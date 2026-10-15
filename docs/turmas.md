# Turmas

## Perfil

```ts
const profile = await client.getProfile();
profile.name; // nome completo
profile.registration; // matrícula
profile.program; // curso, sem o turno final
profile.shift; // 'M' | 'T' | 'N' (se informado)
profile.currentPeriod; // '2026.2'
profile.academicIndices; // [{ code: 'IRA', name?: string, value: number }]
profile.curriculum; // { requiredPendingHours?, optionalPendingHours?, complementaryPendingHours?, totalHours?, completionPercent? }
```

## Listar turmas

```ts
const current = await client.getCourses(); // período mais recente
const one = await client.getCourses({ period: '2025.1' });
const all = await client.getCourses({ period: 'all' });

const course = current[0];
if (!course) throw new Error('Nenhuma turma no período.');
course.code; // 'EMT0061'
course.name;
course.section; // '01'
course.period; // '2026.2'
course.workloadHours; // number | undefined
course.schedule; // '35N34' ou ''
```

Cada método de `Course` acessa o SIGAA. As chamadas são **serializadas**
internamente: pode usar `Promise.all` entre turmas diferentes com segurança
(veja [Arquitetura](arquitetura.md)).

## Frequência

```ts
const a = await course.getAttendance();
a.days; // [{ date: "AAAA-MM-DD", absences: number }] (0 = presente)
a.totalAbsences; // soma das faltas dos dias registrados
a.presencesRecorded; // opcionais, conforme a página:
a.classesWithRecord;
a.workloadClasses;
a.attendancePercent;
a.workloadAttendancePercent;
```

Dias "Não Registrada"/"Não Informada" ficam fora de `days`. A UFSJ não informa o
máximo de faltas permitido.

## Notas

```ts
const report = await course.getGrades();
for (const unit of report.units) {
  console.log(unit.name, unit.method, unit.value);
  for (const item of unit.assessments) console.log(item.code, item.value, item.maxValue);
}
report.makeUp; // nota da reposição
report.finalGrade; // resultado
report.absences;
report.situation; // 'APR', 'REP', ...
```

`unit.method` indica como o total da unidade é calculado:

| Valor                  | Significado         |
| ---------------------- | ------------------- |
| `'sum'`                | soma das avaliações |
| `'weighted-average'`   | média ponderada     |
| `'arithmetic-average'` | média aritmética    |
| `'unknown'`            | não identificado    |

Notas ainda não lançadas ficam `undefined`. Turma sem nenhuma nota devolve
`{ units: [] }`.

## Arquivos e download

```ts
const files = await course.getFiles();
for (const file of files) console.log(file.title, file.description, file.lessonTopic);

const result = await files[0]!.download('./downloads', {
  onProgress: (bytes, total) => console.log(bytes, total),
  overwrite: false // padrão: falha com EEXIST se o arquivo existir
});
console.log(result.path, result.filename, result.bytes);
```

`destination` é um diretório existente (o nome vem do servidor) ou o caminho
completo do arquivo. **O nome vindo do servidor é sanitizado**: separadores de
caminho, caracteres de controle e `<>:"|?*` são removidos, pontos iniciais caem
e o tamanho é limitado a 200 — nunca escapa do diretório. Erros de disco
(`EEXIST`, `ENOENT`) chegam como erros nativos do Node.

`file.open()` devolve a resposta com o corpo em _stream_ (`status`, `url`,
`headers`, `body`); quem chama deve consumir ou cancelar `body`.

## Aulas

```ts
const lessons = await course.getLessons();
// { title, startDate?, endDate?, content, items: [{ title, description }] }
```

## Notícias

```ts
const news = (await course.getNews())[0];
if (!news) throw new Error('A turma não tem notícias.');
console.log(news.title, news.date); // "AAAA-MM-DD"
const content = await news.read();
console.log(content.publishedAt, content.text); // content.html tem o HTML original
```

## Participantes

```ts
const { teachers, students } = await course.getMembers();
// teachers: { name, department?, formation?, email?, sections: string[], photoUrl? }
// students: { name, registration?, program?, email?, section?, photoUrl? }
```

> **Privacidade:** o SIGAA exibe o "usuário" (CPF) dos participantes. A
> biblioteca **descarta** esse campo de propósito. Não publique dados de colegas.

## Plano de curso

```ts
const syllabus = await course.getSyllabus();
// { methodology?, assessmentProcedures?, attendanceSchedule?, schedule, evaluations,
//   basicReferences, complementaryReferences }
```

Turma sem plano devolve listas vazias.
