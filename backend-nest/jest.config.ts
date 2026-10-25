import type { Config } from 'jest';

// The package is ESM ("type": "module"), so Jest runs the TypeScript tests as ES modules.
// Run through the npm scripts, which pass --experimental-vm-modules.
const config: Config = {
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  extensionsToTreatAsEsm: ['.ts'],
  // Source files import each other with ".js" extensions (required by NodeNext); map them back to .ts.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.spec.json', useESM: true }],
  },
};

export default config;
