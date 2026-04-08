import { BUILT_IN_MODELS } from './providerCatalog.js';

/** @typedef {import('../types').ConversationDraft} ConversationDraft */
/** @typedef {import('../types').Conversation} Conversation */
/** @typedef {import('../types').Message} Message */
/** @typedef {import('../types').SettingsState} SettingsState */

export function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** @param {number} conversationCount */
export function buildConversationName(conversationCount) {
  return `Conversation ${conversationCount + 1}`;
}

/** @param {import('../types').ProviderId} provider
 *  @param {SettingsState} settings
 */
export function getProviderDefaultModel(provider, settings) {
  return settings.providers[provider].defaultModel || BUILT_IN_MODELS[provider][0] || '';
}

/** @param {SettingsState} settings
 *  @param {number} conversationCount
 *  @returns {ConversationDraft}
 */
export function createConversationDraft(settings, conversationCount) {
  /** @type {import('../types').ProviderId} */
  const provider = 'openai';

  return {
    name: buildConversationName(conversationCount),
    description: '',
    provider,
    model: getProviderDefaultModel(provider, settings),
    mode: 'direct',
    targetFilePath: '',
    apiKeyOverride: '',
    systemInstruction: ''
  };
}

/** @param {ConversationDraft} draft
 *  @returns {Conversation}
 */
export function createConversationFromDraft(draft) {
  const now = new Date().toISOString();

  return {
    id: createId(),
    ...draft,
    createdAt: now,
    updatedAt: now
  };
}

/** @template T
 *  @param {T & { updatedAt: string }} record
 *  @returns {T & { updatedAt: string }}
 */
export function updateTimestamp(record) {
  return {
    ...record,
    updatedAt: new Date().toISOString()
  };
}

/** @param {Message[]} messages
 *  @param {string} assistantId
 *  @returns {Message[]}
 */
export function getMessagesBeforeAssistant(messages, assistantId) {
  const assistantIndex = messages.findIndex((message) => message.id === assistantId);

  if (assistantIndex === -1) {
    throw new Error(`Assistant message ${assistantId} was not found.`);
  }

  return messages.slice(0, assistantIndex);
}
