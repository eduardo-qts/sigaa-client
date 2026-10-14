import { buildFormRequest } from './jsf/form.js';
import { parseTeacherResults, parseTeacherUnits } from './parsers/teachers.js';
import type { TeacherResult, TeacherUnit } from './parsers/teachers.js';
import type { Session } from './session.js';

const SEARCH_PATH = '/sigaa/public/docente/busca_docentes.jsf';
const FORM = 'form[name="form"]';

export interface TeacherSearchOptions {
  /** Parte do nome do docente. */
  name?: string;
  /** Filtro por unidade (`TeacherUnit.id`). Omitido ou `'0'` busca em todas. */
  unitId?: string;
}

/** Busca pública de docentes. Não exige login. */
export class TeacherDirectory {
  constructor(private readonly session: Session) {}

  /** Unidades disponíveis como filtro (a primeira, `id: '0'`, representa "todas"). */
  listUnits(): Promise<TeacherUnit[]> {
    return this.session.queue.run(async () =>
      parseTeacherUnits(await this.session.get(SEARCH_PATH))
    );
  }

  /** Busca docentes pelo nome e/ou unidade. */
  search({ name = '', unitId = '0' }: TeacherSearchOptions = {}): Promise<TeacherResult[]> {
    return this.session.queue.run(async () => {
      const form = await this.session.get(SEARCH_PATH);
      const result = await this.session.send(
        buildFormRequest(form, FORM, {
          'form:nome': name,
          'form:departamento': unitId,
          'form:buscar': 'Buscar'
        })
      );
      return parseTeacherResults(result);
    });
  }
}
