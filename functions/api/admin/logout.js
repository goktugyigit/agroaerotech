export async function onRequestPost({ request, env }) {
  try {
    const db = env.DB;

    // Request body'den reason parametresini al
    let reason = 'Manuel çıkış';
    try {
      const body = await request.json();
      if (body.reason === 'session_expired') {
        reason = 'Oturum süresi doldu (otomatik çıkış)';
      }
    } catch {
      // Body yoksa veya parse edilemezse default reason kullan
    }

    // Mevcut session token'ını al (invalidate etmek için)
    const cookie = request.headers.get('Cookie') || '';
    const sessionMatch = cookie.match(/adminSession=([^;]+)/);
    const sessionToken = sessionMatch ? decodeURIComponent(sessionMatch[1]) : null;

    // Token'ı D1'de invalidate et (sunucu tarafı oturum sonlandırma)
    if (sessionToken && db) {
      try {
        await db.prepare(`
          CREATE TABLE IF NOT EXISTS invalidated_sessions (
            token TEXT PRIMARY KEY,
            invalidated_at TEXT NOT NULL
          )
        `).run();

        await db.prepare(
          'INSERT OR IGNORE INTO invalidated_sessions (token, invalidated_at) VALUES (?, ?)'
        ).bind(sessionToken, new Date().toISOString()).run();

        // 2 saatten eski kayıtları temizle (token zaten 1 saatte expire oluyor)
        await db.prepare(
          "DELETE FROM invalidated_sessions WHERE invalidated_at < datetime('now', '-2 hours')"
        ).run();
      } catch (tokenError) {
        console.error('Token invalidation hatası:', tokenError);
      }
    }

    // IP ve User Agent bilgilerini al
    const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    const userAgent = request.headers.get('User-Agent') || 'Unknown';

    // Activity log kaydet
    try {
      await db.prepare(`
        INSERT INTO admin_activity_logs (username, action, ip_address, user_agent, details)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        'admin',
        'logout',
        clientIP,
        userAgent,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          reason: reason
        })
      ).run();
    } catch (logError) {
      console.error('Log kaydetme hatası:', logError);
    }

    // Cookie'yi sil
    return new Response(JSON.stringify({
      success: true,
      message: "Çıkış başarılı!"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": "adminSession=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"
      }
    });
  } catch (error) {
    console.error("Logout endpoint error:", error);
    return new Response(JSON.stringify({
      success: false,
      message: "Çıkış yapılırken hata oluştu."
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
