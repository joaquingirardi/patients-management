import { nest } from '@pm/eslint-config/nest';

export default [
  { ignores: ['dist/**', 'coverage/**', 'prisma/migrations/**'] },
  ...nest({ tsconfigRootDir: import.meta.dirname }),
];
