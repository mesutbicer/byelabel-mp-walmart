import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { NewAccountDTO } from '../common/dto/new-account.dto';
import { AuthEndpointService } from './auth-endpoint.service';
import { UserNotFoundException } from '../common/exceptions/custom-exceptions';

/**
 * AuthService - User management business logic
 * 
 * Fully compatible with the C# Services/AuthService.cs.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly authEndpointService: AuthEndpointService,
  ) {}

  /**
   * Creates a new user or updates an existing one
   * 
   * @param newAccountDTO - New account details
   * @returns Created/updated user
   */
  async createOrUpdateUser(newAccountDTO: NewAccountDTO): Promise<User> {
    try {
      if (!newAccountDTO.clientId || !newAccountDTO.clientSecret) {
        throw new Error('ClientID/ClientSecret cannot be null');
      }

      // Trim credentials
      newAccountDTO.clientId = newAccountDTO.clientId.trim();
      newAccountDTO.clientSecret = newAccountDTO.clientSecret.trim();

      // Validate credentials by generating access token
      const accessToken = await this.generateAccessToken(
        newAccountDTO.clientId,
        newAccountDTO.clientSecret,
      );

      if (!accessToken) {
        throw new Error('Access Token not reacheable');
      }

      // Check for existing user by ClientId
      let user = await this.userRepository.findOne({
        where: { ClientId: newAccountDTO.clientId },
      });

      // Existing user scenarios
      if (user) {
        // Reauthorize - same account and store
        if (user.UserId === newAccountDTO.accountId && user.StoreId === newAccountDTO.storeId) {
          user.ClientSecret = newAccountDTO.clientSecret;
          user.IsDeleted = false;
          await this.userRepository.save(user);
          return user;
        }

        // Same account, new store
        if (user.UserId === newAccountDTO.accountId) {
          user.StoreId = newAccountDTO.storeId;
          user.ClientSecret = newAccountDTO.clientSecret;
          user.IsDeleted = false;
          await this.userRepository.save(user);
          return user;
        }

        // Different account trying to use same Walmart store
        throw new Error('Walmart store is in use by another user.');
      }

      // Create new user
      const newUser = this.userRepository.create({
        UserId: newAccountDTO.accountId,
        StoreId: newAccountDTO.storeId,
        ClientId: newAccountDTO.clientId,
        ClientSecret: newAccountDTO.clientSecret,
        IsDeleted: false,
      });

      await this.userRepository.save(newUser);
      return newUser;
    } catch (error) {
      // Mark user as deleted on error
      const user = await this.userRepository.findOne({
        where: {
          UserId: newAccountDTO.accountId,
          ClientId: newAccountDTO.clientId,
        },
      });

      if (user) {
        user.IsDeleted = true;
        await this.userRepository.save(user);
      }

      throw error;
    }
  }

  /**
   * Generates an access token
   * 
   * @param clientId - Walmart Client ID
   * @param clientSecret - Walmart Client Secret
   * @returns Access token
   */
  async generateAccessToken(clientId: string, clientSecret: string): Promise<string> {
    try {
      return await this.authEndpointService.generateAccessToken(clientId, clientSecret);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Soft deletes a user
   * 
   * @param userId - ByeLabel User ID
   * @param storeId - ByeLabel Store ID
   * @returns Deleted user's ID
   */
  async delete(userId: string, storeId: string): Promise<string> {
    try {
      const user = await this.userRepository.findOne({
        where: {
          UserId: userId,
          StoreId: storeId,
          IsDeleted: false,
        },
      });

      if (!user) {
        return userId;
      }

      user.IsDeleted = true;
      await this.userRepository.save(user);

      return user.UserId;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Log test
   */
  async logTest(): Promise<void> {
    this.logger.warn('Service Health Check Warning');
  }
}
