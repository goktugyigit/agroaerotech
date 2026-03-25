export async function onRequestGet(context) {
  const { env } = context;

  try {
    console.log('Technical Service GET request received');

    const db = env.TECHNICAL_SERVICE_DB || env.DB;

    if (!db) {
      console.error('Database not found in env');
      return Response.json({
        success: false,
        error: 'Database binding not found'
      }, { status: 500 });
    }

    // Tüm teknik servis taleplerini getir
    const result = await db.prepare(
      `SELECT * FROM technical_service_requests ORDER BY created_at DESC`
    ).all();

    console.log('Query result:', result);

    return Response.json({
      success: true,
      data: result.results || []
    });

  } catch (error) {
    console.error('Get Technical Service Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;

  try {
    const db = env.TECHNICAL_SERVICE_DB || env.DB;
    const data = await request.json();
    const { id, status, notes } = data;

    if (!id) {
      return Response.json({
        success: false,
        error: 'ID gerekli'
      }, { status: 400 });
    }

    const updated_at = new Date().toISOString();

    const result = await db.prepare(
      `UPDATE technical_service_requests 
       SET status = ?, notes = ?, updated_at = ? 
       WHERE id = ?`
    )
      .bind(status, notes || null, updated_at, id)
      .run();

    if (!result.success) {
      throw new Error('Güncelleme başarısız');
    }

    return Response.json({
      success: true,
      message: 'Talep başarıyla güncellendi'
    });

  } catch (error) {
    console.error('Update Technical Service Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;

  try {
    const db = env.TECHNICAL_SERVICE_DB || env.DB;
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return Response.json({
        success: false,
        error: 'ID gerekli'
      }, { status: 400 });
    }

    const result = await db.prepare(
      `DELETE FROM technical_service_requests WHERE id = ?`
    )
      .bind(id)
      .run();

    if (!result.success) {
      throw new Error('Silme başarısız');
    }

    return Response.json({
      success: true,
      message: 'Talep başarıyla silindi'
    });

  } catch (error) {
    console.error('Delete Technical Service Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
