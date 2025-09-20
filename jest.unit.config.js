/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Only run unit tests
  testMatch: ['**/test/unit/**/*.test.ts'],

  // Don't run the global setup that connects to database
  setupFilesAfterEnv: [],

  // Paths
  rootDir: '.',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],

  // Coverage
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Transform
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },

  // Module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};