/**
 * Walmart API Response Models
 * 
 * This file contains TypeScript interfaces representing JSON responses from the Walmart API.
 * Fully compatible with the C# Models/OrderModel structures.
 */

// Access Token Response
export interface AccessTokenDTO {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Error Response
export interface ErrorResponse {
  error?: {
    code: string;
    field: string;
    description: string;
    info: string;
    severity: string;
    category: string;
    causes: any[];
    errorIdentifiers: Record<string, any>;
  }[];
}

// Order List Response
export interface OrderListRoot {
  list: OrderListWrapper;
}

export interface OrderListWrapper {
  meta: Meta;
  elements: Elements;
}

export interface Meta {
  totalCount: number;
  limit: number;
  nextCursor: string;
}

export interface Elements {
  order: WalmartOrder[];
}

// Single Order Response
export interface OnlyOrderListRoot {
  order: WalmartOrder;
}

// Order Model
export interface WalmartOrder {
  purchaseOrderId: string;
  customerOrderId: string;
  customerEmailId: string;
  orderType: string;
  originalCustomerOrderID: string;
  orderDate: number;
  shippingInfo: WalmartShippingInfo;
  orderLines: WalmartOrderLines;
}

export interface WalmartShippingInfo {
  phone: string;
  estimatedDeliveryDate: number;
  estimatedShipDate: number;
  methodCode: string;
  postalAddress: WalmartPostalAddress;
}

export interface WalmartPostalAddress {
  name: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  addressType: string;
}

export interface WalmartOrderLines {
  orderLine: WalmartOrderLine[];
}

export interface WalmartOrderLine {
  lineNumber: string;
  item: WalmartItem;
  charges: WalmartCharges;
  orderLineQuantity: WalmartOrderLineQuantity;
  statusDate: number;
  orderLineStatuses: WalmartOrderLineStatuses;
  fulfillment: WalmartFulfillment;
}

export interface WalmartItem {
  productName: string;
  sku: string;
  condition: string;
  imageUrl: string;
  weight: WalmartWeight;
}

export interface WalmartWeight {
  value: string;
  unit: string;
}

export interface WalmartCharges {
  charge: WalmartCharge[];
}

export interface WalmartCharge {
  chargeType: string;
  chargeName: string;
  chargeAmount: WalmartChargeAmount;
  tax: WalmartTax;
}

export interface WalmartChargeAmount {
  currency: string;
  amount: number;
}

export interface WalmartTax {
  taxName: string;
  taxAmount: WalmartTaxAmount;
}

export interface WalmartTaxAmount {
  currency: string;
  amount: number;
}

export interface WalmartOrderLineQuantity {
  unitOfMeasurement: string;
  amount: string;
}

export interface WalmartOrderLineStatuses {
  orderLineStatus: WalmartOrderLineStatus[];
}

export interface WalmartOrderLineStatus {
  status: string;
  statusQuantity: WalmartStatusQuantity;
  trackingInfo: WalmartTrackingInfo;
}

export interface WalmartStatusQuantity {
  unitOfMeasurement: string;
  amount: string;
}

export interface WalmartTrackingInfo {
  shipDateTime: number;
  carrierName: WalmartCarrierName;
  methodCode: string;
  trackingNumber: string;
  trackingURL: string;
}

export interface WalmartCarrierName {
  otherCarrier: string;
  carrier: string;
}

export interface WalmartFulfillment {
  fulfillmentOption: string;
  shipMethod: string;
  pickUpDateTime: number;
}

// Shipment Request Models
export interface RootShipment {
  orderShipment: OrderShipment;
}

export interface OrderShipment {
  orderLines: OrderLinesShipment;
}

export interface OrderLinesShipment {
  orderLine: OrderLineShipment[];
}

// Alias for backward compatibility
export type OrderLines = OrderLinesShipment;

export interface OrderLineShipment {
  lineNumber: string;
  intentToCancelOverride: boolean;
  sellerOrderId: string;
  orderLineStatuses: OrderLineStatusesShipment;
}

export interface OrderLineStatusesShipment {
  orderLineStatus: OrderLineStatusShipment[];
}

// Alias for backward compatibility  
export type OrderLineStatuses = OrderLineStatusesShipment;

export interface OrderLineStatusShipment {
  status: string;
  statusQuantity: StatusQuantityShipment;
  trackingInfo: TrackingInfoShipment;
}

export interface StatusQuantityShipment {
  unitOfMeasurement: string;
  amount: string;
}

export interface TrackingInfoShipment {
  shipDateTime: number;
  carrierName: CarrierNameShipment;
  methodCode: string;
  trackingNumber?: string;
  trackingURL?: string;
}

export interface CarrierNameShipment {
  carrier?: string;
  otherCarrier?: string;
}
