import { defineE2EConfig } from '@wesven/testing/cypress-config';

import { resetTables } from './src/utils/db';

export default defineE2EConfig({ resetTables });
