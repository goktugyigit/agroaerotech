export async function onRequestPost(context) {
  try {
    const { env, params } = context;
    const movementId = params.id;
    
    // Hareket kaydını getir
    const movement = await env.STOK_DB.prepare(`
      SELECT * FROM stock_movements 
      WHERE id = ? AND reverted_at IS NULL
    `).bind(movementId).first();
    
    if (!movement) {
      return Response.json({
        success: false,
        error: 'Hareket bulunamadı veya zaten geri alınmış'
      }, { status: 404 });
    }
    
    // Mevcut stok miktarını getir
    const stock = await env.STOK_DB.prepare(`
      SELECT current_quantity FROM stocks WHERE id = ?
    `).bind(movement.stock_id).first();
    
    // Geri alma işlemi için yeni miktar hesapla
    // Hareket geri alınırken, önceki miktara dönülür
    const newQuantity = movement.previous_quantity;
    
    if (newQuantity < 0) {
      return Response.json({
        success: false,
        error: 'Geri alma işlemi stok miktarını negatif yapacak'
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
      `).bind(newQuantity, movement.stock_id),
      
      // Hareket kaydını geri alınmış olarak işaretle
      env.STOK_DB.prepare(`
        UPDATE stock_movements 
        SET reverted_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).bind(movementId),
      
      // Geri alma hareket kaydı ekle
      env.STOK_DB.prepare(`
        INSERT INTO stock_movements (stock_id, movement_type, quantity, previous_quantity, new_quantity, description, reverted_by_movement_id)
        VALUES (?, 'correction', ?, ?, ?, ?, ?)
      `).bind(
        movement.stock_id,
        movement.quantity,
        stock.current_quantity,
        newQuantity,
        `Hareket geri alma: ${movement.description}`,
        movementId
      )
    ];
    
    await env.STOK_DB.batch(batch);
    
    return Response.json({
      success: true,
      message: 'Hareket başarıyla geri alındı'
    });
  } catch (error) {
    console.error('Hareket geri alma hatası:', error);
    return Response.json({
      success: false,
      error: 'Hareket geri alınamadı'
    }, { status: 500 });
  }
}
