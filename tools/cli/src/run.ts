import { Path } from '@affine-tools/utils/path';
import { execAsync } from '@affine-tools/utils/process';
import type { Package, PackageName } from '@affine-tools/utils/workspace';

import { Option, PackageCommand } from './command';

interface RunScriptOptions {
  includeDependencies?: boolean;
  waitDependencies?: boolean;
  ignoreIfNotFound?: boolean;
}

const currentDir = Path.dir(import.meta.url);

const ignoreLoaderScripts = [
  'vitest',
  'vite',
  'ts-node',
  'prisma',
  'cap',
  'tsc',
  /electron(?!-)/,
];

export class RunCommand extends PackageCommand {
  static override paths = [[], ['run'], ['r']];

  static override usage = PackageCommand.Usage({
    description: 'AFFiNE Monorepo scripts',
    details: `
      \`affine web <script>\`    Run any script defined in package's package.json

      \`affine codegen\`         Generate the required files if there are any package added or removed

      \`affine clean\`           Clean the output files of ts, cargo, webpack, etc.

      \`affine bundle\`          Bundle the packages

      \`affine build\`           A proxy for <-p package>'s \`build\` script

      \`affine dev\`             A proxy for <-p package>'s \`dev\` script
    `,
    examples: [
      [`See detail of each command`, '$0 -h'],
      [
        `Run custom 'xxx' script defined in @affine/web's package.json`,
        '$0 web xxx',
      ],
      [`Run 'codegen' for workspace`, '$0 codegen'],
      [`Clean tsbuild and dist under each package`, '$0 clean --ts --dist'],
      [`Clean node_modules under each package`, '$0 clean --node-modules'],
      [`Clean everything`, '$0 clean --all'],
      [`Run 'build' script for @affine/web`, '$0 build -p web'],
      [
        `Run 'build' script for @affine/web with all deps prebuild before`,
        '$0 build -p web --deps',
      ],
    ],
  });

  // we use positional arguments instead of options
  protected override packageNameOrAlias: string = Option.String({
    required: true,
    validator: this.packageNameValidator,
  });

  args = Option.Proxy({ name: 'args', required: 1 });

  async execute() {
    await this.run(this.package, this.args, {
      includeDependencies: this.deps,
      waitDependencies: this.waitDeps,
    });
  }

  async run(name: PackageName, args: string[], opts: RunScriptOptions = {}) {
    opts = {
      includeDependencies: false,
      waitDependencies: true,
      ignoreIfNotFound: false,
      ...opts,
    };

    const pkg = this.workspace.getPackage(name);
    const scriptName = args[0];
    const pkgScript = pkg.scripts[scriptName];

    if (pkgScript) {
      await this.runScript(pkg, scriptName, args.slice(1), opts);
    } else {
      await this.runCommand(pkg, scriptName, args.slice(1));
    }
  }

  async runScript(
    pkg: Package,
    scriptName: string,
    args: string[],
    opts: RunScriptOptions = {}
  ) {
    const script = pkg.scripts[scriptName];

    if (!script) {
      if (opts.ignoreIfNotFound) {
        return;
      }

      throw new Error(`Script ${scriptName} not found in ${pkg.name}`);
    }

    const isAFFiNECommand = script.startsWith('affine ');
    if (opts.includeDependencies) {
      const depsRun = Promise.all(
        pkg.deps.map(dep => {
          return this.runScript(
            pkg.workspace.getPackage(dep.name),
            scriptName,
            args,
            {
              ...opts,
              ignoreIfNotFound: true,
            }
          );
        })
      );
      if (opts.waitDependencies) {
        await depsRun;
      } else {
        depsRun.catch(e => {
          this.logger.error(e);
        });
      }
    }

    args = [...script.split(' '), ...args];

    if (isAFFiNECommand) {
      args.shift();
      args.push('-p', pkg.name);
    } else {
      args.unshift(pkg.name);
    }

    await this.cli.run(args);
  }

  async runCommand(pkg: Package, scriptName: string, args: string[]) {
    // very simple test for auto ts/mjs scripts
    // TODO(@forehalo): bypass cross-env and fetch the next script after envs
    const isLoaderRequired = !ignoreLoaderScripts.some(ignore =>
      new RegExp(ignore).test(scriptName)
    );

    await execAsync(pkg.name, ['yarn', scriptName, ...args], {
      cwd: pkg.path.value,
      ...(isLoaderRequired
        ? {
            env: {
              NODE_OPTIONS: `--import=${currentDir.join('../register.js').toFileUrl()}`,
            },
          }
        : {}),
    });
  }
}
