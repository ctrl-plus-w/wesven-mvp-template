import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import { Command } from '@commander-js/extra-typings';
import { type ExecaChildProcess, execa } from 'execa';
import { type DefaultRenderer, Listr, type ListrTaskWrapper, type SimpleRenderer } from 'listr2';

import { resetTables } from '@/util/db';

const promisifiedExec = promisify(exec);

const injectTaskStdout = (
  commandCb: (task: ListrTaskWrapper<object, typeof DefaultRenderer, typeof SimpleRenderer>) => ExecaChildProcess,
  ignoreError?: boolean,
) => {
  return async (_ctx: object, task: ListrTaskWrapper<object, typeof DefaultRenderer, typeof SimpleRenderer>) => {
    const child = commandCb(task);
    child.stdout?.pipe(task.stdout());
    child.stderr?.pipe(task.stdout());

    if (ignoreError) {
      try {
        await child;
      } catch (_error) {}
    } else {
      await child;
    }
  };
};

const stdOutEnv = { FORCE_COLOR: 'true', NODE_ENV: 'test' as const };

let testOutput = '';

const main = async (watch: boolean) => {
  const tasks = new Listr([
    {
      title: 'Setting up the test database',
      task: (_ctx, task) =>
        task.newListr(
          [
            {
              title: 'Starting the database container',
              task: () => promisifiedExec('docker compose -f compose.test.yaml up --detach --wait'),
            },
            {
              title: 'Running the migrations',
              task: injectTaskStdout(() => execa('pnpm', ['run', 'db:migrate'], { env: stdOutEnv })),
            },
            {
              title: 'Resetting the database',
              task: () => resetTables(),
            },
          ],
          { concurrent: false, rendererOptions: { collapseSubtasks: false } },
        ),
    },
    {
      title: 'Running integration tests',
      task: async () => {
        const result = await execa(
          'pnpm',
          [
            'exec',
            'vitest',
            watch ? 'watch' : 'run',
            '--config',
            'vitest.integration.config.mts',
            '--reporter=verbose',
          ],
          { env: stdOutEnv, reject: false },
        );
        testOutput = result.stdout + (result.stderr ? `\n${result.stderr}` : '');
      },
    },
  ]);

  const cleanupTasks = new Listr([
    {
      title: 'Stopping the database container',
      task: () => promisifiedExec('docker compose -f compose.test.yaml down -v'),
    },
  ]);

  try {
    await tasks.run();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await cleanupTasks.run();

    if (testOutput) {
      // biome-ignore lint/suspicious/noConsole: CLI script needs to output test report
      console.log(testOutput);
    }

    process.exit();
  }
};

const program = new Command()
  .name('integration-runner')
  .description('Run integration tests with a temporary database')
  .option('-w, --watch', 'Run tests in watch mode')
  .action(async (options) => main(!!options.watch));

program.parse();
