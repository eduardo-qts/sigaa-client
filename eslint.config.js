import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'docs/api/', 'node_modules/', '.scratch/', 'tests/consumer/'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname }
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      // Falso positivo com os tipos de nós do cheerio/domhandler (enum ElementType).
      '@typescript-eslint/no-unsafe-enum-assignment': 'off',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }]
    }
  },
  { files: ['**/*.js'], ...tseslint.configs.disableTypeChecked },
  {
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off'
    }
  }
);
