// Tek blog getirme (GET)
export async function onRequestGet({ params, env }) {
  try {
    console.log('Tek blog getirme isteği, ID:', params.id);
    
    if (!env.BLOG_DB) {
      console.error('BLOG_DB binding bulunamadı');
      return new Response(JSON.stringify({
        success: false,
        message: 'Veritabanı bağlantısı bulunamadı'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { results } = await env.BLOG_DB.prepare(
      "SELECT * FROM blogs WHERE id = ?"
    ).bind(params.id).all();
    
    if (results.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: "Blog bulunamadı"
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: results[0]
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Blog getirme hatası:', error);
    return new Response(JSON.stringify({
      success: false,
      message: `Blog yüklenirken hata oluştu: ${error.message}`
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Blog güncelleme (PUT)
export async function onRequestPut({ params, request, env }) {
  try {
    console.log('Blog güncelleme isteği, ID:', params.id);
    
    if (!env.BLOG_DB) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Veritabanı bağlantısı bulunamadı'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await request.json();
    
    // --- YENİ EKLENECEK GÜVENLİK KODU ---
    let finalImageUrl = data.image || null;
    if (finalImageUrl && !finalImageUrl.startsWith('http')) {
      const r2PublicUrl = env.R2_PUBLIC_URL || 'https://pub-747e300928e044d295be3a593a5c0ddf.r2.dev';
      finalImageUrl = `${r2PublicUrl}/${finalImageUrl.replace(/^\//, '')}`;
      console.log('Görsel URL\'si düzeltildi:', finalImageUrl);
    }
    // --- KOD SONU ---
    
    // Veri doğrulama - TR alanları zorunlu
    if (!data.title_tr || !data.slug || !data.category || !data.description_tr || !data.content_tr) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Türkçe alanlar (başlık, açıklama, içerik) zorunludur'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Kısa açıklama tam 100 karakter kontrolü (TR)
    if (data.description_tr.length !== 100) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Türkçe kısa açıklama tam 100 karakter olmalıdır'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Diğer dillerin açıklama kontrolü (varsa)
    const languages = ['en', 'ru', 'az'];
    for (const lang of languages) {
      const desc = data[`description_${lang}`];
      if (desc && desc.length !== 100) {
        const langNames = { en: 'İngilizce', ru: 'Rusça', az: 'Azerbaycan Türkçesi' };
        return new Response(JSON.stringify({
          success: false,
          message: `${langNames[lang]} kısa açıklama tam 100 karakter olmalıdır`
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Slug benzersizlik kontrolü (mevcut blog hariç)
    const existingSlug = await env.BLOG_DB.prepare(
      "SELECT id FROM blogs WHERE slug = ? AND id != ?"
    ).bind(data.slug, params.id).first();

    if (existingSlug) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Bu slug başka bir blog tarafından kullanılıyor'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    await env.BLOG_DB.prepare(`
      UPDATE blogs 
      SET title_tr = ?, title_en = ?, title_ru = ?, title_az = ?,
          slug = ?, category = ?, 
          description_tr = ?, description_en = ?, description_ru = ?, description_az = ?,
          content_tr = ?, content_en = ?, content_ru = ?, content_az = ?,
          image = ?, read_time = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      data.title_tr,
      data.title_en || null,
      data.title_ru || null,
      data.title_az || null,
      data.slug,
      data.category,
      data.description_tr,
      data.description_en || null,
      data.description_ru || null,
      data.description_az || null,
      data.content_tr,
      data.content_en || null,
      data.content_ru || null,
      data.content_az || null,
      finalImageUrl, // Düzeltilmiş URL'yi kullan
      data.read_time || 5,
      params.id
    ).run();
    
    return new Response(JSON.stringify({
      success: true,
      message: "Blog başarıyla güncellendi"
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Blog güncelleme hatası:', error);
    return new Response(JSON.stringify({
      success: false,
      message: `Blog güncellenirken hata oluştu: ${error.message}`
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Blog silme (DELETE)
export async function onRequestDelete({ params, env }) {
  try {
    console.log('Blog silme isteği, ID:', params.id);
    
    if (!env.BLOG_DB || !env.BLOG_IMAGES) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Veritabanı veya R2 depolama alanı yapılandırılmamış.'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. ADIM: Görsel URL'ini almak için ID, slug ve IMAGE sütununu seç
    const existingBlog = await env.BLOG_DB.prepare(
      "SELECT id, slug, image FROM blogs WHERE id = ?"
    ).bind(params.id).first();

    if (!existingBlog) {
      return new Response(JSON.stringify({
        success: false,
        message: "Blog bulunamadı"
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. ADIM: Blog'un bir görseli varsa R2'den silme işlemini yap
    if (existingBlog.image) {
      try {
        // URL'den dosya adını (nesne anahtarını) al
        // Örn: https://media.agroaerotech.com/blog-12345-abc.jpg -> blog-12345-abc.jpg
        const imageUrl = new URL(existingBlog.image);
        const objectKey = imageUrl.pathname.substring(1); // Baştaki '/' karakterini kaldır
        
        if (objectKey) {
          console.log(`R2'den siliniyor: ${objectKey}`);
          await env.BLOG_IMAGES.delete(objectKey);
          console.log(`R2'den ${objectKey} başarıyla silindi.`);
        }
      } catch (r2Error) {
        // Hata durumunda işlemi logla ama ana işlemi durdurma
        // Bu sayede R2'de bir sorun olsa bile blog kaydı veritabanından silinebilir
        // Bu "yetim" bir dosya bırakabilir ama en azından kullanıcı arayüzünde hata oluşmaz
        console.error(`R2 görseli silinirken hata oluştu: ${r2Error.message}`);
      }
    }

    // 3. ADIM: Veritabanından blog kaydını sil
    await env.BLOG_DB.prepare(
      "DELETE FROM blogs WHERE id = ?"
    ).bind(params.id).run();
    
    console.log(`D1'den blog (ID: ${params.id}) başarıyla silindi.`);
    
    return new Response(JSON.stringify({
      success: true,
      message: "Blog ve ilişkili görsel başarıyla silindi"
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Blog silme hatası:', error);
    return new Response(JSON.stringify({
      success: false,
      message: `Blog silinirken hata oluştu: ${error.message}`
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}