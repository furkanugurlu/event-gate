import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 500,
  duration: '30s',
};

export default function () {
  const url = 'http://localhost:3000/api/tickets';

  // Hata Üretmek İçin SİSTEMDE OLMAYAN UYDURMA Event ID:
  const payload = JSON.stringify({
    event_id: '65f123cde456def789012345',
    user_id: `user_load_test_FAIL_${__VU}_${__ITER}`,
    ticketType: 'GENERAL_ADMISSION',
    price: 150
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer FAKE_LOAD_TEST_TOKEN_9384759483'
    },
  };

  const res = http.post(url, payload, params);

  // Bu testte özellikle 404 (Not Found) veya 4xx (Bad Request) kodu bekliyoruz.
  // Çıktıda başarılı görünmesi için r.status >= 400 kontrol ediyoruz (yani sistemin çökmeyip uygun HTTP hatası dönmesi).
  check(res, {
    'Sistem çökmedi (4xx Beklenen Hata Döndü)': (r) => r.status >= 400 && r.status < 500,
    'Hızlı Yanıt Süresi (< 500ms)': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
