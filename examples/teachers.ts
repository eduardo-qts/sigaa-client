// Busca pública de docentes (não exige login).
//   pnpm exec tsx examples/teachers.ts silva
import { SigaaClient } from 'sigaa-client';

const client = new SigaaClient();
const name = process.argv[2] ?? 'silva';

const units = await client.teachers.listUnits();
console.log(`${units.length} unidades disponíveis`);

for (const teacher of (await client.teachers.search({ name })).slice(0, 10)) {
  console.log(`${teacher.name} - ${teacher.department}`);
}
