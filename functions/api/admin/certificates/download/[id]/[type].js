// Sertifika Dosya İndirme API

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

export async function onRequestGet(context) {
  try {
    const { request, params, env } = context;
    const { id, type } = params;

    // Admin session kontrolü
    const isValidSession = await verifyAdminSession(request, env);
    if (!isValidSession) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Sertifika bilgilerini al
    const certificate = await env.CERT_SEARCH_ADD.prepare(`
      SELECT * FROM certificates WHERE id = ?
    `).bind(id).first();

    if (!certificate) {
      return new Response('Certificate not found', { status: 404 });
    }

    let fileKey, fileName, contentType;
    
    if (type === 'image') {
      fileKey = certificate.certificate_image_key;
      const extension = fileKey.split('.').pop();
      fileName = `${certificate.fin_code}_sertifika_gorsel.${extension}`;
      contentType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
    } else if (type === 'pdf') {
      fileKey = certificate.certificate_pdf_key;
      fileName = `${certificate.fin_code}_sertifika.pdf`;
      contentType = 'application/pdf';
    } else {
      return new Response('Invalid file type', { status: 400 });
    }

    // R2'den dosyayı al
    const fileObject = await env.CERT_SEARCH_ADD_DB.get(fileKey);
    
    if (!fileObject) {
      return new Response('File not found', { status: 404 });
    }

    // Dosyayı indirme olarak döndür
    return new Response(fileObject.body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Certificate file download error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}