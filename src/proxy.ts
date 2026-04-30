import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
    const isDevMode = process.env.NODE_ENV === 'development' || process.env.USE_LOCAL_DB === 'true';

    if (isDevMode) {
        const hasAuth = request.headers.get('Authorization');
        if (!hasAuth) {
            const response = NextResponse.next();
            response.headers.set('x-dev-mode', 'true');
            return response;
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/api/:path*'],
};
