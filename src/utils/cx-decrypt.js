
import md5 from 'md5';
import Typr from 'typr.js';

// Polyfill for GM_xmlhttpRequest if not available (for fetch fallback)
const request = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (e) {
    console.warn('Fetch failed, trying GM_xmlhttpRequest if available', e);
    if (typeof GM_xmlhttpRequest !== 'undefined') {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'GET',
          url: url,
          responseType: 'json',
          onload: (res) => {
            if (res.status >= 200 && res.status < 300) {
              resolve(res.response);
            } else {
              reject(new Error(`GM_xmlhttpRequest error! status: ${res.status}`));
            }
          },
          onerror: reject
        });
      });
    }
    throw e;
  }
};

async function loadTyprMapping() {
  try {
    console.log('正在加载繁体字库...');
    // 使用 fetch 或者 GM_xmlhttpRequest
    return await request('https://cdn.ocsjs.com/resources/font/table.json');
  } catch (err) {
    console.error('繁体字库加载失败，请刷新页面重试：', String(err));
    return {};
  }
}

const CXAnalyses = {
  /** 检测页面是否使用字体加密 */
  getSecretFont(doc = document) {
    return Array.from(doc.querySelectorAll('.font-cxsecret')).map((font) => {
      // 这里把选项按钮和文字分离，如果不分离的话 .font-cxsecret 元素下面还包含选项按钮时，替换时会把按钮也删除掉导致选项按钮不可用
      const after = font.querySelector('.after');
      return after === null ? font : after;
    });
  }
};

/**
 * 繁体字识别-字典匹配
 * @param {Document} doc - The document to scan
 */
export async function mappingRecognize(doc = document) {
  let typrMapping = {};
  
  try {
    // 尝试从 top 获取缓存
    if (window.top && window.top !== window) {
      try {
        window.top.typrMapping = window.top.typrMapping || (await loadTyprMapping());
        typrMapping = window.top.typrMapping;
      } catch (e) {
        // 跨域或者其他错误，降级到本地加载
        console.warn('Failed to access top window for typrMapping, loading locally', e);
        typrMapping = await loadTyprMapping();
      }
    } else {
      // 当前就是 top 或者同源限制，直接加载
       // 使用 window 全局变量缓存
       window.typrMapping = window.typrMapping || (await loadTyprMapping());
       typrMapping = window.typrMapping;
    }
  } catch (e) {
    typrMapping = await loadTyprMapping();
  }

  /** 判断是否有繁体字 */
  const fontFaceEl = Array.from(doc.head.querySelectorAll('style')).find((style) =>
    style.textContent && style.textContent.includes('font-cxsecret')
  );

  const base64ToUint8Array = (base64) => {
    const data = window.atob(base64);
    const buffer = new Uint8Array(data.length);
    for (let i = 0; i < data.length; ++i) {
      buffer[i] = data.charCodeAt(i);
    }
    return buffer;
  };

  const fontMap = typrMapping;
  if (fontFaceEl && fontMap && Object.keys(fontMap).length > 0) {
    // 解析font-cxsecret字体
    const fontMatch = fontFaceEl.textContent.match(/base64,([\w\W]+?)'/);
    const font = fontMatch ? fontMatch[1] : null;

    if (font) {
      console.log('正在识别繁体字...');

      try {
        const code = Typr.parse(base64ToUint8Array(font));
        if (!code) {
           console.error('Typr parsing failed');
           return;
        }

        // 匹配解密字体
        const match = {};
        for (let i = 19968; i < 40870; i++) {
          // 中文[19968, 40869]
          const Glyph = Typr.U.codeToGlyph(code, i);
          if (!Glyph) continue;
          const path = Typr.U.glyphToPath(code, Glyph);
          const hex = md5(JSON.stringify(path)).slice(24); // 8位即可区分
          if (fontMap[hex]) {
            match[i.toString()] = fontMap[hex];
          }
        }
        
        const fonts = CXAnalyses.getSecretFont(doc);
        // 替换加密字体
        fonts.forEach((el) => {
          let html = el.innerHTML;
          for (const key in match) {
            const word = String.fromCharCode(parseInt(key));
            const value = String.fromCharCode(match[key]);

            // 如果相同，则不需要替换
            if (word === value) {
              continue;
            }

            while (html.indexOf(word) !== -1) {
              html = html.replace(word, value);
            }
          }

          el.innerHTML = html;
          el.classList.remove('font-cxsecret'); // 移除字体加密
        });

        console.log('识别繁体字完成。');
      } catch (e) {
        console.error('Error during font recognition:', e);
      }
    } else {
      console.log('未检测到繁体字数据。');
    }
  } else {
     // console.log('当前页面无加密字体或映射表为空');
  }
}
