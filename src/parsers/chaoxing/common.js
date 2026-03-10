/**
 * 学习通解析器公共工具模块
 * 供 chapter.js / homework.js / exam_review.js / examing.js 共用
 */

// 规范化 URL（内部使用）
const normalizeUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('//')) return window.location.protocol + url;
  if (url.startsWith('/')) return window.location.origin + url;
  return url;
};

// 提取内容并保留图片 URL 及音频引用（支持跨文档/iframe）
export const extractContentWithImages = (element) => {
  if (!element) return '';
  const clone = element.cloneNode(true);
  const doc = element.ownerDocument || document;

  // 音频 iframe → [音频:filename]
  clone.querySelectorAll('iframe.ans-insertaudio-module, iframe[module="_insertaudio"]').forEach(iframe => {
    const filename = iframe.getAttribute('filename') || iframe.getAttribute('name') || '';
    const objectId = iframe.getAttribute('data') || '';
    const label = filename || objectId || '音频';
    iframe.parentNode.replaceChild(doc.createTextNode(`[音频:${label}]`), iframe);
  });

  // 图片 → URL 文本
  clone.querySelectorAll('img').forEach(img => {
    const src = normalizeUrl(img.getAttribute('src') || '');
    if (src) img.parentNode.replaceChild(doc.createTextNode(src), img);
  });

  return clone.innerText.trim();
};

// 规范化填空题答案（多空用 ### 连接，去掉题号前缀，不误删纯数字答案）
export const normalizeFillBlankAnswer = (value) => {
  if (!value) return value;
  const raw = String(value).replace(/\u00a0/g, ' ').trim();
  const parts = raw
    .split(/\r?\n+/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => part
      .replace(/^正确答案[:：]\s*/, '')
      .replace(/^\s*(?:\(\d+\)|（\d+）|\d+[\.,、])\s*/, '')
      .trim())
    .filter(Boolean);
  if (parts.length > 0) return parts.join('###');
  return raw.replace(/^正确答案[:：]\s*/, '').trim();
};

// 注入公共样式
export const injectStyles = (styleId, doc = document) => {
  if (doc.getElementById(styleId)) return;
  const style = doc.createElement('style');
  style.id = styleId;
  style.textContent = `
    .zerror-xxt-parser-marker {
      display: inline-block;
      margin-left: 10px;
      padding: 4px 8px;
      background-color: #e0f2fe;
      color: #0284c7;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      border: 1px solid #bae6fd;
    }
    .zerror-xxt-parser-marker:hover {
      background-color: #bae6fd;
    }
    .zerror-xxt-parser-btn {
      display: inline-block;
      margin-left: 10px;
      padding: 2px 8px;
      background-color: #3b82f6;
      color: #fff;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      border: none;
      transition: background-color 0.2s;
    }
    .zerror-xxt-parser-btn:hover {
      background-color: #2563eb;
    }
    .zerror-xxt-parser-btn:disabled {
      background-color: #94a3b8;
      cursor: not-allowed;
    }
    .zerror-xxt-parser-panel {
      margin-top: 10px;
      padding: 15px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      color: #334155;
      animation: fadeIn 0.3s ease;
    }
    .zerror-xxt-parser-panel h4 {
      margin: 0 0 10px 0;
      color: #0f172a;
      font-size: 15px;
      font-weight: 600;
    }
    .zerror-xxt-parser-item {
      margin-bottom: 8px;
      line-height: 1.5;
    }
    .zerror-xxt-parser-label {
      font-weight: 600;
      color: #64748b;
      margin-right: 5px;
    }
    .zerror-xxt-parser-options li {
      margin-bottom: 4px;
      padding: 4px 8px;
      background: #fff;
      border-radius: 4px;
      border: 1px solid #f1f5f9;
    }
    .zerror-xxt-parser-answer {
      color: #16a34a;
      font-weight: bold;
      background: #dcfce7;
      padding: 2px 6px;
      border-radius: 4px;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-5px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  doc.head.appendChild(style);
};

// 添加题目到试卷（统一逻辑）
export const addQuestionToExam = async (data, context) => {
  const { token, courseId, folderId } = context;
  if (!token) {
    alert('请先登录');
    return 'failed';
  }

  // 获取现有题目（查重用），优先使用缓存
  let existingQuestions = context.existingQuestions || [];
  if (existingQuestions.length === 0) {
    try {
      const existingRes = await fetch(`https://campuses.zerror.cc/folders/${folderId}/questions`, {
        headers: { Authorization: token }
      });
      if (existingRes.ok) {
        existingQuestions = (await existingRes.json()) || [];
        context.existingQuestions = existingQuestions;
      }
    } catch (e) {
      console.error('查重失败:', e);
    }
  }

  // 含子题的大题（听力/阅读理解/完形填空等）
  if (data.children && data.children.length > 0) {
    const existingParent = existingQuestions.find(q => q.Content === data.title);

    if (existingParent) {
      // 大题已存在，逐一检查并补充/更新子题
      const existingChildren = existingParent.children || [];
      let anyUpdated = false;

      for (const childData of data.children) {
        const existingChild = existingChildren.find(c => c.Content === childData.title);
        if (!existingChild) {
          try {
            await fetch(`https://campuses.zerror.cc/courses/${courseId}/questions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: token },
              body: JSON.stringify({
                type: childData.type,
                content: childData.title,
                answer: childData.answer === '未找到答案' ? '' : childData.answer,
                options: JSON.stringify(childData.options || []),
                parent_id: existingParent.ID
              })
            });
            anyUpdated = true;
          } catch (e) {
            console.error('上传子题失败:', e);
          }
        } else if (childData.answer && childData.answer !== '未找到答案' && existingChild.Answer !== childData.answer) {
          try {
            const updateRes = await fetch(`https://campuses.zerror.cc/questions/${existingChild.ID}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: token },
              body: JSON.stringify({ answer: childData.answer })
            });
            if (updateRes.ok) {
              existingChild.Answer = childData.answer;
              anyUpdated = true;
            }
          } catch (e) {
            console.error('更新子题答案失败:', e);
          }
        }
      }

      return anyUpdated ? 'updated' : 'duplicate';
    } else {
      // 大题不存在，先创建大题再上传子题
      try {
        const addParentRes = await fetch(`https://campuses.zerror.cc/courses/${courseId}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: token },
          body: JSON.stringify({
            type: data.type,
            content: data.title,
            answer: '',
            options: '[]',
            question_bank_id: parseInt(folderId),
            add_to_top: false
          })
        });

        if (!addParentRes.ok) return 'failed';

        const parentQuestion = await addParentRes.json();
        const parentId = parentQuestion.ID;

        if (context.existingQuestions) {
          context.existingQuestions.push({ Content: data.title, Answer: '', ID: parentId, children: [] });
        }

        for (const childData of data.children) {
          try {
            await fetch(`https://campuses.zerror.cc/courses/${courseId}/questions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: token },
              body: JSON.stringify({
                type: childData.type,
                content: childData.title,
                answer: childData.answer === '未找到答案' ? '' : childData.answer,
                options: JSON.stringify(childData.options || []),
                parent_id: parentId
              })
            });
          } catch (e) {
            console.error('上传子题失败:', e);
          }
        }

        return 'success';
      } catch (e) {
        console.error('上传大题失败:', e);
        return 'error';
      }
    }
  }

  // 普通题目
  const existingQuestion = existingQuestions.find(q => q.Content === data.title);
  if (existingQuestion) {
    if (data.answer && data.answer !== '未找到答案' && existingQuestion.Answer !== data.answer) {
      try {
        console.log(`更新题目 ${existingQuestion.ID} 的答案 ${existingQuestion.Answer} -> ${data.answer}`);
        const updateRes = await fetch(`https://campuses.zerror.cc/questions/${existingQuestion.ID}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: token },
          body: JSON.stringify({
            content: data.title,
            answer: data.answer,
            options: JSON.stringify(data.options || []),
            type: data.type
          })
        });
        if (updateRes.ok) {
          existingQuestion.Answer = data.answer;
          return 'updated';
        } else {
          console.error('更新答案失败:', await updateRes.text());
          return 'update_failed';
        }
      } catch (e) {
        console.error('更新请求异常:', e);
        return 'update_error';
      }
    }
    return 'duplicate';
  }

  // 添加新题目
  try {
    const payload = {
      type: data.type,
      content: data.title,
      answer: data.answer,
      options: JSON.stringify(data.options || []),
      add_to_top: false,
      question_bank_id: parseInt(folderId)
    };
    console.log('正在上传题目:', payload);
    const addRes = await fetch(`https://campuses.zerror.cc/courses/${courseId}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify(payload)
    });
    return addRes.ok ? 'success' : 'failed';
  } catch (e) {
    console.error('添加题目失败:', e);
    return 'error';
  }
};
