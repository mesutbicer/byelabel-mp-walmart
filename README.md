# Walmart Marketplace API Service

[![NestJS](https://img.shields.io/badge/NestJS-10.x-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

NestJS-based microservice that integrates with the Walmart Marketplace API.

## 🎯 Features

- ✅ **Walmart Account Management** - OAuth2-based authentication
- ✅ **Order Synchronization** - Automatic order fetching and updating
- ✅ **Shipment Notification** - Shipment dispatch reporting to Walmart
- ✅ **Scheduled Jobs** - Periodic order synchronization
- ✅ **Swagger Documentation** - Comprehensive API documentation
- ✅ **C# Compatibility** - Full compatibility with existing database schema

## 📋 Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Walmart Partner API credentials

## 🚀 Quick Start

### 1. Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit the .env file
nano .env
```

### 2. Database Configuration

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=walmart_db
```

### 3. Running the Application

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### 4. Swagger UI

Open in your browser: `http://localhost:8082/swagger`

## 📁 Project Structure

```
src/
├── auth/                    # User management module
├── order/                   # Order management module
├── schedule/                # Scheduled tasks
├── database/entities/       # TypeORM entities
├── common/
│   ├── dto/                 # Data Transfer Objects
│   ├── exceptions/          # Custom exceptions
│   ├── filters/             # Exception filters
│   └── utils/               # Utility functions
├── app.module.ts
└── main.ts
```

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/Auth` | Create/update account |
| DELETE | `/api/Auth/:accountId/:storeId` | Delete account |

### Order
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/Order/GetOrdersAfterDate/:accountId/:storeId/:lastUpdateDate` | Get orders |
| GET | `/api/Order/GetOrderFromApiByPurchaseOrderId/:accountId/:storeId/:purchaseOrderId` | Get single order |
| POST | `/api/Order/DispatchOrder` | Dispatch shipment |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health-check` | Service status |

## 🔗 Walmart API

This service uses the following Walmart API endpoints:

| Endpoint | Description |
|----------|-------------|
| `POST /token` | OAuth2 token |
| `GET /orders` | Order list |
| `GET /orders/{id}` | Single order |
| `POST /orders/{id}/shipping` | Shipment notification |

**Official Documentation**: https://developer.walmart.com/api/us/mp/orders

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture details |
| [INSTALLATION.md](docs/INSTALLATION.md) | Installation guide |
| [USAGE.md](docs/USAGE.md) | Usage guide |
| [SWAGGER_PREVIEW.md](docs/SWAGGER_PREVIEW.md) | Swagger preview |

## 🧪 Testing

```bash
# Postman Collection
docs/Walmart-Service.postman_collection.json

# Health Check
curl http://localhost:8082/health-check
```

## 🐳 Docker

```bash
# Build
docker build -t walmart-service .

# Run
docker run -p 8082:8082 --env-file .env walmart-service
```

## 📄 License

MIT License - See the [LICENSE](LICENSE) file for details.

## 👥 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

Built with ❤️ by **ByeLabel**.
