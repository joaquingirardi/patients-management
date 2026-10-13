import { nest } from '@pm/eslint-config/nest';

export default [
  { ignores: ['dist/**', 'coverage/**', 'prisma/migrations/**', 'api/**'] },
  ...nest({ tsconfigRootDir: import.meta.dirname }),
];
