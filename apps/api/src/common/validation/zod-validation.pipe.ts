import { type PipeTransform } from '@nestjs/common';
import { type z } from 'zod';

import { ValidationError } from '../errors/domain-errors';

/**
 * Validates and *normalises* input with the shared contract schemas. Unknown keys are stripped,
 * so a client can never mass-assign server-owned fields such as `organizationId` or `version`.
 */
export class ZodValidationPipe<TSchema extends z.ZodType> implements PipeTransform<
  unknown,
  z.output<TSchema>
> {
  constructor(
    private readonly schema: TSchema,
    private readonly pathPrefix?: string,
  ) {}

  transform(value: unknown): z.output<TSchema> {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;

    throw new ValidationError(
      result.error.issues.map((issue) => ({
        path: [this.pathPrefix, ...issue.path.map(String)].filter(Boolean).join('.') || '(root)',
        message: issue.message,
      })),
    );
  }
}
