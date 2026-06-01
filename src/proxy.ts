import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
    const response = NextResponse.next();

    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');

    const isDevMode = process.env.NODE_ENV === 'development' || process.env.USE_LOCAL_DB === 'true';

    if (isDevMode) {
        const hasAuth = request.headers.get('Authorization');
        if (!hasAuth) {
            response.headers.set('x-dev-mode', 'true');
        }
    }

    return response;
}

export const config = {
    matcher: ['/api/:path*'],
};
