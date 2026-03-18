// Tek kategori getirme (GET)
export async function onRequestGet({ params, env }) {
  try {
    console.log('Tek kategori getirme isteği, ID:', params.id);
    
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

    const category = await env.BLOG_DB.prepare(
      "SELECT * FROM categories WHERE id = ?"
    ).bind(params.id).first();
    
    if (!category) {
      return new Response(JSON.stringify({
        success: false,
        message: "Kategori bulunamadı"
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: category
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Kategori getirme hatası:', error);
    return new Response(JSON.stringify({
      success: false,
      message: `Kategori yüklenirken hata oluştu: ${error.message}`
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Kategori güncelleme (PUT)
export async function onRequestPut({ params, request, env }) {
  try {
    console.log('Kategori güncelleme isteği, ID:', params.id);
    
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
    
    // Veri doğrulama
    if (!data.name || !data.slug) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Kategori adı ve slug gereklidir'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Kategori adı benzersizlik kontrolü (mevcut kategori hariç)
    const existingName = await env.BLOG_DB.prepare(
      "SELECT id FROM categories WHERE name = ? AND id != ?"
    ).bind(data.name, params.id).first();

    if (existingName) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Bu kategori adı başka bir kategori tarafından kullanılıyor'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Slug benzersizlik kontrolü (mevcut kategori hariç)
    const existingSlug = await env.BLOG_DB.prepare(
      "SELECT id FROM categories WHERE slug = ? AND id != ?"
    ).bind(data.slug, params.id).first();

    if (existingSlug) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Bu slug başka bir kategori tarafından kullanılıyor'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Eski kategori adını al (blog güncellemesi için)
    const oldCategory = await env.BLOG_DB.prepare(
      "SELECT name FROM categories WHERE id = ?"
    ).bind(params.id).first();

    if (!oldCategory) {
      return new Response(JSON.stringify({
        success: false,
        message: "Kategori bulunamadı"
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Kategoriyi güncelle
    await env.BLOG_DB.prepare(`
      UPDATE categories 
      SET name = ?, slug = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      data.name,
      data.slug,
      data.description || null,
      params.id
    ).run();

    // Eğer kategori adı değiştiyse, bu kategoriye ait blogları da güncelle
    if (oldCategory.name !== data.name) {
      await env.BLOG_DB.prepare(`
        UPDATE blogs 
        SET category = ?, updated_at = CURRENT_TIMESTAMP
        WHERE category = ?
      `).bind(data.name, oldCategory.name).run();
      
      console.log(`Kategori adı değişti: ${oldCategory.name} -> ${data.name}, bloglar güncellendi`);
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: "Kategori başarıyla güncellendi"
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Kategori güncelleme hatası:', error);
    return new Response(JSON.stringify({
      success: false,
      message: `Kategori güncellenirken hata oluştu: ${error.message}`
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Kategori silme (DELETE)
export async function onRequestDelete({ params, env }) {
  try {
    console.log('Kategori silme isteği, ID:', params.id);
    
    if (!env.BLOG_DB) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Veritabanı bağlantısı bulunamadı'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Kategori var mı kontrol et
    const existingCategory = await env.BLOG_DB.prepare(
      "SELECT id, name FROM categories WHERE id = ?"
    ).bind(params.id).first();

    if (!existingCategory) {
      return new Response(JSON.stringify({
        success: false,
        message: "Kategori bulunamadı"
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Bu kategoriye ait blogları "Genel" kategorisine taşı
    await env.BLOG_DB.prepare(`
      UPDATE blogs 
      SET category = 'Genel', updated_at = CURRENT_TIMESTAMP
      WHERE category = ?
    `).bind(existingCategory.name).run();

    // Kategoriyi sil
    await env.BLOG_DB.prepare(
      "DELETE FROM categories WHERE id = ?"
    ).bind(params.id).run();
    
    console.log(`Kategori silindi: ${existingCategory.name}, bloglar "Genel" kategorisine taşındı`);
    
    return new Response(JSON.stringify({
      success: true,
      message: "Kategori başarıyla silindi, bu kategoriye ait bloglar 'Genel' kategorisine taşındı"
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Kategori silme hatası:', error);
    return new Response(JSON.stringify({
      success: false,
      message: `Kategori silinirken hata oluştu: ${error.message}`
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}