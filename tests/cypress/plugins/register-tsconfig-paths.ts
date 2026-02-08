import * as tsConfigPaths from 'tsconfig-paths';

import tsConfig from '../../../tsconfig.json' with { type: 'json' };

const baseUrl = './';

tsConfigPaths.register({
  baseUrl,
  paths: tsConfig.compilerOptions.paths,
});
