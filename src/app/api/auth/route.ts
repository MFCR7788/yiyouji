import { NextRequest, NextResponse } from 'next/server';
import type { Session } from '@supabase/supabase-js';
import { createAnonClient, createAuthedClient } from '@/lib/api-utils';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  resolveSessionFromTokens,
  type SessionResolutionError,
  setSessionCookies,
} from '@/lib/auth-session';
import { IS_DEV_MODE } from '@/lib/dev-mode';

type AuthAction =
  | 'signInWithPassword'
  | 'signUp'
  | 'signOut'
  | 'updateUser'
  | 'resetPasswordForEmail'
  | 'signInWithOtp'
  | 'verifyOtp'
  | 'resetPasswordWithOtp'
  | 'getUser'
  | 'getSession'
  | 'checkLoginAttempts'
  | 'recordLoginAttempt';

function authSuccess(data: unknown, status = 200) {
  return NextResponse.json({ data, error: null }, { status });
}

function authFailure(message: string, status = 400, code?: string) {
  return NextResponse.json(
    {
      data: null,
      error: code ? { message, code } : { message },
    },
    { status }
  );
}

async function resolveSession(request: NextRequest): Promise<{
  session: Session | null;
  refreshed: boolean;
  error: SessionResolutionError | null;
}> {
  const bearer = request.headers.get('authorization');
  const bearerToken = bearer?.replace(/Bearer\s+/i, '') || null;
  return resolveSessionFromTokens(createAnonClient(), {
    accessToken: bearerToken || request.cookies.get(ACCESS_COOKIE)?.value || null,
    refreshToken: request.cookies.get(REFRESH_COOKIE)?.value || null,
  });
}

function buildDevSession(token: string): Session {
  const phoneMatch = token.match(/dev-token-(.+)/);
  const phone = phoneMatch ? phoneMatch[1] : 'dev-user';
  const nickname = phone.startsWith('dev-') ? '开发用户' : `用户${phone.slice(-4)}`;

  return {
    access_token: `dev-token-${phone}`,
    refresh_token: `dev-refresh-token-${phone}`,
    expires_at: Date.now() / 1000 + 3600,
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: `dev-user-${phone}`,
      app_metadata: {},
      user_metadata: { nickname, phone: phone.startsWith('dev-') ? undefined : phone },
      aud: 'authenticated',
      role: 'authenticated',
      email: phone.startsWith('dev-') ? 'dev@example.com' : `user_${phone}@mingai.fun`,
      email_confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

export async function GET(request: NextRequest) {
  if (IS_DEV_MODE) {
    const authHeader = request.headers.get('authorization');
    const accessToken = request.cookies.get(ACCESS_COOKIE)?.value || null;

    if ((authHeader?.startsWith('Bearer ') && authHeader.startsWith('Bearer dev-token-')) || (accessToken && accessToken.startsWith('dev-token-'))) {
      const mockSession = buildDevSession(accessToken || authHeader?.replace('Bearer ', '') || 'dev-token');
      return authSuccess({ session: mockSession, user: mockSession.user });
    }
    return authSuccess({ session: null, user: null });
  }
  
  const { session, refreshed, error } = await resolveSession(request);
  if (error) {
    return authFailure(error.message, error.status, error.code);
  }
  const response = authSuccess({ session, user: session?.user ?? null });
  if (refreshed) {
    setSessionCookies(response, session);
  }
  return response;
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return authFailure('Invalid JSON payload', 400);
  }

  const action = String(payload.action || '') as AuthAction;
  if (!action) return authFailure('Missing auth action', 400);

  if (IS_DEV_MODE) {
    return handleDevModeAction(action, payload, request);
  }

  const anonymousClient = createAnonClient();

  switch (action) {
    case 'signInWithPassword': {
      const email = String(payload.email || '');
      const password = String(payload.password || '');
      const { data, error } = await anonymousClient.auth.signInWithPassword({ email, password });
      if (error) return authFailure(error.message, 401, error.code);
      const response = authSuccess(data);
      setSessionCookies(response, data.session);
      return response;
    }
    case 'signUp': {
      const email = String(payload.email || '');
      const password = String(payload.password || '');
      const options = (payload.options as Record<string, unknown> | undefined) || undefined;
      const { data, error } = await anonymousClient.auth.signUp({ email, password, options });
      if (error) return authFailure(error.message, 400, error.code);
      const response = authSuccess(data);
      if (data.session) {
        setSessionCookies(response, data.session);
      }
      return response;
    }
    case 'signOut': {
      const { session, error: sessionError } = await resolveSession(request);
      if (sessionError) return authFailure(sessionError.message, sessionError.status, sessionError.code);
      if (!session?.access_token) {
        const response = authSuccess({ signedOut: true });
        setSessionCookies(response, null);
        return response;
      }

      const client = createAuthedClient(session.access_token);
      const { error: signOutError } = await client.auth.signOut();
      if (signOutError) return authFailure(signOutError.message, 400, signOutError.code);
      const response = authSuccess({ signedOut: true });
      setSessionCookies(response, null);
      return response;
    }
    case 'updateUser': {
      const { session, error: sessionError } = await resolveSession(request);
      if (sessionError) return authFailure(sessionError.message, sessionError.status, sessionError.code);
      if (!session?.access_token) return authFailure('Unauthorized', 401);

      const attributes = (payload.attributes as Record<string, unknown> | undefined) || {};
      const client = createAuthedClient(session.access_token);
      const { data, error: updateUserError } = await client.auth.updateUser(attributes);
      if (updateUserError) return authFailure(updateUserError.message, 400, updateUserError.code);
      return authSuccess(data);
    }
    case 'resetPasswordForEmail': {
      const email = String(payload.email || '');
      const options = (payload.options as Record<string, unknown> | undefined) || undefined;
      const { data, error } = await anonymousClient.auth.resetPasswordForEmail(email, options);
      if (error) return authFailure(error.message, 400, error.code);
      return authSuccess(data);
    }
    case 'signInWithOtp': {
      const params = (payload.params as Record<string, unknown> | undefined) || {};
      const { data, error } = await anonymousClient.auth.signInWithOtp(params as Parameters<typeof anonymousClient.auth.signInWithOtp>[0]);
      if (error) return authFailure(error.message, 400, error.code);
      return authSuccess(data);
    }
    case 'verifyOtp': {
      const params = (payload.params as Record<string, unknown> | undefined) || {};
      const { data, error } = await anonymousClient.auth.verifyOtp(params as unknown as Parameters<typeof anonymousClient.auth.verifyOtp>[0]);
      if (error) return authFailure(error.message, 400, error.code);
      const response = authSuccess(data);
      if (data.session) {
        setSessionCookies(response, data.session);
      }
      return response;
    }
    case 'resetPasswordWithOtp': {
      const email = String(payload.email || '');
      const token = String(payload.token || '');
      const newPassword = String(payload.newPassword || '');
      if (!email || !token || !newPassword) {
        return authFailure('Missing reset password parameters', 400);
      }

      const isolatedClient = createAnonClient();
      const verifyResult = await isolatedClient.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
      });
      if (verifyResult.error) {
        return authFailure(verifyResult.error.message, 400, verifyResult.error.code);
      }

      const updateResult = await isolatedClient.auth.updateUser({
        password: newPassword,
      });
      if (updateResult.error) {
        return authFailure(updateResult.error.message, 400, updateResult.error.code);
      }

      await isolatedClient.auth.signOut();
      return authSuccess({ success: true });
    }
    case 'getUser': {
      const explicitToken = typeof payload.token === 'string' ? payload.token : null;
      if (explicitToken) {
        const { data, error } = await anonymousClient.auth.getUser(explicitToken);
        if (error) return authFailure(error.message, 401, error.code);
        return authSuccess(data);
      }
      const { session, refreshed, error: sessionError } = await resolveSession(request);
      if (sessionError) return authFailure(sessionError.message, sessionError.status, sessionError.code);
      if (!session?.access_token) return authSuccess({ user: null });
      const { data, error: userError } = await anonymousClient.auth.getUser(session.access_token);
      if (userError) return authFailure(userError.message, 401, userError.code);
      const response = authSuccess(data);
      if (refreshed) {
        setSessionCookies(response, session);
      }
      return response;
    }
    case 'getSession': {
      const { session, refreshed, error } = await resolveSession(request);
      if (error) return authFailure(error.message, error.status, error.code);
      const response = authSuccess({ session, user: session?.user ?? null });
      if (refreshed) {
        setSessionCookies(response, session);
      }
      return response;
    }
    case 'checkLoginAttempts': {
      const email = String(payload.email || '').trim();
      if (!email) return authFailure('Missing email', 400);

      const { data, error } = await anonymousClient.rpc('check_login_attempts', {
        p_email: email,
      });
      if (error) return authFailure(error.message, 500, error.code);

      const maxAttempts = 5;
      const failedAttempts = (data as Array<{ failed_count: number }> | null)?.[0]?.failed_count || 0;
      return authSuccess({
        blocked: failedAttempts >= maxAttempts,
        remainingAttempts: Math.max(0, maxAttempts - failedAttempts),
      });
    }
    case 'recordLoginAttempt': {
      const email = String(payload.email || '').trim();
      const success = Boolean(payload.success);
      if (!email) return authFailure('Missing email', 400);

      const { error } = await anonymousClient.rpc('record_login_attempt', {
        p_email: email,
        p_success: success,
      });
      if (error) return authFailure(error.message, 500, error.code);

      return authSuccess({ success: true });
    }
    default:
      return authFailure(`Unsupported auth action: ${action}`, 400);
  }
}

function handleDevModeAction(action: AuthAction, payload: Record<string, unknown>, request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value || null;
  const hasValidSession = accessToken && accessToken.startsWith('dev-token-');
  const mockSession = buildDevSession(accessToken || 'dev-token');

  switch (action) {
    case 'signInWithPassword': {
      const response = authSuccess({ session: mockSession, user: mockSession.user });
      setSessionCookies(response, mockSession);
      return response;
    }
    case 'signUp': {
      const response = authSuccess({ session: mockSession, user: mockSession.user });
      setSessionCookies(response, mockSession);
      return response;
    }
    case 'signOut': {
      const response = authSuccess({ signedOut: true });
      setSessionCookies(response, null);
      return response;
    }
    case 'updateUser': {
      if (!hasValidSession) {
        return authFailure('Unauthorized', 401);
      }
      const attributes = (payload.attributes as Record<string, unknown> | undefined) || {};
      const updatedUser = {
        ...mockSession.user,
        user_metadata: {
          ...mockSession.user.user_metadata,
          ...attributes,
        },
      };
      return authSuccess({ user: updatedUser });
    }
    case 'resetPasswordForEmail': {
      return authSuccess({ success: true });
    }
    case 'signInWithOtp': {
      return authSuccess({ success: true });
    }
    case 'verifyOtp': {
      const response = authSuccess({ session: mockSession, user: mockSession.user });
      setSessionCookies(response, mockSession);
      return response;
    }
    case 'resetPasswordWithOtp': {
      return authSuccess({ success: true });
    }
    case 'getUser': {
      const explicitToken = typeof payload.token === 'string' ? payload.token : null;
      if (explicitToken) {
        return authSuccess({ user: mockSession.user });
      }
      if (!hasValidSession) {
        return authSuccess({ user: null });
      }
      return authSuccess({ user: mockSession.user });
    }
    case 'getSession': {
      if (!hasValidSession) {
        return authSuccess({ session: null, user: null });
      }
      return authSuccess({ session: mockSession, user: mockSession.user });
    }
    case 'checkLoginAttempts': {
      return authSuccess({
        blocked: false,
        remainingAttempts: 5,
      });
    }
    case 'recordLoginAttempt': {
      return authSuccess({ success: true });
    }
    default:
      return authFailure(`Unsupported auth action: ${action}`, 400);
  }
}
