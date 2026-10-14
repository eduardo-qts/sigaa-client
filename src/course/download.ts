import { createWriteStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { UnexpectedPageError } from '../errors.js';
import type { StreamResponse } from '../http/http-client.js';

export interface DownloadOptions {
  /** Chamado a cada bloco gravado, com o total de bytes até agora e o tamanho (se informado). */
  onProgress?: (bytesWritten: number, totalBytes?: number) => void;
  /** Sobrescreve um arquivo existente. Padrão: `false` (falha com `EEXIST`). */
  overwrite?: boolean;
}

export interface DownloadResult {
  /** Caminho do arquivo gravado. */
  path: string;
  filename: string;
  bytes: number;
}

// eslint-disable-next-line no-control-regex
const UNSAFE_CHARACTERS = /[\u0000-\u001f\u007f<>:"|?*]/g;

/** Remove separadores de caminho, caracteres de controle e nomes reservados. */
export function sanitizeFilename(name: string): string {
  const base = basename(name.replace(/\\/g, '/'))
    .replace(UNSAFE_CHARACTERS, '_')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 200);
  return base || 'arquivo';
}

/** Os cabeçalhos HTTP chegam como Latin-1; nomes em UTF-8 viram "mojibake" e são refeitos aqui. */
function repairUtf8(value: string): string {
  const codes = Array.from(value, (char) => char.codePointAt(0) ?? 0);
  if (!codes.some((code) => code >= 0x80) || codes.some((code) => code > 0xff)) return value;
  const decoded = Buffer.from(value, 'latin1').toString('utf8');
  return decoded.includes('\ufffd') ? value : decoded;
}

/** Nome do arquivo a partir de `Content-Disposition` (RFC 6266) ou, na falta, da URL final. */
export function filenameOf(response: Pick<StreamResponse, 'headers' | 'url'>): string {
  const disposition = response.headers.get('content-disposition') ?? '';
  const extended = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/.exec(disposition)?.[1];
  const plain = /filename\s*=\s*(?:"([^"]*)"|([^;]+))/.exec(disposition);
  const plainName = (plain?.[1] ?? plain?.[2] ?? '').trim();
  const decoded = (value: string): string => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };
  const name =
    (extended ? decoded(extended) : repairUtf8(plainName)) ||
    decoded(response.url.pathname.split('/').pop() ?? '');
  return sanitizeFilename(name);
}

/**
 * Grava o corpo da resposta. `destination` pode ser um diretório existente (o nome vem do
 * servidor, já sanitizado) ou o caminho completo do arquivo.
 */
export async function saveResponse(
  response: StreamResponse,
  destination: string,
  options: DownloadOptions = {}
): Promise<DownloadResult> {
  if (!response.body) {
    throw new UnexpectedPageError('O SIGAA respondeu sem conteúdo para o arquivo.', {
      path: response.url.pathname
    });
  }
  const filename = filenameOf(response);
  const isDirectory = await stat(destination).then(
    (info) => info.isDirectory(),
    () => false
  );
  const path = isDirectory ? join(destination, filename) : destination;
  const total = Number(response.headers.get('content-length')) || undefined;

  let bytes = 0;
  const counter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length;
      options.onProgress?.(bytes, total);
      callback(null, chunk);
    }
  });
  await pipeline(
    Readable.fromWeb(response.body as NodeReadableStream<Uint8Array>),
    counter,
    createWriteStream(path, { flags: options.overwrite ? 'w' : 'wx' })
  );
  return { path, filename: isDirectory ? filename : basename(path), bytes };
}
