const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

const server = http.createServer((req, res) => {
  const timestamp = new Date().toLocaleTimeString('zh-CN');
  console.log(`[${timestamp}] ${req.method} ${req.url}`);

  // 剥离查询参数，用于文件路径解析
  const cleanUrl = req.url.split('?')[0];
  let filePath = '.' + cleanUrl;
  if (filePath === './') {
    filePath = './index.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        console.log(`[${timestamp}] ❌ 404: ${filePath}`);
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 - 页面未找到</h1><p>请返回 <a href="/">首页</a></p>', 'utf-8');
      } else {
        console.log(`[${timestamp}] ❌ 服务器错误: ${error.code}`);
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>服务器错误</h1><p>请稍后重试</p>', 'utf-8');
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(content, 'utf-8');
    }
  });
});

server.on('error', (error) => {
  const timestamp = new Date().toLocaleTimeString('zh-CN');
  if (error.code === 'EADDRINUSE') {
    console.log(`[${timestamp}] ❌ 端口 ${PORT} 已被占用`);
    console.log(`[${timestamp}] 💡 请关闭占用该端口的程序，或修改 server.js 中的端口号`);
    process.exit(1);
  } else {
    console.log(`[${timestamp}] ❌ 服务器错误:`, error);
  }
});

server.listen(PORT, () => {
  const timestamp = new Date().toLocaleTimeString('zh-CN');
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║       🎉 初中英语7年级下册学习平台 - 服务器已启动        ║');
  console.log('║                                                            ║');
  console.log(`║       🌐 访问地址: http://localhost:${PORT}                ║`);
  console.log('║                                                            ║');
  console.log('║       ⏹️  按 Ctrl+C 停止服务器                           ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`[${timestamp}] ✅ 服务器就绪，等待请求...`);
  console.log('');
});

process.on('SIGINT', () => {
  const timestamp = new Date().toLocaleTimeString('zh-CN');
  console.log('');
  console.log(`[${timestamp}] 👋 正在关闭服务器...`);
  server.close(() => {
    console.log(`[${timestamp}] ✅ 服务器已安全关闭`);
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  const timestamp = new Date().toLocaleTimeString('zh-CN');
  console.error(`[${timestamp}] ❌ 未捕获的异常:`, error);
  console.log(`[${timestamp}] 🔄 尝试继续运行...`);
});
