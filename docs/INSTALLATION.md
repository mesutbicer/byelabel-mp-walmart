# Walmart Service - Kurulum Rehberi

## 📋 İçindekiler

1. [Gereksinimler](#1-gereksinimler)
2. [Yerel Kurulum (Local)](#2-yerel-kurulum-local)
3. [AWS Deployment](#3-aws-deployment)
4. [Docker Deployment](#4-docker-deployment)
5. [Sorun Giderme](#5-sorun-giderme)

---

## 1. Gereksinimler

### 1.1 Sistem Gereksinimleri

| Bileşen | Minimum | Önerilen |
|---------|---------|----------|
| **CPU** | 1 core | 2+ cores |
| **RAM** | 512 MB | 1+ GB |
| **Disk** | 1 GB | 5+ GB |

### 1.2 Yazılım Gereksinimleri

| Yazılım | Versiyon | Açıklama |
|---------|----------|----------|
| **Node.js** | 20.x LTS | JavaScript runtime |
| **npm** | 10.x | Package manager |
| **PostgreSQL** | 14+ | Veritabanı |
| **Git** | 2.x | Versiyon kontrol |

### 1.3 Walmart API Gereksinimleri

Walmart Marketplace API erişimi için:
- Walmart Seller Center hesabı
- Partner API onayı
- Client ID ve Client Secret

**Walmart Developer Portal**: https://developer.walmart.com/

---

## 2. Yerel Kurulum (Local)

### 2.1 Projeyi Klonlama

```bash
# Projeyi klonlayın
git clone <repository-url> walmart-nestjs
cd walmart-nestjs
```

### 2.2 Bağımlılıkları Yükleme

```bash
# NPM paketlerini yükleyin
npm install
```

### 2.3 Veritabanı Kurulumu

#### PostgreSQL Kurulumu (Ubuntu/Debian)
```bash
# PostgreSQL yükleyin
sudo apt update
sudo apt install postgresql postgresql-contrib

# PostgreSQL servisini başlatın
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### PostgreSQL Kurulumu (macOS)
```bash
# Homebrew ile yükleyin
brew install postgresql@14
brew services start postgresql@14
```

#### Veritabanı Oluşturma
```bash
# PostgreSQL'e bağlanın
sudo -u postgres psql

# Veritabanı ve kullanıcı oluşturun
CREATE DATABASE walmart_db;
CREATE USER walmart_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE walmart_db TO walmart_user;
\q
```

### 2.4 Environment Konfigürasyonu

```bash
# .env dosyası oluşturun
cp .env.example .env

# .env dosyasını düzenleyin
nano .env
```

**.env dosyası:**
```env
# Application
NODE_ENV=development
PORT=8082
APP_NAME=WalmartService

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=walmart_user
DB_PASSWORD=your_password
DB_DATABASE=walmart_db
DB_SYNCHRONIZE=false
DB_LOGGING=true

# Walmart API
WALMART_API_BASE_URL=https://marketplace.walmartapis.com/v3
WALMART_SERVICE_NAME=Walmart Service Name

# Logging (Logstash)
LOG_TCP_HOST=10.0.2.39
LOG_TCP_PORT=5045
LOG_LEVEL=info

# Scheduler
ENABLE_SCHEDULED_JOBS=false
ORDER_SYNC_INTERVAL_MINUTES=10
BATCH_SIZE=5
MAX_CONCURRENCY=5
```

### 2.5 Veritabanı Şemasını Oluşturma

Mevcut C# projesinden migrate ediyorsanız, şema zaten var demektir. Yeni kurulum için:

```bash
# TypeORM migration'ları çalıştırın (varsa)
npm run migration:run

# VEYA manuel SQL ile tablolar oluşturun
# (SQL dosyası için docs/schema.sql dosyasına bakın)
```

**Manuel Şema Oluşturma (schema.sql):**
```sql
-- User tablosu
CREATE TABLE "User" (
    "Id" SERIAL PRIMARY KEY,
    "UserId" VARCHAR(255),
    "StoreId" VARCHAR(255),
    "ClientId" VARCHAR(255),
    "ClientSecret" VARCHAR(255),
    "IsDeleted" BOOLEAN DEFAULT FALSE
);

-- Orders tablosu
CREATE TABLE "Orders" (
    "Id" SERIAL PRIMARY KEY,
    "purchaseOrderId" VARCHAR(255),
    "customerOrderId" VARCHAR(255),
    "orderDate" VARCHAR(255),
    "clientId" VARCHAR(255),
    "storeId" VARCHAR(255),
    "orderLocalUpdateDate" BIGINT
);

-- ShippingInfo tablosu
CREATE TABLE "ShippingInfo" (
    "Id" SERIAL PRIMARY KEY,
    "phone" VARCHAR(255),
    "estimatedDeliveryDate" BIGINT,
    "estimatedShipDate" BIGINT,
    "methodCode" VARCHAR(255),
    "postalAddress_name" VARCHAR(255),
    "postalAddress_address1" VARCHAR(255),
    "postalAddress_address2" VARCHAR(255),
    "postalAddress_city" VARCHAR(255),
    "postalAddress_state" VARCHAR(255),
    "postalAddress_postalCode" VARCHAR(255),
    "postalAddress_country" VARCHAR(255),
    "postalAddress_addressType" VARCHAR(255),
    "Orderid" INTEGER REFERENCES "Orders"("Id")
);

-- OrderLines tablosu
CREATE TABLE "OrderLines" (
    "Id" SERIAL PRIMARY KEY,
    "lineNumber" VARCHAR(255),
    "item_productName" VARCHAR(1000),
    "item_sku" VARCHAR(255),
    "item_imageUrl" VARCHAR(1000),
    "item_weight_value" DOUBLE PRECISION,
    "item_weight_unit" VARCHAR(50),
    "orderLineQuantity_unitOfMeasurement" VARCHAR(50),
    "orderLineQuantity_amount" VARCHAR(50),
    "fulfillment_fulfillmentOption" VARCHAR(255),
    "fulfillment_shipMethod" VARCHAR(255),
    "fulfillment_pickUpDateTime" BIGINT,
    "statusDate" BIGINT,
    "Orderid" INTEGER REFERENCES "Orders"("Id")
);

-- Charges tablosu
CREATE TABLE "Charges" (
    "Id" SERIAL PRIMARY KEY,
    "chargeType" VARCHAR(255),
    "chargeName" VARCHAR(255),
    "chargeAmount_currency" VARCHAR(10),
    "chargeAmount_amount" DOUBLE PRECISION,
    "tax_taxName" VARCHAR(255),
    "tax_taxAmount_currency" VARCHAR(10),
    "tax_taxAmount_amount" DOUBLE PRECISION,
    "OrderLineid" INTEGER REFERENCES "OrderLines"("Id")
);

-- OrderLineStatuses tablosu
CREATE TABLE "OrderLineStatuses" (
    "Id" SERIAL PRIMARY KEY,
    "status" VARCHAR(255),
    "statusQuantity_unitOfMeasurement" VARCHAR(50),
    "statusQuantity_amount" VARCHAR(50),
    "trackingInfo_shipDateTime" BIGINT,
    "trackingInfo_carrierName_carrier" VARCHAR(255),
    "trackingInfo_carrierName_otherCarrier" VARCHAR(255),
    "trackingInfo_methodCode" VARCHAR(255),
    "trackingInfo_trackingNumber" VARCHAR(255),
    "trackingInfo_trackingURL" VARCHAR(1000),
    "OrderLineid" INTEGER REFERENCES "OrderLines"("Id")
);
```

### 2.6 Uygulamayı Başlatma

```bash
# Development modunda başlatın
npm run start:dev

# VEYA production build
npm run build
npm run start:prod
```

### 2.7 Doğrulama

```bash
# Health check
curl http://localhost:8082/health-check

# Swagger UI'a erişin
# Tarayıcıda: http://localhost:8082/swagger
```

---

## 3. AWS Deployment

### 3.1 Mimari Genel Bakış

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS Cloud                            │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                       VPC                              │ │
│  │  ┌─────────────┐      ┌─────────────────────────┐     │ │
│  │  │   ALB       │─────▶│    ECS Fargate          │     │ │
│  │  │ (Port 80)   │      │   (walmart-service)     │     │ │
│  │  └─────────────┘      └───────────┬─────────────┘     │ │
│  │                                   │                    │ │
│  │                                   ▼                    │ │
│  │                       ┌─────────────────────────┐     │ │
│  │                       │    RDS PostgreSQL       │     │ │
│  │                       │    (db.t3.small)        │     │ │
│  │                       └─────────────────────────┘     │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                    CloudWatch                          │ │
│  │  (Logs, Metrics, Alarms)                              │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Ön Gereksinimler

- AWS CLI kurulu ve yapılandırılmış
- AWS hesabında gerekli IAM yetkileri
- ECR repository oluşturulmuş

### 3.3 RDS PostgreSQL Kurulumu

#### AWS Console veya CLI ile:

```bash
# RDS instance oluşturma
aws rds create-db-instance \
  --db-instance-identifier walmart-db \
  --db-instance-class db.t3.small \
  --engine postgres \
  --engine-version 14.10 \
  --master-username walmart_admin \
  --master-user-password YourSecurePassword123! \
  --allocated-storage 20 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-xxxxxxxx \
  --db-subnet-group-name your-subnet-group \
  --publicly-accessible false \
  --backup-retention-period 7 \
  --multi-az false \
  --db-name walmart_db
```

### 3.4 ECR Repository Oluşturma

```bash
# Repository oluşturun
aws ecr create-repository \
  --repository-name walmart-service \
  --image-scanning-configuration scanOnPush=true

# Login olun
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com
```

### 3.5 Docker Image Build ve Push

```bash
# Image build
docker build -t walmart-service .

# Tag
docker tag walmart-service:latest \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/walmart-service:latest

# Push
docker push \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/walmart-service:latest
```

### 3.6 ECS Fargate Task Definition

**task-definition.json:**
```json
{
  "family": "walmart-service",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "walmart-service",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/walmart-service:latest",
      "portMappings": [
        {
          "containerPort": 8082,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "PORT", "value": "8082" }
      ],
      "secrets": [
        {
          "name": "DB_HOST",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:walmart/db:host::"
        },
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:walmart/db:password::"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/walmart-service",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8082/health-check || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

```bash
# Task definition kaydet
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json
```

### 3.7 ECS Service Oluşturma

```bash
# Service oluştur
aws ecs create-service \
  --cluster walmart-cluster \
  --service-name walmart-service \
  --task-definition walmart-service:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxx],securityGroups=[sg-xxxx],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/walmart-tg/xxx,containerName=walmart-service,containerPort=8082"
```

### 3.8 Application Load Balancer Kurulumu

```bash
# ALB oluştur
aws elbv2 create-load-balancer \
  --name walmart-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx \
  --scheme internal

# Target group oluştur
aws elbv2 create-target-group \
  --name walmart-tg \
  --protocol HTTP \
  --port 8082 \
  --vpc-id vpc-xxx \
  --target-type ip \
  --health-check-path /health-check

# Listener oluştur
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/walmart-alb/xxx \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/walmart-tg/xxx
```

### 3.9 Production Environment Variables

AWS Secrets Manager kullanarak hassas bilgileri saklayın:

```bash
# Secret oluştur
aws secretsmanager create-secret \
  --name walmart/db \
  --secret-string '{"host":"walmart-db.xxx.us-east-1.rds.amazonaws.com","port":"5432","username":"walmart_admin","password":"YourSecurePassword123!","database":"walmart_db"}'
```

### 3.10 CloudWatch Logs

```bash
# Log group oluştur
aws logs create-log-group \
  --log-group-name /ecs/walmart-service

# Retention policy ayarla
aws logs put-retention-policy \
  --log-group-name /ecs/walmart-service \
  --retention-in-days 30
```

### 3.11 Auto Scaling (Opsiyonel)

```bash
# Service auto scaling target kaydet
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/walmart-cluster/walmart-service \
  --min-capacity 1 \
  --max-capacity 5

# CPU-based scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/walmart-cluster/walmart-service \
  --policy-name cpu-tracking \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{"TargetValue":70.0,"PredefinedMetricSpecification":{"PredefinedMetricType":"ECSServiceAverageCPUUtilization"},"ScaleInCooldown":300,"ScaleOutCooldown":60}'
```

---

## 4. Docker Deployment

### 4.1 Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production=false

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

USER nestjs

EXPOSE 8082

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8082/health-check || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
```

### 4.2 Docker Compose (Development)

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8082:8082"
    environment:
      - NODE_ENV=development
      - PORT=8082
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USERNAME=walmart_user
      - DB_PASSWORD=walmart_pass
      - DB_DATABASE=walmart_db
      - DB_SYNCHRONIZE=false
      - WALMART_API_BASE_URL=https://marketplace.walmartapis.com/v3
      - ENABLE_SCHEDULED_JOBS=false
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:14-alpine
    environment:
      - POSTGRES_USER=walmart_user
      - POSTGRES_PASSWORD=walmart_pass
      - POSTGRES_DB=walmart_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docs/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U walmart_user -d walmart_db"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### 4.3 Docker Compose Kullanımı

```bash
# Başlat
docker-compose up -d

# Logları izle
docker-compose logs -f app

# Durdur
docker-compose down

# Volumes ile birlikte temizle
docker-compose down -v
```

---

## 5. Sorun Giderme

### 5.1 Sık Karşılaşılan Hatalar

#### Veritabanı Bağlantı Hatası
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Çözüm:**
- PostgreSQL servisinin çalıştığından emin olun
- DB_HOST, DB_PORT değerlerini kontrol edin
- Firewall/Security Group ayarlarını kontrol edin

#### Walmart API Token Hatası
```
Error: Access Token not reacheable
```
**Çözüm:**
- Client ID ve Client Secret'ı doğrulayın
- Walmart Partner hesabının aktif olduğundan emin olun
- API rate limit'e takılmadığınızdan emin olun

#### Port Çakışması
```
Error: listen EADDRINUSE: address already in use :::8082
```
**Çözüm:**
```bash
# Port'u kullanan process'i bulun
lsof -i :8082
# Process'i sonlandırın
kill -9 <PID>
```

### 5.2 Debug Modunda Çalıştırma

```bash
# Debug modunda başlat
npm run start:debug

# VS Code ile debug için launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to NestJS",
      "port": 9229,
      "restart": true
    }
  ]
}
```

### 5.3 Log Analizi

```bash
# Uygulama loglarını izle
tail -f logs/app.log

# Docker container logları
docker logs -f walmart-service

# AWS CloudWatch logları
aws logs tail /ecs/walmart-service --follow
```

### 5.4 Health Check

```bash
# Basit health check
curl -v http://localhost:8082/health-check

# Detaylı bilgi için
curl http://localhost:8082/swagger-json | jq .
```

---

## Ek Kaynaklar

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Walmart Developer Portal](https://developer.walmart.com/)

---

*Bu kurulum rehberi, Walmart Service'in yerel ve AWS ortamlarında kurulumunu açıklamaktadır. Sorularınız için development ekibi ile iletişime geçin.*
