import { PackageCommand } from './command';

export class DevCommand extends PackageCommand {
  static override paths = [['dev'], ['d']];

  async execute() {
    const args = [];

    if (this.deps) {
      args.push('--deps', '--wait-deps');
    }

    args.push(this.package, 'dev');

    await this.cli.run(args);
  }
}
