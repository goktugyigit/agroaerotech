// Görsel yükleme API'si - R2 Tabanlı
// Auth: admin/_middleware.js tarafından korunuyor
export async function onRequestPost({ request, env }) {
  try {

    // R2 binding ve environment variable kontrolü
    if (!env.BLOG_IMAGES) {
      console.error('R2 bucket binding (BLOG_IMAGES) bulunamadı.');
      return new Response(JSON.stringify({
        success: false,
        message: 'Sunucu yapılandırma hatası: Görsel depolama alanı bulunamadı. Lütfen R2 binding\'ini kontrol edin.'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!env.R2_PUBLIC_URL) {
      console.error('R2_PUBLIC_URL environment variable bulunamadı.');
      return new Response(JSON.stringify({
        success: false,
        message: 'Sunucu yapılandırma hatası: R2 Public URL ayarlanmamış.'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const formData = await request.formData();
    const file = formData.get('image');
    
    if (!file) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Dosya seçilmedi'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Dosya türü kontrolü
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Sadece JPG, PNG ve WebP formatları desteklenir'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Dosya boyutu kontrolü (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Dosya boyutu 10MB\'dan küçük olmalıdır'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Benzersiz dosya adı oluştur
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileExtension = file.name.split('.').pop();
    const fileName = `blog-${timestamp}-${randomString}.${fileExtension}`;

    try {
      // Dosyayı R2'ye yükle
      const arrayBuffer = await file.arrayBuffer();
      await env.BLOG_IMAGES.put(fileName, arrayBuffer, {
        httpMetadata: {
          contentType: file.type,
          cacheControl: 'public, max-age=604800', // 1 hafta cache
        },
      });

      // R2 public URL'i oluştur (environment variable'dan)
      const r2PublicUrl = env.R2_PUBLIC_URL;
      if (!r2PublicUrl) {
        console.error('R2_PUBLIC_URL ortam değişkeni ayarlanmamış.');
        return new Response(JSON.stringify({
          success: false,
          message: 'Sunucu yapılandırma hatası: Public URL bulunamadı.'
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const imageUrl = `${r2PublicUrl}/${fileName}`;
      
      console.log('Görsel başarıyla R2\'ye yüklendi:', fileName);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Görsel başarıyla yüklendi',
        imageUrl: imageUrl,
        fileName: fileName
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });

    } catch (r2Error) {
      console.error('R2 yükleme hatası:', r2Error);
      return new Response(JSON.stringify({
        success: false,
        message: 'Görsel depolama alanına yüklenirken hata oluştu'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Görsel yükleme hatası:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Görsel yüklenirken hata oluştu'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}