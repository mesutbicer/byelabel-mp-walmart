# Walmart Service - Kurulum Rehberi

## 📋 İçindekiler

1. [Gereksinimler](#1-gereksinimler)
2. [Yerel Kurulum (Local)](#2-yerel-kurulum-local)
3. [AWS Production Deployment](#3-aws-production-deployment)
4. [Docker](#4-docker)
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
| **Docker** | 24+ | Container runtime (deployment için) |
| **AWS CLI** | 2.x | AWS komut satırı (deployment için) |
| **jq** | 1.6+ | JSON processor (deploy script için) |

### 1.3 Walmart API Gereksinimleri

- Walmart Seller Center hesabı
- Partner API onayı
- Client ID ve Client Secret

**Walmart Developer Portal**: https://developer.walmart.com/

---

## 2. Yerel Kurulum (Local)

### 2.1 Projeyi Klonlama

```bash
git clone https://github.com/byelabel/mp-walmart.git
cd walmart-nestjs
```

### 2.2 Bağımlılıkları Yükleme

```bash
npm install
```

### 2.3 Veritabanı Kurulumu

#### PostgreSQL Kurulumu (macOS)
```bash
brew install postgresql@14
brew services start postgresql@14
```

#### PostgreSQL Kurulumu (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Veritabanı Oluşturma
```bash
sudo -u postgres psql

CREATE DATABASE walmart_db;
CREATE USER walmart_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE walmart_db TO walmart_user;
\q
```

Tablo şemaları için `docs/schema.sql` dosyasını kullanın.

### 2.4 Environment Konfigürasyonu

```bash
cp .env.example .env
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
DB_SSL=false

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

### 2.5 Uygulamayı Başlatma

```bash
# Development modunda
npm run start:dev

# Production build
npm run build
npm run start:prod
```

### 2.6 Doğrulama

```bash
# Health check
curl http://localhost:8082/health-check

# Swagger UI
# Tarayıcıda: http://localhost:8082/swagger
```

---

## 3. AWS Production Deployment

### 3.1 Mevcut Altyapı

Walmart servisi, ByeLabel'ın ortak AWS altyapısı üzerinde çalışır. Aşağıdaki kaynaklar zaten yapılandırılmıştır:

| Kaynak | Değer |
|--------|-------|
| **AWS Account** | 140023362064 |
| **Region** | us-east-1 |
| **ECS Cluster** | byelabel |
| **ECS Service** | mp-walmart-service |
| **ECR Repository** | mp-walmart-service |
| **ALB** | internal-byelabel-main-internal-lb |
| **Target Group** | mp-walmart-tg (Port 8082, Health: /health-check) |
| **Route 53 DNS** | walmart.byelabel.internal (Private Zone) |
| **CloudWatch Logs** | /ecs/mp-walmart-service |
| **SSL Certificate** | CN=byelabel.com (Amazon RSA 2048) |

### 3.2 Mimari

```
Client (VPN)
    │
    ▼
Route 53 DNS (walmart.byelabel.internal)
    │
    ▼
Internal ALB (/mp-walmart/* → mp-walmart-tg)
    │
    ▼
ECS Fargate (mp-walmart-service)
    │  ├── Middleware: /mp-walmart prefix strip
    │  └── NestJS App (Port 8082)
    │
    ▼
RDS PostgreSQL (SSL)
```

### 3.3 Deploy Script ile Deployment (Önerilen)

En kolay ve güvenli deployment yöntemi `deploy.sh` scriptidir:

```bash
./deploy.sh
```

Script otomatik olarak şunları yapar:
1. **ECR Login** - AWS kimlik doğrulama
2. **Docker Build** - `linux/amd64` platformu için build
3. **Tag & Push** - Unique timestamp tag ile ECR'a push (ör: `20260203-143000`)
4. **Task Definition** - Yeni image tag ile task definition güncelleme
5. **ECS Deploy** - Servis güncelleme ve force new deployment
6. **Health Monitor** - Deployment durumunu takip etme (300s timeout)
7. **Otomatik Rollback** - Timeout durumunda circuit breaker devreye girer

Örnek çıktı:
```
🏷️  Tag: 20260203-143000
🔐 ECR login...
🔨 Building...
📤 Pushing...
📋 Updating task definition...
✅ New revision: mp-walmart-service:15
🚀 Deploying...
⏳ Waiting for deployment...
  [0s] Running: 1/1 | Deployments: 2
  [15s] Running: 2/1 | Deployments: 2
  [30s] Running: 1/1 | Deployments: 1
✅ Deploy basarili! Tag: 20260203-143000
```

### 3.4 Manuel Deploy Adımları

Deploy script kullanmadan manuel deployment:

```bash
# 1. ECR Login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 140023362064.dkr.ecr.us-east-1.amazonaws.com

# 2. Docker Build
docker build --platform linux/amd64 -t mp-walmart-service . --no-cache

# 3. Tag & Push
docker tag mp-walmart-service:latest \
  140023362064.dkr.ecr.us-east-1.amazonaws.com/mp-walmart-service:latest
docker push \
  140023362064.dkr.ecr.us-east-1.amazonaws.com/mp-walmart-service:latest

# 4. ECS Deploy
aws ecs update-service --cluster byelabel --service mp-walmart-service --force-new-deployment
```

> ⚠️ Manuel deploy'da `:latest` tag kullanılır. ECS cache'den eski image çekebilir. `deploy.sh` unique tag kullanarak bu sorunu önler.

### 3.5 ECS Konfigürasyonu

#### Circuit Breaker (Otomatik Rollback)
```bash
aws ecs update-service --cluster byelabel --service mp-walmart-service \
  --deployment-configuration '{"minimumHealthyPercent":100,"maximumPercent":200,"deploymentCircuitBreaker":{"enable":true,"rollback":true}}'
```

- `minimumHealthyPercent=100` → Eski task her zaman ayakta kalır
- `maximumPercent=200` → Yeni task paralel başlar
- `circuitBreaker + rollback` → Başarısız deployment otomatik geri alınır

### 3.6 Canlı Log Takibi

```bash
# Son 5 dakikanın logları + canlı takip
aws logs tail /ecs/mp-walmart-service --since 5m --follow

# Sadece hataları göster
aws logs tail /ecs/mp-walmart-service --since 30m --filter-pattern "ERROR"
```

### 3.7 Erişim

| URL | Açıklama |
|-----|----------|
| `https://walmart.byelabel.internal/mp-walmart/swagger` | Swagger UI |
| `https://walmart.byelabel.internal/mp-walmart/health-check` | Health Check |
| `https://walmart.byelabel.internal/mp-walmart/api/Auth` | Auth API |
| `https://walmart.byelabel.internal/mp-walmart/api/Order/...` | Order API |

> ⚠️ **VPN Gerekli**: Tüm URL'lere erişim için VPN bağlantısı gereklidir.

> ⚠️ **SSL Uyarısı**: SSL sertifikası `byelabel.com` için düzenlenmiştir. `walmart.byelabel.internal` üzerinden erişimde tarayıcı "Not Secure" uyarısı gösterir. Bu internal servisler için kabul edilebilir bir durumdur.

---

## 4. Docker

### 4.1 Dockerfile

Proje multi-stage Docker build kullanır:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache dumb-init curl
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
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

### 4.2 Lokal Docker Çalıştırma

```bash
# Build
docker build -t mp-walmart-service .

# Run
docker run -p 8082:8082 --env-file .env mp-walmart-service
```

---

## 5. Sorun Giderme

### 5.1 Sık Karşılaşılan Hatalar

#### Veritabanı Bağlantı Hatası
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Çözüm:** PostgreSQL servisinin çalıştığından ve DB_HOST/DB_PORT değerlerinin doğruluğundan emin olun.

#### RDS SSL Hatası
```
Error: self signed certificate in certificate chain
```
**Çözüm:** `.env` dosyasında `DB_SSL=true` olduğundan emin olun. RDS bağlantısı SSL gerektirir.

#### Walmart API Token Hatası
```
Error: Access Token not reacheable
```
**Çözüm:** Client ID ve Client Secret'ı doğrulayın. Walmart Partner hesabının aktif olduğundan emin olun.

#### ECS Task Crash Loop
```
ECS task sürekli yeniden başlıyor
```
**Çözüm:**
```bash
# Logları kontrol edin
aws logs tail /ecs/mp-walmart-service --since 10m

# Health check path'ini doğrulayın
aws elbv2 describe-target-groups --names mp-walmart-tg --query 'TargetGroups[0].HealthCheckPath'
```

#### ECR Push 403 Forbidden
```
403 Forbidden - ECR push rejected
```
**Çözüm:** ECR token süresi dolmuş. Yeniden login olun:
```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 140023362064.dkr.ecr.us-east-1.amazonaws.com
```

### 5.2 Yararlı Komutlar

```bash
# ECS service durumu
aws ecs describe-services --cluster byelabel --services mp-walmart-service \
  --query 'services[0].{Running:runningCount,Desired:desiredCount,Status:status}'

# Target Group health durumu
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups --names mp-walmart-tg --query 'TargetGroups[0].TargetGroupArn' --output text)

# DNS doğrulama (VPN gerekli)
curl -k https://walmart.byelabel.internal/mp-walmart/health-check
```

---

## Ek Kaynaklar

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Walmart Developer Portal](https://developer.walmart.com/)

---

*Bu kurulum rehberi, Walmart Service'in yerel ve AWS ortamlarında kurulumunu açıklamaktadır.*
