module.exports = {
  env: {
    es6: true,
    node: true
  },
  extends: 'eslint:recommended',
  // parser: "babel-eslint",
  parserOptions: {
    ecmaVersion: 8,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
      arrowFunctions: true,
      experimentalObjectRestSpread: true,
    }
  },
  plugins: [],
  rules: {
    // 'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'linebreak-style': ['error', 'unix'],
    'semi': ['error', 'never'],
    'comma-dangle': ['warn', 'always-multiline'],
    'constructor-super': 'error',
    // 'no-confusing-arrow': 'error',
    'no-constant-condition': 'error',
    'no-class-assign': 'error',
    'no-const-assign': 'error',
    'no-dupe-class-members': 'error',
    'no-var': 'warn',
    'no-this-before-super': 'error',
    'object-shorthand': ['error', 'always'],
    'prefer-spread': 'warn',
    'prefer-template': 'warn',
    'require-yield': 'error',
  },
  "globals": {
    "window": true,
    "document": true,
    "__DEV__": true,
    "__TEST__": true,
    "__CLIENT__": true,
    "__SERVER__": true,
    "__SSR__": true,
    "__PERSIST_GQL__": true,
    "__BACKEND_URL__": true
  },
}
