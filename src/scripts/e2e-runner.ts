import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import { Command } from '@commander-js/extra-typings';
import { type ExecaChildProcess, execa } from 'execa';
import { type DefaultRenderer, Listr, type ListrTaskWrapper, type SimpleRenderer } from 'listr2';
import waitOn from 'wait-on';

import { resetTables } from '@/util/db';

import { server } from '@/mock/node';

const promisifiedExec = promisify(exec);

interface Context {
  webAppProcess?: ExecaChildProcess;
}

const injectTaskStdout = (
  commandCb: (
    context: Context,
    task: ListrTaskWrapper<Context, typeof DefaultRenderer, typeof SimpleRenderer>,
  ) => ExecaChildProcess,
  ignoreError?: boolean,
) => {
  return async (context: Context, task: ListrTaskWrapper<Context, typeof DefaultRenderer, typeof SimpleRenderer>) => {
    const child = commandCb(context, task);
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

const main = async (open: boolean, skipBuild: boolean) => {
  const tasks = new Listr<Context>([
    {
      title: 'Setup the environment',
      task: (_ctx, task) =>
        task.newListr(
          [
            {
              title: 'Starting the testbed database environment',
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
                      title: 'Resetting the testbed database',
                      task: () => resetTables(),
                    },
                  ],
                  { concurrent: false, rendererOptions: { collapseSubtasks: false } },
                ),
            },
            {
              title: 'Starting the application environment',
              task: (_ctx, task) =>
                task.newListr(
                  [
                    {
                      title: 'Building the web application',
                      task: injectTaskStdout(() => execa('pnpm', ['run', 'build'], { env: stdOutEnv })),
                      rendererOptions: { outputBar: Infinity, persistentOutput: true },
                      enabled: !skipBuild,
                    },
                    {
                      title: 'Starting the application',
                      task: async (ctx, task) => {
                        const process = execa('pnpm', ['run', 'start'], { env: stdOutEnv });
                        process.stdout?.pipe(task.stdout());
                        process.stderr?.pipe(task.stdout());
                        ctx.webAppProcess = process;

                        await waitOn({ resources: ['tcp:3000'], timeout: 10 * 1000 });
                      },
                      rendererOptions: { outputBar: Infinity, persistentOutput: true },
                    },
                  ],
                  { concurrent: false, rendererOptions: { collapseSubtasks: false } },
                ),
            },
            {
              title: 'Starting the external api mock',
              task: () => server.listen(),
            },
          ],
          { concurrent: true, rendererOptions: { collapseSubtasks: false } },
        ),
    },
    {
      title: 'Running the end-to-end tests',
      task: async () => {
        const result = await execa('pnpm', ['run', open ? '_test:e2e:open' : '_test:e2e:ci'], {
          env: stdOutEnv,
          reject: false,
        });
        testOutput = result.stdout + (result.stderr ? `\n${result.stderr}` : '');
      },
    },
  ]);

  const cleanupTasks = new Listr<Context>([
    {
      title: 'Stopping the web application',
      task: (ctx) => {
        if (ctx.webAppProcess) ctx.webAppProcess.kill();
      },
    },
    {
      title: 'Stopping the testbed database environment',
      task: () => promisifiedExec('docker compose -f compose.test.yaml down'),
    },
    {
      title: 'Stopping the external api mock',
      task: () => server.close(),
    },
  ]);

  try {
    await tasks.run();
  } catch (err) {
    console.error(err);

    process.exitCode = 1;
  } finally {
    await cleanupTasks.run(tasks.ctx);

    if (testOutput) {
      // biome-ignore lint/suspicious/noConsole: CLI script needs to output test report
      console.log(testOutput);
    }

    process.exit();
  }
};

const program = new Command()
  .name('e2e-runner')
  .description('Run the end-to-end tests')
  .option('-o, --open', 'Open the test runner UI')
  .option('--skip-build', 'Skip the build step')
  .action(async (options) => {
    return main(!!options.open, !!options.skipBuild);
  });

program.parse();
