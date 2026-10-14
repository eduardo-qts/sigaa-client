# Tratamento de erros

Todos os erros da biblioteca estendem `SigaaError`, com `code` estável e `path`
(caminho da página, sem query, cookies ou conteúdo). Erros de origem externa
trazem `cause`.

```
Error
└─ SigaaError              code, path?, cause?
   ├─ AuthenticationError       INVALID_CREDENTIALS
   ├─ NotAuthenticatedError     NOT_AUTHENTICATED
   ├─ SessionExpiredError       SESSION_EXPIRED
   ├─ NetworkError              NETWORK
   │  └─ TimeoutError           TIMEOUT
   ├─ UnexpectedPageError       UNEXPECTED_PAGE
   ├─ NotFoundError             NOT_FOUND
   ├─ AccessDeniedError         ACCESS_DENIED
   └─ UnsupportedError          UNSUPPORTED
```

| `code`                | Quando                                                        | O que fazer                           |
| --------------------- | ------------------------------------------------------------- | ------------------------------------- |
| `INVALID_CREDENTIALS` | Usuário/senha recusados (ou vazios)                           | Confira; não repita em loop           |
| `NOT_AUTHENTICATED`   | Recurso autenticado chamado sem login                         | Chame `login` antes                   |
| `SESSION_EXPIRED`     | SIGAA encerrou a sessão                                       | Novo `SigaaClient` e novo login       |
| `NETWORK`             | DNS, conexão, TLS, 5xx persistente, redirecionamento inseguro | Tente depois, com intervalo           |
| `TIMEOUT`             | Passou de `timeoutMs`                                         | Aumente o limite ou tente depois      |
| `UNEXPECTED_PAGE`     | HTML sem a estrutura esperada (o SIGAA pode ter mudado)       | Abra uma issue com o recurso e a data |
| `NOT_FOUND`           | Turma/notícia/arquivo não está mais na listagem, ou HTTP 404  | Liste de novo                         |
| `ACCESS_DENIED`       | HTTP 403                                                      | A conta não tem acesso ao recurso     |
| `UNSUPPORTED`         | Perfil que não abre no portal do discente                     | Não suportado                         |

`ALREADY_AUTHENTICATED` existe em `SigaaErrorCode`, reservado, e hoje não é lançado.

## Exemplo

```ts
import { AuthenticationError, NetworkError, SessionExpiredError, SigaaError } from 'sigaa-client';

try {
  const grades = await course.getGrades();
  console.log(grades.finalGrade);
} catch (error) {
  if (error instanceof SessionExpiredError) {
    // refaça o login
  } else if (error instanceof NetworkError) {
    // inclui TimeoutError: tente de novo mais tarde
    console.warn(error.code, error.path);
  } else if (error instanceof SigaaError) {
    switch (error.code) {
      case 'UNEXPECTED_PAGE':
        console.error('O SIGAA mudou? Reporte:', error.path);
        break;
      default:
        throw error;
    }
  } else {
    throw error; // erros de disco, por exemplo
  }
}
```

`error instanceof AuthenticationError` também funciona no login.
