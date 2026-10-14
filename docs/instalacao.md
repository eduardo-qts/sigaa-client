# Instalação

## Requisitos

- Node.js **20** ou superior
- Uma conta **própria** no SIGAA da UFSJ (<https://sig.ufsj.edu.br/sigaa/>)

A única dependência de produção é o [`cheerio`](https://cheerio.js.org/).

## Instalar

**pnpm**

```sh
pnpm add sigaa-client
```

**npm**

```sh
npm install sigaa-client
```

**yarn**

```sh
yarn add sigaa-client
```

Sem projeto ainda?

```sh
mkdir meu-projeto && cd meu-projeto
npm init -y            # ou: pnpm init
npm install sigaa-client
```

## Credenciais

Nunca coloque usuário e senha no código. Use variáveis de ambiente:

```sh
export SIGAA_USERNAME="seu-usuario"
export SIGAA_PASSWORD="sua-senha"
```

Com Node 20.6+ você pode usar um arquivo `.env` (**fora do Git**):

```sh
node --env-file=.env script.mjs
```

## ESM, CommonJS e TypeScript

O pacote publica ESM e CJS, com declarações `.d.ts` para ambos.

```js
// ESM
import { SigaaClient } from 'sigaa-client';
```

```js
// CommonJS
const { SigaaClient } = require('sigaa-client');
```

```ts
// TypeScript: os tipos acompanham o pacote
import { SigaaClient, type GradeReport } from 'sigaa-client';
```

## Verificar a instalação

```sh
node -e "const { VERSION, DEFAULT_BASE_URL } = require('sigaa-client'); console.log(VERSION, DEFAULT_BASE_URL)"
# 0.1.0 https://sig.ufsj.edu.br
```
