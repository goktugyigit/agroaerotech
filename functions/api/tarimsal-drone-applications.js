// Tarımsal Drone Eğitimi Başvuruları API
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const data = await request.json();

    // Veri doğrulama
    const { name, phone, email, address, message, turnstileToken } = data;

    if (!name || !phone || !email || !address) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Tüm zorunlu alanlar doldurulmalıdır.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Turnstile doğrulaması
    if (!turnstileToken) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Güvenlik doğrulaması gerekli.'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Turnstile token'ını Cloudflare'da doğrula
    const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    const turnstileFormData = new FormData();
    turnstileFormData.append('secret', env.TURNSTILE_SECRET_KEY);
    turnstileFormData.append('response', turnstileToken);
    turnstileFormData.append('remoteip', clientIP);
    
    const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: turnstileFormData
    });

    const turnstileResult = await turnstileResponse.json();
    if (!turnstileResult.success) {
        console.log('Turnstile doğrulama başarısız:', turnstileResult['error-codes']);
        return new Response(JSON.stringify({
          success: false,
          error: 'Lütfen doğrulama yapılmasını bekleyiniz.'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    // Veritabanına kaydet
    const result = await env.TARIM_EGITIM_DB.prepare(`
      INSERT INTO tarimsal_drone_applications (name, phone, email, address, message)
      VALUES (?, ?, ?, ?, ?)
    `).bind(name, phone, email, address, message || null).run();

    if (result.success) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Başvurunuz başarıyla alındı. En kısa sürede size dönüş yapacağız.',
        id: result.meta.last_row_id
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      throw new Error('Veritabanı kayıt hatası');
    }

  } catch (error) {
    console.error('Tarımsal drone başvuru hatası:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Başvuru gönderilemedi. Lütfen daha sonra tekrar deneyin.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Admin için başvuruları listele
export async function onRequestGet(context) {
  try {
    const { env } = context;

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
    console.error('Tarımsal drone başvuru listesi hatası:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Başvurular yüklenemedi.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}