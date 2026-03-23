const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const Ticket = require('./models/Ticket');

const app = express();
app.use(express.json());

// Veritabanı (MongoDB) Bağlantısı - Ticket Service İçin Bağımsız DB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ticket-db';

mongoose.connect(MONGO_URI)
  .then(() => console.log('[Ticket Service] connected to MongoDB (ticket-db)'))
  .catch((err) => console.error('[Ticket Service] MongoDB connection error:', err));

// ==========================================
// RRM SEVİYE 2 RESTful ENDPOINTLER (Resource: /tickets)
// ==========================================

// POST /api/tickets : Yeni bir bilet oluşturur (Satın alma)
app.post('/api/tickets', async (req, res) => {
  try {
    const { kullanici_id, event_id } = req.body;

    if (!kullanici_id || !event_id) {
      return res.status(400).json({ error: 'Missing required parameters: kullanici_id, event_id' });
    }

    // 1) Olayın (Event) kapasitesi var mı kontrol etmek için Senkron İstek (Axios)
    // URL, Dispatcher'in proxy target configlerinde kullandığı container ismi olan 'event-service'i gösterir.
    const EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL || 'http://event-service:4000';
    let eventResponse;
    
    try {
      eventResponse = await axios.get(`${EVENT_SERVICE_URL}/api/events/${event_id}`);
    } catch (serviceErr) {
      if (serviceErr.response && serviceErr.response.status === 404) {
         return res.status(404).json({ error: 'Event not found in Event Service.' });
      }
      console.error('Event Service connection error:', serviceErr.message);
      return res.status(500).json({ error: 'Failed to communicate with Event Service for capacity check.' });
    }

    const event = eventResponse.data;

    // 2) Kapasite Kontrolü (Business Rule)
    if (!event.capacity || event.capacity <= 0) {
      return res.status(400).json({ error: 'Event capacity is full or invalid.' });
    }

    // 3) Bilet nesnesini yarat (Capacity Update işlemi burada asenkrom bir RabbitMQ mesajıyla event servise ileriki adımlarda bildirilebilir)
    const newTicket = await Ticket.create({ kullanici_id, event_id });

    // 201 Created
    res.status(201).json(newTicket);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// Eğer modül doğrudan çalıştırılıyorsa listener başlat
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`[Ticket Service] listening on port ${PORT}`);
  });
}

// Test vs için export yapıyoruz
module.exports = app;
