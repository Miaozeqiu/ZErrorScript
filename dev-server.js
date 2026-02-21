import { watch } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { fileURLToPath } from 'url'
import http from 'http'
import https from 'https'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { networkInterfaces } from 'os'
import { URL } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const execAsync = promisify(exec)

class DevServer {
  constructor() {
    this.isBuilding = false
    this.buildQueue = []
    this.server = null
    this.port = process.env.PORT || 3001
    this.storePath = path.join(__dirname, 'dev-server-storage.json')
    this.loginStore = this.loadStore()
  }

  loadStore() {
    if (existsSync(this.storePath)) {
      try {
        const content = readFileSync(this.storePath, 'utf8')
        return JSON.parse(content)
      } catch (error) {
        console.error('⚠️ 读取存储文件失败:', error.message)
      }
    }
    return { token: '', user: null }
  }

  saveStore() {
    try {
      writeFileSync(this.storePath, JSON.stringify(this.loginStore, null, 2))
    } catch (error) {
      console.error('❌ 保存存储文件失败:', error.message)
    }
  }

  async build() {
    if (this.isBuilding) {
      this.buildQueue.push(true)
      return
    }

    this.isBuilding = true
    console.log('🔨 开始构建...')
    
    try {
      // 1. 运行 Vite 构建 (只运行 npm run build，不运行 repack.py)
      const { stdout, stderr } = await execAsync('npm run build')
      if (stderr && !stderr.includes('warning') && !stderr.includes('dist/bilibili-window.user.js')) {
        // Vite 输出可能会在 stderr 中显示构建信息，不一定是错误
        // console.error('❌ 构建警告/错误:', stderr)
      }
      
      // 2. 执行内置的 Repack 逻辑
      if (this.repack()) {
        console.log('✅ 构建与打包完成!')
        console.log('📁 输出文件: dist/bilibili-window.user.js')
        console.log('📦 打包文件: bilibili-window-packed.user.js')
        console.log('🔄 请在Tampermonkey中重新加载脚本')
      } else {
        console.error('❌ 打包失败')
      }

    } catch (error) {
      console.error('❌ 构建失败:', error.message)
    }

    this.isBuilding = false

    // 处理队列中的构建请求
    if (this.buildQueue.length > 0) {
      this.buildQueue = []
      setTimeout(() => this.build(), 100)
    }
  }

  repack() {
    try {
      console.log('📦 开始打包...')
      const distDir = path.join(__dirname, 'dist')
      const jsFile = path.join(distDir, 'bilibili-window.user.js')
      const cssFile = path.join(distDir, 'style.css')
      const outputFile = path.join(__dirname, 'bilibili-window-packed.user.js')
      const viteConfigPath = path.join(__dirname, 'vite.config.js')

      if (!existsSync(jsFile)) {
        console.error(`❌ JS文件不存在: ${jsFile}`)
        return false
      }

      let jsContent = readFileSync(jsFile, 'utf8')
      let cssContent = ''
      if (existsSync(cssFile)) {
        cssContent = readFileSync(cssFile, 'utf8')
      } else {
        console.log('⚠️ 未找到CSS文件，将仅处理JS')
      }

      // 1. 提取 Header
      let header = ''
      const headerMatch = jsContent.match(/(\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==)/)
      if (headerMatch) {
        header = headerMatch[1]
      } else {
        console.log('⚠️ JS中未找到Header，尝试从vite.config.js提取')
        if (existsSync(viteConfigPath)) {
          const configContent = readFileSync(viteConfigPath, 'utf8')
          const configMatch = configContent.match(/banner:\s*`(\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==)/)
          if (configMatch) {
            header = configMatch[1]
          }
        }
      }

      if (!header) {
        console.warn('⚠️ 警告: 未能找到 UserScript Header')
      }

      // 2. 移除 JS 中的 Header (避免重复)
      jsContent = jsContent.replace(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\s*/, '')

      // 3. 注入 CSS
      let finalJsContent = jsContent
      if (cssContent) {
        const cssEscaped = cssContent
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`')
          .replace(/\$\{/g, '\\${')
        
        const cssInjection = `
// 注入CSS样式
(function() {
    const style = document.createElement('style');
    style.textContent = \`${cssEscaped}\`;
    document.head.appendChild(style);
})();
`
        // 插入到 JS 开头 (在 strict mode 定义之后，或者直接最前面)
        // 简单起见，插入到最前面，或者寻找合适位置。
        // 原 python 脚本是查找第一个非注释行。这里我们简单直接拼接到头部下方。
        // 如果 jsContent 是 iife，通常以 (function(){... 开始。
        // 为了安全，我们把它放在 header 之后，jsContent 之前。
        // 但 jsContent 可能包含 'use strict'; 等。
        // 我们直接加在 jsContent 最前面即可，因为它是 IIFE 内部或者是全局执行代码。
        // 不过原脚本是插入到 "第一个非注释代码行"。
        // 简单处理：
        finalJsContent = cssInjection + '\n' + jsContent
      }

      // 4. 组合
      const finalContent = (header ? header + '\n' : '') + finalJsContent

      // 5. 写入
      writeFileSync(outputFile, finalContent, 'utf8')
      
      const originalSize = (readFileSync(jsFile).length + (existsSync(cssFile) ? readFileSync(cssFile).length : 0))
      const packedSize = finalContent.length
      console.log(`📊 大小变化: ${originalSize} -> ${packedSize} bytes`)
      
      return true
    } catch (e) {
      console.error('❌ Repack 异常:', e)
      return false
    }
  }

  watchFiles() {
    const srcDir = path.join(__dirname, 'src')
    
    console.log('👀 开始监听文件变化...')
    console.log('📂 监听目录:', srcDir)
    console.log('🚀 修改文件后将自动重新构建')
    console.log('-----------------------------------')

    watch(srcDir, { recursive: true }, (eventType, filename) => {
      if (filename && (filename.endsWith('.vue') || filename.endsWith('.js') || filename.endsWith('.css'))) {
        console.log(`📝 文件变化: ${filename} (${eventType})`)
        this.build()
      }
    })

    // 监听配置文件
    watch(__dirname, (eventType, filename) => {
      if (filename === 'vite.config.js') {
        console.log('⚙️ 配置文件变化，重新构建...')
        this.build()
      }
    })
  }

  getLocalIPs() {
    const interfaces = networkInterfaces()
    const ips = []
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          ips.push(iface.address)
        }
      }
    }
    
    return ips
  }

  createServer() {
    this.server = http.createServer((req, res) => {
      // 设置CORS头
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200)
        res.end()
        return
      }
      
      const url = req.url
      let filePath = ''
      let contentType = 'text/plain'

      if (url === '/api/login' && req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.writeHead(200)
        res.end(JSON.stringify(this.loginStore))
        return
      }

      if (url === '/api/login' && req.method === 'POST') {
        let body = ''
        req.on('data', chunk => {
          body += chunk.toString()
        })
        req.on('end', () => {
          try {
            const data = body ? JSON.parse(body) : {}
            this.loginStore = {
              token: data.token || '',
              user: data.user || null,
            }
            this.saveStore()
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.writeHead(200)
            res.end(JSON.stringify({ ok: true }))
          } catch (error) {
            res.writeHead(400)
            res.end('Invalid JSON')
          }
        })
        return
      }

      if (url === '/api/login/clear' && req.method === 'POST') {
        this.loginStore = { token: '', user: null }
        this.saveStore()
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.writeHead(200)
        res.end(JSON.stringify({ ok: true }))
        return
      }

      if (url === '/api/gm/xhr' && req.method === 'POST') {
        let body = ''
        req.on('data', chunk => {
          body += chunk.toString()
        })
        req.on('end', () => {
          try {
            const options = JSON.parse(body)
            const targetUrl = new URL(options.url)
            const isHttps = targetUrl.protocol === 'https:'
            const client = isHttps ? https : http
            const responseType = options.responseType || 'text'
            
            const reqOptions = {
              method: options.method || 'GET',
              headers: options.headers || {},
              timeout: options.timeout || 30000
            }

            const proxyReq = client.request(targetUrl, reqOptions, (proxyRes) => {
              const responseHeaders = proxyRes.headers
              let responseBody = []
              
              proxyRes.on('data', (chunk) => {
                responseBody.push(chunk)
              })
              
              proxyRes.on('end', () => {
                const buffer = Buffer.concat(responseBody)
                const contentType = responseHeaders['content-type'] || 'application/octet-stream'
                let responseText = ''
                let base64 = ''
                if (responseType === 'arraybuffer' || responseType === 'blob') {
                  base64 = buffer.toString('base64')
                } else {
                  responseText = buffer.toString('utf8')
                }
                
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.writeHead(200)
                res.end(JSON.stringify({
                  status: proxyRes.statusCode,
                  statusText: proxyRes.statusMessage,
                  headers: responseHeaders,
                  contentType: contentType,
                  base64: base64,
                  responseText: responseText,
                  finalUrl: proxyRes.responseUrl || options.url
                }))
              })
            })

            proxyReq.on('error', (e) => {
              console.error('Proxy Error:', e)
              res.writeHead(500)
              res.end(JSON.stringify({ error: e.message }))
            })

            if (options.data) {
              proxyReq.write(options.data)
            }
            
            proxyReq.end()
            
          } catch (error) {
            console.error('GM XHR Proxy Error:', error)
            res.writeHead(400)
            res.end(JSON.stringify({ error: 'Invalid Request: ' + error.message }))
          }
        })
        return
      }
      
      if (url === '/' || url === '/index.html') {
        // 提供一个简单的索引页面
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.writeHead(200)
        res.end(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Tampermonkey Script Server</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #007acc; padding-bottom: 10px; }
        .file-list { list-style: none; padding: 0; }
        .file-list li { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; }
        .file-list a { text-decoration: none; color: #007acc; font-weight: bold; }
        .file-list a:hover { text-decoration: underline; }
        .description { color: #666; font-size: 14px; margin-top: 5px; }
    </style>
    <script>
    // 注入 GM_xmlhttpRequest Polyfill
    window.GM_xmlhttpRequest = function(details) {
        fetch('/api/gm/xhr', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: details.url,
                method: details.method,
                headers: details.headers,
                data: details.data,
                timeout: details.timeout,
                responseType: details.responseType
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                if (details.onerror) details.onerror({ error: data.error });
            } else {
                if (details.onload) details.onload({
                    status: data.status,
                    statusText: data.statusText,
                    responseHeaders: Object.keys(data.headers).map(k => k + ': ' + data.headers[k]).join('\\r\\n'),
                    responseText: data.responseText,
                    response: data.base64 || null,
                    contentType: data.contentType,
                    finalUrl: data.finalUrl
                });
            }
        })
        .catch(err => {
            if (details.onerror) details.onerror(err);
        });
    };
    
    // 兼容 unsafeWindow
    window.unsafeWindow = window;
    
    console.log('✅ GM_xmlhttpRequest Polyfill 已注入');
    </script>
</head>
<body>
    <div class="container">
        <h1>🎯 Tampermonkey Script Server</h1>
        <p>欢迎使用油猴脚本开发服务器！以下是可用的文件：</p>
        <ul class="file-list">
            <li>
                <a href="/dist/bilibili-window.user.js">📁 dist/bilibili-window.user.js</a>
                <div class="description">开发版本的用户脚本</div>
            </li>
            <li>
                <a href="/bilibili-window-packed.user.js">📦 bilibili-window-packed.user.js</a>
                <div class="description">打包后的用户脚本（推荐使用）</div>
            </li>
        </ul>
        <p><strong>使用方法：</strong></p>
        <ol>
            <li>点击上面的链接下载脚本文件</li>
            <li>在Tampermonkey中安装或更新脚本</li>
            <li>访问豆瓣电影页面测试功能</li>
        </ol>
    </div>
</body>
</html>
        `)
        return
      } else if (url === '/dist/bilibili-window.user.js') {
        filePath = path.join(__dirname, 'dist', 'bilibili-window.user.js')
        contentType = 'application/javascript; charset=utf-8'
      } else if (url === '/bilibili-window-packed.user.js') {
        filePath = path.join(__dirname, 'bilibili-window-packed.user.js')
        contentType = 'application/javascript; charset=utf-8'
      } else {
        res.writeHead(404)
        res.end('File not found')
        return
      }
      
      if (existsSync(filePath)) {
        try {
          const content = readFileSync(filePath, 'utf8')
          res.setHeader('Content-Type', contentType)
          res.writeHead(200)
          res.end(content)
        } catch (error) {
          res.writeHead(500)
          res.end('Error reading file: ' + error.message)
        }
      } else {
        res.writeHead(404)
        res.end('File not found')
      }
    })
    
    this.server.listen(this.port, '0.0.0.0', () => {
      const localIPs = this.getLocalIPs()
      console.log('\n🌐 HTTP服务器已启动:')
      console.log(`   本地访问: http://localhost:${this.port}`)
      localIPs.forEach(ip => {
        console.log(`   局域网访问: http://${ip}:${this.port}`)
      })
      console.log('\n📥 可用文件:')
      console.log(`   - http://localhost:${this.port}/dist/bilibili-window.user.js`)
      console.log(`   - http://localhost:${this.port}/bilibili-window-packed.user.js`)
    })
  }

  async start() {
    console.log('🎯 Vue油猴脚本开发服务器启动')
    console.log('================================')
    
    // 初始构建
    await this.build()
    
    // 启动HTTP服务器
    this.createServer()
    
    // 开始监听
    this.watchFiles()
    
    console.log('\n💡 使用提示:')
    console.log('1. 修改 src/ 目录下的文件会自动重新构建')
    console.log('2. 构建完成后，在Tampermonkey中重新加载脚本')
    console.log('3. 通过HTTP服务器下载最新的脚本文件')
    console.log('4. 按 Ctrl+C 停止开发服务器')
    console.log('\n🔗 相关文件:')
    console.log('- 源码目录: src/')
    console.log('- 构建输出: dist/bilibili-window.user.js')
    console.log('- 打包输出: bilibili-window-packed.user.js')
    console.log('- 配置文件: vite.config.js')
  }
}

const devServer = new DevServer()
devServer.start().catch(console.error)

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n👋 正在停止开发服务器...')
  if (devServer.server) {
    devServer.server.close(() => {
      console.log('🌐 HTTP服务器已关闭')
      console.log('👋 开发服务器已停止')
      process.exit(0)
    })
  } else {
    console.log('👋 开发服务器已停止')
    process.exit(0)
  }
})
