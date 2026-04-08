import { describe, expect, it } from 'vitest';
import { resolveApiKey } from '../src/utils/keys.js';
import { createDefaultState } from '../src/utils/state.js';

describe('resolveApiKey', () => {
  it('uses the conversation override first', () => {
    const settings = createDefaultState().settings;
    settings.providers.openai.defaultApiKey = 'settings-key';

    expect(resolveApiKey('openai', 'override-key', settings, { OPENAI_API_KEY: 'env-key' })).toBe(
      'override-key'
    );
  });

  it('falls back to provider settings before the environment', () => {
    const settings = createDefaultState().settings;
    settings.providers.anthropic.defaultApiKey = 'settings-key';

    expect(resolveApiKey('anthropic', '', settings, { ANTHROPIC_API_KEY: 'env-key' })).toBe(
      'settings-key'
    );
  });

  it('checks both Gemini environment variable names', () => {
    const settings = createDefaultState().settings;

    expect(resolveApiKey('gemini', '', settings, { GOOGLE_API_KEY: 'google-key' })).toBe('google-key');
  });
});
