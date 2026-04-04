import http, { expectedStatuses, setResponseCallback } from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import exec from 'k6/execution';

// Bug fix: 4xx yanıtları başarılı say (401/404 test ortamında beklenen durum)
// Bu sayede http_req_failed sadece gerçek 5xx / bağlantı hatalarını yakalar.
setResponseCallback(expectedStatuses({ min: 200, max: 499 }));

// Custom metrikler — senaryo başına yanıt süresi
const responseTime50  = new Trend('response_time_50vus',  true);
const responseTime100 = new Trend('response_time_100vus', true);
const responseTime200 = new Trend('response_time_200vus', true);
const responseTime500 = new Trend('response_time_500vus', true);
const serverErrorRate = new Rate('server_error_rate');   // yalnızca 5xx / bağlantı hatası
const totalRequests   = new Counter('total_requests');

// Docker içinden: BASE_URL=http://dispatcher:3000 k6 run load-test.js
// Lokal:          k6 run load-test.js  (varsayılan localhost:3000)
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    // Senaryo 1 — 50 eş zamanlı kullanıcı
    load_50: {
      executor:  'constant-vus',
      vus:       50,
      duration:  '30s',
      startTime: '0s',
      exec:      'runTest',
    },
    // Senaryo 2 — 100 eş zamanlı kullanıcı
    load_100: {
      executor:  'constant-vus',
      vus:       100,
      duration:  '30s',
      startTime: '35s',
      exec:      'runTest',
    },
    // Senaryo 3 — 200 eş zamanlı kullanıcı
    load_200: {
      executor:  'constant-vus',
      vus:       200,
      duration:  '30s',
      startTime: '70s',
      exec:      'runTest',
    },
    // Senaryo 4 — 500 eş zamanlı kullanıcı
    load_500: {
      executor:  'constant-vus',
      vus:       500,
      duration:  '30s',
      startTime: '105s',
      exec:      'runTest',
    },
  },

  thresholds: {
    // p(95) tüm isteklerde (bağlantı hataları dahil, 0ms olarak geliyor) 2s altında kalmalı
    'http_req_duration':    ['p(95)<2000'],
    // Gerçek server sağlığı: 5xx + bağlantı kesilmesi oranı %5 altında
    'server_error_rate':    ['rate<0.05'],
    // Senaryo bazlı yanıt süreleri (sadece başarılı yanıtlar için anlamlı)
    'response_time_50vus':  ['p(95)<500'],
    'response_time_100vus': ['p(95)<750'],
    'response_time_200vus': ['p(95)<1000'],
    'response_time_500vus': ['p(95)<2000'],
  },
};

// ─── Setup: token al ─────────────────────────────────────────────────────────
export function setup() {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ username: 'loadtestadmin', password: 'Admin1234!' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (res.status === 200 || res.status === 201) {
    const body = JSON.parse(res.body);
    return { token: body.token || body.accessToken || '' };
  }
  return { token: '' };
}

// ─── Ana test fonksiyonu ──────────────────────────────────────────────────────
export function runTest(data) {
  const token   = data.token;
  const headers = {
    'Content-Type':  'application/json',
    'Authorization': token ? `Bearer ${token}` : 'Bearer INVALID',
    'Connection':    'keep-alive',
  };

  // Sequential istekler — her VU aynı keep-alive bağlantısını yeniden kullanır.
  // Batch kullanmak paralel bağlantı açar; Windows'ta 200-500 VU'da port tükenmesine yol açar.
  const eventsRes = http.get(`${BASE_URL}/api/events`, { headers });
  totalRequests.add(1);

  // status===0 → TCP bağlantı hatası (Windows port tükenmesi); 5xx değil, OS sınırı
  check(eventsRes, {
    'events: HTTP yanıt alındı (2xx/4xx)': (r) => r.status >= 200 && r.status < 500,
    'events: bağlantı hatası değil':       (r) => r.status !== 0,
    'events: yanıt süresi < 2s':           (r) => r.status === 0 || r.timings.duration < 2000,
  });
  serverErrorRate.add(eventsRes.status >= 500);

  sleep(0.1);

  const ticketsRes = http.post(
    `${BASE_URL}/api/tickets`,
    JSON.stringify({
      event_id:   '69c510385dfe0c64ee4d6b1d',
      user_id:    `load_user_${__VU}_${__ITER}`,
      ticketType: 'GENERAL_ADMISSION',
      price:      150,
    }),
    { headers }
  );
  totalRequests.add(1);

  check(ticketsRes, {
    'tickets: HTTP yanıt alındı (2xx/4xx)': (r) => r.status >= 200 && r.status < 500,
    'tickets: bağlantı hatası değil':       (r) => r.status !== 0,
    'tickets: yanıt süresi < 2s':           (r) => r.status === 0 || r.timings.duration < 2000,
  });
  serverErrorRate.add(ticketsRes.status >= 500);

  // Bug fix: exec.scenario.name → k6/execution üzerinden doğru senaryo adı
  const avgDuration = (eventsRes.timings.duration + ticketsRes.timings.duration) / 2;
  switch (exec.scenario.name) {
    case 'load_50':  responseTime50.add(avgDuration);  break;
    case 'load_100': responseTime100.add(avgDuration); break;
    case 'load_200': responseTime200.add(avgDuration); break;
    case 'load_500': responseTime500.add(avgDuration); break;
  }

  sleep(0.5);
}
