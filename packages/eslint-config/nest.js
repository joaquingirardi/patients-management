// @ts-check
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { base } from './base.js';

/**
 * NestJS preset. Nest relies on runtime decorator metadata: classes injected through
 * constructors must be imported as values, so `consistent-type-imports` is turned off.
 *
 * @param {{ tsconfigRootDir: string }} options
 */
export function nest({ tsconfigRootDir }) {
  return tseslint.config(...base({ tsconfigRootDir }), {
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      '@typescript-eslint/parameter-properties': 'off',
    },
  });
}

export default nest;
