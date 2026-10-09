import { z } from 'zod';

import { ValidationError } from '../errors/domain-errors';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(z.object({ name: z.string().trim().min(1, 'Required') }));

  it('returns the parsed (normalised, stripped) value', () => {
    expect(pipe.transform({ name: '  Ada ', organizationId: 'evil' })).toEqual({ name: 'Ada' });
  });

  it('throws a ValidationError with field paths', () => {
    expect.assertions(2);
    expect(() => pipe.transform({ name: ' ' })).toThrow(ValidationError);
    try {
      pipe.transform({ name: ' ' });
    } catch (error) {
      expect((error as ValidationError).errors).toEqual([{ path: 'name', message: 'Required' }]);
    }
  });

  it('prefixes param paths', () => {
    expect.assertions(1);
    const idPipe = new ZodValidationPipe(z.uuid(), 'id');
    try {
      idPipe.transform('nope');
    } catch (error) {
      expect((error as ValidationError).errors[0]?.path).toBe('id');
    }
  });
});
