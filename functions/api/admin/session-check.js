async function verifySecureToken(token, env) {
  if (!token || typeof token !== 'string') return false;
  if (!token.startsWith("admin-")) return false;

  // Token format: admin-{timestamp}-{uuid}
  const tokenParts = token.split('-');
  if (tokenParts.length < 3) return false;

  // Token yaş kontrolü (1 saat)
  const tokenTime = parseInt(tokenParts[1], 10);
  if (isNaN(tokenTime)) return false;
  const now = Date.now();
  if (tokenTime > now + 60000) return false; // Gelecek token'ları reddet
  if (now - tokenTime > 3600000) return false;

  // D1 blacklist kontrolü (logout sonrası invalidasyon)
  try {
    if (env.DB) {
      const invalidated = await env.DB.prepare(
        'SELECT 1 FROM invalidated_sessions WHERE token = ? LIMIT 1'
      ).bind(token).first();
      if (invalidated) return false;
    }
  } catch {
    // Tablo yoksa devam et — token format+süre ile zaten doğrulandı
  }

  return true;
}

export async function onRequestGet({ request, env }) {
  try {
    // CORS kontrolü (esnek)
    const origin = request.headers.get('Origin');
    const requestHost = new URL(request.url).host;
    const allowedOrigin = env.CORS_ORIGIN;
    
    if (origin) {
      const originHost = new URL(origin).host;
      if (originHost !== requestHost && allowedOrigin && origin !== allowedOrigin) {
        return new Response(JSON.stringify({ success: false, message: "CORS policy violation" }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // HttpOnly cookie'den session token'ı oku
    const cookie = request.headers.get("Cookie") || "";
    const sessionMatch = cookie.match(/adminSession=([^;]*)/);
    const sessionToken = sessionMatch ? decodeURIComponent(sessionMatch[1]) : null;
    
    const isValidToken = await verifySecureToken(sessionToken, env);
    if (!isValidToken) {
      return new Response(JSON.stringify({ success: false, message: "Session geçersiz." }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Session geçerli." }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache, no-store, must-revalidate, private"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: "Server error." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
