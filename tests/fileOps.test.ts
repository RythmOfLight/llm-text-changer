import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { appendTextWithSpacing, ensureParentDirectory, readTextFile } from '../src/utils/fileOps.js';

describe('fileOps', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not try to create a drive root that already exists', async () => {
    const statMock = vi.spyOn(fs, 'stat').mockResolvedValue({
      isDirectory: () => true
    } as Awaited<ReturnType<typeof fs.stat>>);
    const mkdirMock = vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined);

    await ensureParentDirectory('D:\\root-file.txt');

    expect(statMock).toHaveBeenCalledWith('D:\\');
    expect(mkdirMock).not.toHaveBeenCalled();
  });

  it('creates a missing parent directory for normal nested files', async () => {
    const statMock = vi.spyOn(fs, 'stat').mockRejectedValue(Object.assign(new Error('missing'), { code: 'ENOENT' }));
    const mkdirMock = vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined);

    await ensureParentDirectory('D:\\folder\\child\\file.txt');

    expect(statMock).toHaveBeenCalledWith('D:\\folder\\child');
    expect(mkdirMock).toHaveBeenCalledWith('D:\\folder\\child', { recursive: true });
  });

  it('appends without spacing when the file is empty', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'llm-text-changer-'));
    const filePath = path.join(tempDir, 'empty.txt');

    await fs.writeFile(filePath, '', 'utf8');
    await appendTextWithSpacing(filePath, 'hello');

    await expect(fs.readFile(filePath, 'utf8')).resolves.toBe('hello');
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('appends with blank-line spacing when the file already has content', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'llm-text-changer-'));
    const filePath = path.join(tempDir, 'filled.txt');

    await fs.writeFile(filePath, 'first', 'utf8');
    await appendTextWithSpacing(filePath, 'second');

    await expect(fs.readFile(filePath, 'utf8')).resolves.toBe('first\n\nsecond');
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('returns empty content for a missing supported text file', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'llm-text-changer-'));
    const filePath = path.join(tempDir, 'missing.txt');

    await expect(readTextFile(filePath)).resolves.toEqual({
      ok: true,
      exists: false,
      text: ''
    });
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('rejects unsupported file types before reading', async () => {
    await expect(readTextFile('D:\\document.docx')).resolves.toEqual({
      ok: false,
      exists: false,
      text: ''
    });
  });
});
