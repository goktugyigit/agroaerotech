// Admin - Sertifika Detay/Güncelleme/Silme

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

// Sertifika detayını getir (GET)
export async function onRequestGet(context) {
  try {
    const { request, params, env } = context;
    const id = params.id;

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

    const certificate = await env.CERT_SEARCH_ADD.prepare(`
      SELECT * FROM certificates WHERE id = ?
    `).bind(id).first();

    if (!certificate) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Sertifika bulunamadı.'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: certificate
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Sertifika detay hatası:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Sertifika detayı yüklenemedi.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Sertifikayı sil (DELETE)
export async function onRequestDelete(context) {
  try {
    const { request, params, env } = context;
    const id = params.id;

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

    // Önce sertifika bilgilerini al (dosyaları silmek için)
    const certificate = await env.CERT_SEARCH_ADD.prepare(`
      SELECT certificate_image_key, certificate_pdf_key FROM certificates WHERE id = ?
    `).bind(id).first();

    if (!certificate) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Sertifika bulunamadı.'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // R2'den dosyaları sil
    try {
      await env.CERT_SEARCH_ADD_DB.delete(certificate.certificate_image_key);
      await env.CERT_SEARCH_ADD_DB.delete(certificate.certificate_pdf_key);
    } catch (error) {
      console.error('R2 dosya silme hatası:', error);
      // Dosya silme hatası olsa bile veritabanından silmeye devam et
    }

    // Veritabanından sil
    const result = await env.CERT_SEARCH_ADD.prepare(`
      DELETE FROM certificates WHERE id = ?
    `).bind(id).run();

    if (result.success) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Sertifika başarıyla silindi.'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      throw new Error('Silme başarısız');
    }

  } catch (error) {
    console.error('Sertifika silme hatası:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Sertifika silinemedi.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Sertifika güncelle (PUT)
export async function onRequestPut(context) {
  try {
    const { request, params, env } = context;
    const id = params.id;

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

    const formData = await request.formData();
    const finCode = formData.get('fin_code')?.toString().trim().toUpperCase();
    const fullName = formData.get('full_name')?.toString().trim();
    const certificateImage = formData.get('certificate_image');
    const certificatePdf = formData.get('certificate_pdf');

    // Validasyon
    if (!finCode || !fullName) {
      return new Response(JSON.stringify({
        success: false,
        error: 'FIN kodu ve ad soyad zorunludur.'
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

    // Mevcut sertifikayı al
    const existingCert = await env.CERT_SEARCH_ADD.prepare(`
      SELECT * FROM certificates WHERE id = ?
    `).bind(id).first();

    if (!existingCert) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Sertifika bulunamadı.'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let imageKey = existingCert.certificate_image_key;
    let pdfKey = existingCert.certificate_pdf_key;

    // Yeni dosyalar yüklendiyse işle
    if (certificateImage && certificateImage.size > 0) {
      const imageExtension = certificateImage.name.split('.').pop().toLowerCase();
      if (!['jpg', 'jpeg', 'png', 'webp'].includes(imageExtension)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Sertifika görseli JPG, PNG veya WebP formatında olmalıdır.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (certificateImage.size > 5 * 1024 * 1024) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Görsel dosya boyutu 5MB\'dan büyük olamaz.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Eski dosyayı sil
      try {
        await env.CERT_SEARCH_ADD_DB.delete(existingCert.certificate_image_key);
      } catch (error) {
        console.error('Eski görsel silinirken hata:', error);
      }

      // Yeni dosyayı yükle
      const timestamp = Date.now();
      imageKey = `certificates/images/${finCode}_${timestamp}.${imageExtension}`;
      await env.CERT_SEARCH_ADD_DB.put(imageKey, certificateImage.stream(), {
        httpMetadata: {
          contentType: certificateImage.type
        }
      });
    }

    if (certificatePdf && certificatePdf.size > 0) {
      const pdfExtension = certificatePdf.name.split('.').pop().toLowerCase();
      if (pdfExtension !== 'pdf') {
        return new Response(JSON.stringify({
          success: false,
          error: 'Sertifika dosyası PDF formatında olmalıdır.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (certificatePdf.size > 5 * 1024 * 1024) {
        return new Response(JSON.stringify({
          success: false,
          error: 'PDF dosya boyutu 5MB\'dan büyük olamaz.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Eski dosyayı sil
      try {
        await env.CERT_SEARCH_ADD_DB.delete(existingCert.certificate_pdf_key);
      } catch (error) {
        console.error('Eski PDF silinirken hata:', error);
      }

      // Yeni dosyayı yükle
      const timestamp = Date.now();
      pdfKey = `certificates/pdfs/${finCode}_${timestamp}.pdf`;
      await env.CERT_SEARCH_ADD_DB.put(pdfKey, certificatePdf.stream(), {
        httpMetadata: {
          contentType: 'application/pdf'
        }
      });
    }

    // Veritabanını güncelle
    const result = await env.CERT_SEARCH_ADD.prepare(`
      UPDATE certificates 
      SET fin_code = ?, full_name = ?, certificate_image_key = ?, certificate_pdf_key = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(finCode, fullName, imageKey, pdfKey, id).run();

    if (result.success) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Sertifika başarıyla güncellendi.',
        data: {
          id: parseInt(id),
          fin_code: finCode,
          full_name: fullName
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      throw new Error('Veritabanı güncelleme hatası');
    }

  } catch (error) {
    console.error('Sertifika güncelleme hatası:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Sertifika güncellenirken bir hata oluştu.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}