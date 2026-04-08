export const PROVIDER_ORDER = ['openai', 'anthropic', 'gemini'];

export const PROVIDER_LABELS = {
  openai: 'ChatGPT',
  anthropic: 'Claude',
  gemini: 'Gemini'
};

export const BUILT_IN_MODELS = {
  openai: ['gpt-5.1', 'gpt-5-mini', 'gpt-4.1'],
  anthropic: [
    'claude-opus-4-1-20250805',
    'claude-sonnet-4-20250514',
    'claude-3-5-haiku-20241022'
  ],
  gemini: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite']
};

export const PROVIDER_ENV_VARS = {
  openai: ['OPENAI_API_KEY'],
  anthropic: ['ANTHROPIC_API_KEY'],
  gemini: ['GEMINI_API_KEY', 'GOOGLE_API_KEY']
};

export function getProviderOptions(provider, customOptions = []) {
  return [...new Set([...BUILT_IN_MODELS[provider], ...customOptions.filter(Boolean)])];
}
