import { Order } from '../../database/entities/order.entity';
import { OrderLine } from '../../database/entities/order-line.entity';
import { ShippingInfo } from '../../database/entities/shipping-info.entity';
import {
  OrderDTO,
  CustomerDTO,
  OrderLineDTO,
  DimensionDTO,
  WeightDTO,
} from '../dto/order.dto';
import { ISO3166 } from './country-alpha-converter.util';

/**
 * OrderToOrderDTOMapper - Converts Order entities to OrderDTOs
 * 
 * Fully compatible with the C# Utils/OrderToOrderDTOMapper.cs.
 */
export class OrderToOrderDTOMapper {
  /**
   * Converts a list of Orders to a list of OrderDTOs
   */
  static convertToOrderDTOList(userId: string, orderDataList: Order[]): OrderDTO[] {
    const orderDTOList: OrderDTO[] = [];

    for (const order of orderDataList) {
      try {
        const orderDTO = this.convertToOrderDTO(userId, order);
        orderDTOList.push(orderDTO);
      } catch (error) {
        throw error;
      }
    }

    return orderDTOList;
  }

  /**
   * Converts a single Order to an OrderDTO
   */
  static convertToOrderDTO(userId: string, order: Order): OrderDTO {
    const orderDTO = new OrderDTO();

    try {
      orderDTO.id = order.id.toString();
      orderDTO.created_at = order.orderDate;
      orderDTO.updated_at = order.orderLocalUpdateDate;
      orderDTO.number = `${order.purchaseOrderId}-${order.customerOrderId}`;
      orderDTO.dispatch_id = order.purchaseOrderId;
      orderDTO.status = this.calculateOrderStatus(order.orderLine || []);
      orderDTO.tags = [];
      orderDTO.insurance = null;
      orderDTO.buyer_note = '';
      orderDTO.customer = this.convertToCustomerDTO(order.shippingInfo, order.customerEmailId);
      orderDTO.items = this.convertToOrderLineDTOs(order.orderLine || []);
    } catch (error) {
      throw error;
    }

    return orderDTO;
  }

  /**
   * Calculates the order status
   * 
   * Walmart status => "Created" "Acknowledged" "Shipped" "Delivered" "Cancelled" "Refund"
   * Output status => "awaiting", "shipped", "cancelled"
   */
  private static calculateOrderStatus(orderLines: OrderLine[]): string {
    let resultStatus = 'awaiting';

    for (const ol of orderLines) {
      if (!ol.orderLineStatus || ol.orderLineStatus.length === 0) continue;

      // Get the latest status (sorted by id)
      const statusObj = ol.orderLineStatus.sort((a, b) => b.id - a.id)[0];

      if (statusObj) {
        if (statusObj.status === 'Acknowledged' || statusObj.status === 'Created') {
          resultStatus = 'awaiting';
          break;
        } else if (statusObj.status === 'Cancelled') {
          resultStatus = 'cancelled';
          break;
        } else {
          resultStatus = 'shipped';
        }
      }
    }

    return resultStatus;
  }

  /**
   * Converts ShippingInfo to CustomerDTO
   */
  private static convertToCustomerDTO(shippingInfo: ShippingInfo, email: string): CustomerDTO {
    const customerDTO = new CustomerDTO();

    if (!shippingInfo) {
      return customerDTO;
    }

    customerDTO.name = shippingInfo.postalAddress_name || '';
    customerDTO.company = '';
    customerDTO.tax_number = '';
    customerDTO.phone = shippingInfo.phone || '';
    customerDTO.email = email || '';

    // Alpha-3 to Alpha-2 conversion
    const countryInfo = ISO3166.FromAlpha3(shippingInfo.postalAddress_country);
    customerDTO.country_code = countryInfo?.Alpha2 || shippingInfo.postalAddress_country || '';

    customerDTO.zip_code = shippingInfo.postalAddress_postalCode || '';
    customerDTO.state_code = shippingInfo.postalAddress_state || '';
    customerDTO.city = shippingInfo.postalAddress_city || '';
    customerDTO.street = [
      shippingInfo.postalAddress_address1 || '',
      shippingInfo.postalAddress_address2 || '',
    ];
    customerDTO.residential = shippingInfo.postalAddress_addressType === 'RESIDENTIAL';

    return customerDTO;
  }

  /**
   * Converts a list of OrderLines to a list of OrderLineDTOs
   */
  private static convertToOrderLineDTOs(orderLines: OrderLine[]): OrderLineDTO[] {
    const orderLineDtoList: OrderLineDTO[] = [];

    for (const orderLine of orderLines) {
      const orderLineDTO = new OrderLineDTO();

      orderLineDTO.number = orderLine.id.toString();
      orderLineDTO.code = orderLine.item_sku || '';
      orderLineDTO.description = orderLine.item_productName || '';
      orderLineDTO.image_url = orderLine.item_imageUrl || '';

      // Charges'dan fiyat bilgisini al
      const productCharge = (orderLine.charge || []).find((c) => c.chargeType === 'PRODUCT');
      // NOTE: C# code uses "SHIPPING " (trailing space) - preserved for compatibility
      const shipCharge = (orderLine.charge || []).find((c) => c.chargeType === 'SHIPPING ');

      orderLineDTO.currency_code = productCharge?.chargeAmount_currency || 'USD';
      orderLineDTO.quantity = parseInt(orderLine.orderLineQuantity_amount || '0', 10);

      // Total selling price hesaplama
      const productAmount = productCharge?.chargeAmount_amount || 0;
      const productTax = productCharge?.tax_taxAmount_amount || 0;
      orderLineDTO.total_selling_price = Math.round((productAmount + productTax) * 100) / 100;

      // Unit selling price hesaplama
      orderLineDTO.unit_selling_price =
        orderLineDTO.quantity > 0
          ? Math.round((orderLineDTO.total_selling_price / orderLineDTO.quantity) * 100) / 100
          : 0;

      // Dimensions
      orderLineDTO.dimensions = new DimensionDTO(0, 0, 0, 'cm');

      // Weight
      let weightAmount = 0;
      try {
        weightAmount = parseFloat(orderLine.item_weight_value || '0');
      } catch {
        weightAmount = 0;
      }

      const unit = orderLine.item_weight_unit || 'lb';
      // Ounces to pounds conversion
      if (unit === 'Ounces' || unit === 'oz') {
        weightAmount = weightAmount / 16;
      }

      orderLineDTO.weight = new WeightDTO(weightAmount, 'lb');

      orderLineDtoList.push(orderLineDTO);
    }

    return orderLineDtoList;
  }
}
