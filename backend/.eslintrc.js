module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:node/recommended',
    'plugin:security/recommended',
    'prettier',
  ],
  plugins: ['node', 'security'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Error prevention
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-var': 'error',
    'prefer-const': 'error',
    
    // Node.js specific
    'node/no-missing-import': 'off', // Handled by bundler
    'node/no-unpublished-require': 'off',
    'node/no-process-env': 'off', // We need process.env
    
    // Security
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'warn',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-non-literal-require': 'warn',
    'security/detect-possible-timing-attacks': 'warn',
    'security/detect-pseudoRandomBytes': 'error',
    
    // Code quality
    'complexity': ['warn', 15],
    'max-depth': ['warn', 4],
    'max-lines': ['warn', 500],
    'max-lines-per-function': ['warn', 100],
    'max-nested-callbacks': ['warn', 4],
    'max-params': ['warn', 5],
    
    // Style (handled by Prettier, but some logical rules)
    'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
    'no-trailing-spaces': 'error',
    'eol-last': 'error',
  },
  overrides: [
    {
      files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true,
      },
      rules: {
        'node/no-unpublished-require': 'off',
        'security/detect-non-literal-fs-filename': 'off',
      },
    },
  ],
};