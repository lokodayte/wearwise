import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from './supabaseAdmin';

// ---------------------------------------------------------------------------
// Cloudflare R2 storage (primary) with Supabase Storage fallback
// ---------------------------------------------------------------------------

function isR2Configured(): boolean {
  return !!(
    process.env.R2_ENDPOINT &&
    process.env.R2_ACCESS_KEY &&
    process.env.R2_SECRET_KEY &&
    process.env.R2_BUCKET
  );
}

async function uploadToR2(pngBuffer: Buffer, userId: string): Promise<string> {
  const client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY!,
      secretAccessKey: process.env.R2_SECRET_KEY!,
    },
  });

  const bucket = process.env.R2_BUCKET!;
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

  const publicUrl = process.env.R2_PUBLIC_URL;
  if (publicUrl) return `${publicUrl.replace(/\/$/, '')}/${key}`;
  return `${process.env.R2_ENDPOINT!.replace(/\/$/, '')}/${bucket}/${key}`;
}

async function uploadToSupabaseStorage(pngBuffer: Buffer, userId: string): Promise<string> {
  const path = `garments/${userId}/${randomUUID()}.png`;

  const { error } = await supabaseAdmin.storage
    .from('garments')
    .upload(path, pngBuffer, {
      contentType: 'image/png',
      upsert: false,
    });

  if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`);

  const { data } = supabaseAdmin.storage.from('garments').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadGarmentImage(
  pngBuffer: Buffer,
  userId: string
): Promise<string> {
  if (isR2Configured()) {
    return uploadToR2(pngBuffer, userId);
  }

  // Fallback to Supabase Storage
  try {
    return await uploadToSupabaseStorage(pngBuffer, userId);
  } catch (err) {
    console.warn('[r2Storage] Supabase Storage fallback failed:', err);
    // Last resort — return empty string, garment will save without an image
    return '';
  }
}
