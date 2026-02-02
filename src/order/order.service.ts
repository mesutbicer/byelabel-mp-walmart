import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../database/entities/order.entity';
import { OrderLine } from '../database/entities/order-line.entity';
import { OrderLineStatus } from '../database/entities/order-line-status.entity';
import { Charge } from '../database/entities/charge.entity';
import { ShippingInfo } from '../database/entities/shipping-info.entity';
import { User } from '../database/entities/user.entity';
import { OrderEndpointService } from './order-endpoint.service';
import { AuthService } from '../auth/auth.service';
import { OrderDTO, ShippingDTO } from '../common/dto';
import { OrderToOrderDTOMapper, mapToWalmartCarrier } from '../common/utils';
import { UserNotFoundException } from '../common/exceptions/custom-exceptions';
import {
  WalmartOrder,
  RootShipment,
  OrderShipment,
  OrderLines as ShipmentOrderLines,
  OrderLineShipment,
  OrderLineStatusShipment,
  StatusQuantityShipment,
  CarrierNameShipment,
  TrackingInfoShipment,
  OrderLineStatuses as ShipmentOrderLineStatuses,
} from '../common/dto/walmart-api.dto';

/**
 * OrderService - Order business logic service
 * 
 * Fully compatible with the C# Services/OrderService.cs.
 */
@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderLine)
    private readonly orderLineRepository: Repository<OrderLine>,
    @InjectRepository(OrderLineStatus)
    private readonly orderLineStatusRepository: Repository<OrderLineStatus>,
    @InjectRepository(Charge)
    private readonly chargeRepository: Repository<Charge>,
    @InjectRepository(ShippingInfo)
    private readonly shippingInfoRepository: Repository<ShippingInfo>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly orderEndpointService: OrderEndpointService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Returns orders updated after the specified date
   * 
   * @param userId - User ID
   * @param storeId - Store ID
   * @param lastUpdateDate - Last update date (Unix timestamp ms)
   * @returns List of order DTOs
   */
  async getOrdersAfterDate(
    userId: string,
    storeId: string,
    lastUpdateDate: number,
  ): Promise<OrderDTO[]> {
    try {
      const user = await this.userRepository.findOne({
        where: { UserId: userId, StoreId: storeId, IsDeleted: false },
      });

      if (!user) {
        throw new UserNotFoundException();
      }

      // Check if any orders exist
      const anyOrder = await this.orderRepository.findOne({
        where: { clientId: user.ClientId, storeId: user.StoreId },
      });

      if (!anyOrder) {
        await this.syncOrdersFromWalmart(user);
      }

      // Fetch relevant orders
      const orderDataList = await this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.shippingInfo', 'shippingInfo')
        .leftJoinAndSelect('order.orderLine', 'orderLine')
        .leftJoinAndSelect('orderLine.charge', 'charge')
        .leftJoinAndSelect('orderLine.orderLineStatus', 'orderLineStatus')
        .where('order.clientId = :clientId', { clientId: user.ClientId })
        .andWhere('order.storeId = :storeId', { storeId: user.StoreId })
        .andWhere('order.orderLocalUpdateDate >= :lastUpdateDate', { lastUpdateDate })
        .getMany();

      return OrderToOrderDTOMapper.convertToOrderDTOList(userId, orderDataList);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Fetches an order from the Walmart API by Purchase Order ID and saves it
   * 
   * @param accountId - User ID
   * @param storeId - Store ID
   * @param purchaseOrderId - Walmart Purchase Order ID
   * @returns Order DTO
   */
  async getOrderFromApiByPurchaseOrderId(
    accountId: string,
    storeId: string,
    purchaseOrderId: string,
  ): Promise<OrderDTO> {
    try {
      const user = await this.userRepository.findOne({
        where: { UserId: accountId, StoreId: storeId, IsDeleted: false },
      });

      if (!user) {
        throw new UserNotFoundException();
      }

      const accessToken = await this.authService.generateAccessToken(
        user.ClientId,
        user.ClientSecret,
      );

      const orderFetched = await this.orderEndpointService.fetchOrderByPurchaseOrderId(
        accessToken,
        purchaseOrderId,
      );

      const orderAsList = [orderFetched];
      this.mapJsonOrderToEntity(orderAsList, user);
      await this.saveOrUpdateOrders(orderAsList);

      // Retrieve entity again and convert to DTO
      const savedOrder = await this.orderRepository.findOne({
        where: { purchaseOrderId: purchaseOrderId, storeId: user.StoreId },
        relations: ['shippingInfo', 'orderLine', 'orderLine.charge', 'orderLine.orderLineStatus'],
      });

      if (!savedOrder) {
        throw new Error('Order Not Found');
      }

      return OrderToOrderDTOMapper.convertToOrderDTO(accountId, savedOrder);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Syncs orders for multiple users
   * 
   * @param userIds - List of user IDs
   */
  async processUserOrderByUserIds(userIds: number[]): Promise<void> {
    const userIdsStr = userIds.join(',');
    try {
      const users = await this.userRepository
        .createQueryBuilder('user')
        .where('user.Id IN (:...userIds)', { userIds })
        .andWhere('user.IsDeleted = :isDeleted', { isDeleted: false })
        .getMany();

      for (const user of users) {
        try {
          await this.syncOrdersFromWalmart(user);
        } catch (error) {
          this.logger.error(
            `Error receiving order update for user ${user.Id}: ${error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `ProcessUserOrderByUserIds Error receiving order update for users ${userIdsStr}: ${error.message}`,
      );
    }
  }

  /**
   * Syncs orders from the Walmart API
   * 
   * @param user - User entity
   */
  async syncOrdersFromWalmart(user: User): Promise<void> {
    try {
      this.logger.log(`🔄 [User: ${user.UserId}] Starting Walmart order sync...`);

      // Get the last update date
      const lastUpdatedResult = await this.orderRepository
        .createQueryBuilder('order')
        .select('MAX(order.orderLocalUpdateDate)', 'maxDate')
        .where('order.clientId = :clientId', { clientId: user.ClientId })
        .andWhere('order.storeId = :storeId', { storeId: user.StoreId })
        .getRawOne();

      let lastUpdatedDate = Number(lastUpdatedResult?.maxDate) || 0;

      this.logger.log(`🔄 [User: ${user.UserId}] Last update date: ${lastUpdatedDate}`);

      if (lastUpdatedDate === 0) {
        // C# COMPATIBILITY: C# code uses ToUnixTimeSeconds() but
        // FetchOrdersByAfterDate parses it with FromUnixTimeMilliseconds().
        // This "bug" actually fetches all orders (creates a very old date).
        // We preserve the same behavior for full compatibility.
        // 30 days ago in SECONDS (will be parsed as milliseconds)
        lastUpdatedDate = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
      }

      const accessToken = await this.authService.generateAccessToken(
        user.ClientId,
        user.ClientSecret,
      );

      const newOrderList = await this.orderEndpointService.fetchOrdersByAfterDate(
        accessToken,
        lastUpdatedDate,
      );

      this.logger.log(`🔄 [User: ${user.UserId}] Fetched ${newOrderList.length} orders from Walmart API`);

      this.mapJsonOrderToEntity(newOrderList, user);
      await this.saveOrUpdateOrders(newOrderList);

      this.logger.log(`✅ [User: ${user.UserId}] Sync complete - ${newOrderList.length} orders processed`);
    } catch (error) {
      this.logger.error(`❌ [User: ${user.UserId}] Sync failed: ${error.message}`);
      this.logger.error(`SyncOrdersFromWalmart. Error: ${error.message}`);

      if (error.message?.includes('Partner is TERMINATED')) {
        user.IsDeleted = true;
        await this.userRepository.save(user);
      }
    }
  }

  /**
   * Order shipment dispatch operation
   * 
   * @param shippingDTO - Shipping information
   */
  async shipOrderItems(shippingDTO: ShippingDTO): Promise<void> {
    try {
      this.checkAllOrderItemCanDispatchable(shippingDTO);

      const user = await this.userRepository.findOne({
        where: { UserId: shippingDTO.userId, StoreId: shippingDTO.storeId },
      });

      if (!user) {
        throw new UserNotFoundException();
      }

      const orderData = await this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.orderLine', 'orderLine')
        .where('(order.purchaseOrderId = :orderId OR order.customerOrderId = :orderId)', {
          orderId: shippingDTO.orderId,
        })
        .andWhere('order.clientId = :clientId', { clientId: user.ClientId })
        .andWhere('order.storeId = :storeId', { storeId: user.StoreId })
        .getOne();

      if (!orderData) {
        throw new Error('Order Not Found');
      }

      // Build shipment payload
      const newShipment: RootShipment = {
        orderShipment: {
          orderLines: {
            orderLine: [],
          },
        },
      };

      const lineItem = shippingDTO.shippingLines[0];

      for (const line of orderData.orderLine) {
        const ols: OrderLineShipment = {
          lineNumber: line.lineNumber,
          intentToCancelOverride: false,
          sellerOrderId: orderData.customerOrderId,
          orderLineStatuses: {
            orderLineStatus: [],
          },
        };

        const olss: OrderLineStatusShipment = {
          status: 'Shipped',
          statusQuantity: {
            unitOfMeasurement: 'EACH',
            amount: line.orderLineQuantity_amount,
          },
          trackingInfo: {} as TrackingInfoShipment,
        };

        const wlmrtCode = mapToWalmartCarrier(lineItem.carrierName);
        const carrier: CarrierNameShipment = wlmrtCode
          ? { carrier: wlmrtCode }
          : { otherCarrier: lineItem.carrierName };

        olss.trackingInfo = {
          shipDateTime: lineItem.shipDateTime,
          carrierName: carrier,
          methodCode: lineItem.methodCode,
          trackingNumber: lineItem.trackingNumber,
          trackingURL: lineItem.trackingURL,
        };

        ols.orderLineStatuses.orderLineStatus.push(olss);
        newShipment.orderShipment.orderLines.orderLine.push(ols);
      }

      const accessToken = await this.authService.generateAccessToken(
        user.ClientId,
        user.ClientSecret,
      );

      await this.orderEndpointService.dispatchOrder(
        accessToken,
        orderData.purchaseOrderId,
        newShipment,
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Checks whether all order items are dispatchable
   */
  private checkAllOrderItemCanDispatchable(shippingDTO: ShippingDTO): void {
    for (const line of shippingDTO.shippingLines) {
      const wlmrtCode = mapToWalmartCarrier(line.carrierName);

      if (wlmrtCode && line.trackingNumber) {
        continue;
      }

      if (!wlmrtCode && line.trackingURL) {
        continue;
      }

      throw new Error(
        'Known Carrier Name - TrackingNumber or Unknown Carrier Name - Tracking Url pairs are required.',
      );
    }
  }

  /**
   * Saves or updates orders in the database
   */
  private async saveOrUpdateOrders(newOrderList: any[]): Promise<void> {
    for (const newOrder of newOrderList) {
      const orderData = await this.orderRepository.findOne({
        where: { storeId: newOrder.storeId, purchaseOrderId: newOrder.purchaseOrderId },
        relations: ['orderLine', 'orderLine.orderLineStatus'],
      });

      if (orderData) {
        await this.updateOrderData(orderData, newOrder);
        await this.orderRepository.save(orderData);
      } else {
        // Save new order
        const order = this.orderRepository.create(newOrder);
        await this.orderRepository.save(order);
      }
    }
  }

  /**
   * Updates an existing order with new data
   */
  private async updateOrderData(orderData: Order, newOrder: any): Promise<void> {
    orderData.orderLocalUpdateDate = newOrder.orderLocalUpdateDate;
    await this.updateOrderLines(orderData.orderLine, newOrder.orderLine);
  }

  /**
   * Updates order lines
   */
  private async updateOrderLines(
    orderLinesData: OrderLine[],
    orderLinesNew: any[],
  ): Promise<void> {
    for (const olData of orderLinesData) {
      const olNew = orderLinesNew.find((oln: any) => oln.lineNumber === olData.lineNumber);

      if (olNew) {
        olData.statusDate = olNew.statusDate;
        await this.updateOrderLineStatus(olData.orderLineStatus, olNew.orderLineStatus);
      }
    }
  }

  /**
   * Updates order line statuses
   */
  private async updateOrderLineStatus(
    orderLineStatusData: OrderLineStatus[],
    orderLineStatusNew: any[],
  ): Promise<void> {
    for (const olStatNew of orderLineStatusNew) {
      const olStatDataExist = orderLineStatusData.some(
        (olsD) =>
          olsD.status === olStatNew.status &&
          olsD.statusQuantity_amount === olStatNew.statusQuantity_amount,
      );

      if (!olStatDataExist) {
        orderLineStatusData.push(olStatNew);
      }
    }
  }

  /**
   * Converts Walmart JSON orders to database entities
   */
  private mapJsonOrderToEntity(newOrderList: WalmartOrder[], user: User): void {
    for (const o of newOrderList) {
      (o as any).orderLocalUpdateDate = Date.now();
      (o as any).storeId = user.StoreId;
      (o as any).clientId = user.ClientId;

      // Extract orderLine array from the orderLines wrapper
      (o as any).orderLine = (o.orderLines?.orderLine || []).map((orderLine: any) => {
        const mappedOrderLine: any = {
          lineNumber: orderLine.lineNumber,
          // Item fields - flattened
          item_productName: orderLine.item?.productName,
          item_sku: orderLine.item?.sku,
          item_imageUrl: orderLine.item?.imageUrl,
          item_weight_value: orderLine.item?.weight?.value,
          item_weight_unit: orderLine.item?.weight?.unit,
          // OrderLineQuantity fields - flattened
          orderLineQuantity_unitOfMeasurement: orderLine.orderLineQuantity?.unitOfMeasurement,
          orderLineQuantity_amount: orderLine.orderLineQuantity?.amount,
          // Fulfillment fields - flattened
          fulfillment_fulfillmentOption: orderLine.fulfillment?.fulfillmentOption,
          fulfillment_shipMethod: orderLine.fulfillment?.shipMethod,
          fulfillment_pickUpDateTime: orderLine.fulfillment?.pickUpDateTime,
          // Status
          statusDate: orderLine.statusDate,
          // Charges - as nested entity
          charge: (orderLine.charges?.charge || []).map((c: any) => ({
            chargeType: c.chargeType,
            chargeName: c.chargeName,
            chargeAmount_currency: c.chargeAmount?.currency,
            chargeAmount_amount: c.chargeAmount?.amount,
            tax_taxName: c.tax?.taxName,
            tax_taxAmount_currency: c.tax?.taxAmount?.currency,
            tax_taxAmount_amount: c.tax?.taxAmount?.amount,
          })),
          // OrderLineStatuses - as nested entity
          orderLineStatus: (orderLine.orderLineStatuses?.orderLineStatus || []).map((s: any) => ({
            status: s.status,
            statusQuantity_unitOfMeasurement: s.statusQuantity?.unitOfMeasurement,
            statusQuantity_amount: s.statusQuantity?.amount,
            trackingInfo_shipDateTime: s.trackingInfo?.shipDateTime,
            trackingInfo_carrierName_carrier: s.trackingInfo?.carrierName?.carrier,
            trackingInfo_carrierName_otherCarrier: s.trackingInfo?.carrierName?.otherCarrier,
            trackingInfo_methodCode: s.trackingInfo?.methodCode,
            trackingInfo_trackingNumber: s.trackingInfo?.trackingNumber,
            trackingInfo_trackingURL: s.trackingInfo?.trackingURL,
          })),
        };

        return mappedOrderLine;
      });

      // ShippingInfo mapping
      if (o.shippingInfo) {
        (o as any).shippingInfo = {
          phone: o.shippingInfo.phone,
          estimatedDeliveryDate: o.shippingInfo.estimatedDeliveryDate,
          estimatedShipDate: o.shippingInfo.estimatedShipDate,
          methodCode: o.shippingInfo.methodCode,
          postalAddress_name: o.shippingInfo.postalAddress?.name,
          postalAddress_address1: o.shippingInfo.postalAddress?.address1,
          postalAddress_address2: o.shippingInfo.postalAddress?.address2,
          postalAddress_city: o.shippingInfo.postalAddress?.city,
          postalAddress_state: o.shippingInfo.postalAddress?.state,
          postalAddress_postalCode: o.shippingInfo.postalAddress?.postalCode,
          postalAddress_country: o.shippingInfo.postalAddress?.country,
          postalAddress_addressType: o.shippingInfo.postalAddress?.addressType,
        };
      }
    }
  }
}
