import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { OrderService } from '../order/order.service';

/**
 * FetchOrderSchedule - Periodic order sync service
 * 
 * Fully compatible with the C# Services/Schedule/FetchOrderSchedule.cs.
 * 
 * Syncs all active users' orders from the Walmart API every 10 minutes.
 * 
 * Features:
 * - Batch processing (default: 25 users/batch)
 * - Concurrent execution (default: max 5 parallel tasks)
 * - Controlled by environment flag (ENABLE_SCHEDULED_JOBS)
 */
@Injectable()
export class FetchOrderScheduleService implements OnModuleInit {
  private readonly logger = new Logger(FetchOrderScheduleService.name);
  private readonly isEnabled: boolean;
  private readonly batchSize: number;
  private readonly maxConcurrency: number;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly orderService: OrderService,
    private readonly configService: ConfigService,
  ) {
    this.isEnabled = this.configService.get<string>('ENABLE_SCHEDULED_JOBS', 'false') === 'true';
    this.batchSize = this.configService.get<number>('BATCH_SIZE', 25);
    this.maxConcurrency = this.configService.get<number>('MAX_CONCURRENCY', 5);
  }

  onModuleInit() {
    if (this.isEnabled) {
      this.logger.log('Scheduled order sync is ENABLED');
      this.logger.log(`Batch size: ${this.batchSize}, Max concurrency: ${this.maxConcurrency}`);
    } else {
      this.logger.log('Scheduled order sync is DISABLED (set ENABLE_SCHEDULED_JOBS=true to enable)');
    }
  }

  /**
   * Order sync task that runs every 10 minutes
   * 
   * Cron: Every 10 minutes (at 0, 10, 20, 30, 40, 50 minutes)
   */
  @Cron('*/60 * * * * *')  // every 60 seconds (for testing purposes)
  // @Cron('0 */10 * * * *')  // every 10 minutes (production)
  //@Cron(CronExpression.EVERY_10_MINUTES)
  async handleOrderSync(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    this.logger.log('Starting scheduled order sync...');

    try {
      // Get all active users
      const allActiveUsers = await this.userRepository.find({
        where: { IsDeleted: false },
      });

      this.logger.log(`Found ${allActiveUsers.length} active users`);

      // Split users into batches
      const userBatches = this.chunkArray(allActiveUsers, this.batchSize);

      for (const batch of userBatches) {
        await this.processBatch(batch);
      }

      this.logger.log('Scheduled order sync completed');
    } catch (error) {
      this.logger.error(`Scheduled order sync failed: ${error.message}`);
    }
  }

  /**
   * Processes a batch of users (concurrently)
   */
  private async processBatch(users: User[]): Promise<void> {
    const semaphore = new Semaphore(this.maxConcurrency);
    const promises: Promise<void>[] = [];

    for (const user of users) {
      const promise = semaphore.acquire().then(async (release) => {
        try {
          await this.orderService.syncOrdersFromWalmart(user);
        } catch (error) {
          this.logger.error(
            `Error syncing orders for user ${user.Id}: ${error.message}`,
          );
        } finally {
          release();
        }
      });

      promises.push(promise);
    }

    await Promise.all(promises);
  }

  /**
   * Splits an array into chunks of a specified size
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

/**
 * Basit Semaphore implementasyonu
 * Used to limit the number of concurrent operations
 */
class Semaphore {
  private permits: number;
  private waitingQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<() => void> {
    if (this.permits > 0) {
      this.permits--;
      return () => this.release();
    }

    return new Promise<() => void>((resolve) => {
      this.waitingQueue.push(() => {
        this.permits--;
        resolve(() => this.release());
      });
    });
  }

  private release(): void {
    this.permits++;
    const next = this.waitingQueue.shift();
    if (next) {
      next();
    }
  }
}
