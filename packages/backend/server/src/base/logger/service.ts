import { ConsoleLogger, Injectable } from '@nestjs/common';

// DO NOT use this Logger directly
// Use it via this way: `private readonly logger = new Logger(MyService.name)`
@Injectable()
export class AFFiNELogger extends ConsoleLogger {}
