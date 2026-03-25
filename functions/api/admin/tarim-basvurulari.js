// functions/api/admin/tarim-basvurulari.js

export async function onRequestGet({ env, request }) {
  try {
    const authCookie = request.headers.get('Cookie');
    if (!authCookie || !authCookie.includes('adminSession=')) {
      return new Response(JSON.stringify({ success: false, message: 'Yetkisiz erişim.' }), { status: 401 });
    }
    
    if (!env.TARIM_DB) {
      return new Response(JSON.stringify({ success: false, message: 'Veritabanı bağlantısı bulunamadı.' }), { status: 500 });
    }

    const { results } = await env.TARIM_DB.prepare(
      "SELECT *, datetime(created_at, '+3 hours') as created_at FROM tarim_hizmet_talepleri ORDER BY created_at DESC"
    ).all();

    return new Response(JSON.stringify({ success: true, data: results || [] }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Tarımsal başvuruları getirme hatası:', error);
    return new Response(JSON.stringify({ success: false, message: 'Sunucu hatası.' }), { status: 500 });
  }
}
