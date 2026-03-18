export async function onRequestGet(context) {
  const { request, env, params } = context;
  
  try {
    // Auth: admin/_middleware.js tarafından korunuyor

    const fileKey = decodeURIComponent(params.key);
    
    // Get original filename from database
    let originalFileName = null;
    try {
      const dbResult = await env.CERT_DB.prepare(`
        SELECT 
          CASE 
            WHEN photo_key = ? THEN photo_name
            WHEN judicial_record_key = ? THEN judicial_record_name
            WHEN population_register_key = ? THEN population_register_name
            ELSE NULL
          END as original_name
        FROM certification_applications 
        WHERE photo_key = ? OR judicial_record_key = ? OR population_register_key = ?
        LIMIT 1
      `).bind(fileKey, fileKey, fileKey, fileKey, fileKey, fileKey).first();
      
      originalFileName = dbResult?.original_name;
    } catch (dbError) {
      console.error('Database query error:', dbError);
      // Continue with fallback filename
    }
    
    // Get file from R2
    const object = await env.CERT_IMAGES_PDFS.get(fileKey);
    
    if (!object) {
      return new Response('File not found', { status: 404 });
    }

    // Use original filename if available, otherwise use key filename
    const filename = originalFileName || fileKey.split('/').pop();

    // Return file with appropriate headers
    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, max-age=3600'
      }
    });

  } catch (error) {
    console.error('File download error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}