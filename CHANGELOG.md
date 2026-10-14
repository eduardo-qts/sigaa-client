# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/); versionamento semântico.

## [0.1.0] - 2026-10-14

Primeira versão: biblioteca escrita do zero, focada no SIGAA da UFSJ.

### Adicionado

- `SigaaClient` com login/logout, perfil, turmas por período, e por turma: frequência, notas,
  participantes, notícias (com conteúdo), aulas, plano de curso e arquivos (com download seguro).
- Busca pública de docentes (`client.teachers`).
- Erros tipados (`SigaaError` e subclasses com `code`).
- ESM + CJS com tipos TypeScript; única dependência de produção: `cheerio`.
- Navegação serializada por sessão, retentativas apenas para GET, timeout configurável.
- Suíte de testes offline (SIGAA falso + fixtures sintéticas) e testes de integração opcionais.
- Pipeline: CI (Node 20/22/24), auditoria, CodeQL, Gitleaks, Scorecard, release com provenance.
