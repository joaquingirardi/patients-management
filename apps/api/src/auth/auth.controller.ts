import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { LoginDto, type LoginResponseDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Brute-force protected by the `login` (per IP) and `loginAccount` (per email) throttlers. */
  @Public()
  @SkipThrottle({ default: true })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body(new ZodValidationPipe(LoginDto)) body: LoginDto): Promise<LoginResponseDto> {
    return this.auth.login(body);
  }
}
