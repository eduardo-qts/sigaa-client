import { describe, expect, it } from 'vitest';
import { SerialQueue } from '../../src/util/queue.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('SerialQueue', () => {
  it('executa tarefas em série, na ordem de chegada', async () => {
    const queue = new SerialQueue();
    const events: string[] = [];
    const task = (name: string, ms: number) => async () => {
      events.push(`${name}:início`);
      await sleep(ms);
      events.push(`${name}:fim`);
      return name;
    };
    const results = await Promise.all([
      queue.run(task('a', 20)),
      queue.run(task('b', 1)),
      queue.run(task('c', 1))
    ]);
    expect(results).toEqual(['a', 'b', 'c']);
    expect(events).toEqual(['a:início', 'a:fim', 'b:início', 'b:fim', 'c:início', 'c:fim']);
  });

  it('uma falha não trava as tarefas seguintes', async () => {
    const queue = new SerialQueue();
    const failing = queue.run(() => Promise.reject(new Error('falhou')));
    const next = queue.run(() => Promise.resolve('ok'));
    await expect(failing).rejects.toThrow('falhou');
    await expect(next).resolves.toBe('ok');
  });
});
