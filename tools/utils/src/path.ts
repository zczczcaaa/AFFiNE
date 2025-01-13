import { existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path/posix';
import { fileURLToPath, pathToFileURL } from 'node:url';

export class Path {
  private readonly path: string;

  static dir(url: string) {
    return new Path(fileURLToPath(url)).join('..');
  }

  get value() {
    return this.path;
  }

  get relativePath() {
    return './' + this.path.slice(ProjectRoot.path.length).replace(/\\/g, '/');
  }

  constructor(path: string) {
    this.path = path.replaceAll('\\', '/');
  }

  join(...paths: string[]) {
    return new Path(join(this.path, ...paths));
  }

  parent() {
    return this.join('..');
  }

  toString() {
    return this.path;
  }

  exists() {
    return existsSync(this.path);
  }

  stats() {
    return statSync(this.path);
  }

  isFile() {
    return this.exists() && this.stats().isFile();
  }

  isDirectory() {
    return this.exists() && this.stats().isDirectory();
  }

  toFileUrl() {
    return pathToFileURL(this.path);
  }

  relative(to: string) {
    return relative(this.value, to);
  }
}

export const ProjectRoot = Path.dir(import.meta.url).join('../../../');
