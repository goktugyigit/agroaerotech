// Admin Activity Logs API
export async function onRequestGet({ request, env }) {
  try {
    // Session kontrolü
    const cookies = request.headers.get('Cookie') || '';
    const sessionMatch = cookies.match(/adminSession=([^;]+)/);
    
    if (!sessionMatch) {
      return Response.json({ success: false, message: 'Oturum bulunamadı' }, { status: 401 });
    }

    const db = env.DB;
    
    // URL parametrelerini al
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const action = url.searchParams.get('action'); // 'login', 'logout', etc.
    
    // Query oluştur
    let query = `
      SELECT 
        id,
        username,
        action,
        resource,
        resource_id,
        ip_address,
        user_agent,
        details,
        created_at
      FROM admin_activity_logs
    `;
    
    const params = [];
    
    if (action) {
      query += ' WHERE action = ?';
      params.push(action);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    
    const stmt = db.prepare(query);
    const result = await stmt.bind(...params).all();
    
    return Response.json({
      success: true,
      data: result.results || []
    });
    
  } catch (error) {
    console.error('Activity logs hatası:', error);
    return Response.json({
      success: false,
      error: error.message || 'Activity logs alınamadı'
    }, { status: 500 });
  }
}
