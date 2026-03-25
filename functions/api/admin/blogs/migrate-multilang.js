// Blog tablosuna çoklu dil desteği ekleme migration
export async function onRequestPost({ request, env }) {
  try {
    console.log('Çoklu dil migration başlatılıyor...');
    
    if (!env.BLOG_DB) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Veritabanı bağlantısı bulunamadı'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Önce mevcut tablo yapısını kontrol et
    const tableInfo = await env.BLOG_DB.prepare(`
      PRAGMA table_info(blogs)
    `).all();
    
    const existingColumns = tableInfo.results.map(col => col.name);
    console.log('Mevcut sütunlar:', existingColumns);

    // Eğer çoklu dil sütunları zaten varsa migration'ı atla
    if (existingColumns.includes('title_tr')) {
      return new Response(JSON.stringify({
        success: true,
        message: "Çoklu dil sütunları zaten mevcut"
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Mevcut blogs tablosunu yedekle
    await env.BLOG_DB.prepare(`
      CREATE TABLE IF NOT EXISTS blogs_backup AS 
      SELECT * FROM blogs
    `).run();

    // Yeni çoklu dil sütunlarını ekle
    const alterQueries = [
      `ALTER TABLE blogs ADD COLUMN title_tr TEXT DEFAULT NULL`,
      `ALTER TABLE blogs ADD COLUMN title_en TEXT DEFAULT NULL`,
      `ALTER TABLE blogs ADD COLUMN title_ru TEXT DEFAULT NULL`,
      `ALTER TABLE blogs ADD COLUMN title_az TEXT DEFAULT NULL`,
      `ALTER TABLE blogs ADD COLUMN description_tr TEXT DEFAULT NULL`,
      `ALTER TABLE blogs ADD COLUMN description_en TEXT DEFAULT NULL`,
      `ALTER TABLE blogs ADD COLUMN description_ru TEXT DEFAULT NULL`,
      `ALTER TABLE blogs ADD COLUMN description_az TEXT DEFAULT NULL`,
      `ALTER TABLE blogs ADD COLUMN content_tr TEXT DEFAULT NULL`,
      `ALTER TABLE blogs ADD COLUMN content_en TEXT DEFAULT NULL`,
      `ALTER TABLE blogs ADD COLUMN content_ru TEXT DEFAULT NULL`,
      `ALTER TABLE blogs ADD COLUMN content_az TEXT DEFAULT NULL`
    ];

    for (const query of alterQueries) {
      try {
        await env.BLOG_DB.prepare(query).run();
        console.log('Sütun eklendi:', query);
      } catch (error) {
        console.log('Sütun ekleme hatası:', error.message);
      }
    }

    // Mevcut verileri Türkçe sütunlarına kopyala
    try {
      await env.BLOG_DB.prepare(`
        UPDATE blogs 
        SET title_tr = title,
            description_tr = description,
            content_tr = content
        WHERE title_tr IS NULL
      `).run();
      console.log('Mevcut veriler Türkçe sütunlarına kopyalandı');
    } catch (error) {
      console.log('Veri kopyalama hatası:', error.message);
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Çoklu dil desteği başarıyla eklendi"
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Migration hatası:', error);
    return new Response(JSON.stringify({
      success: false,
      message: `Migration sırasında hata oluştu: ${error.message}`
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}