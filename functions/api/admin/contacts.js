// Admin Panel - İletişim Talepleri API'si

// Tüm iletişim taleplerini getir (GET)
export async function onRequestGet({ env, request }) {
  try {
    console.log('Admin panel için iletişim talepleri getirme isteği alındı.'); // LOG A

    // AUTHENTICATION KONTROLÜ
    const authCookie = request.headers.get('Cookie');
    if (!authCookie || !authCookie.includes('adminSession=')) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Yetkisiz erişim - Admin girişi gerekli'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!env.CONTACT_DB) {
      console.error('HATA: functions/api/admin/contacts.js -> CONTACT_DB binding bulunamadı!'); // LOG B
      return new Response(JSON.stringify({
        success: false,
        message: 'Veritabanı bağlantısı bulunamadı'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Admin panel: CONTACT_DB binding başarıyla bulundu.'); // LOG C

    // Query parametreleri
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;
    const status = searchParams.get('status') || 'all';

    // SQL sorgusu - Türkiye saat dilimi (GMT+3)
    let query = `
      SELECT id, name, email, phone, address, message, status, notes,
             datetime(created_at, '+3 hours') as created_at
      FROM contact_requests
    `;

    let params = [];

    if (status !== 'all') {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const { results } = await env.CONTACT_DB.prepare(query).bind(...params).all();

    console.log('Admin panel: Veritabanı sorgusu çalıştı, bulunan kayıt sayısı:', results.length); // LOG D

    // Toplam sayı
    let countQuery = 'SELECT COUNT(*) as total FROM contact_requests';
    let countParams = [];

    if (status !== 'all') {
      countQuery += ' WHERE status = ?';
      countParams.push(status);
    }

    const countResult = await env.CONTACT_DB.prepare(countQuery).bind(...countParams).first();

    return new Response(JSON.stringify({
      success: true,
      data: results,
      total: countResult.total,
      limit,
      offset
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Admin panel iletişim talepleri GETİRME hatası:', error); // LOG E
    return new Response(JSON.stringify({
      success: false,
      message: `İletişim talepleri yüklenirken hata oluştu: ${error.message}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Yeni iletişim talebi oluştur (POST) - Admin tarafından manuel ekleme için
export async function onRequestPost({ request, env }) {
  try {
    console.log('Yeni iletişim talebi oluşturma isteği');

    // AUTHENTICATION KONTROLÜ
    const authCookie = request.headers.get('Cookie');
    if (!authCookie || !authCookie.includes('adminSession=')) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Yetkisiz erişim - Admin girişi gerekli'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!env.CONTACT_DB) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Veritabanı bağlantısı bulunamadı'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await request.json();

    // Veri doğrulama
    if (!data.name || !data.email || !data.phone || !data.address) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Zorunlu alanlar eksik'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Veritabanına kaydet
    const result = await env.CONTACT_DB.prepare(`
      INSERT INTO contact_requests (name, email, phone, address, message, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.name,
      data.email,
      data.phone,
      data.address,
      data.message || null,
      data.status || 'new',
      data.notes || null
    ).run();

    return new Response(JSON.stringify({
      success: true,
      message: "İletişim talebi başarıyla oluşturuldu",
      id: result.meta.last_row_id
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('İletişim talebi oluşturma hatası:', error);
    return new Response(JSON.stringify({
      success: false,
      message: `İletişim talebi oluşturulurken hata oluştu: ${error.message}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}