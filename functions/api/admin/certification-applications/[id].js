export async function onRequestDelete(context) {
  const { request, env, params } = context;
  
  try {
    // Auth: admin/_middleware.js tarafından korunuyor

    const id = parseInt(params.id);
    
    if (!id || isNaN(id)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Geçersiz ID' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get application details first to delete files from R2
    const application = await env.CERT_DB.prepare(
      'SELECT judicial_record_key, photo_key, population_register_key FROM certification_applications WHERE id = ?'
    ).bind(id).first();

    if (!application) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Başvuru bulunamadı' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete files from R2
    const filesToDelete = [
      application.judicial_record_key,
      application.photo_key,
      application.population_register_key
    ].filter(key => key); // Remove null/undefined keys

    for (const fileKey of filesToDelete) {
      try {
        await env.CERT_IMAGES_PDFS.delete(fileKey);
      } catch (error) {
        console.error(`Failed to delete file ${fileKey}:`, error);
        // Continue with deletion even if file deletion fails
      }
    }

    // Delete application from database
    const result = await env.CERT_DB.prepare(
      'DELETE FROM certification_applications WHERE id = ?'
    ).bind(id).run();

    if (result.changes === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Başvuru silinemedi' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Başvuru ve dosyalar başarıyla silindi' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete certification application error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Başvuru silinirken hata oluştu' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}