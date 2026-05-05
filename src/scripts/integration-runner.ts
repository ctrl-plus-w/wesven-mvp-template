import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import { Command } from '@commander-js/extra-typings';
import { type ExecaChildProcess, execa } from 'execa';
import { type DefaultRenderer, Listr, type ListrTaskWrapper, type SimpleRenderer } from 'listr2';

import { getAvailablePort } from './utils/get-available-port';
import { printReady, printStatus } from './utils/runner-print';
import {
  buildProjectName,
  clearRunnerState,
  isPidAlive,
  type RunnerState,
  readRunnerState,
  writeRunnerState,
} from './utils/runner-state';

const promisifiedExec = promisify(exec);

const RUNNER = 'integration' as const;

type ListrCtx = object;
type Task = ListrTaskWrapper<ListrCtx, typeof DefaultRenderer, typeof SimpleRenderer>;

type RunnerEnv = NodeJS.ProcessEnv & {
  FORCE_COLOR: 'true';
  NODE_ENV: 'test';
  DATABASE_URL: string;
  TEST_DB_PORT: string;
};

interface PortChoice {
  port: number;
  fromEnv: boolean;
}

const resolveDbPort = async (): Promise<PortChoice> => {
  const fromEnv = process.env.TEST_DB_PORT;
  if (fromEnv && fromEnv.length > 0) {
    const parsed = Number(fromEnv);
    if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`Invalid TEST_DB_PORT="${fromEnv}"`);
    return { port: parsed, fromEnv: true };
  }
  return { port: await getAvailablePort(), fromEnv: false };
};

const buildEnv = (dbPort: number): RunnerEnv => ({
  FORCE_COLOR: 'true',
  NODE_ENV: 'test',
  DATABASE_URL: `postgres://postgres:postgres@localhost:${dbPort}/main`,
  TEST_DB_PORT: String(dbPort),
});

const exportEnv = (env: RunnerEnv) => {
  process.env.DATABASE_URL = env.DATABASE_URL;
  process.env.TEST_DB_PORT = env.TEST_DB_PORT;
};

const injectTaskStdout = (commandCb: (task: Task) => ExecaChildProcess, ignoreError?: boolean) => {
  return async (_ctx: ListrCtx, task: Task) => {
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
  title: 'Resetting the database',
  task: async () => {
    const { resetTables } = await import('@/util/db');
    await resetTables();
  },
});

const dockerDownTask = (env: RunnerEnv, projectName: string) => ({
  title: 'Stopping the database container',
  task: () =>
    promisifiedExec('docker compose -f compose.test.yaml down -v', {
      env: composeEnv(env, projectName),
    }),
});

const buildVitestArgs = (options: { watch: boolean; vitestArgs: readonly string[] }) => [
  'exec',
  'vitest',
  options.watch ? 'watch' : 'run',
  '--config',
  'vitest.integration.config.mts',
  ...options.vitestArgs,
];

const printReadyBlock = (params: {
  mode: 'default' | 'up';
  dbPort: number;
  dbFromEnv: boolean;
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
    projectName: params.projectName,
    startedAt: params.startedAt,
  });

const runDefault = async (options: { watch: boolean; vitestArgs: readonly string[] }) => {
  const { port: dbPort, fromEnv: dbFromEnv } = await resolveDbPort();
  const env = buildEnv(dbPort);
  exportEnv(env);
  const projectName = await buildProjectName(RUNNER);

  printReadyBlock({ mode: 'default', dbPort, dbFromEnv, env, projectName });

  let testOutput = '';

  const setupTasks = new Listr<ListrCtx>([
    {
      title: 'Setting up the test database',
      task: (_ctx, task) =>
        task.newListr([dockerUpTask(env, dbPort, projectName, false), migrateTask(env), resetTask()], {
          concurrent: false,
          rendererOptions: { collapseSubtasks: false },
        }),
    },
    {
      title: 'Running integration tests',
      task: async () => {
        const result = await execa('pnpm', buildVitestArgs(options), { env, reject: false });
        testOutput = result.stdout + (result.stderr ? `\n${result.stderr}` : '');
        if (typeof result.exitCode === 'number' && result.exitCode !== 0) process.exitCode = result.exitCode;
      },
    },
  ]);

  const cleanupTasks = new Listr<ListrCtx>([dockerDownTask(env, projectName)]);

  try {
    await setupTasks.run();
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

const runFreshUp = async () => {
  const { port: dbPort, fromEnv: dbFromEnv } = await resolveDbPort();
  const env = buildEnv(dbPort);
  exportEnv(env);
  const projectName = await buildProjectName(RUNNER);
  const startedAt = Date.now();

  await writeRunnerState(RUNNER, { projectName, dbPort, startedAt });

  const tasks = new Listr<ListrCtx>(
    [
      {
        title: 'Setting up the test database',
        task: (_ctx, task) =>
          task.newListr([dockerUpTask(env, dbPort, projectName, false), migrateTask(env)], {
            concurrent: false,
            rendererOptions: { collapseSubtasks: false },
          }),
      },
    ],
    { concurrent: false },
  );

  try {
    await tasks.run();
  } catch (err) {
    await clearRunnerState(RUNNER);
    throw err;
  }

  printReadyBlock({ mode: 'up', dbPort, dbFromEnv, env, projectName, startedAt });
};

const runReuseUp = async (state: RunnerState) => {
  const env = buildEnv(state.dbPort);
  exportEnv(env);
  const startedAt = Date.now();

  await writeRunnerState(RUNNER, { ...state, startedAt });

  const tasks = new Listr<ListrCtx>(
    [
      {
        title: 'Reusing the test database',
        task: (_ctx, task) =>
          task.newListr([dockerUpTask(env, state.dbPort, state.projectName, true), migrateTask(env)], {
            concurrent: false,
            rendererOptions: { collapseSubtasks: false },
          }),
      },
    ],
    { concurrent: false },
  );

  await tasks.run();

  printReadyBlock({
    mode: 'up',
    dbPort: state.dbPort,
    dbFromEnv: false,
    env,
    projectName: state.projectName,
    startedAt,
  });
};

const runUp = async () => {
  try {
    const state = await readRunnerState(RUNNER);

    if (state) {
      if (state.pid && isPidAlive(state.pid)) {
        console.error(`integration-runner: another :up appears to be running (pid ${state.pid}). Run :down first.`);
        process.exit(1);
      }
      try {
        await runReuseUp(state);
        return;
      } catch (err) {
        console.error(err);
        // biome-ignore lint/suspicious/noConsole: notify on stale-state recovery
        console.log('integration-runner: stale state cleared, reallocating');
        await clearRunnerState(RUNNER);
      }
    }

    await runFreshUp();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
};

const runRun = async (vitestArgs: readonly string[]) => {
  const state = await readRunnerState(RUNNER);
  if (!state) {
    console.error('integration-runner: no testbed up. run `pnpm test:integration:up` first.');
    process.exit(1);
  }

  const env = buildEnv(state.dbPort);
  exportEnv(env);

  // biome-ignore lint/suspicious/noConsole: CLI hint to confirm which testbed is targeted
  console.log(`integration-runner: using db port ${state.dbPort}`);

  const setupTasks = new Listr<ListrCtx>([resetTask()]);

  try {
    await setupTasks.run();
    const result = await execa('pnpm', buildVitestArgs({ watch: false, vitestArgs }), {
      env,
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

  const env = buildEnv(state.dbPort);
  const tasks = new Listr<ListrCtx>([dockerDownTask(env, state.projectName)]);

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
  printStatus({ runner: RUNNER, state, pidAlive: true });
  process.exit();
};

const program = new Command()
  .name('integration-runner')
  .description('Run integration tests with a temporary database. Set TEST_DB_PORT to pin a specific db host port.')
  .enablePositionalOptions();

program
  .command('default', { isDefault: true, hidden: true })
  .description('Full lifecycle: docker up + migrate + reset + vitest + docker down')
  .option('-w, --watch', 'Run tests in watch mode')
  .argument('[vitestArgs...]', 'Args forwarded to vitest')
  .allowUnknownOption()
  .action(async (vitestArgs, options) => {
    await runDefault({ watch: !!options.watch, vitestArgs });
  });

program
  .command('up')
  .description('Bring the test database up on a dynamic port (or $TEST_DB_PORT) and apply migrations')
  .action(async () => {
    await runUp();
  });

program
  .command('run')
  .description('Reset tables and run vitest against the running test database')
  .argument('[vitestArgs...]', 'Args forwarded to vitest')
  .allowUnknownOption()
  .action(async (vitestArgs) => {
    await runRun(vitestArgs);
  });

program
  .command('down')
  .description('Stop and remove the test database container')
  .action(async () => {
    await runDown();
  });

program
  .command('status')
  .description('Print the running testbed details (live / not running)')
  .action(async () => {
    await runStatus();
  });

program.parse();
