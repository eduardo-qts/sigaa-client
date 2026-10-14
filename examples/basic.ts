// Login, perfil e turmas do período mais recente.
//   SIGAA_USERNAME=... SIGAA_PASSWORD=... pnpm exec tsx examples/basic.ts
import { SigaaClient } from 'sigaa-client';
import { requireEnv } from './_env.js';

const client = new SigaaClient();
await client.login({
  username: requireEnv('SIGAA_USERNAME'),
  password: requireEnv('SIGAA_PASSWORD')
});

try {
  const profile = await client.getProfile();
  console.log(`${profile.name} - ${profile.program}`);

  for (const course of await client.getCourses()) {
    console.log(`${course.code} ${course.name} (${course.period}) ${course.schedule}`);
  }
} finally {
  await client.logout();
}
