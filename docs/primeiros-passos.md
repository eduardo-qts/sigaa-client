# Primeiros passos

`new SigaaClient()` já aponta para `https://sig.ufsj.edu.br`. Uma instância é
uma sessão.

```ts
import { SigaaClient } from 'sigaa-client';

const client = new SigaaClient();

await client.login({
  username: process.env.SIGAA_USERNAME!,
  password: process.env.SIGAA_PASSWORD!
});

try {
  const profile = await client.getProfile();
  console.log(profile.program, profile.currentPeriod);

  // Turmas do período mais recente; use { period: 'all' } para todas.
  for (const course of await client.getCourses()) {
    const attendance = await course.getAttendance();
    console.log(`${course.code} - ${course.name}: ${attendance.totalAbsences} falta(s)`);
  }
} finally {
  await client.logout();
}
```

## Opções do construtor

```ts
new SigaaClient({
  baseUrl: 'https://sig.ufsj.edu.br', // padrão
  timeoutMs: 30_000, // por requisição
  retries: 2, // tentativas extras, somente para GET
  retryDelayMs: 300, // dobra a cada tentativa
  userAgent: 'meu-app/1.0',
  fetch: globalThis.fetch // injetável (testes, proxies)
});
```

## Próximos passos

- [Turmas](turmas.md)
- [Erros](erros.md)
