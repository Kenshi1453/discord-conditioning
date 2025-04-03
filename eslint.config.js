import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import customRules from './eslint-plugin-custom-rules/index.js';
import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';

// For __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Compatibility helper for ignore patterns
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  js.configs.recommended,
  ...compat.config({
    ignorePatterns: [
      '**/node_modules/**',
      '**/dist/**',
      '!.*', // Don't ignore dotfiles (like .eslintrc.cjs if present)
    ],
  }),
  {
    files: ['src/commands/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',
    },
    plugins: {
      'custom-rules': customRules,
    },
    rules: {
      'custom-rules/enforce-command-exports': 'error',
    },
  },
];