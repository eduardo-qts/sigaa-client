<div align="center">

<img src="assets/sigaa.png" alt="Logo do SIGAA" height="110" />
&nbsp;&nbsp;&nbsp;&nbsp;
<img src="assets/ufsj.png" alt="Logo da UFSJ" height="110" />

# sigaa-client

**Cliente TypeScript para o SIGAA da UFSJ: perfil, turmas, notas, frequência, materiais e mais.**

[![CI](https://github.com/eduardo-qts/sigaa-client/actions/workflows/ci.yml/badge.svg)](https://github.com/eduardo-qts/sigaa-client/actions/workflows/ci.yml)
[![Security](https://github.com/eduardo-qts/sigaa-client/actions/workflows/security.yml/badge.svg)](https://github.com/eduardo-qts/sigaa-client/actions/workflows/security.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/eduardo-qts/sigaa-client/badge)](https://scorecard.dev/viewer/?uri=github.com/eduardo-qts/sigaa-client)
[![npm](https://img.shields.io/npm/v/sigaa-client?logo=npm&color=cb3837)](https://www.npmjs.com/package/sigaa-client)
[![Node](https://img.shields.io/node/v/sigaa-client?logo=node.js&color=339933)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-estrito-3178c6?logo=typescript&logoColor=white)](docs/referencia-api.md)
[![Dependências](https://img.shields.io/badge/depend%C3%AAncias%20de%20produ%C3%A7%C3%A3o-1-brightgreen)](package.json)
[![Dependabot](https://img.shields.io/badge/dependabot-ativo-025e8c?logo=dependabot)](.github/dependabot.yml)
[![Licença: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-blue)](LICENSE)

[Instalação](docs/instalacao.md) · [Primeiros passos](docs/primeiros-passos.md) · [Guias](docs/README.md) · [Referência da API](docs/referencia-api.md) · [Segurança](SECURITY.md)

</div>

> [!IMPORTANT]
> Biblioteca **não oficial**, sem qualquer vínculo com a UFSJ ou com o SIGAA. Os logos acima pertencem às respectivas instituições e identificam apenas o sistema a que a biblioteca se refere. Use **somente a sua própria conta**: a biblioteca faz apenas leitura e não contorna CAPTCHA, MFA ou bloqueios.

## Por que usar

- **Feita para a UFSJ**: `new SigaaClient()` já aponta para `sig.ufsj.edu.br`, sem configuração.
- **Leve e moderna**: Node 20+, `fetch` nativo, ESM e CJS, tipos TypeScript estritos e **uma única dependência de produção** (`cheerio`).
- **Robusta**: navegação serializada por sessão (o SIGAA guarda a "turma atual" no servidor), retentativas apenas em GET, timeouts, erros tipados e detecção de sessão expirada.
- **Segura**: cookies restritos ao domínio, downloads com nome de arquivo sanitizado, CPF de colegas descartado, auditoria contínua do pipeline.
- **Testada**: dezenas de testes offline (SIGAA falso + fixtures sintéticas) e testes de integração opcionais contra o sistema real.

## Instalação

Requer **Node.js 20+** para usar a biblioteca.

**pnpm**

```sh
pnpm add sigaa-client
```

**npm**

```sh
npm install sigaa-client
```

<details>
<summary>yarn ou projeto novo</summary>

```sh
yarn add sigaa-client
```

Sem projeto ainda? `mkdir meu-projeto && cd meu-projeto && npm init -y && npm install sigaa-client` (ou `pnpm init && pnpm add sigaa-client`).

</details>

## Uso rápido

Guarde as credenciais em variáveis de ambiente, **nunca no código**:

```sh
export SIGAA_USERNAME="seu-usuario"
export SIGAA_PASSWORD="sua-senha"
```

```ts
import { SigaaClient } from 'sigaa-client'; // CommonJS: const { SigaaClient } = require('sigaa-client');

const client = new SigaaClient(); // UFSJ por padrão

await client.login({
  username: process.env.SIGAA_USERNAME!,
  password: process.env.SIGAA_PASSWORD!
});

try {
  const profile = await client.getProfile();
  console.log(`${profile.name} - ${profile.program}`);

  for (const course of await client.getCourses()) {
    const attendance = await course.getAttendance();
    const grades = await course.getGrades();
    console.log(
      `${course.code} ${course.name}: ${attendance.totalAbsences} falta(s), ` +
        `resultado ${grades.finalGrade ?? 'ainda sem nota final'}`
    );
  }
} finally {
  await client.logout();
}
```

Mais exemplos executáveis em [`examples/`](examples): `pnpm exec tsx examples/basic.ts`.

## O que dá para fazer

| Recurso                   | Como                                                       |
| ------------------------- | ---------------------------------------------------------- |
| Login e logout            | `client.login({ username, password })` · `client.logout()` |
| Perfil e índices (IRA…)   | `client.getProfile()`                                      |
| Turmas                    | `client.getCourses({ period?: '2026.2' \| 'all' })`        |
| Frequência                | `course.getAttendance()`                                   |
| Notas por unidade         | `course.getGrades()`                                       |
| Arquivos e download       | `course.getFiles()` · `file.download(pasta)`               |
| Aulas                     | `course.getLessons()`                                      |
| Notícias                  | `course.getNews()` · `news.read()`                         |
| Participantes             | `course.getMembers()`                                      |
| Plano de curso            | `course.getSyllabus()`                                     |
| Busca pública de docentes | `client.teachers.search({ name })`                         |

## Erros

Todos os erros herdam de `SigaaError` e têm um `code` estável:

```ts
import { AuthenticationError, SessionExpiredError, SigaaError } from 'sigaa-client';

try {
  await client.getProfile();
} catch (error) {
  if (error instanceof SessionExpiredError) {
    // faça login novamente
  } else if (error instanceof SigaaError) {
    console.error(error.code, error.message); // NETWORK, TIMEOUT, UNEXPECTED_PAGE, ...
  }
}
```

Veja [Tratamento de erros](docs/erros.md).

## Estado de validação

Validado em **integração real, somente leitura**, com uma conta de aluno de graduação (outubro/2026):

| Recurso                                                                | Estado           |
| ---------------------------------------------------------------------- | ---------------- |
| Login, logout e credenciais inválidas                                  | ✅ validado      |
| Perfil, turmas (todos os períodos), frequência, notas, participantes   | ✅ validado      |
| Notícias (com conteúdo), aulas, plano de curso, arquivos e download    | ✅ validado      |
| Busca pública de docentes                                              | ✅ validado      |
| Perfis que não abrem no portal do discente (docente, vínculo múltiplo) | ❌ não suportado |
| Atividades, tarefas, questionários, fóruns, enquetes e troca de senha  | ❌ não suportado |

Detalhes e particularidades do SIGAA da UFSJ: [docs/ufsj.md](docs/ufsj.md).

## Segurança

- Credenciais e cookies **nunca** são registrados em logs nem aparecem em mensagens de erro.
- Cookies ficam restritos ao domínio que os emitiu; redirecionamentos HTTPS→HTTP são bloqueados.
- O nome de arquivo enviado pelo servidor é sanitizado: um download nunca escapa do diretório de destino.
- O "usuário" (CPF) de colegas e docentes é descartado.
- Pipeline a cada alteração: `pnpm audit` (produção), **CodeQL**, **Gitleaks**, revisão de dependências, **OpenSSF Scorecard** e Dependabot. Pacotes publicados com **provenance**.
- Para reportar uma vulnerabilidade: [SECURITY.md](SECURITY.md).

## Desenvolvimento

```sh
git clone https://github.com/eduardo-qts/sigaa-client.git && cd sigaa-client
pnpm install
pnpm verify          # typecheck + lint + formatação + testes + build
```

Usando npm? `npm install -g pnpm` (ou `corepack enable`) e siga os mesmos comandos.
Testes de integração (opcionais): `SIGAA_USERNAME=... SIGAA_PASSWORD=... pnpm test:integration`.
Guia completo em [CONTRIBUTING.md](CONTRIBUTING.md) e arquitetura em [docs/arquitetura.md](docs/arquitetura.md).

## Licença

[MIT](LICENSE) © 2026 Eduardo Quirino.
