// Sertifika Sorgulama API

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    // Güvenlik: Rate limiting (basit IP tabanlı)
    const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    const rateLimitKey = `rate_limit_cert_search_${clientIP}`;
    
    // Son 1 dakikada kaç istek yapıldığını kontrol et (KV store kullanılabilir, şimdilik basit)
    // Bu production'da KV store ile implement edilmeli
    
    const { fin_code } = await request.json();



    // Güvenlik: Request body boyut kontrolü
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 1024) { // 1KB limit
      return new Response(JSON.stringify({
        success: false,
        error: 'İstek çok büyük.'
      }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // FIN kodu kontrolü
    if (!fin_code || typeof fin_code !== 'string' || fin_code.trim().length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'FIN kodu gereklidir.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // FIN kodu formatı kontrolü (büyük harf ve rakam)
    const cleanFinCode = fin_code.trim().toUpperCase();
    
    // Güvenlik: Uzunluk kontrolü
    if (cleanFinCode.length < 2 || cleanFinCode.length > 20) {
      return new Response(JSON.stringify({
        success: false,
        error: 'FIN kodu 2-20 karakter arasında olmalıdır.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!/^[A-Z0-9]+$/.test(cleanFinCode)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'FIN kodu sadece büyük harf ve rakam içermelidir.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Veritabanından sertifika ara
    // Güvenlik: Prepared statement ile SQL injection koruması
    const certificate = await env.CERT_SEARCH_ADD.prepare(`
      SELECT fin_code, full_name, certificate_image_key, created_at
      FROM certificates 
      WHERE fin_code = ? LIMIT 1
    `).bind(cleanFinCode).first();



    if (!certificate) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Bu FIN koduna ait sertifika bulunamadı.'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Sertifika görselinin URL'sini oluştur (API endpoint üzerinden)
    const imageUrl = `/api/certificate-image/${encodeURIComponent(certificate.certificate_image_key)}`;



    return new Response(JSON.stringify({
      success: true,
      data: {
        fin_code: certificate.fin_code,
        full_name: certificate.full_name,
        certificate_image_url: imageUrl,
        issue_date: certificate.created_at
      }
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      }
    });

  } catch (error) {
    // Sadece kritik hataları logla
    console.error('Certificate search error:', error.message);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Sertifika sorgulanırken bir hata oluştu.'
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  }
}