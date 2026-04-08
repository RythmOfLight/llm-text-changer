import { useState } from 'react';
import type { Conversation, Message, ProviderId, SettingsState } from '../types';
import { PROVIDER_LABELS, getProviderOptions } from '../utils/providerCatalog.js';

interface ChatPaneProps {
  activeConversation: Conversation | null;
  busy: boolean;
  messages: Message[];
  settings: SettingsState;
  onConversationChange: <K extends keyof Conversation>(key: K, value: Conversation[K]) => void;
  onBrowseTargetFile: () => void;
  onEditUserMessage: (messageId: string, content: string) => void;
  onRegenerateAssistant: (messageId: string) => void;
  onSendMessage: (content: string) => void;
}

function MessageCard({
  busy,
  message,
  onEditUserMessage,
  onRegenerateAssistant
}: {
  busy: boolean;
  message: Message;
  onEditUserMessage: (messageId: string, content: string) => void;
  onRegenerateAssistant: (messageId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  return (
    <article className={`message-card ${message.role === 'assistant' ? 'assistant' : 'user'}`}>
      <div className="message-card-header">
        <strong>{message.role === 'assistant' ? 'Assistant' : 'User'}</strong>
        <div className="message-actions">
          {message.role === 'user' ? (
            <>
              {editing ? (
                <>
                  <button
                    className="ghost-button"
                    onClick={() => {
                      setEditing(false);
                      setDraft(message.content);
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="secondary-button"
                    disabled={!draft.trim()}
                    onClick={() => {
                      onEditUserMessage(message.id, draft);
                      setEditing(false);
                    }}
                    type="button"
                  >
                    Save
                  </button>
                </>
              ) : (
                <button className="ghost-button" onClick={() => setEditing(true)} type="button">
                  Edit
                </button>
              )}
            </>
          ) : (
            <button
              className="ghost-button"
              disabled={busy}
              onClick={() => onRegenerateAssistant(message.id)}
              type="button"
            >
              Regenerate
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <textarea rows={5} value={draft} onChange={(event) => setDraft(event.target.value)} />
      ) : (
        <pre>{message.content}</pre>
      )}
    </article>
  );
}

export function ChatPane({
  activeConversation,
  busy,
  messages,
  settings,
  onConversationChange,
  onBrowseTargetFile,
  onEditUserMessage,
  onRegenerateAssistant,
  onSendMessage
}: ChatPaneProps) {
  const [composer, setComposer] = useState('');

  if (!activeConversation) {
    return (
      <section className="panel">
        <div className="empty-center">
          <h2>No active conversation</h2>
          <p>Create a conversation to configure a provider, pick a text file, and start chatting.</p>
        </div>
      </section>
    );
  }

  const providerOptions = getProviderOptions(
    activeConversation.provider,
    settings.providers[activeConversation.provider].modelOptions
  );

  function handleProviderChange(provider: ProviderId) {
    onConversationChange('provider', provider);
    onConversationChange('model', settings.providers[provider].defaultModel || '');
  }

  return (
    <section className="panel chat-pane">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Active conversation</div>
          <h2>{activeConversation.name}</h2>
        </div>
        <span className="busy-indicator">{busy ? 'Waiting for provider response…' : 'Ready'}</span>
      </div>

      <div className="conversation-settings">
        <div className="form-grid">
          <label className="field">
            <span>Name</span>
            <input
              value={activeConversation.name}
              onChange={(event) => onConversationChange('name', event.target.value)}
            />
          </label>

          <label className="field">
            <span>Provider</span>
            <select
              value={activeConversation.provider}
              onChange={(event) => handleProviderChange(event.target.value as ProviderId)}
            >
              {Object.entries(PROVIDER_LABELS).map(([provider, label]) => (
                <option key={provider} value={provider}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Model</span>
            <input
              list={`models-${activeConversation.provider}`}
              value={activeConversation.model}
              onChange={(event) => onConversationChange('model', event.target.value)}
            />
            <datalist id={`models-${activeConversation.provider}`}>
              {providerOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </label>

          <label className="field">
            <span>Mode</span>
            <select
              value={activeConversation.mode}
              onChange={(event) =>
                onConversationChange('mode', event.target.value as Conversation['mode'])
              }
            >
              <option value="direct">Direct output</option>
              <option value="overwrite">Overwrite</option>
            </select>
          </label>
        </div>

        <label className="field">
          <span>Description</span>
          <textarea
            rows={2}
            value={activeConversation.description}
            onChange={(event) => onConversationChange('description', event.target.value)}
          />
        </label>

        <div className="path-row">
          <label className="field grow">
            <span>Target file path</span>
            <input
              value={activeConversation.targetFilePath}
              onChange={(event) => onConversationChange('targetFilePath', event.target.value)}
            />
          </label>
          <button className="secondary-button" onClick={onBrowseTargetFile} type="button">
            Browse
          </button>
        </div>

        <label className="field">
          <span>Conversation API key override</span>
          <input
            placeholder="Leave empty to use settings or environment variables"
            type="password"
            value={activeConversation.apiKeyOverride}
            onChange={(event) => onConversationChange('apiKeyOverride', event.target.value)}
          />
        </label>

        <label className="field">
          <span>System instruction</span>
          <textarea
            rows={4}
            placeholder="Optional instruction sent with every request for this conversation"
            value={activeConversation.systemInstruction}
            onChange={(event) => onConversationChange('systemInstruction', event.target.value)}
          />
        </label>
      </div>

      <div className="message-list">
        {messages.length ? (
          messages.map((message) => (
            <MessageCard
              busy={busy}
              key={message.id}
              message={message}
              onEditUserMessage={onEditUserMessage}
              onRegenerateAssistant={onRegenerateAssistant}
            />
          ))
        ) : (
          <div className="empty-card">
            <p>No messages yet.</p>
            <span>Send a prompt to begin this conversation.</span>
          </div>
        )}
      </div>

      <div className="composer">
        <textarea
          placeholder="Send a message to the active provider"
          rows={4}
          value={composer}
          onChange={(event) => setComposer(event.target.value)}
        />
        <button
          className="primary-button"
          disabled={busy || !composer.trim() || !activeConversation.model.trim()}
          onClick={() => {
            onSendMessage(composer);
            setComposer('');
          }}
          type="button"
        >
          Send
        </button>
      </div>
    </section>
  );
}
