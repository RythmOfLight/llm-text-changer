export type ProviderId = 'openai' | 'anthropic' | 'gemini';
export type ConversationMode = 'direct' | 'overwrite';
export type MessageRole = 'user' | 'assistant';

export interface ProviderSettings {
  defaultApiKey: string;
  defaultModel: string;
  modelOptions: string[];
}

export interface SettingsState {
  providers: Record<ProviderId, ProviderSettings>;
}

export interface DocxExportPreferences {
  fontFamily: string;
  fontSize: number;
}

export interface Conversation {
  id: string;
  name: string;
  description: string;
  provider: ProviderId;
  model: string;
  mode: ConversationMode;
  targetFilePath: string;
  apiKeyOverride: string;
  systemInstruction: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  settings: SettingsState;
  conversations: Conversation[];
  messagesByConversation: Record<string, Message[]>;
  activeConversationId: string | null;
  exportPreferences: DocxExportPreferences;
}

export interface ProviderRequestMessage {
  role: MessageRole;
  content: string;
}

export interface ProviderGenerateArgs {
  provider: ProviderId;
  model: string;
  apiKeyOverride: string;
  systemInstruction: string;
  settings: SettingsState;
  messages: ProviderRequestMessage[];
}

export interface ProviderGenerateResult {
  ok: boolean;
  text?: string;
  reason?: 'missing_key' | 'invalid_key';
}

export interface TextFileValidationResult {
  supported: boolean;
  reason?: string;
}

export interface FileReadResult {
  ok: boolean;
  exists: boolean;
  text: string;
}

export interface FileChangeEvent {
  path: string;
  exists: boolean;
  text: string;
}

export interface DocxExportArgs {
  text: string;
  targetPath: string;
  fontFamily: string;
  fontSize: number;
}

export interface ConversationDraft {
  name: string;
  description: string;
  provider: ProviderId;
  model: string;
  mode: ConversationMode;
  targetFilePath: string;
  apiKeyOverride: string;
  systemInstruction: string;
}
