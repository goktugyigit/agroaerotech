export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    // Auth: admin/_middleware.js tarafından korunuyor

    // Get all certification applications
    const applications = await env.CERT_DB.prepare(`
      SELECT 
        id, fin_code, full_name, phone, email, address,
        judicial_record_key, judicial_record_mime, judicial_record_name,
        photo_key, photo_mime, photo_name,
        population_register_key, population_register_mime, population_register_name,
        status, created_at, updated_at
      FROM certification_applications 
      ORDER BY created_at DESC
    `).all();

    return new Response(JSON.stringify({ 
      success: true, 
      applications: applications.results 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Admin certification applications error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Başvurular yüklenirken hata oluştu' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;
  
  try {
    // Auth: admin/_middleware.js tarafından korunuyor

    const { id, status } = await request.json();
    
    if (!id || !status) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'ID ve durum gerekli' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update application status
    await env.CERT_DB.prepare(`
      UPDATE certification_applications 
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(status, id).run();

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Başvuru durumu güncellendi' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Admin update certification application error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Durum güncellenirken hata oluştu' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}