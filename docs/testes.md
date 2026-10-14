# Testes, CI e auditoria

## Comandos

```sh
pnpm test               # unitários, offline
pnpm test:coverage      # com cobertura
pnpm test:integration   # contra o SIGAA real, somente leitura
pnpm verify             # typecheck + lint + formatação + testes + build
```

## Testes unitários

Ficam em `tests/unit/` e **não acessam a rede**. Eles usam:

- `tests/helpers/fake-sigaa.ts`: um SIGAA falso em memória, injetado pela opção `fetch`. Simula login, sessão por cookie, a "turma atual" do servidor, notícias, arquivos (com `301` para outro host), expiração de sessão (`expireSessions()`) e falhas 503 (`failNext()`).
- `tests/fixtures/pages.ts`: HTML **sintético** com a estrutura observada na UFSJ.

> **Regra:** nunca commite HTML real de uma conta (nomes, matrículas, CPF, e-mails, notas). Escreva fixtures do zero.

## Testes de integração

Opcionais; sem as variáveis, os testes que exigem login são ignorados.

```sh
SIGAA_USERNAME=seu-usuario SIGAA_PASSWORD=sua-senha pnpm test:integration
```

| Variável         | Uso                                            |
| ---------------- | ---------------------------------------------- |
| `SIGAA_USERNAME` | Usuário (obrigatória para os testes com login) |
| `SIGAA_PASSWORD` | Senha                                          |
| `SIGAA_BASE_URL` | Opcional; troca a URL base                     |

Rode com pouca frequência, só com a sua conta, e nunca em CI público. Nada é impresso.

## Pipeline (GitHub Actions)

| Workflow         | Quando                   | O que faz                                                                                   |
| ---------------- | ------------------------ | ------------------------------------------------------------------------------------------- |
| `ci.yml`         | push em `main` e PRs     | typecheck, lint, formatação, testes com cobertura, build, e instalação do pacote empacotado |
| `security.yml`   | push, PRs e semanal      | `pnpm audit` (todas as dependências), CodeQL, Gitleaks e _dependency review_ (nos PRs)      |
| `scorecard.yml`  | push em `main` e semanal | OpenSSF Scorecard                                                                           |
| `release.yml`    | tag `v*`                 | `pnpm verify` e publicação no npm com _provenance_ (segredo `NPM_TOKEN`)                    |
| `dependabot.yml` | semanal                  | PRs de atualização de dependências e de _actions_                                           |

## Auditoria local

```sh
pnpm audit         # todas as dependências, falha a partir de "moderate"
pnpm audit:prod    # só produção
```
