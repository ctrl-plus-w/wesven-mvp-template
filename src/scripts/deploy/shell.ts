import { spawn } from 'node:child_process';

import type { RunOptions } from '@/type/deploy';

/**
 * Runs a command and resolves with its trimmed stdout. Rejects with its stderr (or stdout) on a non-zero exit. It runs
 * asynchronously so a spinner keeps turning meanwhile.
 * @param command The executable
 * @param args Its arguments, which must never hold a secret (pass one through `input`)
 * @param options The stdin content, extra environment, and the name its error uses
 */
export const run = (command: string, args: string[], { input, env, label }: RunOptions = {}) =>
  new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(stdout.trim());
      else
        reject(
          new Error(`\`${label ?? `${command} ${args.slice(0, 3).join(' ')}`}\` failed:\n${(stderr || stdout).trim()}`),
        );
    });

    child.stdin.end(input ?? '');
  });

/**
 * Runs a command attached to the terminal, for the prompts a CLI asks itself (a login, marketplace terms).
 * @param command The executable
 * @param args Its arguments
 * @param label Names the command in its error
 */
export const runInteractive = (command: string, args: string[], label?: string) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`\`${label ?? `${command} ${args.slice(0, 3).join(' ')}`}\` exited with code ${code}.`));
    });
  });

/**
 * Whether a command exits with 0, for the probes (`gh auth status`, `vercel whoami`).
 * @param command The executable
 * @param args Its arguments
 */
export const succeeds = async (command: string, args: string[]) => {
  try {
    await run(command, args);
    return true;
  } catch {
    return false;
  }
};
