const UNRESERVED = /[A-Za-z0-9*\-._]/;

/**
 * Codifica pares chave/valor como `application/x-www-form-urlencoded` em ISO-8859-1,
 * a codificação das páginas do SIGAA. Caracteres fora do Latin-1 viram entidades
 * numéricas (`&#N;`), como fazem os navegadores.
 */
export function encodeForm(fields: Iterable<readonly [string, string]>): string {
  const encode = (text: string): string => {
    let out = '';
    for (const char of text) {
      const code = char.codePointAt(0) ?? 0;
      if (UNRESERVED.test(char)) out += char;
      else if (char === ' ') out += '+';
      else if (code <= 0xff) out += `%${code.toString(16).toUpperCase().padStart(2, '0')}`;
      else out += encode(`&#${code};`);
    }
    return out;
  };
  return Array.from(fields, ([key, value]) => `${encode(key)}=${encode(value)}`).join('&');
}
