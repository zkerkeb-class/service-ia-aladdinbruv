import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFiles: ['<rootDir>/src/__tests__/setupEnv.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/types.ts',
    '!src/**/config/**',
    '!src/**/logger.ts',
    '!src/**/swagger.ts'
  ],
  coverageThreshold: {
    global: {
      lines: 70,
      statements: 70,
      branches: 70,
      functions: 70
    }
  },
  clearMocks: true,
  moduleFileExtensions: ['ts', 'js', 'json']
};

export default config;


