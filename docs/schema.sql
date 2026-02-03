-- =====================================================
-- WALMART SERVICE DATABASE SCHEMA
-- =====================================================
-- This schema matches the original C# Entity Framework
-- migration (20250412113816_init.cs) EXACTLY.
--
-- IMPORTANT: Column naming varies by table:
-- - User table: PascalCase (Id, UserId, StoreId, etc.)
-- - Other tables: lowercase (id, purchaseOrderId, etc.)
-- =====================================================

-- ShippingInfo table (created FIRST due to FK dependency)
CREATE TABLE IF NOT EXISTS "ShippingInfo" (
    "id" SERIAL PRIMARY KEY,
    "phone" TEXT,
    "estimatedDeliveryDate" BIGINT,
    "estimatedShipDate" BIGINT,
    "methodCode" TEXT,
    "postalAddress_name" TEXT,
    "postalAddress_address1" TEXT,
    "postalAddress_address2" TEXT,
    "postalAddress_city" TEXT,
    "postalAddress_state" TEXT,
    "postalAddress_postalCode" TEXT,
    "postalAddress_country" TEXT,
    "postalAddress_addressType" TEXT
);

-- User table (Walmart account credentials) - PascalCase columns!
CREATE TABLE IF NOT EXISTS "User" (
    "Id" SERIAL PRIMARY KEY,
    "UserId" TEXT,
    "StoreId" TEXT,
    "ClientId" TEXT,
    "ClientSecret" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT FALSE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "IX_User_UserId_StoreId" ON "User" ("UserId", "StoreId");
CREATE INDEX IF NOT EXISTS "IX_User_ClientId" ON "User" ("ClientId");

-- Orders table (Purchase orders from Walmart)
CREATE TABLE IF NOT EXISTS "Orders" (
    "id" SERIAL PRIMARY KEY,
    "clientId" TEXT,
    "storeId" TEXT,
    "purchaseOrderId" TEXT,
    "customerOrderId" TEXT,
    "customerEmailId" TEXT,
    "orderType" TEXT,
    "originalCustomerOrderID" TEXT,
    "orderDate" BIGINT,
    "orderLocalUpdateDate" BIGINT,
    "shippingInfoid" INTEGER REFERENCES "ShippingInfo"("id")
);

-- Create indexes for orders
CREATE INDEX IF NOT EXISTS "IX_Orders_shippingInfoid" ON "Orders" ("shippingInfoid");

-- OrderLine table (Individual items in an order)
CREATE TABLE IF NOT EXISTS "OrderLine" (
    "id" SERIAL PRIMARY KEY,
    "lineNumber" TEXT,
    "item_productName" TEXT,
    "item_sku" TEXT,
    "item_condition" TEXT,
    "item_imageUrl" TEXT,
    "item_weight_value" TEXT,
    "item_weight_unit" TEXT,
    "orderLineQuantity_unitOfMeasurement" TEXT,
    "orderLineQuantity_amount" TEXT,
    "statusDate" BIGINT,
    "fulfillment_fulfillmentOption" TEXT,
    "fulfillment_shipMethod" TEXT,
    "fulfillment_pickUpDateTime" BIGINT,
    "Orderid" INTEGER REFERENCES "Orders"("id")
);

-- Create index for order lines
CREATE INDEX IF NOT EXISTS "IX_OrderLine_Orderid" ON "OrderLine" ("Orderid");

-- Charge table (Price information for order lines)
CREATE TABLE IF NOT EXISTS "Charge" (
    "id" SERIAL PRIMARY KEY,
    "chargeType" TEXT,
    "chargeName" TEXT,
    "chargeAmount_currency" TEXT,
    "chargeAmount_amount" DOUBLE PRECISION,
    "tax_taxName" TEXT,
    "tax_taxAmount_currency" TEXT,
    "tax_taxAmount_amount" DOUBLE PRECISION,
    "OrderLineid" INTEGER REFERENCES "OrderLine"("id")
);

-- Create index for charges
CREATE INDEX IF NOT EXISTS "IX_Charge_OrderLineid" ON "Charge" ("OrderLineid");

-- OrderLineStatus table (Status history for order lines)
CREATE TABLE IF NOT EXISTS "OrderLineStatus" (
    "id" SERIAL PRIMARY KEY,
    "status" TEXT,
    "statusQuantity_unitOfMeasurement" TEXT,
    "statusQuantity_amount" TEXT,
    "trackingInfo_shipDateTime" BIGINT,
    "trackingInfo_carrierName_otherCarrier" TEXT,
    "trackingInfo_carrierName_carrier" TEXT,
    "trackingInfo_methodCode" TEXT,
    "trackingInfo_trackingNumber" TEXT,
    "trackingInfo_trackingURL" TEXT,
    "OrderLineid" INTEGER REFERENCES "OrderLine"("id")
);

-- Create index for order line statuses
CREATE INDEX IF NOT EXISTS "IX_OrderLineStatus_OrderLineid" ON "OrderLineStatus" ("OrderLineid");

-- =====================================================
-- GRANT PERMISSIONS (adjust username as needed)
-- =====================================================
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO walmart_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO walmart_user;
