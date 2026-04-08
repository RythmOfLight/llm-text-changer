import { BUILT_IN_MODELS, PROVIDER_ORDER } from './providerCatalog.js';

export function createDefaultState() {
  return {
    settings: {
      providers: {
        openai: {
          defaultApiKey: '',
          defaultModel: BUILT_IN_MODELS.openai[0],
          modelOptions: []
        },
        anthropic: {
          defaultApiKey: '',
          defaultModel: BUILT_IN_MODELS.anthropic[0],
          modelOptions: []
        },
        gemini: {
          defaultApiKey: '',
          defaultModel: BUILT_IN_MODELS.gemini[0],
          modelOptions: []
        }
      }
    },
    conversations: [],
    messagesByConversation: {},
    activeConversationId: null,
    exportPreferences: {
      fontFamily: 'Calibri',
      fontSize: 11
    }
  };
}

export function mergeStateWithDefaults(state) {
  const defaults = createDefaultState();
  const mergedProviders = {};

  for (const provider of PROVIDER_ORDER) {
    mergedProviders[provider] = {
      ...defaults.settings.providers[provider],
      ...(state?.settings?.providers?.[provider] ?? {})
    };
  }

  return {
    ...defaults,
    ...state,
    settings: {
      providers: mergedProviders
    },
    messagesByConversation: state?.messagesByConversation ?? {},
    exportPreferences: {
      ...defaults.exportPreferences,
      ...(state?.exportPreferences ?? {})
    }
  };
}
