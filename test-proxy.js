const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use(createProxyMiddleware({
  target: 'http://example.com',
  changeOrigin: true,
  pathFilter: '/api/auth'
}));

app.listen(9999, () => {
  console.log('Test proxy listening at 9999');
});
