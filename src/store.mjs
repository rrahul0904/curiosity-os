import { readFile, writeFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export class JsonStore {
  constructor(path) { this.path = path; this.queue = Promise.resolve(); }
  async read() { return JSON.parse(await readFile(this.path, 'utf8')); }
  async mutate(mutator) {
    const run = async () => {
      const state = await this.read();
      const result = await mutator(state);
      const tmp = `${this.path}.${process.pid}.tmp`;
      await writeFile(tmp, JSON.stringify(state, null, 2));
      await rename(tmp, this.path);
      return result;
    };
    this.queue = this.queue.then(run, run);
    return this.queue;
  }
  id(prefix) { return `${prefix}_${randomUUID().slice(0, 8)}`; }
}
