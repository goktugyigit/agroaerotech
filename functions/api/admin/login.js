// Rate limiting artık Cloudflare Dashboard'da yapılacak
// Pages > Settings > Security > Rate Limiting ile /api/admin/login endpoint'ini koruyun

// GEREKLI ENVIRONMENT VARIABLES:
// - TURNSTILE_SECRET_KEY: Cloudflare Turnstile secret key
// - CORS_ORIGIN: İzin verilen origin (opsiyonel)
// - DB: D1 Database binding
// 
// TURNSTILE SITE KEY (Frontend için): 0x4AAAAAABuAA4UaEd43Ty1M

// Güvenli şifre hash'leme fonksiyonu
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// OPTIONS preflight request handler
export async function onRequestOptions({ request, env }) {
  const origin = request.headers.get('Origin');
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400"
    }
  });
}

export async function onRequestPost({ request, env }) {
  try {
    // Rate limiting artık Cloudflare Dashboard'da yapılıyor

    // CORS kontrolü (esnek)
    const origin = request.headers.get('Origin');
    const requestHost = new URL(request.url).host;
    const allowedOrigin = env.CORS_ORIGIN;

    // Origin yoksa (direct access) veya same-host ise izin ver
    if (origin) {
      const originHost = new URL(origin).host;
      // Same host veya environment'ta tanımlı origin ise izin ver
      if (originHost !== requestHost && allowedOrigin && origin !== allowedOrigin) {
        console.log(`CORS blocked: origin=${origin}, allowed=${allowedOrigin}, requestHost=${requestHost}`);
        return new Response(JSON.stringify({
          success: false,
          message: `CORS policy violation. Origin: ${origin}, Expected: ${allowedOrigin || requestHost}`
        }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // JSON parse
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ success: false, message: "Geçersiz JSON formatı." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { password, turnstileToken } = body || {};

    if (!password) {
      return new Response(JSON.stringify({ success: false, message: "Şifre gerekli." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Turnstile token doğrulaması - AKTIF
    if (!turnstileToken) {
      return new Response(JSON.stringify({ success: false, message: "Güvenlik doğrulaması gerekli." }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Turnstile token'ını Cloudflare'da doğrula
    const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    const formData = new FormData();
    formData.append('secret', env.TURNSTILE_SECRET_KEY); // Bu değişkeni Cloudflare'e ekleyin
    formData.append('response', turnstileToken);
    formData.append('remoteip', clientIP);

    const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData
    });

    const turnstileResult = await turnstileResponse.json();
    if (!turnstileResult.success) {
      console.log('Turnstile doğrulama başarısız:', turnstileResult['error-codes']);
      return new Response(JSON.stringify({ success: false, message: "Lütfen doğrulama yapılmasını bekleyiniz." }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }
    // Turnstile doğrulaması başarılı, şimdi şifre kontrolüne devam edebiliriz.

    // GÜVENLİ ŞIFRE KONTROLÜ - Timing Attack Koruması
    const db = env.DB;

    // 1. ADIM: Sadece kullanıcı adına göre kullanıcıyı bul (timing attack önlemi)
    const user = await db.prepare("SELECT * FROM users WHERE username = ?")
      .bind("admin")
      .first();

    // Kullanıcı yoksa (admin yapılandırılmamış)
    if (!user) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return new Response(JSON.stringify({ success: false, message: "Kullanıcı yapılandırılmamış." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. ADIM: Gelen şifreyi hash'le ve constant-time karşılaştırma yap
    const providedPasswordHash = await hashPassword(password.trim());

    // Timing attack korumalı karşılaştırma
    let diff = providedPasswordHash.length ^ user.password_hash.length;
    for (let i = 0; i < providedPasswordHash.length && i < user.password_hash.length; i++) {
      diff |= providedPasswordHash.charCodeAt(i) ^ user.password_hash.charCodeAt(i);
    }
    const isValid = (diff === 0);

    if (!isValid) {
      // Brute force koruması için delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      return new Response(JSON.stringify({ success: false, message: "Geçersiz şifre." }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Token ve Cookie oluşturma
    const timestamp = Date.now();
    const sessionToken = `admin-${timestamp}-${crypto.randomUUID()}`; // Daha basit ve güvenli token

    // Activity log kaydet
    try {
      const userAgent = request.headers.get('User-Agent') || 'Unknown';
      await db.prepare(`
        INSERT INTO admin_activity_logs (username, action, ip_address, user_agent, details)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        'admin',
        'login',
        clientIP,
        userAgent,
        JSON.stringify({ timestamp: new Date().toISOString() })
      ).run();
    } catch (logError) {
      console.error('Log kaydetme hatası:', logError);
      // Log hatası giriş işlemini engellemez
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Giriş başarılı!"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `adminSession=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`
      }
    });
  } catch (error) {
    console.error("Login endpoint error:", error);
    return new Response(JSON.stringify({ success: false, message: "Sunucu hatası." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
