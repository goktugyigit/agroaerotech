// Belirli bir dilde blog içeriği getirme
export async function onRequestGet({ params, env }) {
  try {
    const { slug, lang } = params;
    
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

    // Blog'u getir
    const blog = await env.BLOG_DB.prepare(
      `SELECT id, slug, category, image, read_time, created_at, updated_at,
              title_tr, title_en, title_ru, title_az,
              description_tr, description_en, description_ru, description_az,
              content_tr, content_en, content_ru, content_az
       FROM blogs 
       WHERE slug = ? AND (published = 1 OR published IS NULL)`
    ).bind(slug).first();

    if (!blog) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Blog bulunamadı'
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // İstenen dildeki içeriği hazırla
    const title = blog[`title_${lang}`] || blog.title_tr;
    const description = blog[`description_${lang}`] || blog.description_tr;
    const content = blog[`content_${lang}`] || blog.content_tr;

    // Eğer istenen dilde içerik yoksa fallback olarak Türkçe kullan
    if (!title || !description || !content) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Bu dilde içerik mevcut değil',
        availableLanguages: getAvailableLanguages(blog)
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const response = {
      success: true,
      data: {
        id: blog.id,
        slug: blog.slug,
        category: blog.category,
        title,
        description,
        content,
        image: blog.image,
        read_time: blog.read_time,
        created_at: blog.created_at,
        updated_at: blog.updated_at,
        language: lang,
        availableLanguages: getAvailableLanguages(blog)
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
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

// Mevcut dilleri tespit et
function getAvailableLanguages(blog) {
  const languages = [];
  
  if (blog.title_tr && blog.description_tr && blog.content_tr) {
    languages.push('tr');
  }
  if (blog.title_en && blog.description_en && blog.content_en) {
    languages.push('en');
  }
  if (blog.title_ru && blog.description_ru && blog.content_ru) {
    languages.push('ru');
  }
  if (blog.title_az && blog.description_az && blog.content_az) {
    languages.push('az');
  }
  
  return languages;
}