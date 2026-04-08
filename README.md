# llm-text-changer

Electron desktop app for managing multiple LLM conversations alongside a live text-file editor.

## Features
- Multiple named conversation sessions
- Per-conversation provider, model, API key override, mode, target file, and system instruction
- Live editable text-file pane with autosave and external file watching
- Direct-output and overwrite modes
- Provider defaults and custom model options in settings
- `.docx` export for the current text content with selectable font family and size

## Supported providers
- ChatGPT / OpenAI
- Claude / Anthropic
- Gemini

## Development
```powershell
npm.cmd install
npm.cmd run build
npm.cmd test
```
