import { useEffect, useMemo, useRef, useState } from 'react';
import type { Conversation, Message } from '../types';
import { PROVIDER_LABELS } from '../utils/providerCatalog.js';

interface ConversationSidebarProps {
  activeConversationId: string | null;
  conversations: Conversation[];
  messagesByConversation: Record<string, Message[]>;
  onCreateConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
}

export function ConversationSidebar({
  activeConversationId,
  conversations,
  messagesByConversation,
  onCreateConversation,
  onSelectConversation
}: ConversationSidebarProps) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const previewMap = useMemo(() => {
    const next = new Map<string, string>();
    for (const conversation of conversations) {
      next.set(conversation.id, `${conversation.provider}-${conversation.model}-${conversation.mode}`);
    }
    return next;
  }, [conversations]);

  function clearTimer() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    setPreviewId(null);
  }, [activeConversationId]);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div>
          <div className="eyebrow">Conversations</div>
          <h1>LLM Text Changer</h1>
        </div>
        <button className="primary-button" onClick={onCreateConversation} type="button">
          New
        </button>
      </div>

      <div className="conversation-list">
        {conversations.map((conversation) => {
          const isActive = conversation.id === activeConversationId;
          const messageCount = messagesByConversation[conversation.id]?.length ?? 0;
          const previewSignature = previewMap.get(conversation.id);

          return (
            <div
              className="conversation-card-wrap"
              key={conversation.id}
              onMouseEnter={() => {
                clearTimer();
                timerRef.current = window.setTimeout(() => {
                  setPreviewId(conversation.id);
                }, 300);
              }}
              onMouseLeave={() => {
                clearTimer();
                setPreviewId((current) => (current === conversation.id ? null : current));
              }}
            >
              <button
                className={`conversation-card ${isActive ? 'is-active' : ''}`}
                onClick={() => onSelectConversation(conversation.id)}
                type="button"
              >
                <span className="conversation-card-title">{conversation.name}</span>
                <span className="conversation-card-meta">
                  {PROVIDER_LABELS[conversation.provider]} · {messageCount} turns
                </span>
              </button>

              {previewId === conversation.id ? (
                <div className="hover-preview" data-preview={previewSignature}>
                  <div className="hover-preview-row">
                    <span>Description</span>
                    <strong>{conversation.description || 'Empty'}</strong>
                  </div>
                  <div className="hover-preview-row">
                    <span>Provider</span>
                    <strong>{PROVIDER_LABELS[conversation.provider]}</strong>
                  </div>
                  <div className="hover-preview-row">
                    <span>Model</span>
                    <strong>{conversation.model || 'Unset'}</strong>
                  </div>
                  <div className="hover-preview-row">
                    <span>Mode</span>
                    <strong>{conversation.mode === 'direct' ? 'Direct output' : 'Overwrite'}</strong>
                  </div>
                  <div className="hover-preview-row">
                    <span>Target file</span>
                    <strong>{conversation.targetFilePath || 'None'}</strong>
                  </div>
                  <div className="hover-preview-row">
                    <span>Instruction</span>
                    <strong>{conversation.systemInstruction.trim() ? 'Set' : 'None'}</strong>
                  </div>
                  <div className="hover-preview-row">
                    <span>API key override</span>
                    <strong>{conversation.apiKeyOverride.trim() ? 'Configured' : 'None'}</strong>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}

        {!conversations.length ? (
          <div className="empty-card">
            <p>No conversations yet.</p>
            <span>Create one to start sending prompts and editing a target file.</span>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
