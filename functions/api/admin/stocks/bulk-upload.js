// Toplu Stok Yükleme API
export async function onRequestPost(context) {
  try {
    const { env, request } = context;
    
    // Session kontrolü
    const cookies = request.headers.get('Cookie') || '';
    const sessionMatch = cookies.match(/adminSession=([^;]+)/);
    
    if (!sessionMatch) {
      return Response.json({ success: false, message: 'Oturum bulunamadı' }, { status: 401 });
    }

    const data = await request.json();
    const { stocks } = data;

    if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
      return Response.json({
        success: false,
        error: 'Geçerli stok verisi bulunamadı'
      }, { status: 400 });
    }

    if (stocks.length > 1000) {
      return Response.json({
        success: false,
        error: 'Maksimum 1000 stok yüklenebilir'
      }, { status: 400 });
    }

    const db = env.STOK_DB;
    let added = 0;
    let updated = 0;
    let failed = 0;

    // Her stok için işlem yap
    for (const stock of stocks) {
      try {
        // Validasyon
        if (!stock.stock_code || !stock.stock_name) {
          failed++;
          continue;
        }

        // Stok kodu VE adı eşleşen kayıt var mı kontrol et
        const existing = await db.prepare(`
          SELECT id, stock_name, current_quantity FROM stocks 
          WHERE stock_code = ? AND stock_name = ?
        `).bind(stock.stock_code, stock.stock_name).first();

        if (existing) {
          // Hem stok kodu hem adı eşleşiyor - Başlangıç adetini mevcut stoğa EKLE
          const newQuantity = existing.current_quantity + stock.current_quantity;
          
          await db.prepare(`
            UPDATE stocks 
            SET current_quantity = ?,
                unit_price_usd = ?,
                min_stock_level = ?,
                description = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(
            newQuantity,
            stock.unit_price_usd,
            stock.min_stock_level,
            stock.description,
            existing.id
          ).run();

          // Stok ekleme hareketi kaydet
          if (stock.current_quantity > 0) {
            await db.prepare(`
              INSERT INTO stock_movements (
                stock_id, movement_type, quantity, 
                previous_quantity, new_quantity, description
              )
              VALUES (?, 'add', ?, ?, ?, 'Excel toplu yükleme ile eklendi')
            `).bind(
              existing.id,
              stock.current_quantity,
              existing.current_quantity,
              newQuantity
            ).run();
          }

          updated++;
        } else {
          // Yeni ekle
          const result = await db.prepare(`
            INSERT INTO stocks (
              stock_code, stock_name, current_quantity, 
              unit_price_usd, min_stock_level, description
            )
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            stock.stock_code,
            stock.stock_name,
            stock.current_quantity,
            stock.unit_price_usd,
            stock.min_stock_level,
            stock.description
          ).run();

          // İlk stok hareketi
          if (stock.current_quantity > 0) {
            await db.prepare(`
              INSERT INTO stock_movements (
                stock_id, movement_type, quantity, 
                previous_quantity, new_quantity, description
              )
              VALUES (?, 'initial', ?, 0, ?, 'Excel toplu yükleme ile eklendi')
            `).bind(
              result.meta.last_row_id,
              stock.current_quantity,
              stock.current_quantity
            ).run();
          }

          added++;
        }
      } catch (error) {
        console.error('Stok işleme hatası:', stock.stock_code, error);
        failed++;
      }
    }

    return Response.json({
      success: true,
      message: 'Toplu yükleme tamamlandı',
      data: {
        added,
        updated,
        failed,
        total: stocks.length
      }
    });

  } catch (error) {
    console.error('Toplu yükleme hatası:', error);
    return Response.json({
      success: false,
      error: error.message || 'Toplu yükleme başarısız'
    }, { status: 500 });
  }
}
