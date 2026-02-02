import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { NewAccountDTO } from '../common/dto/new-account.dto';
import { User } from '../database/entities/user.entity';
import {
  UserNotFoundException,
  BaseException,
} from '../common/exceptions/custom-exceptions';

/**
 * AuthController - User management endpoints
 * 
 * Fully compatible with the C# Controllers/AuthController.cs.
 * Route prefix: /api/Auth
 */
@ApiTags('Auth')
@Controller('api/Auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Health check endpoint
   * 
   * NOTE: Defined as /health-check in the C# project.
   * Kept here for backward compatibility.
   */
  @Get('/health-check')
  @ApiOperation({ 
    summary: 'Health Check',
    description: 'Checks whether the service is up and running.',
  })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 400, description: 'Service error' })
  healthCheck(): void {
    // Returns 200 OK
  }

  /**
   * Log test endpoint
   */
  @Get('/log-test')
  @ApiOperation({ 
    summary: 'Log Test',
    description: 'Tests the logging system.',
  })
  @ApiResponse({ status: 200, description: 'Log test successful' })
  @ApiResponse({ status: 400, description: 'Log test failed' })
  async logTest(): Promise<void> {
    try {
      this.logger.log('Health Check Inf');
      this.logger.warn('Health Check Warning');
      this.logger.error('Health Check Error');
      await this.authService.logTest();
    } catch (error) {
      throw new BaseException(error.message);
    }
  }

  /**
   * Creates a new Walmart account or updates an existing one
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Create or Update Account',
    description: `Creates a new Walmart account or updates an existing one.
    
**Workflow:**
1. Connects to the Walmart API using Client ID and Client Secret
2. Validates credentials by obtaining an access token
3. Stores user information in the database

**Scenarios:**
- New user: A new record is created
- Same accountId and storeId: Credentials are updated
- Same accountId, different storeId: Store is updated
- Different accountId, same clientId: Returns error (store belongs to another user)`,
  })
  @ApiBody({ type: NewAccountDTO })
  @ApiResponse({ 
    status: 200, 
    description: 'Account successfully created/updated',
    type: User,
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid credentials or store belongs to another user',
  })
  async createNewAccount(@Body() newAccount: NewAccountDTO): Promise<User> {
    try {
      const payload = JSON.stringify(newAccount);
      this.logger.log(`CreateNewAccount Request: ${payload}`);
      return await this.authService.createOrUpdateUser(newAccount);
    } catch (error) {
      this.logger.error(`CreateNewAccount. Error: ${error.message}`);
      // C# code returns only e.Message string for this endpoint (not BaseException)
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Soft deletes a Walmart account
   */
  @Delete(':accountId/:storeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Delete Account',
    description: `Soft deletes the specified Walmart account.
    
**NOTE:** This operation does not permanently delete the user; it only sets the IsDeleted flag to true.
This preserves historical orders and data.`,
  })
  @ApiParam({ 
    name: 'accountId', 
    description: 'ByeLabel Account ID',
    example: 'account-123',
  })
  @ApiParam({ 
    name: 'storeId', 
    description: 'ByeLabel Store ID',
    example: 'store-456',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Account successfully deleted',
    schema: {
      type: 'string',
      example: 'account-123',
    },
  })
  @ApiResponse({ 
    status: 400, 
    description: 'User not found or operation error',
  })
  async delete(
    @Param('accountId') accountId: string,
    @Param('storeId') storeId: string,
  ): Promise<string> {
    try {
      this.logger.log(`Delete Request: AccountId:${accountId} StoreId:${storeId}`);
      return await this.authService.delete(accountId, storeId);
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        this.logger.error('Delete. UserNotFoundException');
        throw new UserNotFoundException('User Not Found.');
      }
      this.logger.error(`Delete. Error: ${error.message}`);
      throw new BaseException(error.message);
    }
  }
}

/**
 * HealthController - Separate controller for root-level health check endpoint
 * 
 * In the C# project, /health-check is defined at the root level.
 */
@ApiTags('Health')
@Controller()
export class HealthController {
  @Get('health-check')
  @ApiOperation({ 
    summary: 'Health Check',
    description: 'Checks whether the service is up and running.',
  })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  healthCheck(): void {
    // Returns 200 OK
  }

  @Get('log-test')
  @ApiOperation({ 
    summary: 'Log Test',
    description: 'Tests the logging system.',
  })
  @ApiResponse({ status: 200, description: 'Log test successful' })
  async logTest(): Promise<void> {
    const logger = new Logger('LogTest');
    logger.log('Health Check Inf');
    logger.warn('Health Check Warning');
    logger.error('Health Check Error');
  }
}
