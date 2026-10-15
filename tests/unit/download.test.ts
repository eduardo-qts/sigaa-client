import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { filenameOf, sanitizeFilename, saveResponse } from '../../src/course/download.js';
import type { StreamResponse } from '../../src/http/http-client.js';

const response = (
  headers: Record<string, string>,
  body: string | null = 'dados',
  url = 'https://arquivos.example.org/a/b/arquivo%20final.pdf'
): StreamResponse => ({
  status: 200,
  url: new URL(url),
  headers: new Headers(headers),
  body: body === null ? null : new Response(body).body
});

describe('sanitizeFilename', () => {
  it.each([
    ['../../etc/passwd', 'passwd'],
    ['..\\..\\evil.exe', 'evil.exe'],
    ['a<b>:c|d?.txt', 'a_b__c_d_.txt'],
    ['.hidden', 'hidden'],
    ['   ', 'arquivo'],
    [' .', 'arquivo'],
    [' . a', 'a'],
    ['', 'arquivo']
  ])('%j vira %j', (input, expected) => {
    expect(sanitizeFilename(input)).toBe(expected);
  });

  it('limita o tamanho do nome', () => {
    expect(sanitizeFilename('x'.repeat(500)).length).toBe(200);
  });
});

describe('filenameOf', () => {
  it('lê filename entre aspas, sem aspas e filename* (RFC 6266)', () => {
    expect(filenameOf(response({ 'content-disposition': 'attachment; filename="a b.pdf"' }))).toBe(
      'a b.pdf'
    );
    expect(
      filenameOf(response({ 'content-disposition': 'attachment; filename=simples.txt' }))
    ).toBe('simples.txt');
    expect(
      filenameOf(
        response({ 'content-disposition': "attachment; filename*=UTF-8''Prova%20n%C2%BA1.pdf" })
      )
    ).toBe('Prova nº1.pdf');
  });

  it('conserta nomes UTF-8 que chegam lidos como Latin-1', () => {
    const mojibake = Buffer.from('Programação.pdf', 'utf8').toString('latin1');
    expect(
      filenameOf(response({ 'content-disposition': `attachment; filename="${mojibake}"` }))
    ).toBe('Programação.pdf');
  });

  it('usa a URL final quando não há Content-Disposition e sanitiza caminhos', () => {
    expect(filenameOf(response({}))).toBe('arquivo final.pdf');
    expect(
      filenameOf(response({ 'content-disposition': 'attachment; filename="../../x.pdf"' }))
    ).toBe('x.pdf');
  });
});

describe('saveResponse', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'sigaa-client-'));
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  it('grava em um diretório usando o nome do servidor e informa progresso', async () => {
    const progress = vi.fn();
    const result = await saveResponse(
      response({
        'content-disposition': 'attachment; filename="Lista 01.pdf"',
        'content-length': '5'
      }),
      dir,
      { onProgress: progress }
    );
    expect(result).toEqual({ path: join(dir, 'Lista 01.pdf'), filename: 'Lista 01.pdf', bytes: 5 });
    expect(await readFile(result.path, 'utf8')).toBe('dados');
    expect(progress).toHaveBeenLastCalledWith(5, 5);
  });

  it('nunca escapa do diretório de destino', async () => {
    const result = await saveResponse(
      response({ 'content-disposition': 'attachment; filename="../../fuga.txt"' }),
      dir
    );
    expect(result.path).toBe(join(dir, 'fuga.txt'));
  });

  it('aceita um caminho de arquivo e respeita overwrite', async () => {
    const target = join(dir, 'saida.bin');
    await saveResponse(response({}), target);
    await expect(saveResponse(response({}), target)).rejects.toMatchObject({ code: 'EEXIST' });
    await writeFile(target, 'antigo');
    await saveResponse(response({}, 'novo'), target, { overwrite: true });
    expect(await readFile(target, 'utf8')).toBe('novo');
  });

  it('falha de forma tipada quando a resposta não tem corpo', async () => {
    await expect(saveResponse(response({}, null), dir)).rejects.toMatchObject({
      code: 'UNEXPECTED_PAGE'
    });
  });
});
