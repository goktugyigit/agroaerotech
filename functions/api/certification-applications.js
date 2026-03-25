export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const formData = await request.formData();
    
    // Honeypot check
    if (formData.get('website')) {
      return new Response(JSON.stringify({ success: false, error: 'Spam detected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract form fields
    const fin_code = formData.get('fin')?.trim();
    const full_name = formData.get('name')?.trim();
    const phone = formData.get('phone')?.trim();
    const email = formData.get('email')?.trim();
    const address = formData.get('address')?.trim();
    const turnstileToken = formData.get('cf-turnstile-response');
    
    // Validate required fields
    if (!fin_code || !full_name || !phone || !email || !address) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Tüm zorunlu alanları doldurunuz' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Turnstile doğrulaması
    if (!turnstileToken) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Güvenlik doğrulaması gerekli.'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // FIN kodu ile birden fazla başvuru yapılabilir (duplicate kontrolü kaldırıldı)

    // Handle file uploads
    const files = {
      photo: formData.get('photo'),
      judicial_record: formData.get('judicial_record'),
      population_register: formData.get('population_register')
    };

    const uploadedFiles = {};

    for (const [fieldName, file] of Object.entries(files)) {
      if (!file || !file.size) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: `${fieldName} dosyası gerekli` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: `${fieldName} dosyası 5MB'dan büyük olamaz` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const extension = file.name.split('.').pop();
      const key = `cert-applications/${fin_code}/${fieldName}_${timestamp}_${randomStr}.${extension}`;

      // Upload to R2
      await env.CERT_IMAGES_PDFS.put(key, file.stream(), {
        httpMetadata: {
          contentType: file.type,
        },
      });

      uploadedFiles[fieldName] = {
        key,
        mime: file.type,
        name: file.name
      };
    }

    // Insert into database
    const result = await env.CERT_DB.prepare(`
      INSERT INTO certification_applications (
        fin_code, full_name, phone, email, address,
        judicial_record_key, judicial_record_mime, judicial_record_name,
        photo_key, photo_mime, photo_name,
        population_register_key, population_register_mime, population_register_name,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', datetime('now'), datetime('now'))
    `).bind(
      fin_code, full_name, phone, email, address,
      uploadedFiles.judicial_record.key, uploadedFiles.judicial_record.mime, uploadedFiles.judicial_record.name,
      uploadedFiles.photo.key, uploadedFiles.photo.mime, uploadedFiles.photo.name,
      uploadedFiles.population_register.key, uploadedFiles.population_register.mime, uploadedFiles.population_register.name
    ).run();

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Başvurunuz başarıyla alındı. En kısa sürede size dönüş yapacağız.',
      id: result.meta.last_row_id
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Certification application error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Başvuru gönderilirken bir hata oluştu' 
    }), {
      status: 500,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json' 
      }
    });
  }
}