import { Logger } from '@nestjs/common';

// Unit tests assert on behaviour, not on log output; keep the reporter readable.
Logger.overrideLogger(false);
