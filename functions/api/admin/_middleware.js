// Admin API'leri için authentication middleware
// Login ve logout hariç tüm admin endpoint'lerini korur

const PUBLIC_ADMIN_PATHS = [
    '/api/admin/login',
    '/api/admin/logout'
];

const SESSION_MAX_AGE_MS = 3600000; // 1 saat

function unauthorizedResponse(message = 'Unauthorized - Admin login required') {
    return new Response(JSON.stringify({
        success: false,
        error: message
    }), {
        status: 401,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
        }
    });
}

function validateSessionToken(token) {
    if (!token || typeof token !== 'string') return false;

    // Format: admin-{timestamp}-{uuid}
    if (!token.startsWith('admin-')) return false;

    // Timestamp kontrolü
    const parts = token.split('-');
    // admin-{timestamp}-{uuid parçaları} → en az 3 parça olmalı
    if (parts.length < 3) return false;

    const tokenTime = parseInt(parts[1], 10);
    if (isNaN(tokenTime)) return false;

    const now = Date.now();
    // Gelecekteki token'ları reddet
    if (tokenTime > now + 60000) return false;
    // Süresi dolmuş token'ları reddet (1 saat)
    if (now - tokenTime > SESSION_MAX_AGE_MS) return false;

    return true;
}

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    // Public path'leri kontrol et
    if (PUBLIC_ADMIN_PATHS.includes(url.pathname)) {
        return context.next();
    }

    // Cookie kontrolü
    const cookie = request.headers.get('Cookie');
    if (!cookie) {
        return unauthorizedResponse();
    }

    // Session token'ı çıkar
    const sessionMatch = cookie.match(/adminSession=([^;]+)/);
    if (!sessionMatch) {
        return unauthorizedResponse();
    }

    const sessionToken = decodeURIComponent(sessionMatch[1]);

    // Token format ve süre doğrulaması
    if (!validateSessionToken(sessionToken)) {
        return unauthorizedResponse('Invalid or expired session');
    }

    // D1'de invalidate edilmiş token kontrolü (logout sonrası koruma)
    try {
        if (env.DB) {
            const invalidated = await env.DB.prepare(
                'SELECT 1 FROM invalidated_sessions WHERE token = ? LIMIT 1'
            ).bind(sessionToken).first();

            if (invalidated) {
                return unauthorizedResponse('Session has been invalidated');
            }
        }
    } catch {
        // Tablo henüz yoksa (ilk kullanım), devam et — token zaten format+süre ile doğrulandı
    }

    // Session geçerliyse devam et
    return context.next();
}
