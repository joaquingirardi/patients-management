import { type LoginRequest, LoginRequestSchema, type LoginResponse } from '@pm/contracts';

/** See patients/dto: DTOs are the shared contract schemas, named for the module. */
export const LoginDto = LoginRequestSchema;
export type LoginDto = LoginRequest;

export type LoginResponseDto = LoginResponse;
