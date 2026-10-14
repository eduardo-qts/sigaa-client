# Particularidades da UFSJ

Observadas no SIGAA da UFSJ (v4.18.8), com uma conta de aluno de graduação.

## Comportamentos tratados

- **Login** sem CAPTCHA, em `/sigaa/verTelaLogin.do`, formulário `loginForm` (`user.login`, `user.senha`).
- **Links JSF**: o `onclick` pode vir com funções antes do `if (typeof jsfcljs ...)`; o parser procura a chamada `jsfcljs(...)` em qualquer posição.
- **Listagem de turmas**: cabeçalho com `<th>`, sem coluna "Alunos", linhas separadoras de uma célula, e id da turma em `frontEndIdTurma` (token por sessão).
- **Frequência**: a página não informa o máximo de faltas permitido; traz presenças registradas, aulas com registro, aulas pela carga horária e percentuais. Dias "Não Registrada" não entram.
- **Participantes**: legendas "Docentes" e "Discentes"; sem data de matrícula; o campo "Usuário" (CPF) é descartado.
- **Listas vazias**: notícias e arquivos sem itens aparecem como página da turma sem tabela; notas e plano sem dados trazem um aviso (`ul.warning`) na página da turma.
- **Notas**: tabela `tabelaRelatorio`, com tipo de cálculo da unidade em campos ocultos (`S` soma, `P` média ponderada, `A` média aritmética).
- **Download**: `POST` sem chave; o SIGAA responde `301` para `arquivos.ufsj.edu.br`, que recebe `GET` sem cookies.
- **Docente público**: a página `/sigaa/public/docente/portal.jsf?siape=...` devolve a página de erro do próprio SIGAA (por isso não há e-mail na busca).

## Estado de validação

Validado em **integração real, somente leitura**, conta de aluno de graduação, outubro/2026.

| Recurso                                                                | Estado                 |
| ---------------------------------------------------------------------- | ---------------------- |
| Login, logout, credencial inválida                                     | validado em integração |
| Perfil (curso, matrícula, índices, integralização)                     | validado em integração |
| Turmas de todos os períodos                                            | validado em integração |
| Frequência                                                             | validado em integração |
| Notas (parciais e finais)                                              | validado em integração |
| Participantes                                                          | validado em integração |
| Notícias e conteúdo                                                    | validado em integração |
| Aulas                                                                  | validado em integração |
| Plano de curso (com e sem plano)                                       | validado em integração |
| Arquivos e download                                                    | validado em integração |
| Busca de docentes                                                      | validado em integração |
| Chamadas concorrentes em turmas diferentes                             | validado em integração |
| Perfis que não abrem no portal do discente (docente, vínculo múltiplo) | **não suportado**      |
| Atividades, tarefas, questionários, fóruns, enquetes                   | **não suportado**      |
| Troca de senha                                                         | **não suportado**      |

Todos os parsers também têm testes unitários com HTML **sintético**.

## Limitações

- O SIGAA pode mudar o HTML sem aviso; nesse caso você recebe `UnexpectedPageError`.
- Não testado com outros perfis (docente, pós-graduação) nem com outros cursos além do validado.
- É uma camada sobre uma interface web: use com moderação e só com a sua conta.
