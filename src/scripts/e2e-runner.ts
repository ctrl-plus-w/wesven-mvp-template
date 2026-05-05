import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import { Command } from '@commander-js/extra-typings';
import { type ExecaChildProcess, execa } from 'execa';
import { type DefaultRenderer, Listr, type ListrTaskWrapper, type SimpleRenderer } from 'listr2';
import waitOn from 'wait-on';

import { server } from '@/mock/node';
import { getAvailablePort } from './utils/get-available-port';
import { printReady, printStatus } from './utils/runner-print';
import {
  buildProjectName,
  clearRunnerState,
  isPidAlive,
  type RunnerState,
  readRunnerState,
  updateRunnerStatePid,
  writeRunnerState,
} from './utils/runner-state';

const promisifiedExec = promisify(exec);

const RUNNER = 'e2e' as const;

interface Context {
  webAppProcess?: ExecaChildProcess;
}

type Task = ListrTaskWrapper<Context, typeof DefaultRenderer, typeof SimpleRenderer>;

type RunnerEnv = NodeJS.ProcessEnv & {
  FORCE_COLOR: 'true';
  NODE_ENV: 'test';
  DATABASE_URL: string;
  TEST_DB_PORT: string;
  PORT: string;
  BETTER_AUTH_URL: string;
  NEXT_PUBLIC_APP_URL: string;
};

interface PortChoice {
  port: number;
  fromEnv: boolean;
}

const resolvePort = async (envName: 'TEST_DB_PORT' | 'PORT'): Promise<PortChoice> => {
  const fromEnv = process.env[envName];
  if (fromEnv && fromEnv.length > 0) {
    const parsed = Number(fromEnv);
    if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`Invalid ${envName}="${fromEnv}"`);
    return { port: parsed, fromEnv: true };
  }
  return { port: await getAvailablePort(), fromEnv: false };
};

const buildEnv = (dbPort: number, appPort: number): RunnerEnv => {
  const appUrl = `http://localhost:${appPort}`;
  return {
    FORCE_COLOR: 'true',
    NODE_ENV: 'test',
    DATABASE_URL: `postgres://postgres:postgres@localhost:${dbPort}/main`,
    TEST_DB_PORT: String(dbPort),
    PORT: String(appPort),
    BETTER_AUTH_URL: appUrl,
    NEXT_PUBLIC_APP_URL: appUrl,
  };
};

const exportEnv = (env: RunnerEnv) => {
  process.env.DATABASE_URL = env.DATABASE_URL;
  process.env.TEST_DB_PORT = env.TEST_DB_PORT;
  process.env.PORT = env.PORT;
  process.env.BETTER_AUTH_URL = env.BETTER_AUTH_URL;
  process.env.NEXT_PUBLIC_APP_URL = env.NEXT_PUBLIC_APP_URL;
};

const injectTaskStdout = (commandCb: (context: Context, task: Task) => ExecaChildProcess, ignoreError?: boolean) => {
  return async (context: Context, task: Task) => {
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

const composeEnv = (env: RunnerEnv, projectName: string) => ({
  ...process.env,
  ...env,
  COMPOSE_PROJECT_NAME: projectName,
});

const dockerUpTask = (env: RunnerEnv, dbPort: number, projectName: string, allowReuse: boolean) => ({
  title: `Starting the database container (host port ${dbPort})`,
  task: () => {
    const flag = allowReuse ? ' --no-recreate' : '';
    return promisifiedExec(`docker compose -f compose.test.yaml up --detach --wait${flag}`, {
      env: composeEnv(env, projectName),
    });
  },
});

const migrateTask = (env: RunnerEnv) => ({
  title: 'Running the migrations',
  task: injectTaskStdout(() => execa('pnpm', ['run', 'db:migrate'], { env })),
});

const resetTask = () => ({
  title: 'Resetting the testbed database',
  task: async () => {
    const { resetTables } = await import('@/util/db');
    await resetTables();
  },
});

const buildAppTask = (env: RunnerEnv, enabled: boolean) => ({
  title: 'Building the web application',
  task: injectTaskStdout(() => execa('pnpm', ['run', 'build'], { env })),
  rendererOptions: { outputBar: Number.POSITIVE_INFINITY, persistentOutput: true },
  enabled: () => enabled,
});

const startAppTask = (env: RunnerEnv, appPort: number) => ({
  title: `Starting the application (port ${appPort})`,
  task: async (ctx: Context, task: Task) => {
    const webProcess = execa('pnpm', ['run', 'start'], { env });
    webProcess.stdout?.pipe(task.stdout());
    webProcess.stderr?.pipe(task.stdout());
    ctx.webAppProcess = webProcess;

    await waitOn({ resources: [`tcp:${appPort}`], timeout: 60 * 1000 });
  },
  rendererOptions: { outputBar: Number.POSITIVE_INFINITY, persistentOutput: true },
});

const startMockTask = () => ({
  title: 'Starting the external api mock',
  task: () => server.listen(),
});

const stopAppTask = () => ({
  title: 'Stopping the web application',
  task: (ctx: Context) => {
    if (ctx.webAppProcess) ctx.webAppProcess.kill();
  },
});

const stopMockTask = () => ({
  title: 'Stopping the external api mock',
  task: () => server.close(),
});

const dockerDownTask = (env: RunnerEnv, projectName: string) => ({
  title: 'Stopping the testbed database environment',
  task: () =>
    promisifiedExec('docker compose -f compose.test.yaml down', {
      env: composeEnv(env, projectName),
    }),
});

const buildCypressArgs = (options: { open: boolean; cypressArgs: readonly string[] }) => [
  'exec',
  'cypress',
  options.open ? 'open' : 'run',
  ...options.cypressArgs,
];

const printReadyBlock = (params: {
  mode: 'default' | 'up';
  dbPort: number;
  dbFromEnv: boolean;
  appPort: number;
  appFromEnv: boolean;
  env: RunnerEnv;
  projectName: string;
  startedAt?: number;
}) =>
  printReady({
    runner: RUNNER,
    mode: params.mode,
    dbPort: params.dbPort,
    dbFromEnv: params.dbFromEnv,
    dbUrl: params.env.DATABASE_URL,
    appPort: params.appPort,
    appFromEnv: params.appFromEnv,
    appUrl: params.env.NEXT_PUBLIC_APP_URL,
    projectName: params.projectName,
    startedAt: params.startedAt,
  });

const runDefault = async (options: { open: boolean; skipBuild: boolean; cypressArgs: readonly string[] }) => {
  const { port: dbPort, fromEnv: dbFromEnv } = await resolvePort('TEST_DB_PORT');
  const { port: appPort, fromEnv: appFromEnv } = await resolvePort('PORT');
  const env = buildEnv(dbPort, appPort);
  exportEnv(env);
  const projectName = await buildProjectName(RUNNER);

  printReadyBlock({ mode: 'default', dbPort, dbFromEnv, appPort, appFromEnv, env, projectName });

  let testOutput = '';

  const tasks = new Listr<Context>([
    {
      title: 'Setup the environment',
      task: (_ctx, task) =>
        task.newListr(
          [
            {
              title: 'Starting the testbed database environment',
              task: (_dbCtx, dbTask) =>
                dbTask.newListr([dockerUpTask(env, dbPort, projectName, false), migrateTask(env), resetTask()], {
                  concurrent: false,
                  rendererOptions: { collapseSubtasks: false },
                }),
            },
            {
              title: 'Starting the application environment',
              task: (_appCtx, appTask) =>
                appTask.newListr([buildAppTask(env, !options.skipBuild), startAppTask(env, appPort)], {
                  concurrent: false,
                  rendererOptions: { collapseSubtasks: false },
                }),
            },
            startMockTask(),
          ],
          { concurrent: true, rendererOptions: { collapseSubtasks: false } },
        ),
    },
    {
      title: 'Running the end-to-end tests',
      task: async () => {
        const result = await execa('pnpm', buildCypressArgs(options), {
          env: { ...env, CYPRESS_BASE_URL: env.NEXT_PUBLIC_APP_URL },
          reject: false,
        });
        testOutput = result.stdout + (result.stderr ? `\n${result.stderr}` : '');
        if (typeof result.exitCode === 'number' && result.exitCode !== 0) process.exitCode = result.exitCode;
      },
    },
  ]);

  const cleanupTasks = new Listr<Context>([stopAppTask(), dockerDownTask(env, projectName), stopMockTask()]);

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

const blockUntilSignal = async (params: {
  env: RunnerEnv;
  projectName: string;
  webContext: Context;
}): Promise<never> => {
  const cleanupTasks = new Listr<Context>([stopAppTask(), stopMockTask()]);

  let cleanupRan = false;
  const teardown = async () => {
    if (cleanupRan) return;
    cleanupRan = true;
    try {
      await cleanupTasks.run(params.webContext);
    } catch (err) {
      console.error(err);
    }
    try {
      await updateRunnerStatePid(RUNNER, null);
    } catch (err) {
      console.error(err);
    }
    process.exit();
  };

  process.once('SIGINT', teardown);
  process.once('SIGTERM', teardown);

  await new Promise<void>(() => {});
  return undefined as never;
};

const runFreshUp = async (options: { skipBuild: boolean }) => {
  const { port: dbPort, fromEnv: dbFromEnv } = await resolvePort('TEST_DB_PORT');
  const { port: appPort, fromEnv: appFromEnv } = await resolvePort('PORT');
  const env = buildEnv(dbPort, appPort);
  exportEnv(env);
  const projectName = await buildProjectName(RUNNER);
  const startedAt = Date.now();

  await writeRunnerState(RUNNER, { projectName, dbPort, appPort, pid: process.pid, startedAt });

  const tasks = new Listr<Context>([
    {
      title: 'Setup the environment',
      task: (_ctx, task) =>
        task.newListr(
          [
            {
              title: 'Starting the testbed database environment',
              task: (_dbCtx, dbTask) =>
                dbTask.newListr([dockerUpTask(env, dbPort, projectName, false), migrateTask(env)], {
                  concurrent: false,
                  rendererOptions: { collapseSubtasks: false },
                }),
            },
            {
              title: 'Starting the application environment',
              task: (_appCtx, appTask) =>
                appTask.newListr([buildAppTask(env, !options.skipBuild), startAppTask(env, appPort)], {
                  concurrent: false,
                  rendererOptions: { collapseSubtasks: false },
                }),
            },
            startMockTask(),
          ],
          { concurrent: true, rendererOptions: { collapseSubtasks: false } },
        ),
    },
  ]);

  try {
    await tasks.run();
  } catch (err) {
    await clearRunnerState(RUNNER);
    throw err;
  }

  printReadyBlock({ mode: 'up', dbPort, dbFromEnv, appPort, appFromEnv, env, projectName, startedAt });

  await blockUntilSignal({ env, projectName, webContext: tasks.ctx });
};

const runReuseUp = async (state: RunnerState) => {
  if (!state.appPort) throw new Error('state missing appPort');
  const env = buildEnv(state.dbPort, state.appPort);
  exportEnv(env);
  const startedAt = Date.now();

  await writeRunnerState(RUNNER, { ...state, pid: process.pid, startedAt });

  const tasks = new Listr<Context>([
    {
      title: 'Reusing the testbed environment',
      task: (_ctx, task) =>
        task.newListr(
          [
            {
              title: 'Reusing the testbed database environment',
              task: (_dbCtx, dbTask) =>
                dbTask.newListr([dockerUpTask(env, state.dbPort, state.projectName, true), migrateTask(env)], {
                  concurrent: false,
                  rendererOptions: { collapseSubtasks: false },
                }),
            },
            {
              title: 'Starting the application environment',
              task: (_appCtx, appTask) =>
                appTask.newListr([startAppTask(env, state.appPort as number)], {
                  concurrent: false,
                  rendererOptions: { collapseSubtasks: false },
                }),
            },
            startMockTask(),
          ],
          { concurrent: true, rendererOptions: { collapseSubtasks: false } },
        ),
    },
  ]);

  await tasks.run();

  printReadyBlock({
    mode: 'up',
    dbPort: state.dbPort,
    dbFromEnv: false,
    appPort: state.appPort,
    appFromEnv: false,
    env,
    projectName: state.projectName,
    startedAt,
  });

  await blockUntilSignal({ env, projectName: state.projectName, webContext: tasks.ctx });
};

const runUp = async (options: { skipBuild: boolean }) => {
  try {
    const state = await readRunnerState(RUNNER);

    if (state) {
      if (state.pid && isPidAlive(state.pid)) {
        console.error(`e2e-runner: another :up appears to be running (pid ${state.pid}). Run :down first.`);
        process.exit(1);
      }
      try {
        await runReuseUp(state);
        return;
      } catch (err) {
        console.error(err);
        // biome-ignore lint/suspicious/noConsole: notify on stale-state recovery
        console.log('e2e-runner: stale state cleared, reallocating');
        await clearRunnerState(RUNNER);
      }
    }

    await runFreshUp(options);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
    process.exit();
  }
};

const runRun = async (options: { open: boolean; cypressArgs: readonly string[] }) => {
  const state = await readRunnerState(RUNNER);
  if (!state || !state.appPort) {
    console.error('e2e-runner: no testbed up. run `pnpm test:e2e:up` first.');
    process.exit(1);
  }

  const env = buildEnv(state.dbPort, state.appPort);
  exportEnv(env);

  // biome-ignore lint/suspicious/noConsole: CLI hint to confirm which testbed is targeted
  console.log(`e2e-runner: using db port ${state.dbPort} / app port ${state.appPort}`);

  const setupTasks = new Listr<Context>([resetTask()]);

  try {
    await setupTasks.run();
    const result = await execa('pnpm', buildCypressArgs(options), {
      env: { ...env, CYPRESS_BASE_URL: env.NEXT_PUBLIC_APP_URL },
      reject: false,
      stdio: 'inherit',
    });
    if (typeof result.exitCode === 'number') process.exitCode = result.exitCode;
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
};

const runDown = async () => {
  const state = await readRunnerState(RUNNER);
  if (!state) {
    process.exit();
  }

  const env = buildEnv(state.dbPort, state.appPort ?? 0);
  const tasks = new Listr<Context>([dockerDownTask(env, state.projectName)]);

  try {
    await tasks.run();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await clearRunnerState(RUNNER);
    process.exit();
  }
};

const runStatus = async () => {
  const state = await readRunnerState(RUNNER);
  const pidAlive = state?.pid !== undefined ? isPidAlive(state.pid) : false;
  printStatus({ runner: RUNNER, state, pidAlive });
  process.exit();
};

const program = new Command()
  .name('e2e-runner')
  .description('Run the end-to-end tests. Set TEST_DB_PORT or PORT to pin specific host ports.')
  .enablePositionalOptions();

program
  .command('default', { isDefault: true, hidden: true })
  .description('Full lifecycle: docker up + build + app + mock + cypress + cleanup')
  .option('-o, --open', 'Open the test runner UI')
  .option('--skip-build', 'Skip the build step')
  .argument('[cypressArgs...]', 'Args forwarded to cypress')
  .allowUnknownOption()
  .action(async (cypressArgs, options) => {
    await runDefault({ open: !!options.open, skipBuild: !!options.skipBuild, cypressArgs });
  });

program
  .command('up')
  .description('Bring the testbed up on dynamic ports (or $TEST_DB_PORT / $PORT) and block until killed')
  .option('--skip-build', 'Skip the build step')
  .action(async (options) => {
    await runUp({ skipBuild: !!options.skipBuild });
  });

program
  .command('run')
  .description('Reset tables and run cypress against the running testbed')
  .option('-o, --open', 'Open the test runner UI')
  .argument('[cypressArgs...]', 'Args forwarded to cypress')
  .allowUnknownOption()
  .action(async (cypressArgs, options) => {
    await runRun({ open: !!options.open, cypressArgs });
  });

program
  .command('down')
  .description('Stop and remove the testbed database container')
  .action(async () => {
    await runDown();
  });

program
  .command('status')
  .description('Print the running testbed details (live / stale / not running)')
  .action(async () => {
    await runStatus();
  });

program.parse();
