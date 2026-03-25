// Bize Ulaşın Form API'si
export async function onRequestPost({ request, env }) {
  try {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    // Veritabanı bağlantısı kontrolü
    if (!env.CONTACT_DB) {
      console.error('CONTACT_DB binding bulunamadı');
      return new Response(JSON.stringify({
        success: false,
        message: 'Sunucu yapılandırma hatası'
      }), { 
        status: 500,
        headers: corsHeaders
      });
    }

    const data = await request.json();

    // --- TURNSTILE DOĞRULAMASI ---
    if (!env.TURNSTILE_SECRET_KEY) {
        console.error('TURNSTILE_SECRET_KEY environment variable ayarlanmamış.');
        return new Response(JSON.stringify({ success: false, message: "Sunucu yapılandırma hatası." }), { status: 500, headers: corsHeaders });
    }

    if (!data.turnstileToken) {
        return new Response(JSON.stringify({ success: false, message: "Güvenlik doğrulaması gerekli." }), { status: 403, headers: corsHeaders });
    }

    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const formData = new FormData();
    formData.append('secret', env.TURNSTILE_SECRET_KEY);
    formData.append('response', data.turnstileToken);
    formData.append('remoteip', clientIP);

    const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: formData
    });

    const turnstileResult = await turnstileResponse.json();
    if (!turnstileResult.success) {
        console.log('Turnstile doğrulaması başarısız:', turnstileResult['error-codes']);
        return new Response(JSON.stringify({ success: false, message: "Lütfen doğrulama yapılmasını bekleyiniz." }), { status: 403, headers: corsHeaders });
    }
    // --- TURNSTILE DOĞRULAMASI SONU ---
    
    // Veri doğrulama
    const { name, email, phone, address, message } = data;
    
    if (!name || !email || !phone) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Ad, e-posta ve telefon alanları zorunludur.'
      }), { 
        status: 400,
        headers: corsHeaders
      });
    }

    // Email format kontrolü
    const emailRegex = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Geçersiz email formatı'
      }), { 
        status: 400,
        headers: corsHeaders
      });
    }

    // Telefon format kontrolü
    const phoneRegex = /^[0-9+\-\s()]{10,20}$/;
    if (!phoneRegex.test(phone)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Geçersiz telefon formatı'
      }), { 
        status: 400,
        headers: corsHeaders
      });
    }

    // Veritabanına kaydet
    const result = await env.CONTACT_DB.prepare(`
      INSERT INTO contact_requests (name, email, phone, address, message)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      name.trim(),
      email.trim().toLowerCase(),
      phone.trim(),
      address.trim(),
      message ? message.trim() : null
    ).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.',
      id: result.meta.last_row_id
    }), {
      headers: corsHeaders
    });

  } catch (error) {
    console.error('İletişim formu hatası:', error.message);

    return new Response(JSON.stringify({
      success: false,
      message: 'Mesajınız gönderilemedi. Lütfen daha sonra tekrar deneyin.'
    }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
}

// OPTIONS request için CORS
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}