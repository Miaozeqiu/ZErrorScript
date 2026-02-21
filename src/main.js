import { createApp } from 'vue'
import App from './App.vue'
import css from './style.css?inline'

// 暴露跨域请求接口供网页使用
if (typeof unsafeWindow !== 'undefined') {
  const extractContentType = (headers) => {
    if (!headers) return ''
    const match = /content-type:\s*([^\r\n]+)/i.exec(headers)
    return match ? match[1].trim() : ''
  }

  const arrayBufferToBase64 = (buffer) => {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < bytes.byteLength; i += 1) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  unsafeWindow.ZErrorScript = {
    request: (options) => {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: options.method || 'GET',
          url: options.url,
          headers: options.headers,
          data: options.data,
          responseType: options.responseType,
          onload: (response) => {
            const contentType = extractContentType(response.responseHeaders) || options.contentType || ''
            let base64 = ''
            if (options.responseType === 'arraybuffer') {
              if (response.response instanceof ArrayBuffer) {
                base64 = arrayBufferToBase64(response.response)
              } else if (typeof response.response === 'string') {
                base64 = response.response
              }
            }
            resolve({
              status: response.status,
              statusText: response.statusText,
              headers: response.responseHeaders,
              responseText: response.responseText,
              finalUrl: response.finalUrl,
              contentType: contentType,
              base64: base64
            })
          },
          onerror: (error) => {
            reject(error)
          },
          ontimeout: () => {
            reject(new Error('Timeout'))
          }
        })
      })
    }
  }
}

// 跨帧通信：Iframe 检测到 activeId 后通知 Top Frame
if (window.top !== window.self) {
  const checkActiveId = () => {
    try {
      const match = window.location.href.match(/[?&]activeId=(\d+)/i);
      if (match) {
        window.top.postMessage({
          type: 'ZERROR_ACTIVE_ID',
          activeId: match[1]
        }, '*');
      }
    } catch (e) {
      // ignore
    }
  }
  
  checkActiveId();
  // 监听 URL 变化 (针对 SPA)
  window.addEventListener('popstate', checkActiveId);
  window.addEventListener('hashchange', checkActiveId);
  // 也可以简单轮询
  setInterval(checkActiveId, 2000);
}

const styleTag = document.createElement('style')
styleTag.textContent = css
document.head.appendChild(styleTag)

const mountApp = () => {
  // zerror.cc 页面只提供接口，不渲染窗口
  if (window.location.hostname.includes('zerror.cc')) {
    return
  }

  if (window.top !== window.self) {
    return
  }
  const existing = document.getElementById('zerror-window-root')
  if (!existing) {
    const root = document.createElement('div')
    root.id = 'zerror-window-root'
    document.body.appendChild(root)
  }

  const app = createApp(App)
  app.mount('#zerror-window-root')
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp)
} else {
  mountApp()
}
