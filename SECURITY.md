# Política de segurança

## Versões suportadas

Apenas a versão mais recente publicada recebe correções de segurança.

## Como reportar uma vulnerabilidade

**Não abra uma issue pública.** Use o
[relato privado de vulnerabilidades](https://github.com/eduardo-qts/sigaa-client/security/advisories/new)
do GitHub. A primeira resposta ocorre em até 7 dias.

## Boas práticas ao usar a biblioteca

- Guarde usuário e senha em variáveis de ambiente ou em um cofre de segredos; nunca no código.
- Não registre em logs cookies de sessão, senhas, CPF ou dados acadêmicos.
- Use somente a sua própria conta. A biblioteca só faz leitura e não contorna CAPTCHA, MFA ou bloqueios.
- Evite chamadas em alta frequência: o SIGAA é um sistema institucional compartilhado.
- Os dados de colegas e docentes (nomes, matrículas, e-mails) são pessoais: não os publique.

## O que a biblioteca faz pela sua segurança

- Credenciais e cookies nunca são registrados em logs nem incluídos em mensagens de erro.
- Cookies ficam restritos ao domínio que os emitiu e só trafegam por HTTPS (atributo `Secure`).
- Redirecionamentos de HTTPS para HTTP são bloqueados, e há um limite de 10 redirecionamentos.
- Nomes de arquivo vindos do servidor são sanitizados: um download nunca escapa do diretório de destino.
- O "usuário" (CPF) de colegas e docentes exibido pelo SIGAA é descartado.
- Retentativas automáticas só ocorrem em GET; nunca em requisições que alteram estado.
- Uma única dependência de produção (`cheerio`), auditada a cada alteração (`pnpm audit`), além de CodeQL, Gitleaks, revisão de dependências, OpenSSF Scorecard e Dependabot.
- Pacotes publicados no npm com _provenance_ (build verificável a partir deste repositório).
