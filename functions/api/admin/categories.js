// Kategori listesi getirme (GET)
export async function onRequestGet({ env }) {
  try {
    console.log('Kategori listesi istendi');
    
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

    // Kategorileri blog sayısı ile birlikte getir
    const { results } = await env.BLOG_DB.prepare(`
      SELECT 
        c.id, 
        c.name, 
        c.slug, 
        c.description, 
        c.created_at,
        COUNT(b.id) as blog_count
      FROM categories c
      LEFT JOIN blogs b ON b.category = c.name
      GROUP BY c.id, c.name, c.slug, c.description, c.created_at
      ORDER BY c.name ASC
    `).all();
    
    console.log('Kategori listesi başarıyla getirildi:', results.length, 'kategori');
    
    return new Response(JSON.stringify({
      success: true,
      data: results
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    console.error('Kategori listesi hatası:', error);
    return new Response(JSON.stringify({
      success: false,
      message: `Kategori listesi yüklenirken hata oluştu: ${error.message}`
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Yeni kategori ekleme (POST)
export async function onRequestPost({ request, env }) {
  try {
    console.log('Kategori ekleme isteği alındı');
    
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
    console.log('Kategori verisi:', data);
    
    // Veri doğrulama
    if (!data.name || !data.slug) {
      console.error('Gerekli alanlar eksik:', { 
        name: !!data.name, 
        slug: !!data.slug
      });
      return new Response(JSON.stringify({
        success: false,
        message: 'Kategori adı ve slug gereklidir'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Kategori adı benzersizlik kontrolü
    const existingName = await env.BLOG_DB.prepare(
      "SELECT id FROM categories WHERE name = ?"
    ).bind(data.name).first();

    if (existingName) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Bu kategori adı zaten kullanılıyor'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Slug benzersizlik kontrolü
    const existingSlug = await env.BLOG_DB.prepare(
      "SELECT id FROM categories WHERE slug = ?"
    ).bind(data.slug).first();

    if (existingSlug) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Bu slug zaten kullanılıyor'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    await env.BLOG_DB.prepare(`
      INSERT INTO categories (name, slug, description, created_at, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      data.name,
      data.slug,
      data.description || null
    ).run();
    
    console.log('Kategori başarıyla eklendi:', data.name);
    
    return new Response(JSON.stringify({
      success: true,
      message: "Kategori başarıyla eklendi"
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Kategori ekleme hatası:', error);
    return new Response(JSON.stringify({
      success: false,
      message: `Kategori eklenirken hata oluştu: ${error.message}`
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}