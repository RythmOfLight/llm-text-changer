import { PROVIDER_ENV_VARS } from './providerCatalog.js';

export function resolveApiKey(provider, apiKeyOverride, settings, env) {
  if (apiKeyOverride?.trim()) {
    return apiKeyOverride.trim();
  }

  const defaultKey = settings.providers[provider]?.defaultApiKey?.trim();
  if (defaultKey) {
    return defaultKey;
  }

  const envKeyName = PROVIDER_ENV_VARS[provider].find((variableName) => env[variableName]?.trim());
  return envKeyName ? env[envKeyName].trim() : '';
}
