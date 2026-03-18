// Basit blacklist kontrolü (logout.js ile senkronize olmalı)
const blacklistedTokens = new Set();

async function verifySecureToken(token, env) {
  if (!token || !token.startsWith("admin-")) return false;
  
  // Blacklist kontrolü
  if (blacklistedTokens.has(token)) return false;
  
  // HMAC imzalı token kontrolü
  if (token.includes('.') && env.JWT_SECRET) {
    const [payload, signature] = token.split('.');
    const encoder = new TextEncoder();
    
    try {
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(env.JWT_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );
      
      const signatureBytes = new Uint8Array(
        signature.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
      );
      
      const isValid = await crypto.subtle.verify(
        'HMAC',
        key,
        signatureBytes,
        encoder.encode(payload)
      );
      
      if (!isValid) return false;
      token = payload; // Use payload for time check
    } catch {
      return false;
    }
  }
  
  // Token yaş kontrolü (1 saat)
  const tokenParts = token.split('-');
  if (tokenParts.length >= 2) {
    const tokenTime = parseInt(tokenParts[1]);
    const now = Date.now();
    if (now - tokenTime > 3600000) return false;
  }
  
  return true;
}

function sanitizeOutput(data) {
  if (typeof data === 'string') {
    return data.replace(/[<>&"']/g, (match) => {
      const entities = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#x27;' };
      return entities[match];
    });
  }
  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeOutput(value);
    }
    return sanitized;
  }
  return data;
}

export async function onRequestGet({ request, env }) {
  try {
    // CORS kontrolü (esnek)
    const origin = request.headers.get('Origin');
    const requestHost = new URL(request.url).host;
    const allowedOrigin = env.CORS_ORIGIN;
    
    // Same-host istekleri her zaman izin ver
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
      return new Response(JSON.stringify({ success: false, message: "Yetkisiz erişim veya oturum süresi doldu." }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!env.DB) {
      return new Response(JSON.stringify({ success: false, message: "Database bağlantısı yok." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { results } = await env.DB
      .prepare("SELECT id, name, email, phone, message, created_at FROM leads ORDER BY id DESC")
      .all();
    
    // Output sanitization
    const sanitizedResults = (results || []).map(sanitizeOutput);
    
    return new Response(JSON.stringify({ data: sanitizedResults }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Cache-Control": "no-cache, no-store, must-revalidate, private"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: `Server error: ${error.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
