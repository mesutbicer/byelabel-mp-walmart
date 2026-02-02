import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/database/entities/user.entity';
import { Repository } from 'typeorm';

/**
 * Exception Handling E2E Tests
 * 
 * Compatibility tests with C# project exception formats.
 * 
 * C# Exception Formats:
 * - CreateNewAccount: BadRequest(e.Message) → sadece string
 * - Others: BadRequest(new BaseException()) → {Message, code}
 * - UserNotFoundException: {Message: "User Not Found.", code: "USER_NOT_FOUND"}
 */
describe('Exception Handling (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;

  const mockAuthEndpointService = {
    generateAccessToken: jest.fn(),
  };

  const mockOrderEndpointService = {
    fetchOrdersByAfterDate: jest.fn(),
    fetchOrderByPurchaseOrderId: jest.fn(),
    dispatchOrder: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('AuthEndpointService')
      .useValue(mockAuthEndpointService)
      .overrideProvider('OrderEndpointService')
      .useValue(mockOrderEndpointService)
      .compile();

    app = moduleFixture.createNestApplication();
    
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
    jest.clearAllMocks();
    await userRepository.query('DELETE FROM "User"');
  });

  // ==========================================
  // C# CREATENEACCOUNT ERROR FORMAT TEST
  // ==========================================
  describe('CreateNewAccount Error Format (Plain String)', () => {
    it('should return plain string for ClientID/ClientSecret null error', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/Auth')
        .send({
          accountId: 'test',
          storeId: 'test',
          clientId: '', // Empty
          clientSecret: 'secret',
        })
        .expect(400);

      // C# behavior: BadRequest(e.Message) → string
      expect(typeof response.body).toBe('string');
      // Check message content
      expect(response.body).toContain('clientId');
    });

    it('should return plain string for auth error', async () => {
      mockAuthEndpointService.generateAccessToken.mockRejectedValue(
        new Error('AuthError: Invalid credentials')
      );

      const response = await request(app.getHttpServer())
        .post('/api/Auth')
        .send({
          accountId: 'test',
          storeId: 'test',
          clientId: 'client',
          clientSecret: 'secret',
        })
        .expect(400);

      // Must be plain string
      expect(typeof response.body).toBe('string');
      expect(response.body).toContain('AuthError');
    });

    it('should return plain string for "store in use" error', async () => {
      mockAuthEndpointService.generateAccessToken.mockResolvedValue('token');

      // First user
      await request(app.getHttpServer())
        .post('/api/Auth')
        .send({
          accountId: 'user1',
          storeId: 'store1',
          clientId: 'shared-client',
          clientSecret: 'secret',
        })
        .expect(200);

      // Different accountId, same clientId
      const response = await request(app.getHttpServer())
        .post('/api/Auth')
        .send({
          accountId: 'user2', // Different!
          storeId: 'store2',
          clientId: 'shared-client', // Same!
          clientSecret: 'secret',
        })
        .expect(400);

      expect(typeof response.body).toBe('string');
      expect(response.body).toBe('Walmart store is in use by another user.');
    });
  });

  // ==========================================
  // C# USERNOTFOUNDEXCEPTION FORMAT TEST
  // ==========================================
  describe('UserNotFoundException Format ({Message, code})', () => {
    it('should return {Message, code} for Order endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/Order/invalid/invalid/0')
        .expect(400);

      // C# format: {Message: "...", code: "USER_NOT_FOUND"}
      expect(response.body).toEqual({
        Message: 'User Not Found.',
        code: 'USER_NOT_FOUND',
      });
    });

    it('should return {Message, code} for GetOrderFromApiByPurchaseOrderId', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/Order/GetOrderFromApiByPurchaseOrderId/invalid/invalid/123')
        .expect(400);

      expect(response.body.Message).toBe('User Not Found.');
      expect(response.body.code).toBe('USER_NOT_FOUND');
    });

    it('should return {Message, code} for DispatchOrder', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/Order/DispatchOrder')
        .send({
          orderId: '123',
          userId: 'invalid',
          storeId: 'invalid',
          shippingLines: [
            {
              carrierName: 'UPS',
              methodCode: 'Standard',
              trackingNumber: '123',
              shipDateTime: Date.now(),
            },
          ],
        })
        .expect(400);

      expect(response.body.Message).toBe('User Not Found.');
      expect(response.body.code).toBe('USER_NOT_FOUND');
    });
  });

  // ==========================================
  // C# BASEEXCEPTION FORMAT TEST
  // ==========================================
  describe('BaseException Format ({Message, code: "GENERAL"})', () => {
    it('should return {Message, code: "GENERAL"} for order not found', async () => {
      // Create user but no orders
      await userRepository.save(userRepository.create({
        UserId: 'test-user',
        StoreId: 'test-store',
        ClientId: 'test-client',
        ClientSecret: 'test-secret',
        IsDeleted: false,
      }));

      const response = await request(app.getHttpServer())
        .post('/api/Order/DispatchOrder')
        .send({
          orderId: 'non-existent-order',
          userId: 'test-user',
          storeId: 'test-store',
          shippingLines: [
            {
              carrierName: 'UPS',
              methodCode: 'Standard',
              trackingNumber: '123',
              shipDateTime: Date.now(),
            },
          ],
        })
        .expect(400);

      // C# format: {Message: "...", code: "GENERAL"}
      expect(response.body.Message).toBe('Order Not Found');
      expect(response.body.code).toBe('GENERAL');
    });

    it('should return {Message, code: "GENERAL"} for carrier validation error', async () => {
      await userRepository.save(userRepository.create({
        UserId: 'test-user',
        StoreId: 'test-store',
        ClientId: 'test-client',
        ClientSecret: 'test-secret',
        IsDeleted: false,
      }));

      const response = await request(app.getHttpServer())
        .post('/api/Order/DispatchOrder')
        .send({
          orderId: '123',
          userId: 'test-user',
          storeId: 'test-store',
          shippingLines: [
            {
              carrierName: 'UPS', // Known carrier
              methodCode: 'Standard',
              trackingNumber: '', // Missing!
              trackingURL: '',
              shipDateTime: Date.now(),
            },
          ],
        })
        .expect(400);

      expect(response.body.code).toBe('GENERAL');
      expect(response.body.Message).toContain('Tracking');
    });

    it('should return {Message, code: "GENERAL"} for Walmart API errors', async () => {
      await userRepository.save(userRepository.create({
        UserId: 'test-user',
        StoreId: 'test-store',
        ClientId: 'test-client',
        ClientSecret: 'test-secret',
        IsDeleted: false,
      }));

      mockAuthEndpointService.generateAccessToken.mockResolvedValue('token');
      mockOrderEndpointService.fetchOrderByPurchaseOrderId.mockRejectedValue(
        new Error('Walmart API Error: Rate limit exceeded')
      );

      const response = await request(app.getHttpServer())
        .get('/api/Order/GetOrderFromApiByPurchaseOrderId/test-user/test-store/123')
        .expect(400);

      expect(response.body.code).toBe('GENERAL');
      expect(response.body.Message).toContain('Walmart API Error');
    });
  });

  // ==========================================
  // HTTP STATUS CODE TESTS
  // ==========================================
  describe('HTTP Status Codes', () => {
    it('UserNotFoundException should return 400 (not 404)', async () => {
      await request(app.getHttpServer())
        .get('/api/Order/invalid/invalid/0')
        .expect(400); // C# ile uyumlu: 400
    });

    it('BaseException should return 400', async () => {
      await userRepository.save(userRepository.create({
        UserId: 'test',
        StoreId: 'test',
        ClientId: 'test',
        ClientSecret: 'test',
        IsDeleted: false,
      }));

      await request(app.getHttpServer())
        .post('/api/Order/DispatchOrder')
        .send({
          orderId: 'non-existent',
          userId: 'test',
          storeId: 'test',
          shippingLines: [{
            carrierName: 'UPS',
            methodCode: 'Standard',
            trackingNumber: '123',
            shipDateTime: Date.now(),
          }],
        })
        .expect(400);
    });

    it('Health check should return 200', async () => {
      await request(app.getHttpServer())
        .get('/health-check')
        .expect(200);
    });

    it('Successful create should return 200 (not 201)', async () => {
      mockAuthEndpointService.generateAccessToken.mockResolvedValue('token');

      await request(app.getHttpServer())
        .post('/api/Auth')
        .send({
          accountId: 'test',
          storeId: 'test',
          clientId: 'test-client',
          clientSecret: 'test-secret',
        })
        .expect(200); // C# compatible: 200 (not 201)
    });

    it('Successful delete should return 200', async () => {
      await request(app.getHttpServer())
        .delete('/api/Auth/any/any')
        .expect(200);
    });
  });

  // ==========================================
  // CASE SENSITIVITY TESTS
  // ==========================================
  describe('Response Property Case Sensitivity', () => {
    it('Exception Message should be PascalCase (C# compatible)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/Order/invalid/invalid/0')
        .expect(400);

      // "Message" (capital M) required, NOT "message" (lowercase m)
      expect(response.body).toHaveProperty('Message');
      expect(response.body).not.toHaveProperty('message');
    });

    it('Exception code should be lowercase', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/Order/invalid/invalid/0')
        .expect(400);

      // "code" (lowercase c) required
      expect(response.body).toHaveProperty('code');
      expect(response.body).not.toHaveProperty('Code');
    });
  });
});
