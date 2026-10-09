import { Inject, Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';

import { APP_CONFIG, type AppConfig } from '../config/app-config';

@Injectable()
export class PasswordHasher {
  /**
   * Compared against when the email is unknown, so "no such user" and "wrong password"
   * take the same time — response timing cannot be used to enumerate accounts.
   */
  private readonly dummyHash: string;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.dummyHash = bcrypt.hashSync('timing-equaliser', config.auth.bcryptCost);
  }

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.config.auth.bcryptCost);
  }

  verify(password: string, hash: string | undefined): Promise<boolean> {
    return bcrypt.compare(password, hash ?? this.dummyHash).then((ok) => ok && hash !== undefined);
  }
}
