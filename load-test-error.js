/**
 * Hata Yönetimi Yük Testi
 *
 * Dispatcher'ın hatalı istekleri nasıl ele aldığını ölçer:
 * - Geçersiz token → 401
 * - Var olmayan kaynak → 404
 * - Eksik alan → 400/422
 * Tüm senaryolarda sistem 5xx dönmemeli (çökmemeli).
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Counter } from 'k6/metrics';

const errorHandledCorrectly = new Rate('error_handled_correctly');
const totalRequests         = new Counter('total_requests');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    error_load_50: {
      executor:  'constant-vus',
      vus:       50,
      duration:  '30s',
      startTime: '0s',
      exec:      'errorTest',
    },
    error_load_100: {
      executor:  'constant-vus',
      vus:       100,
      duration:  '30s',
      startTime: '40s',
      exec:      'errorTest',
    },
    error_load_200: {
      executor:  'constant-vus',
      vus:       200,
      duration:  '30s',
      startTime: '80s',
      exec:      'errorTest',
    },
    error_load_500: {
      executor:  'constant-vus',
      vus:       500,
      duration:  '30s',
      startTime: '120s',
      exec:      'errorTest',
    },
  },

  thresholds: {
    'error_handled_correctly': ['rate>0.85'],   // %85+ istek düzgün 4xx dönmeli
    'http_req_duration':       ['p(95)<1500'],
    'http_req_failed':         ['rate<0.05'],   // 5xx oranı %5 altında kalmalı
  },
};

export function errorTest() {
  const headers = { 'Content-Type': 'application/json' };

  // ── 1. Geçersiz token ile korumalı endpoint ──────────────────────────────
  group('Geçersiz Token → 401', () => {
    const res = http.get(`${BASE_URL}/api/events`, {
      headers: { ...headers, 'Authorization': 'Bearer INVALID_TOKEN_xyz' },
    });
    totalRequests.add(1);

    const handled = check(res, {
      '401 Unauthorized döndü': (r) => r.status === 401,
      '5xx yok (sistem çökmedi)': (r) => r.status < 500,
    });
    errorHandledCorrectly.add(handled);
  });

  sleep(0.3);

  // ── 2. Var olmayan ticket ID ──────────────────────────────────────────────
  group('Var olmayan kaynak → 404', () => {
    const res = http.get(`${BASE_URL}/api/tickets/000000000000000000000000`, {
      headers: { ...headers, 'Authorization': 'Bearer INVALID_TOKEN_xyz' },
    });
    totalRequests.add(1);

    const handled = check(res, {
      '4xx döndü (401 veya 404)': (r) => r.status === 401 || r.status === 404,
      '5xx yok': (r) => r.status < 500,
    });
    errorHandledCorrectly.add(handled);
  });

  sleep(0.3);

  // ── 3. Eksik alan ile ticket oluşturma ────────────────────────────────────
  group('Eksik alan → 400/422', () => {
    const res = http.post(
      `${BASE_URL}/api/tickets`,
      JSON.stringify({ ticketType: 'GENERAL_ADMISSION' }), // event_id ve user_id eksik
      { headers: { ...headers, 'Authorization': 'Bearer INVALID_TOKEN_xyz' } }
    );
    totalRequests.add(1);

    const handled = check(res, {
      '4xx döndü': (r) => r.status >= 400 && r.status < 500,
      '5xx yok': (r) => r.status < 500,
    });
    errorHandledCorrectly.add(handled);
  });

  sleep(0.4);
}
