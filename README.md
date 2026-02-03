# Walmart Marketplace API Service

[![NestJS](https://img.shields.io/badge/NestJS-10.x-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)
[![AWS ECS](https://img.shields.io/badge/AWS-ECS%20Fargate-orange.svg)](https://aws.amazon.com/ecs/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

NestJS-based microservice that integrates with the Walmart Marketplace API. Migrated from C# (.NET) with full backward compatibility.

## 🎯 Features

- ✅ **Walmart Account Management** - OAuth2-based authentication
- ✅ **Order Synchronization** - Automatic order fetching and updating
- ✅ **Shipment Notification** - Shipment dispatch reporting to Walmart
- ✅ **Scheduled Jobs** - Periodic order synchronization (every 10 minutes)
- ✅ **Swagger Documentation** - Comprehensive API documentation
- ✅ **C# Compatibility** - Full backward compatibility with existing database schema and API contracts
- ✅ **AWS ECS Deployment** - Production deployment on ECS Fargate with automated deploy script
- ✅ **Circuit Breaker** - Automatic rollback on failed deployments

## 🏗️ Architecture Overview

```
Client (VPN) → Route 53 DNS → Internal ALB → ECS Fargate → PostgreSQL (RDS)
                 │                  │              │
    walmart.byelabel.internal   /mp-walmart/*   Middleware strips prefix
                                   routing      → NestJS processes as /api/*
```

## 📋 Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Walmart Partner API credentials
- AWS CLI (for deployment)
- Docker (for containerized deployment)
- VPN connection (for accessing production environment)

## 🚀 Quick Start

### 1. Installation

```bash
git clone https://github.com/byelabel/mp-walmart.git
cd walmart-nestjs

npm install

cp .env.example .env
nano .env
```

### 2. Database Configuration

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=walmart_db
DB_SSL=false
```

### 3. Running the Application

```bash
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod
```

### 4. Swagger UI

- **Local**: http://localhost:8082/swagger
- **Production**: https://walmart.byelabel.internal/mp-walmart/swagger (VPN required)

## 🌐 Production Environment

### Access URLs (VPN Required)

| Resource | URL |
|----------|-----|
| **Swagger UI** | `https://walmart.byelabel.internal/mp-walmart/swagger` |
| **Health Check** | `https://walmart.byelabel.internal/mp-walmart/health-check` |
| **Auth API** | `https://walmart.byelabel.internal/mp-walmart/api/Auth` |
| **Order API** | `https://walmart.byelabel.internal/mp-walmart/api/Order/...` |

> ⚠️ **SSL Certificate**: The internal ALB uses a certificate issued for `byelabel.com`. When accessing via `walmart.byelabel.internal`, browsers will show a "Not Secure" warning. This is expected for internal services.

### AWS Infrastructure

| Resource | Details |
|----------|---------|
| **ECS Cluster** | byelabel |
| **ECS Service** | mp-walmart-service |
| **ECR Repository** | 140023362064.dkr.ecr.us-east-1.amazonaws.com/mp-walmart-service |
| **ALB** | internal-byelabel-main-internal-lb (Internal) |
| **Target Group** | mp-walmart-tg |
| **Route 53** | walmart.byelabel.internal → ALB (Private Zone) |
| **CloudWatch Logs** | /ecs/mp-walmart-service |

### Deployment

```bash
# One-command deployment with automatic rollback
./deploy.sh
```

The deploy script handles: ECR login → Docker build → Push → Task definition update → ECS deployment → Health monitoring → Automatic rollback on failure.

### Live Logs

```bash
aws logs tail /ecs/mp-walmart-service --since 5m --follow
```

## 📁 Project Structure

```
walmart-nestjs/
├── src/
│   ├── auth/                    # User management module
│   ├── order/                   # Order management module
│   ├── schedule/                # Scheduled tasks
│   ├── database/entities/       # TypeORM entities
│   ├── common/
│   │   ├── dto/                 # Data Transfer Objects
│   │   ├── exceptions/          # Custom exceptions
│   │   ├── filters/             # Exception filters
│   │   └── utils/               # Utility functions
│   ├── app.module.ts
│   └── main.ts                  # Entry point + /mp-walmart prefix middleware
├── docs/                        # Documentation
├── deploy.sh                    # Automated deployment script
├── Dockerfile                   # Multi-stage Docker build
├── .env.example                 # Environment template
└── tsconfig.json
```

## 🔌 API Endpoints

All endpoints are accessible via ALB with `/mp-walmart` prefix. The middleware strips this prefix before NestJS routing.

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/Auth` | Create/update Walmart account |
| DELETE | `/api/Auth/:accountId/:storeId` | Soft delete account |

### Order
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/Order/:accountId/:storeId/:lastUpdateDate` | Get orders after date |
| GET | `/api/Order/GetOrdersAfterDate/:accountId/:storeId/:lastUpdateDate` | Get orders (C# compatible alias) |
| GET | `/api/Order/GetOrderFromApiByPurchaseOrderId/:accountId/:storeId/:purchaseOrderId` | Get specific order from Walmart API |
| POST | `/api/Order/DispatchOrder` | Dispatch shipment |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health-check` | Service health check |
| GET | `/log-test` | Logging system test |

## 🔗 Walmart API Integration

| Endpoint | Description |
|----------|-------------|
| `POST /v3/token` | OAuth2 token |
| `GET /v3/orders` | Order list |
| `GET /v3/orders/{id}` | Single order |
| `POST /v3/orders/{id}/shipping` | Shipment notification |

**Official Documentation**: https://developer.walmart.com/api/us/mp/orders

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture, data flow, middleware, and AWS infrastructure |
| [INSTALLATION.md](docs/INSTALLATION.md) | Local setup, AWS deployment, and deploy script usage |
| [USAGE.md](docs/USAGE.md) | API usage guide with examples and error codes |
| [SWAGGER_PREVIEW.md](docs/SWAGGER_PREVIEW.md) | Swagger UI endpoint preview |
| [walmart-nestjs-project-summary.html](docs/walmart-nestjs-project-summary.html) | Visual project summary with topology diagram |

## 🧪 Testing

```bash
# Postman Collection (import into Postman)
docs/Walmart-Marketplace-API.postman_collection.json

# Health Check (local)
curl http://localhost:8082/health-check

# Health Check (production - VPN required)
curl -k https://walmart.byelabel.internal/mp-walmart/health-check
```

> **Postman Note**: Disable SSL certificate verification in Postman settings when testing production endpoints.

## 🐳 Docker

```bash
# Build
docker build --platform linux/amd64 -t mp-walmart-service .

# Run locally
docker run -p 8082:8082 --env-file .env mp-walmart-service

# Production deployment
./deploy.sh
```

## 📄 License

MIT License - See the [LICENSE](LICENSE) file for details.

---

Built with ❤️ by **ByeLabel**.
