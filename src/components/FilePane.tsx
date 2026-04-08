import type { Conversation, DocxExportPreferences, TextFileValidationResult } from '../types';

interface FilePaneProps {
  activeConversation: Conversation | null;
  fileText: string;
  fileValidation: TextFileValidationResult;
  exportPreferences: DocxExportPreferences;
  onChangeFileText: (nextText: string) => void;
  onChangeExportPreference: <K extends keyof DocxExportPreferences>(
    key: K,
    value: DocxExportPreferences[K]
  ) => void;
  onExportDocx: () => void;
}

export function FilePane({
  activeConversation,
  fileText,
  fileValidation,
  exportPreferences,
  onChangeFileText,
  onChangeExportPreference,
  onExportDocx
}: FilePaneProps) {
  return (
    <section className="panel file-pane">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Target file</div>
          <h2>{activeConversation?.targetFilePath || 'No file selected'}</h2>
        </div>
      </div>

      {!activeConversation?.targetFilePath ? (
        <div className="empty-card">
          <p>No target file path set.</p>
          <span>Set a text file path in the active conversation to edit it here.</span>
        </div>
      ) : null}

      {activeConversation?.targetFilePath && !fileValidation.supported ? (
        <div className="warning-banner">{fileValidation.reason}</div>
      ) : null}

      <textarea
        className="file-editor"
        disabled={!activeConversation?.targetFilePath || !fileValidation.supported}
        spellCheck={false}
        value={fileText}
        onChange={(event) => onChangeFileText(event.target.value)}
      />

      <div className="docx-controls">
        <div className="panel-header compact">
          <div>
            <div className="eyebrow">DOCX export</div>
            <h3>Export current text</h3>
          </div>
          <button className="secondary-button" onClick={onExportDocx} type="button">
            Export as .docx
          </button>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Font family</span>
            <input
              value={exportPreferences.fontFamily}
              onChange={(event) => onChangeExportPreference('fontFamily', event.target.value)}
            />
          </label>

          <label className="field">
            <span>Font size</span>
            <input
              min={8}
              step={1}
              type="number"
              value={exportPreferences.fontSize}
              onChange={(event) => onChangeExportPreference('fontSize', Number(event.target.value))}
            />
          </label>
        </div>
      </div>
    </section>
  );
}
