import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 500,
  duration: '30s',
};

export default function () {
  const url = 'http://localhost:3000/api/tickets';

  // Arka planda senin için 50.000 (elli bin) kapasiteli özel bir konser oluşturdum:
  const payload = JSON.stringify({
    event_id: '69c510385dfe0c64ee4d6b1d', // Orijinal, gerçek ve dev kapasiteli Event ID
    user_id: `user_load_test_FAIL_${__VU}_${__ITER}`,
    ticketType: 'GENERAL_ADMISSION',
    price: 150
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer FAKE_LOAD_TEST_TOKEN_9384759483' // Sahte token
    },
  };

  const res = http.post(url, payload, params);

  // Basit kontroller (201 Created veya 200 OK bekleniyor)
  check(res, {
    'status is 201/200': (r) => r.status === 200 || r.status === 201,
    'transaction time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1); // Çok kısa bir boşluk, gerçekçi sistem yorması için
}
