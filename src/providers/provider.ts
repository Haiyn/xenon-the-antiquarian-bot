import { inject, injectable } from 'inversify';
import { Redis } from 'ioredis';
import { Logger } from 'tslog';
import { TYPES } from '@src/types';

@injectable()
export class Provider {
    protected readonly redisClient: Redis;
    protected readonly logger: Logger;

    constructor(
        @inject(TYPES.RedisClient) redisClient: Redis,
        @inject(TYPES.ProviderLogger) logger: Logger
    ) {
        this.redisClient = redisClient;
        this.logger = logger;
    }
}