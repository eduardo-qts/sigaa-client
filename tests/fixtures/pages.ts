/**
 * HTML sintético que reproduz a estrutura observada no SIGAA da UFSJ.
 * Todos os dados são fictícios. NUNCA cole aqui HTML real de uma conta.
 */

const jsf = (formId: string, params: Record<string, string>, target = ''): string => {
  const body = Object.entries(params)
    .map(([k, v]) => `'${k}':'${v}'`)
    .join(',');
  return `if(typeof jsfcljs == 'function'){jsfcljs(document.getElementById('${formId}'),{${body}},'${target}');}return false`;
};

/** Variante com funções antes do `if` (formato visto na listagem de turmas). */
const jsfPrefixed = (formId: string, params: Record<string, string>): string =>
  `var a=function(){return prevenirDuploClique();};var b=function(){${jsf(formId, params).replace('return false', '')}return false};return (a()==false) ? false : b();`;

const page = (body: string): string =>
  `<!DOCTYPE html><html><head><title>SIGAA</title></head><body>${body}</body></html>`;

export const loginPage = (): string =>
  page(`<h3> Entrar no Sistema </h3>
<form name="loginForm" method="post" action="/sigaa/logar.do;jsessionid=ABC.sigaa01?dispatch=logOn">
  <input type="hidden" name="width" value="0" />
  <input type="hidden" name="urlRedirect" value="" />
  <input type="text" name="user.login" value="" />
  <input type="password" name="user.senha" value="" />
  <input type="submit" value="Entrar" />
</form>`);

export const loginInvalidPage = (): string =>
  page(`<ul class="erros"><li>Usuário e/ou senha inválidos</li></ul>${loginPage()}`);

export const portalPage = (): string =>
  page(`<div id="info-usuario"><p class="periodo-atual">Semestre atual: <strong>2026.2</strong></p>
<p class="usuario"><span title="MARIA E. EXEMPLO">MARIA E. EXEMPLO</span></p></div>
<div id="perfil-docente">
 <div class="pessoal-docente"><div class="foto"><img src="https://arquivos.example.org/foto.jpg" /></div></div>
 <p class="info-docente"><span class="nome"><small><b>MARIA EXEMPLO DA SILVA</b></small></span></p>
 <table>
  <tr><td>Matrícula:</td><td>2020000001</td></tr>
  <tr><td valign="top">Curso:</td><td>Engenharia Exemplo/DEPTO - Campus - Bacharelado -
    N</td></tr>
  <tr><td>Nível:</td><td>GRADUAÇÃO</td></tr>
  <tr><td>Status:</td><td>ATIVO</td></tr>
  <tr><td>E-Mail Institucional:</td><td>maria@example.org</td></tr>
  <tr><td>Entrada:</td><td>2020.1</td></tr>
  <tr><td colspan="2" style="text-align:center">Índices Acadêmicos</td></tr>
  <tr><td colspan="2"><table width="100%">
    <tr><td><acronym title="Média de Conclusão">MC:</acronym></td><td align="right"><div>7.5</div></td>
        <td><acronym title="Índice de Rendimento Acadêmico">IRA:</acronym></td><td align="right"><div>7.25</div></td></tr>
  </table></td></tr>
  <tr><td colspan="2"><i><center>Integralizações:</center></i><table>
    <tr><td>CH. Obrigatória Pendente</td><td align="right">1000</td></tr>
    <tr><td>CH. Optativa Pendente</td><td align="right">200</td></tr>
    <tr><td>CH. Total Currículo</td><td align="right">3600</td></tr>
    <tr><td>CH. Complementar Pendente</td><td align="right">80</td></tr>
    <tr><td colspan="2" align="center">48% Integralizado</td></tr>
  </table></td></tr>
 </table>
</div>`);

export interface CourseSpec {
  code: string;
  name: string;
  section?: string;
  period: string;
  hours?: number;
  schedule?: string;
}

export const COURSES: CourseSpec[] = [
  { code: 'AAA0001', name: 'ALGORITMOS - PARTE I', period: '2026.2', hours: 60, schedule: '35N34' },
  { code: 'AAA0002', name: 'CIRCUITOS', period: '2026.2', hours: 90 },
  { code: 'AAA0003', name: 'CÁLCULO', period: '2025.1', hours: 60, schedule: '24M12' }
];

export const coursesPage = (courses: CourseSpec[] = COURSES, token = 'T'): string => {
  let currentPeriod = '';
  const rows = courses
    .map((course) => {
      const header =
        course.period === currentPeriod
          ? ''
          : `<tr class="destaque"><td class="periodo" colspan="6">${course.period}</td></tr>`;
      currentPeriod = course.period;
      const link = jsfPrefixed('formCursos', {
        'formCursos:j_id_9': 'formCursos:j_id_9',
        frontEndIdTurma: `${token}-${course.code}`
      });
      return `${header}<tr class="linhaPar"><td>${course.code} - ${course.name}</td>
        <td align="center">${course.section ?? '01'}</td><td align="right">${course.hours ?? 60}h</td>
        <td align="center">${course.schedule ?? ''}</td>
        <td><a href="#" title="Acessar Turma Virtual" onclick="${link}"></a></td></tr>`;
    })
    .join('');
  return page(`<form id="formCursos" name="formCursos" method="post" action="/sigaa/portais/discente/turmas.jsf">
<input type="hidden" name="formCursos" value="formCursos" />
<input type="hidden" name="javax.faces.ViewState" value="j_id2" />
<table class="listagem"><caption>Todas as Turmas Virtuais (${courses.length})</caption><tbody>
<thead><tr><th>Disciplina</th><th>Turma</th><th>CH Total</th><th>Horário</th><th> </th></tr></thead>
${rows}<tr><td colspan="5" align="center"> </td></tr>
</tbody></table></form>`);
};

export const MENU_KEYS = {
  Principal: 'k1',
  'Plano de Curso': 'k2',
  Participantes: 'k3',
  Notícias: 'k4',
  Frequência: 'k5',
  'Ver Notas': 'k6',
  Arquivos: 'k7'
} as const;

/** Página de uma turma virtual: cabeçalho com o código + menu lateral + corpo da seção. */
export const courseSection = (code: string, body = ''): string =>
  page(`<p id="linkCodigoTurma">${code} - </p>
<form id="formMenu" name="formMenu" method="post" action="/sigaa/ava/index.jsf">
 <input type="hidden" name="formMenu" value="formMenu" />
 <input type="hidden" name="formMenu:panel" value="formMenu:x" />
 <input type="hidden" name="javax.faces.ViewState" value="j_id4" />
 ${Object.entries(MENU_KEYS)
   .map(
     ([label, key]) =>
       `<a href="#" onclick="${jsf('formMenu', { [`formMenu:${key}`]: `formMenu:${key}` })}"><div class="itemMenu">${label}</div></a>`
   )
   .join('')}
</form>${body}`);

export const lessonsBody = (): string => `
<span id="formAva:1:aulas"><div class="topico-aula">
  <div class="titulo">Introdução ao curso (10/08/2026 - 10/08/2026)</div>
  <div class="conteudotopico"><div class="drag_indicator"></div>Leitura inicial recomendada.
    <div class="item"><span><a href="#" onclick="${jsf('formAva', { id: '7' })}">Lista 01</a></span>
      <div class="descricao-item"><span>Exercícios</span></div></div>
  </div></div>
  <div class="topico-aula"><div class="titulo">Não haverá aula (12/08/2026)</div>
  <div class="conteudotopico"></div></div></span>`;

export const attendanceBody = (): string => `
<table class="listing"><thead><tr><th>Data</th><th>Situação</th></tr></thead><tbody>
<tr class="linhaPar"><td class="first">10/08/2026</td><td><span style="color:red">Não Registrada</span></td></tr>
<tr class="linhaImpar"><td class="first">12/08/2026</td><td>2 Falta(s)</td></tr>
<tr class="linhaPar"><td class="first">14/08/2026</td><td>Presente</td></tr>
<tr class="linhaImpar"><td class="first">17/08/2026</td><td>1 Falta(s)</td></tr>
</tbody></table>
<div class="botoes-show">
 <b>Presenças Registradas:</b> 25<br/><br/>
 <span><b>Número de Aulas com Registro de Frequência:</b> 33</span><br/>
 <b>Porcentagem de Frequência em relação as Aulas com Registro de Frequência:</b> 75%<br/>
 <b>Número de Aulas definidas pela CH do Componente:</b> 65<br/>
 <span style="display:block">Porcentagem de Frequência em relação a CH: 38%</span>
</div>`;

export const gradesPage = (code: string): string =>
  page(`<div id="relatorio"><input type="hidden" id="tipoUnid1" value="S"/>
<h3>${code} - ALGORITMOS (60h) - Turma: 01 (2026.2)</h3>
<table class="tabelaRelatorio"><caption>Alunos Matriculados</caption>
<thead>
 <tr><th>Matrícula</th><th>Nome</th><th colspan="3">Unid. 1</th><th>Reposição</th><th>Resultado</th><th>Faltas</th><th>Sit.</th></tr>
 <tr id="trAval"><th></th><th></th>
  <th id="aval_1">P1</th><input type="hidden" id="abrevAval_1" value="P1"/><input type="hidden" id="denAval_1" value="Primeira prova"/><input type="hidden" id="notaAval_1" value="5.0"/><input type="hidden" id="pesoAval_1" value="1"/>
  <th id="aval_2">TR</th><input type="hidden" id="abrevAval_2" value="TR"/><input type="hidden" id="denAval_2" value="Trabalho"/><input type="hidden" id="notaAval_2" value="5.0"/><input type="hidden" id="pesoAval_2" value="1"/>
  <th id="unid">Nota</th><th></th><th></th><th></th><th></th></tr>
</thead>
<tbody><tr class="linhaPar"><td>2020000001</td><td>MARIA EXEMPLO</td>
 <td> 3,5 </td><td> </td><td> 3,5 </td><td> </td><td> 3,5 </td><td> 4 </td><td> REP </td></tr></tbody>
</table></div>`);

export const noGradesPage = (code: string): string =>
  courseSection(code, '<div id="painel-erros"><ul class="warning"><li>Ainda não foram lançadas notas.</li></ul></div>');

export const membersBody = (): string => `
<fieldset><legend> Docentes (1)</legend></fieldset>
<table class="participantes"><tr class="odd">
 <td width="72"><img src="https://arquivos.example.org/prof.jpg" /></td>
 <td valign="top"><strong><a href="#">PROFESSOR EXEMPLO</a></strong> <br/>
  Departamento: <em>DEPARTAMENTO X</em> <br/>
  Formação: <em>DOUTORADO</em> <br/>
  Usuário: <em>00000000000</em> <br/>
  E-Mail: <em>prof@example.org</em> <br/>
  Turma(s): <em>01A 01B </em><br/></td></tr></table>
<fieldset><legend> Discentes (2)</legend></fieldset>
<table class="participantes">
 <tr><td colspan="4" class="subFormulario"></td></tr>
 <tr class="odd">
  <td width="47"><img src="/sigaa/img/no_picture.png"/></td>
  <td valign="top"><strong>ALUNO UM<a class="naoImprimir" href="#" onclick="A4J.AJAX.Submit()"><img src="/x.png"/></a></strong><br/>
   Curso: <em>Curso X </em><br/>
   Matrícula: <em>2020000002</em> <br/>
   Usuário: <em>00000000000 </em><br/>
   E-mail: <em>um@example.org </em><br/>
   Turma: <em>01B</em></td>
  <td width="47"><img src="/sigaa/img/no_picture.png"/></td>
  <td valign="top"><strong>ALUNO DOIS</strong><br/>
   Curso: <em>Curso X </em><br/>
   Matrícula: <em>2020000003</em> <br/>
   Usuário: <em>00000000000 </em><br/>
   E-mail: <em>dois@example.org </em><br/>
   Turma: <em>01A</em></td>
 </tr></table>`;

export const newsBody = (items: { title: string; date: string }[]): string =>
  items.length === 0
    ? ''
    : `<form id="formNews" action="/sigaa/ava/NoticiaTurma/listar.jsf" method="post">
<input type="hidden" name="formNews" value="formNews"/>
<table class="listing"><thead><tr><th><p>Título</p></th><th>Data</th><th></th></tr></thead><tbody>
${items
  .map(
    (item, i) =>
      `<tr class="even"><td class="first">${item.title}</td><td class="width75">${item.date}</td>
       <td class="icon"><a href="#" onclick="${jsf('formNews', { 'formNews:open': 'formNews:open', id: String(i + 1) })}"><img src="/x.png"/></a></td></tr>`
  )
  .join('')}</tbody></table></form>`;

export const newsDetailPage = (title: string): string =>
  page(`<fieldset><legend>Notícia</legend><ul class="form">
<li><label>Título:</label><span> ${title} </span></li>
<li><label>Data:</label><span> 01/10/2026 08:17 </span></li>
<li><table><tr><th>Texto: </th><td class="conteudoNoticia"><div><p>Primeiro parágrafo.</p><p>Segundo&nbsp;parágrafo.<br/>Linha nova.</p></div></td></tr></table></li>
</ul></fieldset>`);

export const filesBody = (files: { title: string; description: string; id: string }[]): string =>
  files.length === 0
    ? ''
    : `<form id="formAva" action="/sigaa/ava/index.jsf" method="post"><input type="hidden" name="formAva" value="formAva"/></form>
<table class="listing"><thead><tr><th>Título</th><th>Descrição</th><th>Tópico de Aula</th><th></th></tr></thead><tbody>
${files
  .map(
    (file) =>
      `<tr class="linhaPar"><td>${file.title}</td><td>${file.description}</td><td>Introdução ao curso</td>
      <td><a href="#" onclick="${jsf('formAva', { 'formAva:dl': 'formAva:dl', id: file.id }, '_blank')}"><img src="/x.png"/></a></td></tr>`
  )
  .join('')}</tbody></table>`;

export const syllabusBody = (): string => `
<table class="listagem"><caption>Metodologia de Ensino e Avaliação</caption><tbody>
 <tr><th>Metodologia:</th><td>Aulas expositivas.</td></tr>
 <tr><th>Procedimentos de Avaliação da Aprendizagem:</th><td>Duas provas.</td></tr>
 <tr><th>Horário de atendimento:</th><td>Quartas, 14h.</td></tr></tbody></table>
<table class="listagem"><caption>Programa</caption><tbody><tr><th>Programa atual do componente:</th><td></td></tr></tbody></table>
<table class="listagem"><caption>Cronograma de Aulas</caption><thead><tr><th>Início</th><th>Fim</th><th>Descrição</th></tr></thead><tbody>
 <tr><td>25/03/2025</td><td>25/03/2025</td><td>Apresentação</td></tr>
 <tr><td>27/03/2025</td><td></td><td>Revisão</td></tr></tbody></table>
<table class="listagem"><caption>Avaliações</caption><thead><tr><th>Data</th><th>Descrição</th></tr></thead><tbody>
 <tr><td>15/07/2025</td><td>1ª Avaliação</td></tr></tbody></table>
<table class="listagem"><caption>Referências Básicas</caption><thead><tr><th>Tipo de material</th><th>Descrição</th></tr></thead><tbody></tbody></table>
<table class="listagem"><caption>Referências Complementares</caption><thead><tr><th>Tipo de material</th><th>Descrição</th></tr></thead><tbody>
 <tr><td>Livro</td><td>AUTOR, Fulano. Título do livro.</td></tr></tbody></table>`;

export const noSyllabusBody = (): string =>
  '<div id="painel-erros"><ul class="warning"><li>Esta turma ainda não possui um plano cadastrado.</li></ul></div>';

export const teacherFormPage = (): string =>
  page(`<form name="form" method="post" action="/sigaa/public/docente/busca_docentes.jsf;jsessionid=XYZ">
<input type="hidden" name="form" value="form"/><input type="text" name="form:nome"/>
<select name="form:departamento"><option value="0">-- TODOS --</option><option value="10">DEPARTAMENTO A - Cidade</option></select>
<input type="submit" name="form:buscar" value="Buscar"/><input type="submit" name="form:cancelar" value="Cancelar"/>
<input type="hidden" name="javax.faces.ViewState" value="j_id1"/></form>`);

export const teacherResultsPage = (): string =>
  page(`<table class="listagem"><caption>Docentes encontrados (2)</caption><tbody>
<tr class="linhaPar topo"><td class="foto"><img src="https://arquivos.example.org/a.jpg"/></td><td><br/>
 <span class="nome">DOCENTE UM</span><span class="departamento">DEPARTAMENTO A</span>
 <span class="pagina"><a href="/sigaa/public/docente/portal.jsf?siape=1">ver página pública</a></span></td></tr>
<tr class="linhaImpar topo"><td class="foto"><img src="/sigaa/img/no_picture.png"/></td><td><br/>
 <span class="nome">DOCENTE DOIS</span><span class="departamento">DEPARTAMENTO B</span></td></tr></tbody></table>`);
