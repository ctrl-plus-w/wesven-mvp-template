import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import { Command } from '@commander-js/extra-typings';
import { type ExecaChildProcess, execa } from 'execa';
import { type DefaultRenderer, Listr, type ListrTaskWrapper, type SimpleRenderer } from 'listr2';
import waitOn from 'wait-on';

import { server } from '@/mock/node';
import { getAvailablePort } from './utils/get-available-port';

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

let testOutput = '';

const main = async (open: boolean, skipBuild: boolean) => {
  const dbPort = await getAvailablePort();
  const appPort = await getAvailablePort();

  const databaseUrl = `postgres://postgres:postgres@localhost:${dbPort}/main`;
  const appUrl = `http://localhost:${appPort}`;

  process.env.DATABASE_URL = databaseUrl;
  process.env.TEST_DB_PORT = String(dbPort);
  process.env.PORT = String(appPort);
  process.env.BETTER_AUTH_URL = appUrl;
  process.env.NEXT_PUBLIC_APP_URL = appUrl;

  const stdOutEnv = {
    FORCE_COLOR: 'true',
    NODE_ENV: 'test' as const,
    DATABASE_URL: databaseUrl,
    TEST_DB_PORT: String(dbPort),
    PORT: String(appPort),
    BETTER_AUTH_URL: appUrl,
    NEXT_PUBLIC_APP_URL: appUrl,
  };

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
                      title: `Starting the database container (host port ${dbPort})`,
                      task: () =>
                        promisifiedExec('docker compose -f compose.test.yaml up --detach --wait', {
                          env: { ...process.env, ...stdOutEnv },
                        }),
                    },
                    {
                      title: 'Running the migrations',
                      task: injectTaskStdout(() => execa('pnpm', ['run', 'db:migrate'], { env: stdOutEnv })),
                    },
                    {
                      title: 'Resetting the testbed database',
                      task: async () => {
                        const { resetTables } = await import('@/util/db');
                        await resetTables();
                      },
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
                      title: `Starting the application (port ${appPort})`,
                      task: async (ctx, task) => {
                        const webProcess = execa('pnpm', ['run', 'start', '--', '-p', String(appPort)], {
                          env: stdOutEnv,
                        });
                        webProcess.stdout?.pipe(task.stdout());
                        webProcess.stderr?.pipe(task.stdout());
                        ctx.webAppProcess = webProcess;

                        await waitOn({ resources: [`tcp:${appPort}`], timeout: 10 * 1000 });
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
          env: { ...stdOutEnv, CYPRESS_BASE_URL: appUrl },
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
      task: () =>
        promisifiedExec('docker compose -f compose.test.yaml down', {
          env: { ...process.env, ...stdOutEnv },
        }),
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
