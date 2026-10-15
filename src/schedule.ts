/** Horário de uma turma em um dia: `day` segue o SIGAA (2 = segunda ... 7 = sábado). */
export interface Slot {
  day: number;
  /** `HH:MM`. */
  start: string;
  /** `HH:MM`. */
  end: string;
}

/** Grade de tempos da UFSJ (índice 0 = tempo 1), conforme o quadro de horários do SIGAA. */
const PERIODS: Record<string, [string, string][]> = {
  M: [
    ['07:05', '08:00'],
    ['08:00', '08:55'],
    ['08:55', '09:50'],
    ['10:00', '10:55'],
    ['10:55', '11:50'],
    ['11:50', '12:45']
  ],
  T: [
    ['13:15', '14:10'],
    ['14:10', '15:05'],
    ['15:15', '16:10'],
    ['16:10', '17:05'],
    ['17:05', '18:00'],
    ['18:00', '18:55']
  ],
  N: [
    ['19:00', '19:55'],
    ['19:55', '20:50'],
    ['21:00', '21:55'],
    ['21:55', '22:50']
  ]
};

/**
 * Converte o código SIGAA (`2T34 3T56`: dias, turno, tempos) em horários. Tempos seguidos
 * viram um só bloco (`35N34` → 21:00–22:50); blocos que não existem na grade são ignorados.
 */
export function parseSchedule(code: string): Slot[] {
  const slots: Slot[] = [];
  for (const token of code.split(/\s+/)) {
    // Ancorada por token: sem backtracking quadrático em entradas longas.
    const [, days = '', shift = '', periods = ''] = /^([2-7]+)([MTN])(\d+)$/.exec(token) ?? [];
    const grid = PERIODS[shift] ?? [];
    const times = Array.from(periods, (p) => grid[Number(p) - 1]);
    // ponytail: assume tempos em ordem crescente e consecutivos; ceiling = códigos com buracos (ex.: 135)
    const first = times[0];
    const last = times[times.length - 1];
    if (!first || !last) continue;
    for (const day of days) slots.push({ day: Number(day), start: first[0], end: last[1] });
  }
  return slots;
}

/** Dígitos iniciais da turma (`01A` → `01`), para o consumidor cruzar fontes; `section` cru não muda. */
export const sectionBase = (section: string): string => /^\d*/.exec(section)?.[0] ?? '';
