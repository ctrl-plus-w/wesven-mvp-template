import { createServer } from 'node:net';

/**
 * Asks the OS for an available TCP port by binding to port 0 then closing.
 */
export const getAvailablePort = (): Promise<number> => {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Failed to acquire an available port'));
        return;
      }
      const { port } = address;
      server.close(() => resolve(port));
    });
  });
};
