import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  OrderListRoot,
  OnlyOrderListRoot,
  WalmartOrder,
  RootShipment,
} from '../common/dto/walmart-api.dto';

/**
 * OrderEndpointService - Walmart Order API operations
 * 
 * Fully compatible with the C# Services/OrderEndpointService.cs.
 */
@Injectable()
export class OrderEndpointService {
  private readonly logger = new Logger(OrderEndpointService.name);
  private readonly endpointService: string;
  private readonly serviceName: string;

  constructor(private readonly configService: ConfigService) {
    this.endpointService = this.configService.get<string>(
      'WALMART_API_BASE_URL',
      'https://marketplace.walmartapis.com/v3',
    );
    this.serviceName = this.configService.get<string>(
      'WALMART_SERVICE_NAME',
      'Walmart Service Name',
    );
  }

  /**
   * Fetches orders updated after a specified date
   * 
   * @param accessToken - Walmart API access token
   * @param lastUpdateDate - Last update date (Unix timestamp ms)
   * @returns List of orders
   */
  async fetchOrdersByAfterDate(
    accessToken: string,
    lastUpdateDate: number,
  ): Promise<WalmartOrder[]> {
    const newOrders: WalmartOrder[] = [];

    try {
      // Convert Unix timestamp to ISO date
      const dateTimeISO = new Date(Number(lastUpdateDate)).toISOString().split('.')[0];
      let reqUrl = `${this.endpointService}/orders?lastModifiedStartDate=${dateTimeISO}&limit=100&productInfo=true`;

      const response = await axios.get(reqUrl, {
        headers: {
          'Accept': 'application/json',
          'WM_SEC.ACCESS_TOKEN': accessToken,
          'WM_QOS.CORRELATION_ID': this.generateUniqueID(),
          'WM_SVC.NAME': this.serviceName,
        },
      });

      if (response.status === 200) {
        const orderListRoot: OrderListRoot = response.data;
        
        if (orderListRoot.list?.elements?.order) {
          newOrders.push(...orderListRoot.list.elements.order);
        }

        // Pagination handling
        let nextCursor = orderListRoot.list?.meta?.nextCursor;

        while (nextCursor) {
          reqUrl = `${this.endpointService}/orders${nextCursor}`;

          const paginatedResponse = await axios.get(reqUrl, {
            headers: {
              'Accept': 'application/json',
              'WM_SEC.ACCESS_TOKEN': accessToken,
              'WM_QOS.CORRELATION_ID': this.generateUniqueID(),
              'WM_SVC.NAME': this.serviceName,
            },
          });

          if (paginatedResponse.status === 200) {
            const paginatedOrderList: OrderListRoot = paginatedResponse.data;
            
            if (paginatedOrderList.list?.elements?.order) {
              newOrders.push(...paginatedOrderList.list.elements.order);
            }
            
            nextCursor = paginatedOrderList.list?.meta?.nextCursor;
          } else {
            this.logger.error(
              `FetchOrdersByAfterDate1. Error: ${JSON.stringify(paginatedResponse.data)}`,
            );
            break;
          }
        }
      } else {
        throw new Error(
          `FetchOrdersByAfterDate2. Error: ${JSON.stringify(response.data)}`,
        );
      }
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? JSON.stringify(error.response?.data)
        : error.message;

      this.logger.error(`FetchOrdersByAfterDate3. Error: ${errorMessage}`);

      // Re-throw if partner is terminated
      if (errorMessage.includes('Partner is TERMINATED')) {
        throw error;
      }
    }

    return newOrders;
  }

  /**
   * Fetches a single order by Purchase Order ID
   * 
   * @param accessToken - Walmart API access token
   * @param purchaseOrderId - Walmart Purchase Order ID
   * @returns Order information
   */
  async fetchOrderByPurchaseOrderId(
    accessToken: string,
    purchaseOrderId: string,
  ): Promise<WalmartOrder> {
    try {
      const reqUrl = `${this.endpointService}/orders/${purchaseOrderId}?productInfo=true`;

      const response = await axios.get(reqUrl, {
        headers: {
          'Accept': 'application/json',
          'WM_SEC.ACCESS_TOKEN': accessToken,
          'WM_QOS.CORRELATION_ID': this.generateUniqueID(),
          'WM_SVC.NAME': this.serviceName,
        },
      });

      if (response.status === 200) {
        const orderRoot: OnlyOrderListRoot = response.data;
        return orderRoot.order;
      } else {
        throw new Error(
          `FetchOrderByPurchaseOrderId Error: ${JSON.stringify(response.data)}`,
        );
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          `FetchOrderByPurchaseOrderId Error: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw error;
    }
  }

  /**
   * Sends order shipment information to Walmart
   * 
   * @param accessToken - Walmart API access token
   * @param purchaseOrderId - Walmart Purchase Order ID
   * @param payload - Shipment information
   */
  async dispatchOrder(
    accessToken: string,
    purchaseOrderId: string,
    payload: RootShipment,
  ): Promise<void> {
    try {
      const reqUrl = `${this.endpointService}/orders/${purchaseOrderId}/shipping`;

      const payloadJson = JSON.stringify(payload);
      this.logger.log(`DispatchOrderAPI payload: ${payloadJson}`);

      const response = await axios.post(reqUrl, payload, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'WM_SEC.ACCESS_TOKEN': accessToken,
          'WM_QOS.CORRELATION_ID': this.generateUniqueID(),
          'WM_SVC.NAME': this.serviceName,
        },
      });

      if (response.status !== 200) {
        throw new Error(JSON.stringify(response.data));
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(JSON.stringify(error.response.data));
      }
      throw new Error(error.message);
    }
  }

  /**
   * Generates a unique correlation ID
   */
  private generateUniqueID(): string {
    return uuidv4();
  }
}
