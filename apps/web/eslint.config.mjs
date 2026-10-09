import { next } from '@pm/eslint-config/next';

export default [
  { ignores: ['.next/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**'] },
  ...next({ tsconfigRootDir: import.meta.dirname }),
];
