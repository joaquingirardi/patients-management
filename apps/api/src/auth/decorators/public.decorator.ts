import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'auth:isPublic';

/** Opts a route out of authentication. Everything else is protected by default (deny by default). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
