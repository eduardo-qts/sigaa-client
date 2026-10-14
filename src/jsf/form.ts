import type { Cheerio } from 'cheerio';
import type { AnyNode } from 'domhandler';
import type { FormFields } from '../http/http-client.js';
import { UnexpectedPageError } from '../errors.js';
import type { Page } from '../page.js';

/** Chamada `jsfcljs(form, {parametros}, alvo)` extraída do `onclick` de um link JSF. */
export interface JsfLink {
  formId: string;
  params: Record<string, string>;
  target: string;
}

export interface FormRequest {
  action: URL;
  fields: FormFields;
}

const JSFCLJS =
  /jsfcljs\(\s*document\.getElementById\(\s*'([^']+)'\s*\)\s*,\s*\{([\s\S]*?)\}\s*,\s*'([^']*)'\s*\)/;
const JS_STRING = String.raw`'((?:[^'\\]|\\.)*)'`;
const unescapeJs = (text: string): string => text.replace(/\\(.)/g, '$1');

/**
 * Lê o `onclick` de um link JSF. O SIGAA emite variações (com ou sem funções antes do
 * `if (typeof jsfcljs ...)`), por isso a busca não depende do início do código.
 */
export function parseJsfLink(onclick: string | undefined): JsfLink | undefined {
  const match = onclick ? JSFCLJS.exec(onclick) : null;
  if (!match) return undefined;
  const [, formId = '', body = '', target = ''] = match;
  // Sem protótipo: uma chave como `__proto__` enviada pelo servidor vira dado, não altera o objeto.
  const params: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const pair of body.matchAll(new RegExp(`${JS_STRING}\\s*:\\s*${JS_STRING}`, 'g'))) {
    params[unescapeJs(pair[1] ?? '')] = unescapeJs(pair[2] ?? '');
  }
  return { formId, params, target };
}

const NOT_SUBMITTED = new Set(['submit', 'button', 'image', 'reset', 'file']);

/** Campos que um navegador enviaria ao submeter o formulário (controles "bem-sucedidos"). */
export function collectFields(form: Cheerio<AnyNode>): [string, string][] {
  const fields: [string, string][] = [];
  form.find('input, select, textarea').each((_, node) => {
    const element = form.find(node);
    const name = element.attr('name');
    if (!name || element.attr('disabled') !== undefined) return;
    const tag = (node as { tagName?: string }).tagName;
    if (tag === 'select') {
      const chosen = element.find('option[selected]').first();
      const option = chosen.length > 0 ? chosen : element.find('option').first();
      if (option.length > 0) fields.push([name, option.attr('value') ?? option.text().trim()]);
    } else if (tag === 'textarea') {
      fields.push([name, element.text()]);
    } else {
      const type = (element.attr('type') ?? 'text').toLowerCase();
      if (NOT_SUBMITTED.has(type)) return;
      if ((type === 'checkbox' || type === 'radio') && element.attr('checked') === undefined)
        return;
      fields.push([name, element.attr('value') ?? '']);
    }
  });
  return fields;
}

/** Define `name=value`: substitui a primeira ocorrência ou acrescenta ao final. */
export function setField(fields: [string, string][], name: string, value: string): void {
  const existing = fields.find(([key]) => key === name);
  if (existing) existing[1] = value;
  else fields.push([name, value]);
}

/** Monta a requisição de um formulário da página, opcionalmente com campos extras. */
export function buildFormRequest(
  page: Page,
  formSelector: string,
  extra: Readonly<Record<string, string>> = {}
): FormRequest {
  const form = page.$(formSelector).first();
  if (form.length === 0) {
    throw new UnexpectedPageError(`Formulário ${formSelector} não encontrado.`, {
      path: page.url.pathname
    });
  }
  const fields = collectFields(form);
  for (const [name, value] of Object.entries(extra)) setField(fields, name, value);
  return { action: new URL(form.attr('action') ?? '', page.url), fields };
}

/** Requisição equivalente a clicar em um link JSF (`jsfcljs`) da página. */
export function buildLinkRequest(page: Page, link: JsfLink): FormRequest {
  return buildFormRequest(page, `[id="${link.formId}"]`, link.params);
}
