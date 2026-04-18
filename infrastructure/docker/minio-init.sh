#!/bin/sh
set -e

until mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" 2>/dev/null; do
  echo "waiting for minio..."
  sleep 1
done

if ! mc ls "local/$MINIO_BUCKET" > /dev/null 2>&1; then
  mc mb "local/$MINIO_BUCKET"
fi

mc anonymous set download "local/$MINIO_BUCKET"

echo "minio bucket '$MINIO_BUCKET' is ready"
