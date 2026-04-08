import { useEffect, useState } from 'react';
import type { ConversationDraft, ProviderId, SettingsState } from '../types';
import { createConversationDraft, getProviderDefaultModel } from '../utils/conversation.js';
import { PROVIDER_LABELS, getProviderOptions } from '../utils/providerCatalog.js';

interface CreateConversationModalProps {
  conversationCount: number;
  open: boolean;
  settings: SettingsState;
  onClose: () => void;
  onCreate: (draft: ConversationDraft) => void;
}

export function CreateConversationModal({
  conversationCount,
  open,
  settings,
  onClose,
  onCreate
}: CreateConversationModalProps) {
  const [draft, setDraft] = useState<ConversationDraft>(createConversationDraft(settings, conversationCount));

  useEffect(() => {
    if (open) {
      setDraft(createConversationDraft(settings, conversationCount));
    }
  }, [open, settings, conversationCount]);

  if (!open) {
    return null;
  }

  function updateDraft<K extends keyof ConversationDraft>(key: K, value: ConversationDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleProviderChange(provider: ProviderId) {
    setDraft((current) => ({
      ...current,
      provider,
      model: getProviderDefaultModel(provider, settings)
    }));
  }

  const modelOptions = getProviderOptions(draft.provider, settings.providers[draft.provider].modelOptions);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="panel-header">
          <div>
            <h2>New Conversation</h2>
            <p>Start a new session with its own provider, file, and instructions.</p>
          </div>
          <button className="ghost-button" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Name</span>
            <input value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} />
          </label>

          <label className="field">
            <span>Provider</span>
            <select
              value={draft.provider}
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
              list={`create-models-${draft.provider}`}
              value={draft.model}
              onChange={(event) => updateDraft('model', event.target.value)}
            />
            <datalist id={`create-models-${draft.provider}`}>
              {modelOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </label>

          <label className="field">
            <span>Mode</span>
            <select
              value={draft.mode}
              onChange={(event) => updateDraft('mode', event.target.value as ConversationDraft['mode'])}
            >
              <option value="direct">Direct output</option>
              <option value="overwrite">Overwrite</option>
            </select>
          </label>
        </div>

        <label className="field">
          <span>Description</span>
          <textarea
            rows={3}
            value={draft.description}
            onChange={(event) => updateDraft('description', event.target.value)}
          />
        </label>

        <label className="field">
          <span>Target file path</span>
          <input
            placeholder="Optional text file path"
            value={draft.targetFilePath}
            onChange={(event) => updateDraft('targetFilePath', event.target.value)}
          />
        </label>

        <label className="field">
          <span>Conversation API key override</span>
          <input
            placeholder="Optional per-conversation key"
            type="password"
            value={draft.apiKeyOverride}
            onChange={(event) => updateDraft('apiKeyOverride', event.target.value)}
          />
        </label>

        <label className="field">
          <span>System instruction</span>
          <textarea
            rows={4}
            placeholder="Optional instruction sent with every request"
            value={draft.systemInstruction}
            onChange={(event) => updateDraft('systemInstruction', event.target.value)}
          />
        </label>

        <div className="modal-actions">
          <button
            className="primary-button"
            onClick={() => onCreate(draft)}
            type="button"
            disabled={!draft.name.trim() || !draft.model.trim()}
          >
            Create Conversation
          </button>
        </div>
      </div>
    </div>
  );
}
