package storage

import (
	"context"
	"fmt"
	"io"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type MinioClient struct {
	client *minio.Client
	bucket string
}

func NewMinioClient(endpoint, accessKey, secretKey, bucket string, useSSL bool) (*MinioClient, error) {
	c, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("minio init: %w", err)
	}
	return &MinioClient{client: c, bucket: bucket}, nil
}

func (m *MinioClient) EnsureBucket(ctx context.Context) error {
	exists, err := m.client.BucketExists(ctx, m.bucket)
	if err != nil {
		return err
	}
	if !exists {
		return m.client.MakeBucket(ctx, m.bucket, minio.MakeBucketOptions{})
	}
	return nil
}

func (m *MinioClient) Put(ctx context.Context, key string, r io.Reader, size int64) error {
	_, err := m.client.PutObject(ctx, m.bucket, key, r, size, minio.PutObjectOptions{
		ContentType: "application/octet-stream",
	})
	return err
}

func (m *MinioClient) Get(ctx context.Context, key string) (io.ReadCloser, int64, error) {
	obj, err := m.client.GetObject(ctx, m.bucket, key, minio.GetObjectOptions{})
	if err != nil {
		return nil, 0, err
	}
	stat, err := obj.Stat()
	if err != nil {
		obj.Close()
		return nil, 0, fmt.Errorf("stat object: %w", err)
	}
	return obj, stat.Size, nil
}

func (m *MinioClient) Exists(ctx context.Context, key string) bool {
	_, err := m.client.StatObject(ctx, m.bucket, key, minio.StatObjectOptions{})
	return err == nil
}

func (m *MinioClient) Delete(ctx context.Context, key string) error {
	return m.client.RemoveObject(ctx, m.bucket, key, minio.RemoveObjectOptions{})
}

func PayloadKey(tenantSlug, planID, mcVersion string) string {
	return fmt.Sprintf("%s/%s/%s.pspl", tenantSlug, planID, mcVersion)
}