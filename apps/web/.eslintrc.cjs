module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/vue3-recommended',
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'vue'],
  rules: {
    'vue/multi-word-component-names': 'off',
    'vue/no-v-html': 'off',
    'vue/max-attributes-per-line': 'off', // Allow multiple attributes per line for brevity
    'vue/singleline-html-element-content-newline': 'off', // Allow inline content for small elements
    'vue/first-attribute-linebreak': 'off', // Don't enforce attribute line breaks
    'vue/html-closing-bracket-newline': 'off', // Don't enforce closing bracket position
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'warn',
    'no-debugger': 'warn',
  },
  ignorePatterns: ['dist/', 'node_modules/', '.quasar/', '*.d.ts'],
  overrides: [
    {
      // Test files can use any for mocks and leading semicolons for ASI safety
      files: ['**/*.spec.ts', '**/*.test.ts'],
      rules: {
        'no-extra-semi': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      }
    }
  ],
}




