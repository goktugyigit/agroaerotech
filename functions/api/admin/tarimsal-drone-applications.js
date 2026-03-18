// Admin - Tarımsal Drone Eğitimi Başvuruları Yönetimi

// Session doğrulama fonksiyonu
async function verifyAdminSession(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const sessionMatch = cookie.match(/adminSession=([^;]*)/);
  const sessionToken = sessionMatch ? decodeURIComponent(sessionMatch[1]) : null;
  
  if (!sessionToken || !sessionToken.startsWith("admin-")) return false;
  
  // Token yaş kontrolü (1 saat)
  const tokenParts = sessionToken.split('-');
  if (tokenParts.length >= 2) {
    const tokenTime = parseInt(tokenParts[1]);
    const now = Date.now();
    if (now - tokenTime > 3600000) return false;
  }
  
  return true;
}

export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    // Admin session kontrolü
    const isValidSession = await verifyAdminSession(request, env);
    if (!isValidSession) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Yetkisiz erişim.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await env.TARIM_EGITIM_DB.prepare(`
      SELECT * FROM tarimsal_drone_applications 
      ORDER BY created_at DESC
    `).all();

    return new Response(JSON.stringify({
      success: true,
      data: result.results
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Admin tarımsal drone başvuru listesi hatası:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Başvurular yüklenemedi.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}