// Basit blog listesi API'si
export async function onRequestGet({ env }) {
  try {
    if (!env.BLOG_DB) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Veritabanı bağlantısı bulunamadı'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Basit sorgu - eski yapıyı destekle
    let results = [];
    try {
      const queryResult = await env.BLOG_DB.prepare(
        `SELECT id, title_tr, slug, category, description_tr, image, read_time, created_at, updated_at 
         FROM blogs 
         WHERE published = 1 OR published IS NULL 
         ORDER BY created_at DESC`
      ).all();
      
      results = queryResult.results || [];
      console.log('Blog sorgusu başarılı:', results.length, 'blog bulundu');
    } catch (error) {
      console.error('Blog listesi hatası:', error);
      // Hata durumunda bile boş array döndür
      results = [];
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: results || []
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    console.error('API hatası:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Sunucu hatası'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}