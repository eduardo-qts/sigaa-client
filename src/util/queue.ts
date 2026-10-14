/**
 * Executa tarefas assíncronas uma de cada vez, na ordem de chegada.
 *
 * O SIGAA guarda no servidor a "turma atual" da sessão; navegar em duas turmas
 * ao mesmo tempo corromperia as respostas. Toda navegação passa por esta fila.
 */
export class SerialQueue {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.tail.then(task, task);
    this.tail = result.catch(() => undefined);
    return result;
  }
}
