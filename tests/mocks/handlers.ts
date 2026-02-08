import type { HttpHandler } from 'msw';

import blobStorageHandlers from './handlers/blob-storage';

const handlers: HttpHandler[] = [...blobStorageHandlers];

export default handlers;
