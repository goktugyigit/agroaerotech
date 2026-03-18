// Sertifika Görsel Serve API

export async function onRequestGet(context) {
  try {
    const { params, env } = context;
    const key = decodeURIComponent(params.key);

    // Güvenlik: Path traversal saldırılarını engelle
    if (key.includes('..') || key.includes('//') || !key.startsWith('certificates/')) {
      return new Response('Invalid path', { status: 400 });
    }

    // Güvenlik: Sadece image dosyalarına izin ver
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const hasValidExtension = allowedExtensions.some(ext => key.toLowerCase().endsWith(ext));
    if (!hasValidExtension) {
      return new Response('Invalid file type', { status: 400 });
    }



    // R2'den dosyayı al
    const imageObject = await env.CERT_SEARCH_ADD_DB.get(key);
    
    if (!imageObject) {
      return new Response('Image not found', { status: 404 });
    }

    // Content-Type'ı belirle
    const contentType = imageObject.httpMetadata?.contentType || 'image/jpeg';
    


    // Dosyayı stream olarak döndür
    return new Response(imageObject.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // 1 yıl cache
        'X-Content-Type-Options': 'nosniff',
        // Sağ tık ve kaydetmeyi engelle
        'Content-Security-Policy': "default-src 'none'",
        'X-Frame-Options': 'DENY'
      }
    });

  } catch (error) {
    console.error('Image serve error:', error.message);
    return new Response('Internal Server Error', { status: 500 });
  }
}