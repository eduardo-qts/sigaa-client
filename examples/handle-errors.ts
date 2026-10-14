// Tratamento de erros tipados e de sessão expirada.
import { AuthenticationError, SessionExpiredError, SigaaClient, SigaaError } from 'sigaa-client';
import { requireEnv } from './_env.js';

async function run(): Promise<void> {
  const client = new SigaaClient({ timeoutMs: 20_000 });
  try {
    await client.login({
      username: requireEnv('SIGAA_USERNAME'),
      password: requireEnv('SIGAA_PASSWORD')
    });
    console.log((await client.getProfile()).name);
  } catch (error) {
    if (error instanceof AuthenticationError) console.error('Usuário ou senha incorretos.');
    else if (error instanceof SessionExpiredError)
      console.error('Sessão expirada: faça login de novo.');
    else if (error instanceof SigaaError) console.error(`[${error.code}] ${error.message}`);
    else throw error;
    process.exitCode = 1;
  } finally {
    if (client.isAuthenticated) await client.logout();
  }
}

await run();
