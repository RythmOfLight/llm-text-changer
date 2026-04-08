import { useState } from 'react';
import type { ProviderId, SettingsState } from '../types';
import { PROVIDER_LABELS, getProviderOptions } from '../utils/providerCatalog.js';

interface SettingsPageProps {
  settings: SettingsState;
  onBack: () => void;
  onSettingsChange: (settings: SettingsState) => void;
}

export function SettingsPage({ settings, onBack, onSettingsChange }: SettingsPageProps) {
  const [draftOptions, setDraftOptions] = useState<Record<ProviderId, string>>({
    openai: '',
    anthropic: '',
    gemini: ''
  });

  function updateProviderField<K extends keyof SettingsState['providers'][ProviderId]>(
    provider: ProviderId,
    key: K,
    value: SettingsState['providers'][ProviderId][K]
  ) {
    onSettingsChange({
      providers: {
        ...settings.providers,
        [provider]: {
          ...settings.providers[provider],
          [key]: value
        }
      }
    });
  }

  function addModelOption(provider: ProviderId) {
    const nextOption = draftOptions[provider].trim();
    if (!nextOption) {
      return;
    }

    updateProviderField(provider, 'modelOptions', [
      ...settings.providers[provider].modelOptions,
      nextOption
    ]);
    setDraftOptions((current) => ({ ...current, [provider]: '' }));
  }

  function removeModelOption(provider: ProviderId, option: string) {
    updateProviderField(
      provider,
      'modelOptions',
      settings.providers[provider].modelOptions.filter((entry) => entry !== option)
    );
  }

  return (
    <section className="settings-shell">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Settings</div>
          <h1>Provider defaults</h1>
        </div>
        <button className="secondary-button" onClick={onBack} type="button">
          Back to workspace
        </button>
      </div>

      <div className="settings-grid">
        {(Object.keys(PROVIDER_LABELS) as ProviderId[]).map((provider) => {
          const providerSettings = settings.providers[provider];
          const visibleOptions = getProviderOptions(provider, providerSettings.modelOptions);

          return (
            <section className="panel settings-card" key={provider}>
              <div className="panel-header compact">
                <div>
                  <div className="eyebrow">Provider</div>
                  <h2>{PROVIDER_LABELS[provider]}</h2>
                </div>
              </div>

              <label className="field">
                <span>Default API key</span>
                <input
                  placeholder="Optional default key"
                  type="password"
                  value={providerSettings.defaultApiKey}
                  onChange={(event) =>
                    updateProviderField(provider, 'defaultApiKey', event.target.value)
                  }
                />
              </label>

              <label className="field">
                <span>Default model</span>
                <input
                  list={`settings-models-${provider}`}
                  value={providerSettings.defaultModel}
                  onChange={(event) => updateProviderField(provider, 'defaultModel', event.target.value)}
                />
                <datalist id={`settings-models-${provider}`}>
                  {visibleOptions.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </label>

              <div className="field">
                <span>Custom model options</span>
                <div className="tag-row">
                  {providerSettings.modelOptions.map((option) => (
                    <button
                      className="tag-button"
                      key={option}
                      onClick={() => removeModelOption(provider, option)}
                      type="button"
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <div className="inline-actions">
                  <input
                    placeholder="Add custom model"
                    value={draftOptions[provider]}
                    onChange={(event) =>
                      setDraftOptions((current) => ({ ...current, [provider]: event.target.value }))
                    }
                  />
                  <button className="secondary-button" onClick={() => addModelOption(provider)} type="button">
                    Add
                  </button>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
