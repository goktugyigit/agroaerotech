// Admin - Sertifika Yönetimi

// Session doğrulama fonksiyonu
async function verifyAdminSession(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const sessionMatch = cookie.match(/adminSession=([^;]*)/);
  const sessionToken = sessionMatch ? decodeURIComponent(sessionMatch[1]) : null;
  
  if (!sessionToken || !sessionToken.startsWith("admin-")) return false;
  
  // Token yaş kontrolü (1 saat)
  const tokenParts = sessionToken.split('-');
  if (tokenParts.length >= 2) {
    const tokenTime = parseInt(tokenParts[1]);
    const now = Date.now();
    if (now - tokenTime > 3600000) return false;
  }
  
  return true;
}

// Sertifikaları listele (GET)
export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    // Admin session kontrolü
    const isValidSession = await verifyAdminSession(request, env);
    if (!isValidSession) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Yetkisiz erişim.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const certificates = await env.CERT_SEARCH_ADD.prepare(`
      SELECT id, fin_code, full_name, created_at, updated_at
      FROM certificates 
      ORDER BY created_at DESC
    `).all();

    return new Response(JSON.stringify({
      success: true,
      data: certificates.results
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Sertifika listesi hatası:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Sertifikalar yüklenemedi.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Yeni sertifika ekle (POST)
export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // Admin session kontrolü
    const isValidSession = await verifyAdminSession(request, env);
    if (!isValidSession) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Yetkisiz erişim.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Güvenlik: Content-Length kontrolü (50MB limit)
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Dosya çok büyük. Maksimum 50MB.'
      }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const formData = await request.formData();
    const finCode = formData.get('fin_code')?.toString().trim().toUpperCase();
    const fullName = formData.get('full_name')?.toString().trim();
    const certificateImage = formData.get('certificate_image');
    const certificatePdf = formData.get('certificate_pdf');

    // Validasyon
    if (!finCode || !fullName || !certificateImage || !certificatePdf) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Tüm alanlar zorunludur.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // FIN kodu formatı kontrolü
    if (!/^[A-Z0-9]+$/.test(finCode)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'FIN kodu sadece büyük harf ve rakam içermelidir.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // FIN kodu benzersizlik kontrolü
    const existingCert = await env.CERT_SEARCH_ADD.prepare(`
      SELECT id FROM certificates WHERE fin_code = ?
    `).bind(finCode).first();

    if (existingCert) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Bu FIN kodu zaten kullanılmaktadır.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Güvenlik: Dosya türü ve MIME type kontrolü
    const imageExtension = certificateImage.name.split('.').pop().toLowerCase();
    const pdfExtension = certificatePdf.name.split('.').pop().toLowerCase();

    // Dosya uzantısı kontrolü
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(imageExtension)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Sertifika görseli JPG, PNG veya WebP formatında olmalıdır.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (pdfExtension !== 'pdf') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Sertifika dosyası PDF formatında olmalıdır.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // MIME type kontrolü
    const allowedImageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedImageMimes.includes(certificateImage.type)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Geçersiz görsel dosya türü.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (certificatePdf.type !== 'application/pdf') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Geçersiz PDF dosya türü.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Dosya boyutu kontrolü (5MB)
    if (certificateImage.size > 5 * 1024 * 1024 || certificatePdf.size > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Dosya boyutu 5MB\'dan büyük olamaz.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Benzersiz dosya adları oluştur
    const timestamp = Date.now();
    const imageKey = `certificates/images/${finCode}_${timestamp}.${imageExtension}`;
    const pdfKey = `certificates/pdfs/${finCode}_${timestamp}.pdf`;



    // Dosyaları R2'ye yükle
    await env.CERT_SEARCH_ADD_DB.put(imageKey, certificateImage.stream(), {
      httpMetadata: {
        contentType: certificateImage.type
      }
    });

    await env.CERT_SEARCH_ADD_DB.put(pdfKey, certificatePdf.stream(), {
      httpMetadata: {
        contentType: 'application/pdf'
      }
    });



    // Veritabanına kaydet
    const result = await env.CERT_SEARCH_ADD.prepare(`
      INSERT INTO certificates (fin_code, full_name, certificate_image_key, certificate_pdf_key)
      VALUES (?, ?, ?, ?)
    `).bind(finCode, fullName, imageKey, pdfKey).run();

    if (result.success) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Sertifika başarıyla eklendi.',
        data: {
          id: result.meta.last_row_id,
          fin_code: finCode,
          full_name: fullName
        }
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      throw new Error('Veritabanı kayıt hatası');
    }

  } catch (error) {
    console.error('Sertifika ekleme hatası:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Sertifika eklenirken bir hata oluştu.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

