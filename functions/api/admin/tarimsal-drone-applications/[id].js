// Admin - Tarımsal Drone Eğitimi Başvuru Detay/Güncelleme/Silme

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
    const { request, params, env } = context;
    const id = params.id;

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
      SELECT * FROM tarimsal_drone_applications WHERE id = ?
    `).bind(id).first();

    if (!result) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Başvuru bulunamadı.'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Tarımsal drone başvuru detay hatası:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Başvuru detayı yüklenemedi.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Başvuru durumunu güncelle
export async function onRequestPut(context) {
  try {
    const { request, params, env } = context;
    const id = params.id;

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

    const { status } = await request.json();

    if (!status) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Durum bilgisi gerekli.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await env.TARIM_EGITIM_DB.prepare(`
      UPDATE tarimsal_drone_applications 
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(status, id).run();

    if (result.success) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Durum başarıyla güncellendi.'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      throw new Error('Güncelleme başarısız');
    }

  } catch (error) {
    console.error('Tarımsal drone durum güncelleme hatası:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Durum güncellenemedi.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Başvuruyu sil
export async function onRequestDelete(context) {
  try {
    const { request, params, env } = context;
    const id = params.id;

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
      DELETE FROM tarimsal_drone_applications WHERE id = ?
    `).bind(id).run();

    if (result.success) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Başvuru başarıyla silindi.'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      throw new Error('Silme başarısız');
    }

  } catch (error) {
    console.error('Tarımsal drone başvuru silme hatası:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Başvuru silinemedi.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}