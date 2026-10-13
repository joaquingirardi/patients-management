import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'auth:isPublic';

/** Opts a route out of authentication. Routes without it require a valid token. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
