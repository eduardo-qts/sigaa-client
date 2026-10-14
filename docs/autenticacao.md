# Autenticação e sessão

## Fluxo

`client.login({ username, password })` faz:

1. `GET /sigaa/verTelaLogin.do` — recebe o cookie de sessão (`JSESSIONID`);
2. lê o formulário `form[name="loginForm"]` e mantém os campos ocultos dele;
3. preenche `user.login` e `user.senha` e envia o `POST` (a senha segue codificada
   em **ISO-8859-1**, como o SIGAA espera, então acentos funcionam);
4. segue os redirecionamentos até a página inicial;
5. confirma que caiu no portal do discente (`/portais/discente/`).

Não há CAPTCHA nem MFA no fluxo validado. Se a UFSJ passar a exigir algum
deles, a biblioteca **não tenta contornar**: o login falhará.

```ts
await client.login({ username, password });
console.log(client.isAuthenticated); // true
```

## Erros de login

| Situação                                 | Erro                                  |
| ---------------------------------------- | ------------------------------------- |
| Usuário ou senha vazios                  | `AuthenticationError` (sem ir à rede) |
| Credenciais recusadas                    | `AuthenticationError`                 |
| Tela de login devolvida sem a mensagem   | `UnexpectedPageError`                 |
| Conta que não abre no portal do discente | `UnsupportedError`                    |

```ts
import { AuthenticationError } from 'sigaa-client';

try {
  await client.login({ username, password });
} catch (error) {
  if (error instanceof AuthenticationError) console.error('Usuário ou senha inválidos.');
  else throw error;
}
```

Evite repetir tentativas em loop: o SIGAA pode bloquear a conta.

## Sessão expirada

Se o SIGAA encerrar a sessão (inatividade), a próxima chamada lança
`SessionExpiredError`. Crie outra instância e faça login de novo:

```ts
import { SigaaClient } from 'sigaa-client';

async function withSession<T>(use: (client: SigaaClient) => Promise<T>): Promise<T> {
  const client = new SigaaClient();
  await client.login({
    username: process.env.SIGAA_USERNAME!,
    password: process.env.SIGAA_PASSWORD!
  });
  try {
    return await use(client);
  } finally {
    await client.logout().catch(() => undefined);
  }
}

const profile = await withSession((client) => client.getProfile());
```

Recursos autenticados chamados antes do login lançam `NotAuthenticatedError`.

## Logout

`await client.logout()` abre `/sigaa/logar.do?dispatch=logOff`, marca a sessão
como encerrada e **descarta os cookies locais**, mesmo que a requisição falhe.

## Boas práticas

- Credenciais só em variáveis de ambiente ou cofre de segredos.
- Reaproveite a sessão em vez de fazer login a cada operação.
- Não registre cookies, senhas ou dados acadêmicos em logs.
