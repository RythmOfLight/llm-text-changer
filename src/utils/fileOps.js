import fs from 'node:fs/promises';
import path from 'node:path';
import { decodeUtf8, supportsTextEditing } from './textFiles.js';

export async function ensureParentDirectory(filePath) {
  const parentDirectory = path.dirname(filePath);
  if (!parentDirectory || parentDirectory === filePath) {
    return;
  }

  try {
    const stats = await fs.stat(parentDirectory);
    if (stats.isDirectory()) {
      return;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  await fs.mkdir(parentDirectory, { recursive: true });
}

export async function readTextFile(filePath) {
  if (!supportsTextEditing(filePath)) {
    return {
      ok: false,
      exists: false,
      text: ''
    };
  }

  try {
    const buffer = await fs.readFile(filePath);
    return {
      ok: true,
      exists: true,
      text: decodeUtf8(buffer)
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        ok: true,
        exists: false,
        text: ''
      };
    }

    throw error;
  }
}

export async function appendTextWithSpacing(filePath, text) {
  await ensureParentDirectory(filePath);
  let prefix = '';

  try {
    const current = await fs.readFile(filePath, 'utf8');
    prefix = current.length ? '\n\n' : '';
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  await fs.appendFile(filePath, `${prefix}${text}`, 'utf8');
}
