// functions/api/tarim-basvurulari.js

export async function onRequestPost({ request, env }) {
  try {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    if (!env.TARIM_DB) {
      console.error('TARIM_DB binding bulunamadı!');
      return new Response(JSON.stringify({ success: false, message: 'Sunucu veritabanı yapılandırma hatası.' }), { status: 500, headers: corsHeaders });
    }

    const data = await request.json();

    // Turnstile Doğrulaması
    if (!env.TURNSTILE_SECRET_KEY || !data.turnstileToken) {
        return new Response(JSON.stringify({ success: false, message: "Güvenlik doğrulaması başarısız oldu." }), { status: 403, headers: corsHeaders });
    }
    const formData = new FormData();
    formData.append('secret', env.TURNSTILE_SECRET_KEY);
    formData.append('response', data.turnstileToken);
    const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: formData });
    const turnstileResult = await turnstileResponse.json();
    if (!turnstileResult.success) {
        return new Response(JSON.stringify({ success: false, message: "Lütfen doğrulama yapılmasını bekleyiniz." }), { status: 403, headers: corsHeaders });
    }

    // Sunucu Tarafı Doğrulama (TÜM ALANLAR ZORUNLU)
    const { service_type, name, phone, email, address, field_size, crop_type, message } = data;
    if (!service_type || !name || !phone || !email || !address || !field_size || !crop_type) {
      return new Response(JSON.stringify({ success: false, message: 'Lütfen tüm zorunlu alanları doldurun.' }), { status: 400, headers: corsHeaders });
    }

    // Veritabanına kaydet
    await env.TARIM_DB.prepare(
      `INSERT INTO tarim_hizmet_talepleri (service_type, name, phone, email, address, field_size, crop_type, message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      service_type, name.trim(), phone.trim(), email.trim().toLowerCase(),
      address.trim(), parseFloat(field_size), crop_type, message ? message.trim() : null
    ).run();
    
    return new Response(JSON.stringify({ success: true, message: 'Başvurunuz başarıyla alındı. En kısa sürede size dönüş yapacağız.' }), { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Tarımsal başvuru API hatası:', error);
    return new Response(JSON.stringify({ success: false, message: 'Sunucu tarafında bir hata oluştu.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
