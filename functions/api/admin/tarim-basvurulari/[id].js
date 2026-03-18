// functions/api/admin/tarim-basvurulari/[id].js

export async function onRequestGet({ env, request, params }) {
  try {
    const authCookie = request.headers.get('Cookie');
    if (!authCookie || !authCookie.includes('adminSession=')) {
      return new Response(JSON.stringify({ success: false, message: 'Yetkisiz erişim.' }), { status: 401 });
    }

    if (!env.TARIM_DB) {
      return new Response(JSON.stringify({ success: false, message: 'Veritabanı bağlantısı bulunamadı.' }), { status: 500 });
    }

    const id = params.id;
    if (!id) {
      return new Response(JSON.stringify({ success: false, message: 'ID parametresi eksik.' }), { status: 400 });
    }

    const { results } = await env.TARIM_DB.prepare(
      "SELECT *, datetime(created_at, '+3 hours') as created_at FROM tarim_hizmet_talepleri WHERE id = ?"
    ).bind(id).all();

    if (results.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Başvuru bulunamadı.' }), { status: 404 });
    }

    return new Response(JSON.stringify({ success: true, data: results[0] }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Tarımsal başvuru detayı getirme hatası:', error);
    return new Response(JSON.stringify({ success: false, message: 'Sunucu hatası.' }), { status: 500 });
  }
}

export async function onRequestPut({ env, request, params }) {
  try {
    const authCookie = request.headers.get('Cookie');
    if (!authCookie || !authCookie.includes('adminSession=')) {
      return new Response(JSON.stringify({ success: false, message: 'Yetkisiz erişim.' }), { status: 401 });
    }

    if (!env.TARIM_DB) {
      return new Response(JSON.stringify({ success: false, message: 'Veritabanı bağlantısı bulunamadı.' }), { status: 500 });
    }

    const id = params.id;
    if (!id) {
      return new Response(JSON.stringify({ success: false, message: 'ID parametresi eksik.' }), { status: 400 });
    }

    const data = await request.json();
    const { status } = data;

    if (!status || !['new', 'read', 'pending', 'in_progress', 'approved', 'rejected', 'completed', 'cancelled'].includes(status)) {
      return new Response(JSON.stringify({ success: false, message: 'Geçersiz durum değeri.' }), { status: 400 });
    }

    const result = await env.TARIM_DB.prepare(
      "UPDATE tarim_hizmet_talepleri SET status = ? WHERE id = ?"
    ).bind(status, id).run();

    if (result.changes === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Başvuru bulunamadı.' }), { status: 404 });
    }

    return new Response(JSON.stringify({ success: true, message: 'Durum başarıyla güncellendi.' }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Tarımsal başvuru durumu güncelleme hatası:', error);
    return new Response(JSON.stringify({ success: false, message: 'Sunucu hatası.' }), { status: 500 });
  }
}

export async function onRequestDelete({ env, request, params }) {
  try {
    const authCookie = request.headers.get('Cookie');
    if (!authCookie || !authCookie.includes('adminSession=')) {
      return new Response(JSON.stringify({ success: false, message: 'Yetkisiz erişim.' }), { status: 401 });
    }

    if (!env.TARIM_DB) {
      return new Response(JSON.stringify({ success: false, message: 'Veritabanı bağlantısı bulunamadı.' }), { status: 500 });
    }

    const id = params.id;
    if (!id) {
      return new Response(JSON.stringify({ success: false, message: 'ID parametresi eksik.' }), { status: 400 });
    }

    const result = await env.TARIM_DB.prepare(
      "DELETE FROM tarim_hizmet_talepleri WHERE id = ?"
    ).bind(id).run();

    if (result.changes === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Başvuru bulunamadı.' }), { status: 404 });
    }

    return new Response(JSON.stringify({ success: true, message: 'Başvuru başarıyla silindi.' }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Tarımsal başvuru silme hatası:', error);
    return new Response(JSON.stringify({ success: false, message: 'Sunucu hatası.' }), { status: 500 });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
