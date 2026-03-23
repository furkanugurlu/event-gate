const express = require('express');
const mongoose = require('mongoose');
const Event = require('./models/Event');

const app = express();
app.use(express.json());

// Veritabanı (MongoDB) Bağlantısı
// Mikroservis izolasyonunda (Docker vs) environment'den çekeceğiz.
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/event-db';

mongoose.connect(MONGO_URI)
  .then(() => console.log('[Event Service] connected to MongoDB (event-db)'))
  .catch((err) => console.error('[Event Service] MongoDB connection error:', err));

// ==========================================
// RRM SEVİYE 2 RESTful ENDPOINTLER (Resource: /events)
// ==========================================

// GET /api/events : Tüm event'leri listeler
app.get('/api/events', async (req, res) => {
  try {
    const events = await Event.find({});
    // 200 OK
    res.status(200).json(events);
  } catch (error) {
    // 500 Internal Server Error
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Server error while fetching content' });
  }
});

// POST /api/events : Yeni event oluşturur
app.post('/api/events', async (req, res) => {
  try {
    const { name, date, capacity } = req.body;

    // Şema validasyon öncesi manuel 400 Bad Request durumu kontrolü (isteğe bağlı)
    if (!name || !date || !capacity) {
      return res.status(400).json({ error: 'Missing required parameters: name, date, capacity' });
    }

    const newEvent = await Event.create({ name, date, capacity });
    // 201 Created
    res.status(201).json(newEvent);
  } catch (error) {
    // MongoDB validasyonunda veya body/casting hatalarında 400 Bad Request
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    // Diğer sunucu tabanlı hatalar 500
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// DELETE /api/events/:id : Spesifik bir id'deki event'i siler
app.delete('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Önce o kaynağın gerçekten var olup olmadığını kontrol ediyoruz, yoksa 404 döner.
    const deletedEvent = await Event.findByIdAndDelete(id);

    if (!deletedEvent) {
      // 404 Not Found (kaynak zaten yok/bulunamadı)
      return res.status(404).json({ error: `Event with id ${id} not found` });
    }

    // 204 No Content (silme işlemi başarıyla tamamlandı, body dahil edilmez)
    // JSON response body si döndürülmek isteniyorsa 200 döner, fakat standart restful yaklaşımlarda silme sonrası body boş 204 gönderilmesi yaygındır.
    res.status(204).send();
  } catch (error) {
    // ID formati hatalıysa (Örn: 12 karakterlik ObjectId yerine baska bir sey)
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Eğer modül doğrudan çalıştırılıyorsa listener başlat 
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`[Event Service] listening on port ${PORT}`);
  });
}

// Test vs için export yapıyoruz
module.exports = app;
