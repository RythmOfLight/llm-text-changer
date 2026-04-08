import { describe, expect, it } from 'vitest';
import type { Message } from '../src/types';
import { getMessagesBeforeAssistant } from '../src/utils/conversation.js';

describe('getMessagesBeforeAssistant', () => {
  it('returns only the displayed history before the target assistant output', () => {
    const messages: Message[] = [
      {
        id: '1',
        conversationId: 'conversation',
        role: 'user',
        content: 'first',
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:00.000Z'
      },
      {
        id: '2',
        conversationId: 'conversation',
        role: 'assistant',
        content: 'reply 1',
        createdAt: '2026-04-08T00:00:01.000Z',
        updatedAt: '2026-04-08T00:00:01.000Z'
      },
      {
        id: '3',
        conversationId: 'conversation',
        role: 'user',
        content: 'second',
        createdAt: '2026-04-08T00:00:02.000Z',
        updatedAt: '2026-04-08T00:00:02.000Z'
      },
      {
        id: '4',
        conversationId: 'conversation',
        role: 'assistant',
        content: 'reply 2',
        createdAt: '2026-04-08T00:00:03.000Z',
        updatedAt: '2026-04-08T00:00:03.000Z'
      }
    ];

    expect(getMessagesBeforeAssistant(messages, '4')).toEqual(messages.slice(0, 3));
  });
});
