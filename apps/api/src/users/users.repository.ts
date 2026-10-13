import { Inject, Injectable } from '@nestjs/common';

import { DATABASE, type Database } from '../database/database';

@Injectable()
export class UsersRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  // Emails are stored lower-cased, so this is a plain index lookup.
  findByEmail(email: string) {
    return this.db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        organizationId: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
      },
    });
  }
}
