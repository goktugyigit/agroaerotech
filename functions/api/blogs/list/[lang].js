// Belirli bir dilde blog listesi getirme
export async function onRequestGet({ params, env }) {
  try {
    const { lang } = params;
    
    if (!env.BLOG_DB) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Veritabanı bağlantısı bulunamadı'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Desteklenen dilleri kontrol et
    const supportedLangs = ['tr', 'en', 'ru', 'az'];
    if (!supportedLangs.includes(lang)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Desteklenmeyen dil'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Blog listesini getir
    const { results } = await env.BLOG_DB.prepare(
      `SELECT id, slug, category, image, read_time, created_at, updated_at,
              title_tr, title_en, title_ru, title_az,
              description_tr, description_en, description_ru, description_az,
              content_tr, content_en, content_ru, content_az
       FROM blogs 
       WHERE (published = 1 OR published IS NULL)
       ORDER BY created_at DESC`
    ).all();

    // İstenen dildeki içerikleri filtrele ve hazırla
    const blogsInLanguage = results
      .filter(blog => {
        // İstenen dilde içerik var mı kontrol et (sadece başlık ve açıklama yeterli)
        return blog[`title_${lang}`] && blog[`description_${lang}`];
      })
      .map(blog => ({
        id: blog.id,
        slug: blog.slug,
        category: blog.category,
        title: blog[`title_${lang}`],
        description: blog[`description_${lang}`],
        image: blog.image,
        read_time: blog.read_time,
        created_at: blog.created_at,
        updated_at: blog.updated_at,
        language: lang,
        availableLanguages: getAvailableLanguages(blog)
      }));

    return new Response(JSON.stringify({
      success: true,
      data: blogsInLanguage,
      total: blogsInLanguage.length,
      language: lang
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    console.error('Blog listesi hatası:', error);
    return new Response(JSON.stringify({
      success: false,
      message: `Blog listesi yüklenirken hata oluştu: ${error.message}`
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Mevcut dilleri tespit et
function getAvailableLanguages(blog) {
  const languages = [];
  
  if (blog.title_tr && blog.description_tr) {
    languages.push('tr');
  }
  if (blog.title_en && blog.description_en) {
    languages.push('en');
  }
  if (blog.title_ru && blog.description_ru) {
    languages.push('ru');
  }
  if (blog.title_az && blog.description_az) {
    languages.push('az');
  }
  
  return languages;
}