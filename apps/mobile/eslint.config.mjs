import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['node_modules/**', '.expo/**', 'dist/**', 'assets/**', 'android/**', 'ios/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  prettier,
  {
    languageOptions: { globals: { ...globals.node, ...globals.jest, __DEV__: 'readonly' } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
