import type { Cheerio } from 'cheerio';
import type { AnyNode } from 'domhandler';

/** Colapsa qualquer sequência de espaços (inclusive NBSP) e remove as pontas. */
export const clean = (text: string | undefined | null): string =>
  (text ?? '').replace(/\s+/g, ' ').trim();

/** Texto normalizado de um elemento. */
export const textOf = (element: Cheerio<AnyNode>): string => clean(element.text());

/** Remove acentos e caixa, para comparar rótulos sem depender de grafia. */
export const fold = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/** `dd/mm/aaaa` (ou `dd/mm/aaaa hh:mm`) para `Date` em horário local; `undefined` se inválida. */
export function parseBrDate(text: string): Date | undefined {
  const match = /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\D+(\d{1,2})[:h](\d{2}))?/.exec(text);
  if (!match) return undefined;
  const [, day, month, year, hour, minute] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour ?? 0),
    Number(minute ?? 0)
  );
  return date.getDate() === Number(day) ? date : undefined;
}

/** Número com vírgula ou ponto decimal; `undefined` se não for numérico. */
export function parseDecimal(text: string): number | undefined {
  const normalized = clean(text).replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return undefined;
  return Number(normalized);
}

/** `Date` local para `AAAA-MM-DD` (sem fuso, para serializar sem surpresas). */
export const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Como {@link parseBrDate}, mas devolve ISO local: `AAAA-MM-DD` ou `AAAA-MM-DDTHH:MM` se houver hora. */
export function parseBrIso(text: string): string | undefined {
  const date = parseBrDate(text);
  if (!date) return undefined;
  const time = /\d{1,2}[:h]\d{2}/.test(text)
    ? `T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    : '';
  return toIsoDate(date) + time;
}
