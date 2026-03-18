export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    
    // Form verilerini al
    const name = formData.get('name');
    const phone = formData.get('phone');
    const email = formData.get('email');
    const drone_model = formData.get('drone_model');
    const service_type = formData.get('service_type');
    const problem_description = formData.get('problem_description');
    const address = formData.get('address') || '';
    
    // Turnstile token kontrolü
    const turnstileToken = formData.get('cf-turnstile-response');
    if (!turnstileToken) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Güvenlik doğrulaması gerekli' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Turnstile doğrulama
    const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    const turnstileFormData = new FormData();
    turnstileFormData.append('secret', env.TURNSTILE_SECRET_KEY);
    turnstileFormData.append('response', turnstileToken);
    turnstileFormData.append('remoteip', clientIP);

    const turnstileResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: turnstileFormData
      }
    );

    const turnstileResult = await turnstileResponse.json();
    if (!turnstileResult.success) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Güvenlik doğrulaması başarısız' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Veritabanına kaydet
    const created_at = new Date().toISOString();
    
    const result = await env.TECHNICAL_SERVICE_DB.prepare(
      `INSERT INTO technical_service_requests 
       (name, phone, email, drone_model, service_type, problem_description, address, created_at, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(name, phone, email, drone_model, service_type, problem_description, address, created_at, 'pending')
    .run();

    if (!result.success) {
      throw new Error('Veritabanına kayıt başarısız');
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Servis talebiniz başarıyla alındı. En kısa sürede size dönüş yapacağız.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Technical Service Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Bir hata oluştu. Lütfen tekrar deneyin.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
