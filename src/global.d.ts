import type {
  AppState,
  DocxExportArgs,
  FileChangeEvent,
  FileReadResult,
  ProviderGenerateArgs,
  ProviderGenerateResult,
  TextFileValidationResult
} from './types';

declare global {
  interface Window {
    electronApi: {
      loadState: () => Promise<AppState>;
      saveState: (state: AppState) => Promise<void>;
      validateFile: (filePath: string) => Promise<TextFileValidationResult>;
      readFile: (filePath: string) => Promise<FileReadResult>;
      writeFile: (filePath: string, text: string) => Promise<{ ok: boolean }>;
      appendFile: (filePath: string, text: string) => Promise<{ ok: boolean }>;
      watchFile: (filePath: string) => Promise<{ ok: boolean }>;
      unwatchFile: (filePath: string) => Promise<void>;
      pickTargetFile: () => Promise<string>;
      pickDocxExportPath: (suggestedName: string) => Promise<string>;
      exportDocx: (args: DocxExportArgs) => Promise<void>;
      generateText: (args: ProviderGenerateArgs) => Promise<ProviderGenerateResult>;
      onFileChanged: (callback: (payload: FileChangeEvent) => void) => () => void;
    };
  }
}

export {};
