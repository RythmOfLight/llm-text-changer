import { useEffect, useMemo, useRef, useState } from 'react';
import { ChatPane } from './components/ChatPane';
import { ConversationSidebar } from './components/ConversationSidebar';
import { CreateConversationModal } from './components/CreateConversationModal';
import { FilePane } from './components/FilePane';
import { SettingsPage } from './components/SettingsPage';
import type {
  AppState,
  Conversation,
  ConversationDraft,
  DocxExportPreferences,
  FileChangeEvent,
  Message,
  ProviderGenerateArgs,
  TextFileValidationResult
} from './types';
import {
  createConversationFromDraft,
  createId,
  getMessagesBeforeAssistant,
  updateTimestamp
} from './utils/conversation.js';
import { createDefaultState } from './utils/state.js';

type ViewMode = 'workspace' | 'settings';

function App() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [startupError, setStartupError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('workspace');
  const [busy, setBusy] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [fileText, setFileText] = useState('');
  const [fileValidation, setFileValidation] = useState<TextFileValidationResult>({ supported: true });
  const saveReadyRef = useRef(false);
  const lastSavedFileTextRef = useRef('');

  const activeConversation = useMemo(() => {
    if (!appState?.activeConversationId) {
      return null;
    }

    return (
      appState.conversations.find((conversation) => conversation.id === appState.activeConversationId) ?? null
    );
  }, [appState]);

  const activeMessages = useMemo(() => {
    if (!appState || !activeConversation) {
      return [];
    }

    return appState.messagesByConversation[activeConversation.id] ?? [];
  }, [appState, activeConversation]);

  useEffect(() => {
    let mounted = true;

    async function loadInitialState() {
      if (!window.electronApi?.loadState) {
        throw new Error('electronApi bridge is not available in the renderer.');
      }

      const loadedState = await window.electronApi.loadState();
      if (!mounted) {
        return;
      }

      const nextState = loadedState.conversations.length
        ? loadedState
        : {
            ...loadedState,
            activeConversationId: null
          };

      setAppState(nextState);
      saveReadyRef.current = true;
    }

    loadInitialState().catch((error) => {
      console.error('Failed to initialize app state.', error);
      if (!mounted) {
        return;
      }

      setStartupError(error instanceof Error ? error.message : String(error));
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!appState || !saveReadyRef.current) {
      return;
    }

    void window.electronApi.saveState(appState);
  }, [appState]);

  useEffect(() => {
    const targetFilePath = activeConversation?.targetFilePath.trim() ?? '';
    let disposed = false;
    let unsubscribe = () => {};

    async function syncFile() {
      if (!targetFilePath) {
        setFileValidation({ supported: true });
        setFileText('');
        lastSavedFileTextRef.current = '';
        return;
      }

      const validation = await window.electronApi.validateFile(targetFilePath);
      if (disposed) {
        return;
      }

      setFileValidation(validation);
      if (!validation.supported) {
        setFileText('');
        lastSavedFileTextRef.current = '';
        return;
      }

      const readResult = await window.electronApi.readFile(targetFilePath);
      if (disposed) {
        return;
      }

      setFileText(readResult.text);
      lastSavedFileTextRef.current = readResult.text;
      await window.electronApi.watchFile(targetFilePath);
      unsubscribe = window.electronApi.onFileChanged((payload: FileChangeEvent) => {
        if (payload.path !== targetFilePath) {
          return;
        }

        setFileText(payload.text);
        lastSavedFileTextRef.current = payload.text;
      });
    }

    void syncFile();

    return () => {
      disposed = true;
      unsubscribe();
      if (targetFilePath) {
        void window.electronApi.unwatchFile(targetFilePath);
      }
    };
  }, [activeConversation?.id, activeConversation?.targetFilePath]);

  useEffect(() => {
    const targetFilePath = activeConversation?.targetFilePath.trim() ?? '';

    if (!targetFilePath || !fileValidation.supported || fileText === lastSavedFileTextRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      void window.electronApi.writeFile(targetFilePath, fileText);
      lastSavedFileTextRef.current = fileText;
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeConversation?.targetFilePath, fileText, fileValidation.supported]);

  function updateAppState(updater: (current: AppState) => AppState) {
    setAppState((current) => updater(current ?? createDefaultState()));
  }

  function updateConversation<K extends keyof Conversation>(key: K, value: Conversation[K]) {
    if (!activeConversation) {
      return;
    }

    updateAppState((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) =>
        conversation.id === activeConversation.id
          ? updateTimestamp({
              ...conversation,
              [key]: value
            })
          : conversation
      )
    }));
  }

  function updateMessagesForActiveConversation(nextMessages: Message[]) {
    if (!activeConversation) {
      return;
    }

    updateAppState((current) => ({
      ...current,
      messagesByConversation: {
        ...current.messagesByConversation,
        [activeConversation.id]: nextMessages
      }
    }));
  }

  async function ensureConversationReadyForGeneration(conversation: Conversation) {
    if (conversation.mode !== 'overwrite') {
      return true;
    }

    const targetFilePath = conversation.targetFilePath.trim();
    if (!targetFilePath) {
      window.alert('Overwrite mode requires a supported target file path before sending a request.');
      return false;
    }

    const validation = await window.electronApi.validateFile(targetFilePath);
    setFileValidation(validation);
    if (!validation.supported) {
      window.alert(validation.reason ?? 'Overwrite mode requires a supported text file.');
      return false;
    }

    return true;
  }

  async function appendOverwriteOutputIfNeeded(conversation: Conversation, text: string) {
    const targetFilePath = conversation.targetFilePath.trim();
    if (conversation.mode !== 'overwrite') {
      return;
    }

    if (!targetFilePath) {
      throw new Error('Overwrite mode requires a supported target file path.');
    }

    const validation = await window.electronApi.validateFile(targetFilePath);
    if (!validation.supported) {
      throw new Error(validation.reason ?? 'Overwrite mode requires a supported text file.');
    }

    await window.electronApi.appendFile(targetFilePath, text);

    if (conversation.id === activeConversation?.id) {
      const currentText = lastSavedFileTextRef.current;
      const nextText = currentText.length ? `${currentText}\n\n${text}` : text;
      setFileText(nextText);
      lastSavedFileTextRef.current = nextText;
    }
  }

  async function handleSendMessage(content: string) {
    if (!activeConversation || !appState) {
      return;
    }

    if (!(await ensureConversationReadyForGeneration(activeConversation))) {
      return;
    }

    const userMessage: Message = {
      id: createId(),
      conversationId: activeConversation.id,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const baseMessages = [...activeMessages, userMessage];
    updateMessagesForActiveConversation(baseMessages);
    setBusy(true);

    try {
      const response = await window.electronApi.generateText({
        provider: activeConversation.provider,
        model: activeConversation.model,
        apiKeyOverride: activeConversation.apiKeyOverride,
        systemInstruction: activeConversation.systemInstruction,
        settings: appState.settings,
        messages: baseMessages.map((message) => ({
          role: message.role,
          content: message.content
        }))
      } satisfies ProviderGenerateArgs);

      if (!response.ok || !response.text) {
        return;
      }

      const assistantMessage: Message = {
        id: createId(),
        conversationId: activeConversation.id,
        role: 'assistant',
        content: response.text,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const nextMessages = [...baseMessages, assistantMessage];
      updateMessagesForActiveConversation(nextMessages);
      await appendOverwriteOutputIfNeeded(activeConversation, response.text);
    } finally {
      setBusy(false);
    }
  }

  async function handleRegenerateAssistant(messageId: string) {
    if (!activeConversation || !appState) {
      return;
    }

    if (!(await ensureConversationReadyForGeneration(activeConversation))) {
      return;
    }

    setBusy(true);

    try {
      const contextMessages = getMessagesBeforeAssistant(activeMessages, messageId);
      const response = await window.electronApi.generateText({
        provider: activeConversation.provider,
        model: activeConversation.model,
        apiKeyOverride: activeConversation.apiKeyOverride,
        systemInstruction: activeConversation.systemInstruction,
        settings: appState.settings,
        messages: contextMessages.map((message: Message) => ({
          role: message.role,
          content: message.content
        }))
      });

      if (!response.ok || !response.text) {
        return;
      }

      const regeneratedText = response.text;
      const nextMessages = activeMessages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              content: regeneratedText,
              updatedAt: new Date().toISOString()
            }
          : message
      );

      updateMessagesForActiveConversation(nextMessages);
      await appendOverwriteOutputIfNeeded(activeConversation, regeneratedText);
    } finally {
      setBusy(false);
    }
  }

  async function handleBrowseTargetFile() {
    const filePath = await window.electronApi.pickTargetFile();
    if (!filePath) {
      return;
    }

    updateConversation('targetFilePath', filePath);
  }

  function handleCreateConversation(draft: ConversationDraft) {
    const conversation = createConversationFromDraft(draft);

    updateAppState((current) => ({
      ...current,
      conversations: [...current.conversations, conversation],
      messagesByConversation: {
        ...current.messagesByConversation,
        [conversation.id]: []
      },
      activeConversationId: conversation.id
    }));
    setCreateModalOpen(false);
  }

  async function handleExportDocx() {
    const suggestedName = `${activeConversation?.name || 'conversation-export'}.docx`;
    const exportPath = await window.electronApi.pickDocxExportPath(suggestedName);

    if (!exportPath || !appState) {
      return;
    }

    await window.electronApi.exportDocx({
      text: fileText,
      targetPath: exportPath,
      fontFamily: appState.exportPreferences.fontFamily,
      fontSize: appState.exportPreferences.fontSize
    });
  }

  function handleChangeSettings(settings: AppState['settings']) {
    updateAppState((current) => ({
      ...current,
      settings
    }));
  }

  function handleChangeExportPreference<K extends keyof DocxExportPreferences>(
    key: K,
    value: DocxExportPreferences[K]
  ) {
    updateAppState((current) => ({
      ...current,
      exportPreferences: {
        ...current.exportPreferences,
        [key]: value
      }
    }));
  }

  if (!appState) {
    return (
      <main className="app-shell">
        <div className="startup-state">
          <div className="loading-state">
            {startupError ? (
              <>
                <strong>Renderer startup failed</strong>
                <div>{startupError}</div>
              </>
            ) : (
              'Loading application state...'
            )}
          </div>
        </div>
      </main>
    );
  }

  if (viewMode === 'settings') {
    return (
      <main className="app-shell">
        <SettingsPage
          onBack={() => setViewMode('workspace')}
          onSettingsChange={handleChangeSettings}
          settings={appState.settings}
        />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="workspace-header">
        <div>
          <div className="eyebrow">Desktop workspace</div>
          <h1>Conversation manager with live file editing</h1>
        </div>
        <button className="secondary-button" onClick={() => setViewMode('settings')} type="button">
          Settings
        </button>
      </div>

      <div className="workspace-grid">
        <ConversationSidebar
          activeConversationId={appState.activeConversationId}
          conversations={appState.conversations}
          messagesByConversation={appState.messagesByConversation}
          onCreateConversation={() => setCreateModalOpen(true)}
          onSelectConversation={(conversationId) =>
            updateAppState((current) => ({
              ...current,
              activeConversationId: conversationId
            }))
          }
        />

        <ChatPane
          activeConversation={activeConversation}
          busy={busy}
          messages={activeMessages}
          onBrowseTargetFile={handleBrowseTargetFile}
          onConversationChange={updateConversation}
          onEditUserMessage={(messageId, content) => {
            const nextMessages = activeMessages.map((message) =>
              message.id === messageId
                ? {
                    ...message,
                    content,
                    updatedAt: new Date().toISOString()
                  }
                : message
            );
            updateMessagesForActiveConversation(nextMessages);
          }}
          onRegenerateAssistant={handleRegenerateAssistant}
          onSendMessage={handleSendMessage}
          settings={appState.settings}
        />

        <FilePane
          activeConversation={activeConversation}
          exportPreferences={appState.exportPreferences}
          fileText={fileText}
          fileValidation={fileValidation}
          onChangeExportPreference={handleChangeExportPreference}
          onChangeFileText={setFileText}
          onExportDocx={handleExportDocx}
        />
      </div>

      <CreateConversationModal
        conversationCount={appState.conversations.length}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateConversation}
        open={createModalOpen}
        settings={appState.settings}
      />
    </main>
  );
}

export default App;
