import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    open: true,
    proxy: {
      '/api/v1': {
        target: 'https://reservation-xynh.onrender.com',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            console.log(`[Proxying] ${req.method} ${req.url} -> ${options.target}${req.url}`);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Proxy response:', proxyRes);
          });
          proxy.on('proxyError', (proxyErr, req, res) => {
            console.log('Proxy error:', proxyErr);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Proxy error: ' + proxyErr.message);
          });
        }
      },
      '/api/global-chat': {
        target: 'https://ai-reservation.onrender.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace('/api/global-chat', '/api/global-chat'),
        configure: (proxy, options) => {
          proxy.on('error', (err) => {
            console.error('Chatbot proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log(`[Chatbot Proxy] ${req.method} ${req.url} -> ${options.target}${req.url}`);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('Chatbot proxy response:', proxyRes.statusCode);
          });
        }
      }
    }
  }
})
