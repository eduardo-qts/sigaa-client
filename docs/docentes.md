# Busca pública de docentes

Não exige login.

```ts
import { SigaaClient } from 'sigaa-client';

const client = new SigaaClient();

const units = await client.teachers.listUnits(); // [{ id, name }]; o primeiro é { id: '0', name: '-- TODOS --' }
const results = await client.teachers.search({ name: 'silva', unitId: units[0]!.id });

for (const teacher of results) {
  console.log(teacher.name, '-', teacher.department);
}
```

`search` aceita `{ name?: string; unitId?: string }`. Sem filtros, busca em todas
as unidades.

Cada `TeacherResult` tem `name`, `department`, `photoUrl?` e `profileUrl?`.

## Limitação

**E-mail e página pública do docente não estão disponíveis**: o link
`/sigaa/public/docente/portal.jsf?siape=...` responde com a página de erro do
próprio SIGAA, mesmo com cookie de sessão e `Referer` (testado também com
`curl`). Por isso a biblioteca não expõe e-mail nesta busca; `profileUrl` é só o
link como o SIGAA o fornece.
