// Tek iletişim talebi işlemleri

// Tek iletişim talebi getir (GET)
export async function onRequestGet({ params, env, request }) {
  try {
    console.log('Tek iletişim talebi getirme isteği, ID:', params.id);
    
    // AUTHENTICATION KONTROLÜ - Sayfa yokmuş gibi davran
    const authCookie = request.headers.get('Cookie');
    if (!authCookie || !authCookie.includes('adminSession=')) {
      return new Response('Not Found', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    if (!env.CONTACT_DB) {
      console.error('CONTACT_DB binding bulunamadı');
      return new Response('Not Found', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const contact = await env.CONTACT_DB.prepare(`
      SELECT id, name, email, phone, address, message, status, notes,
             datetime(created_at, '+3 hours') as created_at
      FROM contact_requests 
      WHERE id = ?
    `).bind(params.id).first();
    
    if (!contact) {
      return new Response('Not Found', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: contact
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('İletişim talebi getirme hatası:', error);
    return new Response('Not Found', { 
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// İletişim talebi güncelle (PUT)
export async function onRequestPut({ params, request, env }) {
  try {
    console.log('İletişim talebi güncelleme isteği, ID:', params.id);
    
    // AUTHENTICATION KONTROLÜ - Sayfa yokmuş gibi davran
    const authCookie = request.headers.get('Cookie');
    if (!authCookie || !authCookie.includes('adminSession=')) {
      return new Response('Not Found', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    if (!env.CONTACT_DB) {
      return new Response('Not Found', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const data = await request.json();
    
    // Durum validasyonu
    if (data.status && !['new', 'read', 'pending', 'in_progress', 'approved', 'rejected', 'completed', 'cancelled', 'replied', 'closed'].includes(data.status)) {
      return new Response(JSON.stringify({ success: false, message: 'Geçersiz durum değeri.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Güncelleme alanları
    const allowedFields = ['status', 'notes'];
    const updates = [];
    const values = [];
    
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(data[field]);
      }
    });
    
    if (updates.length === 0) {
      return new Response('Not Found', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    values.push(params.id);
    
    const result = await env.CONTACT_DB.prepare(`
      UPDATE contact_requests 
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...values).run();
    
    if (result.changes === 0) {
      return new Response('Not Found', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: "İletişim talebi başarıyla güncellendi"
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('İletişim talebi güncelleme hatası:', error);
    return new Response('Not Found', { 
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// İletişim talebi sil (DELETE)
export async function onRequestDelete({ params, env, request }) {
  try {
    console.log('İletişim talebi silme isteği, ID:', params.id);
    
    // AUTHENTICATION KONTROLÜ - Sayfa yokmuş gibi davran
    const authCookie = request.headers.get('Cookie');
    if (!authCookie || !authCookie.includes('adminSession=')) {
      return new Response('Not Found', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    if (!env.CONTACT_DB) {
      return new Response('Not Found', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const result = await env.CONTACT_DB.prepare(
      "DELETE FROM contact_requests WHERE id = ?"
    ).bind(params.id).run();
    
    if (result.changes === 0) {
      return new Response('Not Found', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    console.log(`İletişim talebi silindi: ${params.id}`);
    
    return new Response(JSON.stringify({
      success: true,
      message: "İletişim talebi başarıyla silindi"
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('İletişim talebi silme hatası:', error);
    return new Response('Not Found', { 
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}