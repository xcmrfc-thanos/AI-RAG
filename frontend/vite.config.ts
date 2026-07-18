import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

const gatewayUrl = process.env.AI_RAG_GATEWAY_URL || 'http://localhost:8080'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // sockjs-client 依赖 Node.js global，在浏览器中需要 polyfill
  define: {
    global: 'globalThis',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  optimizeDeps: {
    include: ['echarts', 'echarts-for-react'],
  },
  build: {
    rollupOptions: {
      output: {
        /** 将文档处理大依赖拆为独立 chunk，降低首屏与路由公共包体积。 */
        manualChunks(id) {
          if (id.includes('node_modules/react-pdf') || id.includes('node_modules/pdfjs-dist')) {
            return 'react-pdf';
          }
          if (id.includes('node_modules/mammoth')) {
            return 'mammoth';
          }
          if (id.includes('node_modules/xlsx')) {
            return 'xlsx';
          }
        },
      },
    },
  },
  server: {
    port: 3002,
    host: true,
    proxy: {
      '/api': {
        target: gatewayUrl,
        changeOrigin: true,
        secure: false,
        // 确保正确的请求头转发
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // 记录代理请求
            console.log('🔄 Proxying:', req.method, req.url, '->', options.target + proxyReq.path);
            console.log('🔄 Request Headers:', JSON.stringify(proxyReq.getHeaders(), null, 2));

            // 确保Origin和Referer头正确设置
            proxyReq.setHeader('Origin', gatewayUrl);
            proxyReq.setHeader('Referer', `${gatewayUrl}/`);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('✅ Proxy response:', proxyRes.statusCode, req.url);
            console.log('✅ Response Headers:', JSON.stringify(proxyRes.headers, null, 2));

            // 确保CORS头正确返回
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS';
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Requested-With,X-CSRF-TOKEN';
          });
          proxy.on('error', (err, _req, _res) => {
            console.error('❌ Proxy error:', err.message);
          });
          proxy.on('proxyReqWs', (_proxyReq, req, _socket, _options, _head) => {
            console.log('🔄 Proxying WebSocket:', req.url);
          });
        }
      },
      '/ws': {
        target: gatewayUrl,
        ws: true,
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // 转发客户端携带的Authorization头到网关
            const authHeader = req.headers['authorization'];
            if (authHeader) {
              proxyReq.setHeader('Authorization', authHeader);
            }
          });
          proxy.on('error', (err, _req, _res) => {
            console.error('❌ WebSocket proxy error:', err.message);
          });
        }
      }
    }
  }
})
