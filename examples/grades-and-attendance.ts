// Notas e frequência de todas as turmas do período mais recente.
import { SigaaClient } from 'sigaa-client';
import { requireEnv } from './_env.js';

const client = new SigaaClient();
await client.login({
  username: requireEnv('SIGAA_USERNAME'),
  password: requireEnv('SIGAA_PASSWORD')
});

try {
  for (const course of await client.getCourses()) {
    const [grades, attendance] = [await course.getGrades(), await course.getAttendance()];
    console.log(`\n${course.code} - ${course.name}`);
    for (const unit of grades.units) {
      const lancadas = unit.assessments.filter((a) => a.value !== undefined).length;
      console.log(
        `  ${unit.name}: ${unit.value ?? '-'} (${lancadas}/${unit.assessments.length} lançadas)`
      );
    }
    console.log(
      `  Faltas: ${attendance.totalAbsences} | Frequência: ${attendance.attendancePercent ?? '-'}%`
    );
  }
} finally {
  await client.logout();
}
