export async function onRequestGet(context) {
  try {
    const { env } = context;

    // Stok hareketlerini getir
    const { results } = await env.STOK_DB.prepare(`
      SELECT 
        sm.*,
        s.stock_code,
        s.stock_name
      FROM stock_movements sm
      JOIN stocks s ON sm.stock_id = s.id
      WHERE sm.reverted_at IS NULL
      ORDER BY sm.created_at DESC
      LIMIT 100
    `).all();

    return Response.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Hareket geçmişi getirme hatası:', error);
    return Response.json({
      success: false,
      error: 'Hareket geçmişi getirilemedi'
    }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const { env, request } = context;
    const data = await request.json();

    // Mevcut stok miktarını getir
    const stock = await env.STOK_DB.prepare(`
      SELECT current_quantity FROM stocks WHERE id = ?
    `).bind(data.stock_id).first();

    if (!stock) {
      return Response.json({
        success: false,
        error: 'Stok bulunamadı'
      }, { status: 404 });
    }

    const previousQuantity = stock.current_quantity;
    let newQuantity;

    if (data.movement_type === 'add') {
      newQuantity = previousQuantity + data.quantity;
    } else if (data.movement_type === 'remove') {
      if (data.quantity > previousQuantity) {
        return Response.json({
          success: false,
          error: 'Stokta yeterli adet yok'
        }, { status: 400 });
      }
      newQuantity = previousQuantity - data.quantity;
    } else {
      return Response.json({
        success: false,
        error: 'Geçersiz hareket türü'
      }, { status: 400 });
    }

    // Transaction başlat
    const batch = [
      // Stok miktarını güncelle
      env.STOK_DB.prepare(`
        UPDATE stocks 
        SET current_quantity = ?, 
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).bind(newQuantity, data.stock_id),

      // Hareket kaydı ekle
      env.STOK_DB.prepare(`
        INSERT INTO stock_movements (stock_id, movement_type, quantity, previous_quantity, new_quantity, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        data.stock_id,
        data.movement_type,
        data.quantity,
        previousQuantity,
        newQuantity,
        data.description
      )
    ];

    await env.STOK_DB.batch(batch);

    return Response.json({
      success: true,
      message: 'Stok hareketi başarıyla kaydedildi'
    });
  } catch (error) {
    console.error('Stok hareket hatası:', error);
    return Response.json({
      success: false,
      error: 'Stok hareketi kaydedilemedi'
    }, { status: 500 });
  }
}
