import type { MembershipType } from '@/lib/user/membership';
import type { UserSettingsSnapshot } from '@/lib/user/settings';
import { requestBrowserJson } from '@/lib/browser-api';

export type UserProfile = {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  membership: MembershipType | null;
  membership_expires_at: string | null;
  ai_chat_count: number | null;
};

export type UserProfileBundle = {
  profile: UserProfile | null;
  settings: UserSettingsSnapshot | null;
};

export type ProfileUpdateInput = {
  profile?: {
    nickname?: string;
    avatar_url?: string | null;
  };
};

export type ProfileUpdateResult = {
  success: boolean;
  profile: UserProfile | null;
  settings: UserSettingsSnapshot | null;
  error?: { message: string; code?: string };
};

function toProfileUpdateResult(result: Awaited<ReturnType<typeof requestBrowserJson<UserProfileBundle>>>): ProfileUpdateResult {
  if (result.error) {
    return {
      success: false,
      profile: null,
      settings: null,
      error: {
        message: result.error.message || '更新用户资料失败',
        code: result.error.code,
      },
    };
  }

  return {
    success: true,
    profile: result.data?.profile ?? null,
    settings: result.data?.settings ?? null,
  };
}

export async function getCurrentUserProfileBundle(): Promise<UserProfileBundle> {
  const result = await requestBrowserJson<UserProfileBundle>('/api/user/profile', {
    method: 'GET',
  });

  if (result.error) {
    throw new Error(result.error.message || '获取用户资料失败');
  }

  if (!result.data) {
    throw new Error('获取用户资料失败');
  }

  return result.data;
}

export async function updateCurrentUserProfile(input: ProfileUpdateInput): Promise<ProfileUpdateResult> {
  const payload: ProfileUpdateInput = {};

  if (input.profile) {
    payload.profile = {};
    if (typeof input.profile.nickname === 'string') {
      payload.profile.nickname = input.profile.nickname.trim();
    }
    if (typeof input.profile.avatar_url === 'string' || input.profile.avatar_url === null) {
      payload.profile.avatar_url = input.profile.avatar_url;
    }
  }

  const result = await requestBrowserJson<UserProfileBundle>('/api/user/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  return toProfileUpdateResult(result);
}

export async function updateAvatarUrl(avatarUrl: string | null) {
  return updateCurrentUserProfile({
    profile: {
      avatar_url: avatarUrl,
    },
  });
}

export async function updateNickname(nickname: string) {
  return updateCurrentUserProfile({
    profile: {
      nickname,
    },
  });
}

export async function uploadAvatarForCurrentUser(userId: string, file: File | Blob): Promise<{
  success: boolean;
  publicUrl: string | null;
  error?: { message: string; code?: string };
}> {
  const formData = new FormData();
  const extension = file instanceof File && file.name.includes('.')
    ? file.name.split('.').pop()
    : 'png';
  const path = `${userId}-${Date.now()}.${extension}`;

  formData.append('file', file);
  formData.append('bucket', 'avatars');
  formData.append('path', path);
  formData.append('upsert', 'true');

  try {
    const uploadResult = await fetch('/api/supabase/storage', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    console.debug('[Avatar Upload] Response status:', uploadResult.status);
    
    let uploadPayload: {
      data?: { publicUrl?: string | null } | null;
      error?: unknown;
    } | null = null;

    try {
      const responseText = await uploadResult.text();
      console.debug('[Avatar Upload] Response text:', responseText);
      
      if (responseText.trim()) {
        uploadPayload = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error('[Avatar Upload] Failed to parse response JSON:', parseError);
      uploadPayload = null;
    }

    console.debug('[Avatar Upload] Response payload:', uploadPayload);

    if (!uploadResult.ok) {
      let errorMsg = `HTTP ${uploadResult.status}`;
      
      if (uploadPayload?.error) {
        errorMsg = typeof uploadPayload.error === 'object' && 'message' in uploadPayload.error
          ? String((uploadPayload.error as { message: unknown }).message)
          : String(uploadPayload.error);
      }
      
      console.error('[Avatar Upload] Server error:', errorMsg);
      return {
        success: false,
        publicUrl: null,
        error: { message: `上传失败: ${errorMsg}` },
      };
    }

    const publicUrl = uploadPayload?.data?.publicUrl ?? null;
    if (!publicUrl) {
      console.error('[Avatar Upload] No public URL returned');
      return {
        success: false,
        publicUrl: null,
        error: { message: '获取头像URL失败' },
      };
    }

    const profileUpdate = await updateAvatarUrl(publicUrl);
    if (!profileUpdate.success) {
      console.error('[Avatar Upload] Failed to update profile:', profileUpdate.error);
      return {
        success: false,
        publicUrl: null,
        error: profileUpdate.error || { message: '头像保存失败' },
      };
    }

    console.info('[Avatar Upload] Success:', publicUrl);
    return {
      success: true,
      publicUrl,
    };
  } catch (error) {
    console.error('[Avatar Upload] Exception:', error);
    return {
      success: false,
      publicUrl: null,
      error: { message: `上传异常: ${error instanceof Error ? error.message : String(error)}` },
    };
  }
}
