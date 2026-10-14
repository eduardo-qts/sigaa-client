# Contribuindo

Obrigado por querer ajudar! Esta é uma biblioteca não oficial: respeite o sistema da UFSJ
e a privacidade das pessoas.

## Ambiente

Requisitos: Node.js 22.13+ (exigência do pnpm 11; a biblioteca em si suporta Node 20+) e pnpm (`corepack enable` ou `npm install -g pnpm`).

```sh
git clone https://github.com/eduardo-qts/sigaa-client.git
cd sigaa-client
pnpm install
pnpm verify      # typecheck + lint + formatação + testes + build
```

## Estrutura

```
src/
  client.ts          fachada pública (SigaaClient)
  http/              cliente HTTP (fetch), cookie jar, codificação ISO-8859-1
  jsf/               links jsfcljs e montagem de formulários
  session.ts         sessão: fila serial, detecção de sessão expirada
  auth.ts            login e logout
  course/            Course, navegador de turmas, download seguro
  parsers/           funções puras: HTML -> dados tipados
  errors.ts          hierarquia de erros
tests/
  unit/              testes offline
  fixtures/pages.ts  HTML sintético (estrutura real, dados fictícios)
  helpers/           SIGAA falso em memória
  integration/       testes opcionais contra o SIGAA real
examples/            exemplos executáveis e tipados
```

## Fluxo

1. Crie uma branch a partir de `main`.
2. Altere o código **com teste**. Parser novo exige fixture sintética em
   `tests/fixtures/pages.ts` e teste em `tests/unit/`.
3. Rode `pnpm verify`.
4. Abra o PR descrevendo o que mudou e como validou (se possível, também em integração real).

## Regras de ouro

- **Nunca** commite credenciais, cookies, CPF, nomes de colegas ou HTML real. Escreva fixtures do zero.
- Não invente endpoints, seletores ou parâmetros: baseie-se no comportamento observado do SIGAA.
- Sem operações destrutivas, testes de carga ou contorno de CAPTCHA/MFA.
- Prefira seletores semânticos (rótulos, cabeçalhos) a índices fixos de coluna.
- Mudança na API pública precisa de entrada no `CHANGELOG.md`.

## Publicação (mantenedor)

1. Atualize `version` em `package.json` **e** em `src/version.ts` (um teste garante que coincidem) e o `CHANGELOG.md`.
2. `git tag vX.Y.Z && git push --tags`.
3. O workflow `release.yml` verifica e publica com _provenance_ via _trusted publishing_ (OIDC, sem token); configure uma vez no npmjs.com.

Publicação manual: `npm login` e `pnpm publish --access public` (o `prepublishOnly` roda `pnpm verify`).
