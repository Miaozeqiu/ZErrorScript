import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    minify: false, // 禁用压缩以增加代码可读性
    lib: {
      entry: resolve(__dirname, 'src/main.js'),
      name: 'BilibiliTampermonkey',
      fileName: 'bilibili-window',
      formats: ['iife']
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
        format: 'iife',
        entryFileNames: 'bilibili-window.user.js',
        banner: `// ==UserScript==
// @name         ZError题库上传脚本
// @namespace    http://tampermonkey.net/
// @version      1.0.3
// @description  ZError题库上传脚本，支持学习通章节测验和作业，nooc作业与检测题目解析与上传
// @author       ZError
// @match        *://*.chaoxing.com/*
// @match        *://*.icourse163.org/*
// @match        *://*.zerror.cc/*
// @match        *://*.zyk.icve.com.cn/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        unsafeWindow
// @connect      scriptcat.org
// @connect      app.zaizhexue.top
// @connect      campuses.zerror.cc
// @connect      tiku.zerror.cc
// @connect      api.doubanflix.com
// @connect      mooc1-api.chaoxing.com
// @connect      p.ananas.chaoxing.com
// @run-at       document-start
// @license      MIT
// @icon         https://cdn.zerror.cc/images/ZError_32x32.ico
// ==/UserScript==

(function() {
'use strict';`,
        footer: '})();'
      }
    },
    outDir: 'dist',
    emptyOutDir: true
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  }
})
