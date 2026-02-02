import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Logger,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { OrderService } from './order.service';
import { OrderDTO, ShippingDTO, ShippingLineDTO } from '../common/dto';
import {
  UserNotFoundException,
  BaseException,
} from '../common/exceptions/custom-exceptions';

/**
 * OrderController - Order management endpoints
 * 
 * Fully compatible with the C# Controllers/OrderController.cs.
 */
@ApiTags('Order')
@Controller('api/Order')
export class OrderController {
  private readonly logger = new Logger(OrderController.name);

  constructor(private readonly orderService: OrderService) {}

  /**
   * Returns orders updated after the specified date (Alternative Route)
   */
  @Get(':accountId/:storeId/:lastUpdateDate')
  @ApiOperation({
    summary: 'Get orders updated after a specified date',
    description: `
Returns all orders updated after the specified date.

**On first call**: If the user has no orders, the last 30 days of orders are automatically synced from the Walmart API.

**lastUpdateDate parameter**: Must be in Unix timestamp (milliseconds) format.

**Example**: 1704067200000 (January 1, 2024 00:00:00 UTC)
    `,
  })
  @ApiParam({
    name: 'accountId',
    description: 'User account ID (UserId)',
    example: 'user123',
  })
  @ApiParam({
    name: 'storeId',
    description: 'Walmart store ID',
    example: 'store456',
  })
  @ApiParam({
    name: 'lastUpdateDate',
    description: 'Last update date (Unix timestamp - milliseconds)',
    example: '1704067200000',
  })
  @ApiResponse({
    status: 200,
    description: 'Order list returned successfully',
    type: [OrderDTO],
  })
  @ApiResponse({
    status: 400,
    description: 'User not found or an error occurred',
    schema: {
      oneOf: [
        {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'UserNotFoundException' },
            message: { type: 'string', example: 'User Not Found.' },
          },
        },
        {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'BaseException' },
            message: { type: 'string', example: 'Error message' },
          },
        },
      ],
    },
  })
  async getOrdersAfterDate2(
    @Param('accountId') accountId: string,
    @Param('storeId') storeId: string,
    @Param('lastUpdateDate') lastUpdateDate: string,
  ): Promise<OrderDTO[]> {
    try {
      return await this.orderService.getOrdersAfterDate(
        accountId,
        storeId,
        parseInt(lastUpdateDate, 10),
      );
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        this.logger.error('GetOrdersAfterDate. UserNotFoundException');
        throw new UserNotFoundException('User Not Found.');
      }
      this.logger.error(`GetOrdersAfterDate. Error: ${error.message}`);
      throw new BaseException(error.message);
    }
  }

  /**
   * Returns orders updated after the specified date
   */
  @Get('GetOrdersAfterDate/:accountId/:storeId/:lastUpdateDate')
  @ApiOperation({
    summary: 'Get orders updated after a specified date',
    description: `
Returns all orders updated after the specified date.

**On first call**: If the user has no orders, the last 30 days of orders are automatically synced from the Walmart API.

**Order Statuses**:
- \`awaiting\`: Order is pending (Created, Acknowledged)
- \`shipped\`: Order has been shipped
- \`cancelled\`: Order has been cancelled

**lastUpdateDate parameter**: Must be in Unix timestamp (milliseconds) format.
    `,
  })
  @ApiParam({
    name: 'accountId',
    description: 'User account ID (UserId)',
    example: 'user123',
  })
  @ApiParam({
    name: 'storeId',
    description: 'Walmart store ID',
    example: 'store456',
  })
  @ApiParam({
    name: 'lastUpdateDate',
    description: 'Last update date (Unix timestamp - milliseconds)',
    example: '1704067200000',
  })
  @ApiResponse({
    status: 200,
    description: 'Order list returned successfully',
    type: [OrderDTO],
  })
  @ApiResponse({
    status: 400,
    description: 'User not found or an error occurred',
  })
  async getOrdersAfterDate(
    @Param('accountId') accountId: string,
    @Param('storeId') storeId: string,
    @Param('lastUpdateDate') lastUpdateDate: string,
  ): Promise<OrderDTO[]> {
    try {
      return await this.orderService.getOrdersAfterDate(
        accountId,
        storeId,
        parseInt(lastUpdateDate, 10),
      );
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        this.logger.error('GetOrdersAfterDate. UserNotFoundException');
        throw new UserNotFoundException('User Not Found.');
      }
      this.logger.error(`GetOrdersAfterDate. Error: ${error.message}`);
      throw new BaseException(error.message);
    }
  }

  /**
   * Fetches a specific order from the Walmart API
   */
  @Get('GetOrderFromApiByPurchaseOrderId/:accountId/:storeId/:purchaseOrderId')
  @ApiOperation({
    summary: 'Fetch a specific order from the Walmart API',
    description: `
Fetches a specific order from the Walmart API by Purchase Order ID and saves/updates it in the database.

**Use Case**: 
- When you want to get the current status of a specific order
- When you want to refresh order details

**purchaseOrderId**: The unique order number assigned by Walmart.
    `,
  })
  @ApiParam({
    name: 'accountId',
    description: 'User account ID (UserId)',
    example: 'user123',
  })
  @ApiParam({
    name: 'storeId',
    description: 'Walmart store ID',
    example: 'store456',
  })
  @ApiParam({
    name: 'purchaseOrderId',
    description: 'Walmart Purchase Order ID',
    example: '1234567890123',
  })
  @ApiResponse({
    status: 200,
    description: 'Order returned successfully',
    type: OrderDTO,
  })
  @ApiResponse({
    status: 400,
    description: 'User not found or an error occurred',
  })
  async getOrderFromApiByPurchaseOrderId(
    @Param('accountId') accountId: string,
    @Param('storeId') storeId: string,
    @Param('purchaseOrderId') purchaseOrderId: string,
  ): Promise<OrderDTO> {
    try {
      return await this.orderService.getOrderFromApiByPurchaseOrderId(
        accountId,
        storeId,
        purchaseOrderId,
      );
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        this.logger.error('GetOrderFromApiByPurchaseOrderId. UserNotFoundException');
        throw new UserNotFoundException('User Not Found.');
      }
      this.logger.error(`GetOrderFromApiByPurchaseOrderId. Error: ${error.message}`);
      throw new BaseException(error.message);
    }
  }

  /**
   * Dispatches an order for shipment
   */
  @Post('DispatchOrder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Dispatch order for shipment',
    description: `
Reports an order as shipped to Walmart.

**Important Rules**:
1. If using a known carrier: \`carrierName\` + \`trackingNumber\` are required
2. If using an unknown carrier: \`carrierName\` + \`trackingURL\` are required

**Supported Carriers (Known)**:
UPS, USPS, FedEx, DHL, Airborne, OnTrac, LS (LaserShip), UDS, UPSMI, FDX, PILOT, ESTES, SAIA, 
FDS Express, Seko Worldwide, HIT Delivery, FEDEXSP, RL Carriers, China Post, YunExpress, 
4PX, GLS, OSM Worldwide, FIRST MILE, CEVA, India Post, SF Express, Canada Post, Japan Post, 
Deutsche Post, Asendia, and more...

**Method Codes**:
- \`Standard\`: Standard shipping
- \`Express\`: Express shipping
- \`OneDay\`: One-day delivery
- \`Freight\`: Freight shipping
- \`WhiteGlove\`: White glove delivery service
- \`Value\`: Economy shipping
    `,
  })
  @ApiBody({
    type: ShippingDTO,
    description: 'Shipping information',
    examples: {
      knownCarrier: {
        summary: 'With a known carrier',
        value: {
          orderId: '1234567890123',
          userId: 'user123',
          storeId: 'store456',
          shippingLines: [
            {
              orderItemId: '1',
              orderItemQuantity: 2,
              shipDateTime: 1704067200000,
              carrierName: 'UPS',
              methodCode: 'Standard',
              trackingNumber: '1Z999AA10123456784',
              trackingURL: '',
            },
          ],
        },
      },
      unknownCarrier: {
        summary: 'With an unknown carrier',
        value: {
          orderId: '1234567890123',
          userId: 'user123',
          storeId: 'store456',
          shippingLines: [
            {
              orderItemId: '1',
              orderItemQuantity: 2,
              shipDateTime: 1704067200000,
              carrierName: 'MyLocalCarrier',
              methodCode: 'Standard',
              trackingNumber: '',
              trackingURL: 'https://mycarrier.com/track/ABC123',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Order dispatched successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'An error occurred',
    schema: {
      oneOf: [
        {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'UserNotFoundException' },
            message: { type: 'string', example: 'User Not Found.' },
          },
        },
        {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'BaseException' },
            message: {
              type: 'string',
              example: 'Known Carrier Name - TrackingNumber or Unknown Carrier Name - Tracking Url pairs are required.',
            },
          },
        },
      ],
    },
  })
  async dispatchOrder(@Body() shippingDTO: ShippingDTO): Promise<void> {
    try {
      const payload = JSON.stringify(shippingDTO);
      this.logger.log(`Dispatch Request: ${payload}`);
      await this.orderService.shipOrderItems(shippingDTO);
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        this.logger.error('DispatchOrder. UserNotFoundException');
        throw new UserNotFoundException('User Not Found.');
      }
      this.logger.error(`DispatchOrder. Error: ${error.message}`);
      throw new BaseException(error.message);
    }
  }
}
