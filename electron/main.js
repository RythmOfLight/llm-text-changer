import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import chokidar from 'chokidar';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDefaultState, mergeStateWithDefaults } from '../src/utils/state.js';
import { appendTextWithSpacing, ensureParentDirectory, readTextFile } from '../src/utils/fileOps.js';
import { resolveApiKey } from '../src/utils/keys.js';
import { PROVIDER_LABELS } from '../src/utils/providerCatalog.js';
import { decodeUtf8, supportsTextEditing } from '../src/utils/textFiles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_FILE_NAME = 'app-state.json';
const WATCH_SUPPRESSION_MS = 800;

let mainWindow = null;
const watchers = new Map();
const writeSuppressionUntil = new Map();

function getStorePath() {
  return path.join(app.getPath('userData'), STORE_FILE_NAME);
}

async function loadState() {
  const storePath = getStorePath();

  try {
    const raw = await fs.readFile(storePath, 'utf8');
    return mergeStateWithDefaults(JSON.parse(raw));
  } catch (error) {
    if (error.code === 'ENOENT') {
      const defaultState = createDefaultState();
      await saveState(defaultState);
      return defaultState;
    }

    throw error;
  }
}

async function saveState(state) {
  const storePath = getStorePath();
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(state, null, 2), 'utf8');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 960,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: '#101111',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('Renderer failed to load:', { errorCode, errorDescription, validatedURL });
  });

  mainWindow.webContents.on('console-message', (_event, level, message) => {
    if (level >= 2) {
      console.error('Renderer console:', message);
    }
  });

  if (devServerUrl) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

function setWriteSuppression(filePath) {
  writeSuppressionUntil.set(filePath, Date.now() + WATCH_SUPPRESSION_MS);
}

async function emitFileChange(filePath) {
  const suppressionUntil = writeSuppressionUntil.get(filePath) ?? 0;
  if (Date.now() < suppressionUntil) {
    return;
  }

  const result = await readTextFile(filePath);
  mainWindow?.webContents.send('files:changed', {
    path: filePath,
    exists: result.exists,
    text: result.text
  });
}

function ensureWatcher(filePath) {
  if (!filePath || watchers.has(filePath)) {
    return;
  }

  const watcher = chokidar.watch(filePath, {
    ignoreInitial: true
  });

  watcher.on('change', () => emitFileChange(filePath));
  watcher.on('add', () => emitFileChange(filePath));
  watcher.on('unlink', () =>
    mainWindow?.webContents.send('files:changed', {
      path: filePath,
      exists: false,
      text: ''
    })
  );

  watchers.set(filePath, watcher);
}

async function stopWatcher(filePath) {
  const watcher = watchers.get(filePath);
  if (!watcher) {
    return;
  }

  await watcher.close();
  watchers.delete(filePath);
}

function isInvalidKeyResponse(status, message = '') {
  const lowerCaseMessage = message.toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    lowerCaseMessage.includes('api key') ||
    lowerCaseMessage.includes('authentication') ||
    lowerCaseMessage.includes('unauthorized')
  );
}

function extractOpenAIText(payload) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }

  const output = Array.isArray(payload.output) ? payload.output : [];
  const parts = output.flatMap((item) => item.content ?? []);
  return parts
    .filter((part) => part.type === 'output_text' || part.type === 'text')
    .map((part) => part.text ?? '')
    .join('')
    .trim();
}

function extractAnthropicText(payload) {
  return (payload.content ?? [])
    .filter((item) => item.type === 'text')
    .map((item) => item.text ?? '')
    .join('')
    .trim();
}

function extractGeminiText(payload) {
  return (payload.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? '')
    .join('')
    .trim();
}

async function showKeyError(provider) {
  await dialog.showMessageBox({
    type: 'error',
    title: 'Invalid API Key',
    message: `There is no valid API key for ${PROVIDER_LABELS[provider]}.`
  });
}

async function generateText({ provider, model, apiKeyOverride, systemInstruction, settings, messages }) {
  const apiKey = resolveApiKey(provider, apiKeyOverride, settings, process.env);

  if (!apiKey) {
    await showKeyError(provider);
    return {
      ok: false,
      reason: 'missing_key'
    };
  }

  if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        instructions: systemInstruction || undefined,
        input: messages.map((message) => ({
          role: message.role,
          content: [{ type: 'input_text', text: message.content }]
        }))
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      if (isInvalidKeyResponse(response.status, payload.error?.message)) {
        await showKeyError(provider);
        return { ok: false, reason: 'invalid_key' };
      }

      throw new Error(payload.error?.message ?? 'OpenAI request failed.');
    }

    return { ok: true, text: extractOpenAIText(payload) };
  }

  if (provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemInstruction || undefined,
        messages: messages.map((message) => ({
          role: message.role,
          content: message.content
        }))
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      if (isInvalidKeyResponse(response.status, payload.error?.message)) {
        await showKeyError(provider);
        return { ok: false, reason: 'invalid_key' };
      }

      throw new Error(payload.error?.message ?? 'Anthropic request failed.');
    }

    return { ok: true, text: extractAnthropicText(payload) };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: messages.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }]
        })),
        systemInstruction: systemInstruction
          ? {
              parts: [{ text: systemInstruction }]
            }
          : undefined
      })
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    if (
      isInvalidKeyResponse(response.status, payload.error?.message) ||
      payload.error?.status === 'PERMISSION_DENIED'
    ) {
      await showKeyError(provider);
      return { ok: false, reason: 'invalid_key' };
    }

    throw new Error(payload.error?.message ?? 'Gemini request failed.');
  }

  return { ok: true, text: extractGeminiText(payload) };
}

async function exportDocx({ text, targetPath, fontFamily, fontSize }) {
  const paragraphs = text.split(/\r?\n/).map((line) =>
    new Paragraph({
      children: [
        new TextRun({
          text: line.length ? line : ' ',
          font: fontFamily,
          size: Math.round(fontSize * 2)
        })
      ]
    })
  );

  const document = new Document({
    sections: [
      {
        children: paragraphs.length
          ? paragraphs
          : [
              new Paragraph({
                children: [
                  new TextRun({
                    text: ' ',
                    font: fontFamily,
                    size: Math.round(fontSize * 2)
                  })
                ]
              })
            ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(document);
  await fs.writeFile(targetPath, buffer);
}

app.whenReady().then(() => {
  ipcMain.handle('state:load', () => loadState());
  ipcMain.handle('state:save', (_event, state) => saveState(state));

  ipcMain.handle('files:validate', async (_event, filePath) => {
    if (!filePath) {
      return { supported: true };
    }

    if (!supportsTextEditing(filePath)) {
      return {
        supported: false,
        reason: 'Only supported text files can be edited in the live file panel.'
      };
    }

    try {
      const buffer = await fs.readFile(filePath);
      decodeUtf8(buffer);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { supported: true };
      }

      if (error instanceof TypeError || error.code === 'ERR_ENCODING_INVALID_ENCODED_DATA') {
        return {
          supported: false,
          reason: 'The selected file is not valid UTF-8 text.'
        };
      }

      throw error;
    }

    return { supported: true };
  });

  ipcMain.handle('files:read', (_event, filePath) => readTextFile(filePath));
  ipcMain.handle('files:write', async (_event, filePath, text) => {
    await ensureParentDirectory(filePath);
    setWriteSuppression(filePath);
    await fs.writeFile(filePath, text, 'utf8');
    return { ok: true };
  });
  ipcMain.handle('files:append', async (_event, filePath, text) => {
    setWriteSuppression(filePath);
    await appendTextWithSpacing(filePath, text);
    return { ok: true };
  });

  ipcMain.handle('files:watch', (_event, filePath) => {
    ensureWatcher(filePath);
    return { ok: true };
  });
  ipcMain.handle('files:unwatch', (_event, filePath) => stopWatcher(filePath));

  ipcMain.handle('files:pick-target', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile']
    });

    return result.canceled ? '' : result.filePaths[0] ?? '';
  });

  ipcMain.handle('files:pick-docx-export', async (_event, suggestedName) => {
    const result = await dialog.showSaveDialog({
      defaultPath: suggestedName || 'conversation-export.docx',
      filters: [{ name: 'Word Document', extensions: ['docx'] }]
    });

    return result.canceled ? '' : result.filePath ?? '';
  });

  ipcMain.handle('files:export-docx', (_event, args) => exportDocx(args));
  ipcMain.handle('providers:generate', (_event, args) => generateText(args));

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
