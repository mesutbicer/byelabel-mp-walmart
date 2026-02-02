import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/database/entities/user.entity';
import { Order } from '../src/database/entities/order.entity';
import { OrderLine } from '../src/database/entities/order-line.entity';
import { ShippingInfo } from '../src/database/entities/shipping-info.entity';
import { Repository } from 'typeorm';

/**
 * Order Controller E2E Tests
 * 
 * C# projesindeki OrderController ile birebir uyumlu testler.
 * All endpoints and exception handling are tested.
 */
describe('OrderController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let orderRepository: Repository<Order>;
  let orderLineRepository: Repository<OrderLine>;
  let shippingInfoRepository: Repository<ShippingInfo>;

  // Mock Services
  const mockAuthEndpointService = {
    generateAccessToken: jest.fn(),
  };

  const mockOrderEndpointService = {
    fetchOrdersByAfterDate: jest.fn(),
    fetchOrderByPurchaseOrderId: jest.fn(),
    dispatchOrder: jest.fn(),
  };

  // Test Data
  const testUser = {
    UserId: 'test-user-123',
    StoreId: 'test-store-456',
    ClientId: 'test-client-id',
    ClientSecret: 'test-client-secret',
    IsDeleted: false,
  };

  const testShippingInfo = {
    phone: '555-1234',
    estimatedDeliveryDate: 1704153600000,
    estimatedShipDate: 1704067200000,
    methodCode: 'Standard',
    postalAddress_name: 'John Doe',
    postalAddress_address1: '123 Main St',
    postalAddress_city: 'New York',
    postalAddress_state: 'NY',
    postalAddress_postalCode: '10001',
    postalAddress_country: 'US',
  };

  const testOrder = {
    clientId: 'test-client-id',
    storeId: 'test-store-456',
    purchaseOrderId: '1234567890123',
    customerOrderId: 'CUST-ORDER-001',
    customerEmailId: 'customer@test.com',
    orderType: 'REGULAR',
    orderDate: 1704067200000,
    orderLocalUpdateDate: Date.now(),
  };

  const testOrderLine = {
    lineNumber: '1',
    item_productName: 'Test Product',
    item_sku: 'SKU-001',
    orderLineQuantity_unitOfMeasurement: 'EACH',
    orderLineQuantity_amount: '2',
    statusDate: 1704067200000,
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
    orderRepository = moduleFixture.get<Repository<Order>>(getRepositoryToken(Order));
    orderLineRepository = moduleFixture.get<Repository<OrderLine>>(getRepositoryToken(OrderLine));
    shippingInfoRepository = moduleFixture.get<Repository<ShippingInfo>>(getRepositoryToken(ShippingInfo));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    // Clear tables (respect foreign key order)
    await orderLineRepository.query('DELETE FROM "OrderLine"');
    await orderRepository.query('DELETE FROM "Orders"');
    await shippingInfoRepository.query('DELETE FROM "ShippingInfo"');
    await userRepository.query('DELETE FROM "User"');
  });

  // Helper: Create test user and order
  async function createTestUserWithOrder() {
    const user = await userRepository.save(userRepository.create(testUser));
    
    const shippingInfo = await shippingInfoRepository.save(
      shippingInfoRepository.create(testShippingInfo)
    );

    const order = await orderRepository.save(
      orderRepository.create({
        ...testOrder,
        shippingInfoid: shippingInfo.id,
      })
    );

    const orderLine = await orderLineRepository.save(
      orderLineRepository.create({
        ...testOrderLine,
        Orderid: order.id,
      })
    );

    return { user, order, orderLine, shippingInfo };
  }

  // ==========================================
  // GET ORDERS AFTER DATE TESTS
  // ==========================================
  describe('GET /api/Order/:accountId/:storeId/:lastUpdateDate', () => {
    it('should return orders after specified date', async () => {
      await createTestUserWithOrder();

      const lastUpdateDate = 0; // Get all orders
      const response = await request(app.getHttpServer())
        .get(`/api/Order/${testUser.UserId}/${testUser.StoreId}/${lastUpdateDate}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('orderId');
      expect(response.body[0]).toHaveProperty('shippingInfo');
      expect(response.body[0]).toHaveProperty('orderLines');
    });

    it('should return empty array when no orders match date filter', async () => {
      await createTestUserWithOrder();

      const futureDate = Date.now() + 86400000; // Tomorrow
      const response = await request(app.getHttpServer())
        .get(`/api/Order/${testUser.UserId}/${testUser.StoreId}/${futureDate}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return 400 with UserNotFoundException when user not found', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/Order/non-existent-user/non-existent-store/0')
        .expect(400);

      // C# format {Message, code} object
      expect(response.body).toHaveProperty('Message');
      expect(response.body).toHaveProperty('code');
      expect(response.body.Message).toBe('User Not Found.');
      expect(response.body.code).toBe('USER_NOT_FOUND');
    });

    it('should return 400 when user is deleted', async () => {
      await userRepository.save(userRepository.create({
        ...testUser,
        IsDeleted: true, // Deleted user
      }));

      const response = await request(app.getHttpServer())
        .get(`/api/Order/${testUser.UserId}/${testUser.StoreId}/0`)
        .expect(400);

      expect(response.body.code).toBe('USER_NOT_FOUND');
    });

    it('should sync orders from Walmart when no orders exist', async () => {
      // Only create user, no orders
      await userRepository.save(userRepository.create(testUser));

      // Mock Walmart API response
      mockAuthEndpointService.generateAccessToken.mockResolvedValue('access-token');
      mockOrderEndpointService.fetchOrdersByAfterDate.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get(`/api/Order/${testUser.UserId}/${testUser.StoreId}/0`)
        .expect(200);

      // Walmart API should be called
      expect(mockOrderEndpointService.fetchOrdersByAfterDate).toHaveBeenCalled();
    });
  });

  describe('GET /api/Order/GetOrdersAfterDate/:accountId/:storeId/:lastUpdateDate', () => {
    it('should work same as alternative route', async () => {
      await createTestUserWithOrder();

      const response = await request(app.getHttpServer())
        .get(`/api/Order/GetOrdersAfterDate/${testUser.UserId}/${testUser.StoreId}/0`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ==========================================
  // GET ORDER BY PURCHASE ORDER ID TESTS
  // ==========================================
  describe('GET /api/Order/GetOrderFromApiByPurchaseOrderId/:accountId/:storeId/:purchaseOrderId', () => {
    it('should fetch and return order from Walmart API', async () => {
      await userRepository.save(userRepository.create(testUser));

      // Mock Walmart API response
      const mockWalmartOrder = {
        purchaseOrderId: '9999999999',
        customerOrderId: 'WALMART-001',
        orderDate: 1704067200000,
        shippingInfo: {
          phone: '555-5555',
          postalAddress: {
            name: 'Test User',
            address1: '456 Test St',
            city: 'Los Angeles',
            state: 'CA',
            postalCode: '90001',
            country: 'US',
          },
        },
        orderLines: {
          orderLine: [
            {
              lineNumber: '1',
              item: { productName: 'Walmart Product', sku: 'WM-001' },
              orderLineQuantity: { unitOfMeasurement: 'EACH', amount: '1' },
              charges: { charge: [] },
              orderLineStatuses: { orderLineStatus: [] },
            },
          ],
        },
      };

      mockAuthEndpointService.generateAccessToken.mockResolvedValue('access-token');
      mockOrderEndpointService.fetchOrderByPurchaseOrderId.mockResolvedValue(mockWalmartOrder);

      const response = await request(app.getHttpServer())
        .get(`/api/Order/GetOrderFromApiByPurchaseOrderId/${testUser.UserId}/${testUser.StoreId}/9999999999`)
        .expect(200);

      expect(response.body).toHaveProperty('orderId');
      expect(mockOrderEndpointService.fetchOrderByPurchaseOrderId).toHaveBeenCalledWith(
        'access-token',
        '9999999999'
      );
    });

    it('should return 400 when user not found', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/Order/GetOrderFromApiByPurchaseOrderId/invalid/invalid/123')
        .expect(400);

      expect(response.body.code).toBe('USER_NOT_FOUND');
    });

    it('should return 400 when Walmart API fails', async () => {
      await userRepository.save(userRepository.create(testUser));

      mockAuthEndpointService.generateAccessToken.mockResolvedValue('access-token');
      mockOrderEndpointService.fetchOrderByPurchaseOrderId.mockRejectedValue(
        new Error('Walmart API Error')
      );

      const response = await request(app.getHttpServer())
        .get(`/api/Order/GetOrderFromApiByPurchaseOrderId/${testUser.UserId}/${testUser.StoreId}/123`)
        .expect(400);

      // C# format BaseException
      expect(response.body).toHaveProperty('Message');
      expect(response.body).toHaveProperty('code');
      expect(response.body.code).toBe('GENERAL');
    });
  });

  // ==========================================
  // DISPATCH ORDER TESTS
  // ==========================================
  describe('POST /api/Order/DispatchOrder', () => {
    const validShippingDTO = {
      orderId: '1234567890123',
      userId: testUser.UserId,
      storeId: testUser.StoreId,
      shippingLines: [
        {
          orderItemId: '1',
          orderItemQuantity: 2,
          shipDateTime: 1704067200000,
          carrierName: 'UPS', // Known carrier
          methodCode: 'Standard',
          trackingNumber: '1Z999AA10123456784',
          trackingURL: '',
        },
      ],
    };

    it('should dispatch order successfully with known carrier', async () => {
      await createTestUserWithOrder();

      mockAuthEndpointService.generateAccessToken.mockResolvedValue('access-token');
      mockOrderEndpointService.dispatchOrder.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .post('/api/Order/DispatchOrder')
        .send(validShippingDTO)
        .expect(200);

      expect(mockOrderEndpointService.dispatchOrder).toHaveBeenCalled();
    });

    it('should dispatch order successfully with unknown carrier and trackingURL', async () => {
      await createTestUserWithOrder();

      mockAuthEndpointService.generateAccessToken.mockResolvedValue('access-token');
      mockOrderEndpointService.dispatchOrder.mockResolvedValue(undefined);

      const unknownCarrierDTO = {
        ...validShippingDTO,
        shippingLines: [
          {
            ...validShippingDTO.shippingLines[0],
            carrierName: 'MyLocalCarrier', // Unknown carrier
            trackingNumber: '',
            trackingURL: 'https://mycarrier.com/track/123', // URL required
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/api/Order/DispatchOrder')
        .send(unknownCarrierDTO)
        .expect(200);
    });

    it('should return 400 when known carrier without trackingNumber', async () => {
      await createTestUserWithOrder();

      const invalidDTO = {
        ...validShippingDTO,
        shippingLines: [
          {
            ...validShippingDTO.shippingLines[0],
            carrierName: 'UPS', // Known carrier
            trackingNumber: '', // Missing!
            trackingURL: '',
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/api/Order/DispatchOrder')
        .send(invalidDTO)
        .expect(400);

      // C# error message
      expect(response.body.Message).toBe(
        'Known Carrier Name - TrackingNumber or Unknown Carrier Name - Tracking Url pairs are required.'
      );
    });

    it('should return 400 when unknown carrier without trackingURL', async () => {
      await createTestUserWithOrder();

      const invalidDTO = {
        ...validShippingDTO,
        shippingLines: [
          {
            ...validShippingDTO.shippingLines[0],
            carrierName: 'UnknownCarrier', // Unknown carrier
            trackingNumber: '', // Not enough for unknown
            trackingURL: '', // Missing!
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/api/Order/DispatchOrder')
        .send(invalidDTO)
        .expect(400);

      expect(response.body.Message).toContain('Tracking Url pairs are required');
    });

    it('should return 400 when user not found', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/Order/DispatchOrder')
        .send({
          ...validShippingDTO,
          userId: 'non-existent',
          storeId: 'non-existent',
        })
        .expect(400);

      expect(response.body.code).toBe('USER_NOT_FOUND');
    });

    it('should return 400 when order not found', async () => {
      await userRepository.save(userRepository.create(testUser));

      const response = await request(app.getHttpServer())
        .post('/api/Order/DispatchOrder')
        .send({
          ...validShippingDTO,
          orderId: 'non-existent-order',
        })
        .expect(400);

      expect(response.body.Message).toBe('Order Not Found');
    });

    it('should map carrier names correctly', async () => {
      await createTestUserWithOrder();

      mockAuthEndpointService.generateAccessToken.mockResolvedValue('access-token');
      mockOrderEndpointService.dispatchOrder.mockResolvedValue(undefined);

      // Test each known carrier
      const carriers = ['ups', 'UPS', 'fedex', 'FedEx', 'dhl', 'usps', 'asendia'];
      
      for (const carrier of carriers) {
        await request(app.getHttpServer())
          .post('/api/Order/DispatchOrder')
          .send({
            ...validShippingDTO,
            shippingLines: [
              {
                ...validShippingDTO.shippingLines[0],
                carrierName: carrier,
                trackingNumber: '12345',
              },
            ],
          })
          .expect(200);
      }
    });

    it('should find order by customerOrderId', async () => {
      await createTestUserWithOrder();

      mockAuthEndpointService.generateAccessToken.mockResolvedValue('access-token');
      mockOrderEndpointService.dispatchOrder.mockResolvedValue(undefined);

      // customerOrderId ile ara
      await request(app.getHttpServer())
        .post('/api/Order/DispatchOrder')
        .send({
          ...validShippingDTO,
          orderId: 'CUST-ORDER-001', // customerOrderId
        })
        .expect(200);
    });
  });

  // ==========================================
  // ORDER DTO FORMAT TESTS
  // ==========================================
  describe('Order DTO Format Validation', () => {
    it('should return correct DTO structure', async () => {
      await createTestUserWithOrder();

      const response = await request(app.getHttpServer())
        .get(`/api/Order/${testUser.UserId}/${testUser.StoreId}/0`)
        .expect(200);

      const order = response.body[0];

      // DTO structure validation
      expect(order).toHaveProperty('orderId');
      expect(order).toHaveProperty('accountId');
      expect(order).toHaveProperty('status');
      expect(order).toHaveProperty('purchaseOrderId');
      expect(order).toHaveProperty('customerOrderId');
      expect(order).toHaveProperty('orderDate');
      expect(order).toHaveProperty('shippingInfo');
      expect(order).toHaveProperty('orderLines');

      // ShippingInfo structure
      if (order.shippingInfo) {
        expect(order.shippingInfo).toHaveProperty('phone');
        expect(order.shippingInfo).toHaveProperty('postalAddress');
      }

      // OrderLines structure
      if (order.orderLines && order.orderLines.length > 0) {
        const line = order.orderLines[0];
        expect(line).toHaveProperty('lineNumber');
        expect(line).toHaveProperty('item');
        expect(line).toHaveProperty('quantity');
      }
    });
  });
});
