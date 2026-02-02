import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/database/entities/user.entity';
import { Repository } from 'typeorm';

/**
 * Auth Controller E2E Tests
 * 
 * C# projesindeki AuthController ile birebir uyumlu testler.
 * All endpoints and exception handling are tested.
 */
describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;

  // Mock AuthEndpointService
  const mockAuthEndpointService = {
    generateAccessToken: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('AuthEndpointService')
      .useValue(mockAuthEndpointService)
      .compile();

    app = moduleFixture.createNestApplication();
    
    // Global pipes and filters (C# uyumlu)
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
    }));
    app.useGlobalFilters(new HttpExceptionFilter());
    
    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Clear test database
    await userRepository.query('DELETE FROM "User"');
  });

  // ==========================================
  // HEALTH CHECK TESTS
  // ==========================================
  describe('GET /health-check', () => {
    it('should return 200 OK', async () => {
      const response = await request(app.getHttpServer())
        .get('/health-check')
        .expect(200);
      
      // C# project returns empty body
      expect(response.body).toEqual({});
    });
  });

  describe('GET /log-test', () => {
    it('should return 200 OK and log messages', async () => {
      const response = await request(app.getHttpServer())
        .get('/log-test')
        .expect(200);
      
      expect(response.body).toEqual({});
    });
  });

  // ==========================================
  // CREATE ACCOUNT TESTS
  // ==========================================
  describe('POST /api/Auth', () => {
    const validAccountDTO = {
      accountId: 'test-account-123',
      storeId: 'test-store-456',
      clientId: 'walmart-client-id',
      clientSecret: 'walmart-client-secret',
    };

    it('should create a new user when credentials are valid', async () => {
      // Mock successful token response
      mockAuthEndpointService.generateAccessToken.mockResolvedValue('valid-access-token');

      const response = await request(app.getHttpServer())
        .post('/api/Auth')
        .send(validAccountDTO)
        .expect(200);

      // Response validation
      expect(response.body).toHaveProperty('Id');
      expect(response.body.UserId).toBe(validAccountDTO.accountId);
      expect(response.body.StoreId).toBe(validAccountDTO.storeId);
      expect(response.body.ClientId).toBe(validAccountDTO.clientId);
      expect(response.body.IsDeleted).toBe(false);

      // Database validation
      const savedUser = await userRepository.findOne({
        where: { ClientId: validAccountDTO.clientId },
      });
      expect(savedUser).toBeDefined();
      expect(savedUser!.UserId).toBe(validAccountDTO.accountId);
    });

    it('should reauthorize existing user with same accountId and storeId', async () => {
      // First create user
      mockAuthEndpointService.generateAccessToken.mockResolvedValue('valid-access-token');
      
      await request(app.getHttpServer())
        .post('/api/Auth')
        .send(validAccountDTO)
        .expect(200);

      // Add same user again (reauthorize)
      const response = await request(app.getHttpServer())
        .post('/api/Auth')
        .send({
          ...validAccountDTO,
          clientSecret: 'new-secret', // Yeni secret
        })
        .expect(200);

      expect(response.body.UserId).toBe(validAccountDTO.accountId);
      expect(response.body.IsDeleted).toBe(false);

      // Should have single record in database
      const users = await userRepository.find({
        where: { ClientId: validAccountDTO.clientId },
      });
      expect(users.length).toBe(1);
    });

    it('should update storeId for same accountId with different storeId', async () => {
      mockAuthEndpointService.generateAccessToken.mockResolvedValue('valid-access-token');
      
      // First user
      await request(app.getHttpServer())
        .post('/api/Auth')
        .send(validAccountDTO)
        .expect(200);

      // Same accountId, different storeId
      const newStoreId = 'new-store-789';
      const response = await request(app.getHttpServer())
        .post('/api/Auth')
        .send({
          ...validAccountDTO,
          storeId: newStoreId,
        })
        .expect(200);

      expect(response.body.StoreId).toBe(newStoreId);
    });

    it('should return error when Walmart store is in use by another user', async () => {
      mockAuthEndpointService.generateAccessToken.mockResolvedValue('valid-access-token');
      
      // First user
      await request(app.getHttpServer())
        .post('/api/Auth')
        .send(validAccountDTO)
        .expect(200);

      // Different accountId, same clientId
      const response = await request(app.getHttpServer())
        .post('/api/Auth')
        .send({
          ...validAccountDTO,
          accountId: 'different-account',
        })
        .expect(400);

      // C# format plain string error
      expect(response.body).toBe('Walmart store is in use by another user.');
    });

    it('should return error when clientId is empty', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/Auth')
        .send({
          ...validAccountDTO,
          clientId: '',
        })
        .expect(400);

      // C# format plain string error
      expect(typeof response.body).toBe('string');
    });

    it('should return error when clientSecret is empty', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/Auth')
        .send({
          ...validAccountDTO,
          clientSecret: '',
        })
        .expect(400);

      expect(typeof response.body).toBe('string');
    });

    it('should return error when access token generation fails', async () => {
      mockAuthEndpointService.generateAccessToken.mockRejectedValue(
        new Error('AuthError: Invalid credentials')
      );

      const response = await request(app.getHttpServer())
        .post('/api/Auth')
        .send(validAccountDTO)
        .expect(400);

      // C# format plain string error
      expect(typeof response.body).toBe('string');
      expect(response.body).toContain('AuthError');
    });

    it('should soft delete user when error occurs after finding existing user', async () => {
      mockAuthEndpointService.generateAccessToken
        .mockResolvedValueOnce('valid-access-token') // First call succeeds
        .mockRejectedValueOnce(new Error('Token error')); // Second call fails

      // First user succeeds
      await request(app.getHttpServer())
        .post('/api/Auth')
        .send(validAccountDTO)
        .expect(200);

      // Second call errors - user should be soft deleted
      await request(app.getHttpServer())
        .post('/api/Auth')
        .send(validAccountDTO)
        .expect(400);

      const user = await userRepository.findOne({
        where: { ClientId: validAccountDTO.clientId },
      });
      expect(user).toBeDefined();
      expect(user!.IsDeleted).toBe(true);
    });

    it('should trim clientId and clientSecret', async () => {
      mockAuthEndpointService.generateAccessToken.mockResolvedValue('valid-access-token');

      await request(app.getHttpServer())
        .post('/api/Auth')
        .send({
          ...validAccountDTO,
          clientId: '  trimmed-client-id  ',
          clientSecret: '  trimmed-secret  ',
        })
        .expect(200);

      // generateAccessToken should be called with trimmed values
      expect(mockAuthEndpointService.generateAccessToken).toHaveBeenCalledWith(
        'trimmed-client-id',
        'trimmed-secret'
      );
    });
  });

  // ==========================================
  // DELETE ACCOUNT TESTS
  // ==========================================
  describe('DELETE /api/Auth/:accountId/:storeId', () => {
    const testUser = {
      UserId: 'delete-test-user',
      StoreId: 'delete-test-store',
      ClientId: 'delete-test-client',
      ClientSecret: 'delete-test-secret',
      IsDeleted: false,
    };

    beforeEach(async () => {
      // Create test user
      await userRepository.save(userRepository.create(testUser));
    });

    it('should soft delete existing user and return userId', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/Auth/${testUser.UserId}/${testUser.StoreId}`)
        .expect(200);

      // C# project returns userId string
      expect(response.body).toBe(testUser.UserId);

      // IsDeleted should be true in database
      const deletedUser = await userRepository.findOne({
        where: { ClientId: testUser.ClientId },
      });
      expect(deletedUser).toBeDefined();
      expect(deletedUser!.IsDeleted).toBe(true);
    });

    it('should return userId when user not found (C# uyumlu)', async () => {
      const nonExistentUserId = 'non-existent-user';
      const nonExistentStoreId = 'non-existent-store';

      const response = await request(app.getHttpServer())
        .delete(`/api/Auth/${nonExistentUserId}/${nonExistentStoreId}`)
        .expect(200);

      // C# project returns userId even if user not found
      expect(response.body).toBe(nonExistentUserId);
    });

    it('should not delete already deleted user', async () => {
      // First soft delete
      await request(app.getHttpServer())
        .delete(`/api/Auth/${testUser.UserId}/${testUser.StoreId}`)
        .expect(200);

      // Delete again - user already deleted, not found
      const response = await request(app.getHttpServer())
        .delete(`/api/Auth/${testUser.UserId}/${testUser.StoreId}`)
        .expect(200);

      expect(response.body).toBe(testUser.UserId);
    });

    it('should handle URL encoded parameters', async () => {
      const specialUserId = 'user/with/slashes';
      const specialStoreId = 'store with spaces';

      const response = await request(app.getHttpServer())
        .delete(`/api/Auth/${encodeURIComponent(specialUserId)}/${encodeURIComponent(specialStoreId)}`)
        .expect(200);

      expect(response.body).toBe(specialUserId);
    });
  });
});
