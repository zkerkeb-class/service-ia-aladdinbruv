module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
  ],
  rules: {
    // Basic rules for TypeScript
    'no-unused-vars': 'off', // Turn off for TypeScript
    '@typescript-eslint/no-unused-vars': 'warn',
    'no-console': 'off', // Allow console statements for logging
    'no-undef': 'off', // TypeScript handles this
  },
  env: {
    node: true,
    es6: true,
    jest: true,
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '*.js',
    '*.d.ts',
  ],
};
