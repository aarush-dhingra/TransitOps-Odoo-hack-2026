module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  extends: ['eslint:recommended', 'plugin:react-hooks/recommended'],
  plugins: ['react'],
  ignorePatterns: ['dist'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^(_|i$)' }],
    'no-trailing-spaces': 'error',
    'react/jsx-uses-vars': 'error',
  },
};
