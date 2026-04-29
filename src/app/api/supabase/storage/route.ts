import { NextRequest, NextResponse } from 'next/server';
import { createRequestSupabaseClient, getServiceRoleClient, jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';

const ALLOWED_BUCKETS = new Set(['avatars']);
const MAX_AVATAR_FILE_BYTES = 2 * 1024 * 1024;
const STORAGE_PATH_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,255}$/;

function parseUpsert(value: FormDataEntryValue | null): boolean {
  if (typeof value !== 'string') return false;
  return value === 'true' || value === '1';
}

function isValidStoragePath(path: string): boolean {
  if (!path || path.includes('..')) return false;
  return STORAGE_PATH_PATTERN.test(path);
}

function validateBucket(bucket: string | null) {
  if (!bucket || !ALLOWED_BUCKETS.has(bucket)) {
    return jsonError('Unsupported storage bucket', 403);
  }
  return null;
}

export async function GET(request: NextRequest) {
  const rawBucket = request.nextUrl.searchParams.get('bucket');
  const bucketError = validateBucket(rawBucket);
  if (bucketError) return bucketError;
  const bucket = rawBucket as string;

  const path = request.nextUrl.searchParams.get('path') || '';
  if (!isValidStoragePath(path)) {
    return jsonError('Invalid storage path', 400);
  }

  const supabase = await createRequestSupabaseClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!data.publicUrl) {
    return jsonError('Public URL unavailable', 404);
  }

  return NextResponse.redirect(data.publicUrl, 302);
}

export async function POST(request: NextRequest) {
  console.log('[Storage API] Upload request received');
  
  const auth = await requireUserContext(request);
  if ('error' in auth) {
    console.error('[Storage API] Auth error:', auth.error);
    return jsonError(auth.error.message, auth.error.status);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (e) {
    console.error('[Storage API] Form data parse error:', e);
    return jsonError('Invalid form data', 400);
  }

  const rawBucket = formData.get('bucket');
  if (typeof rawBucket !== 'string') {
    return jsonError('Missing storage bucket', 400);
  }
  const bucketError = validateBucket(rawBucket);
  if (bucketError) return bucketError;
  const bucket = rawBucket;

  const path = formData.get('path');
  if (typeof path !== 'string' || !isValidStoragePath(path)) {
    return jsonError('Invalid storage path', 400);
  }

  if (bucket === 'avatars' && !path.startsWith(`${auth.user.id}-`)) {
    return jsonError('Invalid avatar path', 403);
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return jsonError('Missing upload file', 400);
  }

  console.log('[Storage API] Uploading file:', file.name, 'size:', file.size, 'type:', file.type);

  if (bucket === 'avatars') {
    if (!file.type.startsWith('image/')) {
      return jsonError('Unsupported avatar file type', 400);
    }
    if (file.size > MAX_AVATAR_FILE_BYTES) {
      return jsonError('Avatar file too large', 400);
    }
  }

  const upsert = parseUpsert(formData.get('upsert'));

  const serviceClient = getServiceRoleClient();
  const storageClient = serviceClient?.storage;
  
  if (!storageClient) {
    console.error('[Storage API] Storage client is undefined');
    return jsonError('Storage service unavailable', 500);
  }

  const { data, error } = await storageClient
    .from(bucket)
    .upload(path, file, { upsert });

  if (error) {
    console.error('[Storage API] Supabase upload error:', error);
    return jsonError(error.message || 'Upload failed', 400);
  }

  console.log('[Storage API] Upload successful, data:', data);

  const { data: publicData } = storageClient.from(bucket).getPublicUrl(path);
  const response = jsonOk({
    data: {
      path: data?.path ?? path,
      fullPath: data?.fullPath ?? null,
      id: data?.id ?? null,
      publicUrl: publicData.publicUrl,
    },
    error: null,
  });

  console.log('[Storage API] Returning response with publicUrl:', publicData.publicUrl);
  return response;
}
