import { describe, expect, it } from 'vitest';
import { supportsTextEditing, decodeUtf8 } from '../src/utils/textFiles.js';

describe('supportsTextEditing', () => {
  it('accepts known text file extensions', () => {
    expect(supportsTextEditing('notes.md')).toBe(true);
    expect(supportsTextEditing('script.ts')).toBe(true);
  });

  it('rejects unsupported binary-style extensions', () => {
    expect(supportsTextEditing('document.docx')).toBe(false);
    expect(supportsTextEditing('image.png')).toBe(false);
  });

  it('accepts extensionless paths', () => {
    expect(supportsTextEditing('README')).toBe(true);
  });

  it('throws for invalid UTF-8 input', () => {
    expect(() => decodeUtf8(Uint8Array.from([0xc3, 0x28]))).toThrow();
  });
});
