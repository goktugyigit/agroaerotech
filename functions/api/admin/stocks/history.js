// Stok Geçmişi API
export async function onRequestGet(context) {
  try {
    const { env, request } = context;
    
    // Session kontrolü
    const cookies = request.headers.get('Cookie') || '';
    const sessionMatch = cookies.match(/adminSession=([^;]+)/);
    
    if (!sessionMatch) {
      return Response.json({ success: false, message: 'Oturum bulunamadı' }, { status: 401 });
    }

    // URL parametrelerinden stock_id al
    const url = new URL(request.url);
    const stockId = url.searchParams.get('stock_id');
    
    if (!stockId) {
      return Response.json({
        success: false,
        error: 'stock_id parametresi gerekli'
      }, { status: 400 });
    }

    const db = env.STOK_DB;
    
    // Stok bilgisini al
    const stock = await db.prepare(`
      SELECT * FROM stocks WHERE id = ?
    `).bind(stockId).first();
    
    if (!stock) {
      return Response.json({
        success: false,
        error: 'Stok bulunamadı'
      }, { status: 404 });
    }
    
    // Stok geçmişini al
    const { results: history } = await db.prepare(`
      SELECT 
        id,
        action,
        field_name,
        old_value,
        new_value,
        quantity_change,
        note,
        changed_by,
        created_at
      FROM stock_history
      WHERE stock_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `).bind(stockId).all();
    
    // Stok hareketlerini de al (eski sistem)
    const { results: movements } = await db.prepare(`
      SELECT 
        id,
        movement_type,
        quantity,
        previous_quantity,
        new_quantity,
        description,
        created_at
      FROM stock_movements
      WHERE stock_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `).bind(stockId).all();
    
    return Response.json({
      success: true,
      data: {
        stock: stock,
        history: history || [],
        movements: movements || []
      }
    });
    
  } catch (error) {
    console.error('Stok geçmişi hatası:', error);
    return Response.json({
      success: false,
      error: error.message || 'Stok geçmişi alınamadı'
    }, { status: 500 });
  }
}

// Stok geçmişi kaydetme fonksiyonu (diğer endpoint'lerden çağrılacak)
export async function logStockHistory(db, stockId, action, data) {
  try {
    await db.prepare(`
      INSERT INTO stock_history (
        stock_id, action, field_name, old_value, new_value, 
        quantity_change, note, changed_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      stockId,
      action,
      data.field_name || null,
      data.old_value || null,
      data.new_value || null,
      data.quantity_change || null,
      data.note || null,
      data.changed_by || 'admin'
    ).run();
  } catch (error) {
    console.error('Stok geçmişi kaydetme hatası:', error);
    // Hata olsa bile ana işlemi engellemez
  }
}
