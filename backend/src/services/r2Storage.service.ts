import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Cloudflare R2 storage service (S3-compatible)
// ---------------------------------------------------------------------------

function buildR2Client(): S3Client {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY;
  const secretAccessKey = process.env.R2_SECRET_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing R2 environment variables: R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY');
  }

  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

/**
 * Upload a PNG buffer to R2 and return the public CDN URL.
 *
 * Objects are stored at: garments/{userId}/{uuid}.png
 */
export async function uploadGarmentImage(
  pngBuffer: Buffer,
  userId: string
): Promise<string> {
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL; // e.g. https://cdn.wearwise.app

  if (!bucket) throw new Error('Missing R2_BUCKET environment variable');

  const client = buildR2Client();
  const key = `garments/${userId}/${randomUUID()}.png`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: pngBuffer,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  // If a public CDN URL prefix is set use it, otherwise build the R2 URL
  if (publicUrl) {
    return `${publicUrl.replace(/\/$/, '')}/${key}`;
  }

  // Fallback: derive from R2_ENDPOINT (replace account subdomain with pub)
  const endpoint = process.env.R2_ENDPOINT ?? '';
  return `${endpoint.replace(/\/$/, '')}/${bucket}/${key}`;
}
