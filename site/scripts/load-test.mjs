import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8080';

const ROUTES = ['/', '/posts/infrastructure-as-code', '/writing/tags'];

export const options = {
  stages: [
    { duration: '30s', target: 1 },
    { duration: '1m', target: 3 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const path = ROUTES[__ITER % ROUTES.length];
  const res = http.get(`${BASE_URL}${path}`);
  check(res, {
    'status 200': (r) => r.status === 200,
  });
}
