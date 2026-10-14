// Últimas notícias de cada turma, com o texto da mais recente.
import { SigaaClient } from 'sigaa-client';
import { requireEnv } from './_env.js';

const client = new SigaaClient();
await client.login({
  username: requireEnv('SIGAA_USERNAME'),
  password: requireEnv('SIGAA_PASSWORD')
});

try {
  for (const course of await client.getCourses()) {
    const news = await course.getNews();
    console.log(`\n${course.code}: ${news.length} notícia(s)`);
    const latest = news[0];
    if (latest) {
      const content = await latest.read();
      console.log(`  ${latest.title}\n  ${content.text.slice(0, 200)}`);
    }
  }
} finally {
  await client.logout();
}
