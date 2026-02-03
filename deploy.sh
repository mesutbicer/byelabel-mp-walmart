#!/bin/bash
set -e

# Konfigürasyon
AWS_ACCOUNT="140023362064"
REGION="us-east-1"
ECR_REPO="$AWS_ACCOUNT.dkr.ecr.$REGION.amazonaws.com/mp-walmart-service"
CLUSTER="byelabel"
SERVICE="mp-walmart-service"
TASK_FAMILY="mp-walmart-service"

# Unique tag
TAG=$(date +%Y%m%d-%H%M%S)
echo "🏷️  Tag: $TAG"

# 1. ECR Login
echo "🔐 ECR login..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT.dkr.ecr.$REGION.amazonaws.com

# 2. Build
echo "🔨 Building..."
docker build --platform linux/amd64 -t mp-walmart-service:$TAG . --no-cache

# 3. Tag & Push
echo "📤 Pushing..."
docker tag mp-walmart-service:$TAG $ECR_REPO:$TAG
docker tag mp-walmart-service:$TAG $ECR_REPO:latest
docker push $ECR_REPO:$TAG
docker push $ECR_REPO:latest

# 4. Task definition güncelle
echo "📋 Updating task definition..."
aws ecs describe-task-definition --task-definition $TASK_FAMILY --query taskDefinition > /tmp/current-td.json
jq --arg IMG "$ECR_REPO:$TAG" \
  'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy) | .containerDefinitions[0].image = $IMG' \
  /tmp/current-td.json > /tmp/new-td.json
NEW_REVISION=$(aws ecs register-task-definition --cli-input-json file:///tmp/new-td.json --query 'taskDefinition.revision' --output text)
echo "✅ New revision: $TASK_FAMILY:$NEW_REVISION"

# 5. Deploy
echo "🚀 Deploying..."
aws ecs update-service --cluster $CLUSTER --service $SERVICE \
  --task-definition $TASK_FAMILY:$NEW_REVISION \
  --force-new-deployment > /dev/null

# 6. Takip
echo "⏳ Waiting for deployment..."
TIMEOUT=300
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
  RUNNING=$(aws ecs describe-services --cluster $CLUSTER --services $SERVICE \
    --query 'services[0].runningCount' --output text)
  DESIRED=$(aws ecs describe-services --cluster $CLUSTER --services $SERVICE \
    --query 'services[0].desiredCount' --output text)
  DEPLOYMENTS=$(aws ecs describe-services --cluster $CLUSTER --services $SERVICE \
    --query 'length(services[0].deployments)' --output text)

  echo "  [${ELAPSED}s] Running: $RUNNING/$DESIRED | Deployments: $DEPLOYMENTS"

  if [ "$RUNNING" = "$DESIRED" ] && [ "$DEPLOYMENTS" = "1" ]; then
    echo ""
    echo "✅ Deploy basarili! Tag: $TAG"
    exit 0
  fi

  sleep 15
  ELAPSED=$((ELAPSED + 15))
done

echo ""
echo "⚠️  Timeout! Circuit breaker devreye girecek ve otomatik rollback yapacak."
echo "Loglari kontrol et: aws logs tail /ecs/mp-walmart-service --since 5m"
exit 1