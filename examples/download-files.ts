// Baixa todos os arquivos de uma turma para ./downloads (existente).
//   SIGAA_COURSE=EMT0061 pnpm exec tsx examples/download-files.ts
import { mkdir } from 'node:fs/promises';
import { SigaaClient } from 'sigaa-client';
import { requireEnv } from './_env.js';

const client = new SigaaClient();
await client.login({
  username: requireEnv('SIGAA_USERNAME'),
  password: requireEnv('SIGAA_PASSWORD')
});

try {
  const code = requireEnv('SIGAA_COURSE');
  const course = (await client.getCourses({ period: 'all' })).find((c) => c.code === code);
  if (!course) throw new Error(`Turma ${code} não encontrada.`);

  await mkdir('downloads', { recursive: true });
  for (const file of await course.getFiles()) {
    const { filename, bytes } = await file.download('downloads', { overwrite: true });
    console.log(`${filename} (${bytes} bytes)`);
  }
} finally {
  await client.logout();
}
