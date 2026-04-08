import path from 'node:path';

export const SUPPORTED_TEXT_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.ini',
  '.log',
  '.csv',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.css',
  '.html',
  '.xml',
  '.py',
  '.java',
  '.c',
  '.cpp',
  '.h',
  '.cs',
  '.go',
  '.rs',
  '.php',
  '.rb',
  '.sh',
  '.bat',
  '.ps1',
  '.sql'
]);

export function supportsTextEditing(filePath) {
  if (!filePath) {
    return false;
  }

  const extension = path.extname(filePath).toLowerCase();
  return extension ? SUPPORTED_TEXT_EXTENSIONS.has(extension) : true;
}

export function decodeUtf8(buffer) {
  return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
}
