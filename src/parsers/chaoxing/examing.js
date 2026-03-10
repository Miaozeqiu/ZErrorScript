/**
 * 学习通考试中页面解析器
 * 针对 https://mooc1.chaoxing.com/exam-ans/mooc2/exam/preview 页面
 * 将用户作答内容视为答案
 */

// 注入样式
const injectStyles = () => {
  const styleId = 'zerror-xxt-examing-parser-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
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
  document.head.appendChild(style);
};

// 规范化 URL
const normalizeUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('//')) return window.location.protocol + url;
  if (url.startsWith('/')) return window.location.origin + url;
  return url;
};

// 提取内容并保留图片 URL 及音频引用
const extractContentWithImages = (element) => {
  if (!element) return '';
  const clone = element.cloneNode(true);
  const doc = element.ownerDocument || document;

  // 音频 iframe → [音频:filename]
  clone.querySelectorAll('iframe.ans-insertaudio-module, iframe[module="_insertaudio"]').forEach(iframe => {
    const label = iframe.getAttribute('filename') || iframe.getAttribute('name') || iframe.getAttribute('data') || '音频';
    iframe.parentNode.replaceChild(doc.createTextNode(`[音频:${label}]`), iframe);
  });

  // 图片 → URL 文本
  clone.querySelectorAll('img').forEach(img => {
    const src = normalizeUrl(img.getAttribute('src') || '');
    if (src) img.parentNode.replaceChild(doc.createTextNode(src), img);
  });

  return clone.innerText.trim();
};

const normalizeFillBlankAnswer = (value) => {
  if (!value) return value
  const raw = String(value).replace(/\u00a0/g, ' ').trim()
  const parts = raw
    .split(/\r?\n+/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => part.replace(/^正确答案[:：]\s*/, '').replace(/^((?:\(?\d+\)?|（\d+）|[\d]+[\.、\s]*)+)/, '').trim())
  if (parts.length > 0) return parts.join('###')
  return raw.replace(/^正确答案[:：]\s*/, '').trim()
}

// 解析子题目（考试页 阅读理解/听力题/完形填空）
// 结构 B: .reading_answer  (.reader_answer_tit + .stem_answer .hoverDiv)
// 结构 C: .filling_answer  (.filling_num + .stem_answer .hoverDiv)
const parseSubQuestion = (subEl) => {
  try {
    let type = 'single_choice';
    let title = '未知子题';
    const options = [];

    const readerTit  = subEl.querySelector('.reader_answer_tit');
    const fillingNum = subEl.querySelector('.filling_num');

    if (readerTit) {
      const readType = readerTit.querySelector('.read_type');
      const typeText = readType?.innerText || readType?.textContent || '';
      if (typeText.includes('单选')) type = 'single_choice';
      else if (typeText.includes('多选')) type = 'multiple_choice';
      else if (typeText.includes('判断')) type = 'true_false';
      else if (typeText.includes('填空')) type = 'fill_blank';
      else if (typeText.includes('简答') || typeText.includes('名词解释')) type = 'short_answer';

      const titClone = readerTit.cloneNode(true);
      titClone.querySelector('.read_type')?.remove();
      title = extractContentWithImages(titClone).replace(/^\(\d+\)\s*/, '').trim();

      subEl.querySelectorAll('.stem_answer .hoverDiv .answer_p').forEach(el => {
        options.push(extractContentWithImages(el).trim());
      });

    } else if (fillingNum) {
      type = 'single_choice';
      title = (fillingNum.innerText || fillingNum.textContent || '').trim();

      subEl.querySelectorAll('.stem_answer .hoverDiv .answer_p').forEach(el => {
        options.push(extractContentWithImages(el).trim());
      });
    }

    // 答案：取已选中项（saveSingleSelect / saveMultiSelect 会给 span 加 check_answer 类）
    let answer = '未找到答案';
    const checkedSpans = subEl.querySelectorAll('.stem_answer .check_answer[data]');
    if (checkedSpans.length > 0) {
      answer = Array.from(checkedSpans).map(s => s.getAttribute('data')).join('');
    } else {
      // 回退：尝试 hidden input（answer${parentId}${childUUID}）
      const hiddenInput = subEl.querySelector('input[type="hidden"][id^="answer"]');
      if (hiddenInput?.value) answer = hiddenInput.value;
    }

    return { title, type, options, answer };
  } catch (e) {
    console.error('解析子题失败:', e);
    return null;
  }
};

// 解析单个题目
const parseQuestion = (questionEl) => {
  try {
    const id = questionEl.getAttribute('data') || questionEl.id;

    // ── 题干 ──────────────────────────────────────────────────
    let title = '未知题目';
    const titleEl = questionEl.querySelector('.mark_name .qtContent');
    if (titleEl) {
      title = extractContentWithImages(titleEl);
    } else {
      const markName = questionEl.querySelector('.mark_name');
      if (markName) {
        const clone = markName.cloneNode(true);
        clone.querySelector('.colorShallow')?.remove();
        title = extractContentWithImages(clone);
      }
    }
    title = title.replace(/^\s*\d+[\.\、\s]*/, '').trim();
    // 兼容 (单选题)、(名词解释, 5.0 分) 等各种括号+题型格式
    title = title.replace(/\s*[\(（](单选题|多选题|判断题|填空题|简答题|名词解释|论述题|计算题|阅读理解|听力题|完形填空|完型填空)[^\)）]*[\)）]\s*/g, '').trim();

    // ── 题型 ──────────────────────────────────────────────────
    // 优先用 hidden input typeName（更可靠），回退到 .colorShallow 文本
    const typeInput = questionEl.querySelector('input[name^="typeName"]');
    const typeText  = typeInput?.value || questionEl.querySelector('.mark_name .colorShallow')?.innerText || '';
    let type = 'single_choice';
    if (typeText.includes('单选')) type = 'single_choice';
    else if (typeText.includes('多选')) type = 'multiple_choice';
    else if (typeText.includes('判断')) type = 'true_false';
    else if (typeText.includes('完形') || typeText.includes('完型')) type = 'cloze';
    else if (typeText.includes('填空')) type = 'fill_blank';
    else if (typeText.includes('简答')) type = 'short_answer';
    else if (typeText.includes('论述')) type = 'essay';
    else if (typeText.includes('计算')) type = 'calculation';
    else if (typeText.includes('名词解释')) type = 'definition';
    else if (typeText.includes('阅读')) type = 'reading';
    else if (typeText.includes('听力')) type = 'listening';

    // ── 子题检测（阅读理解/听力题/完形填空）─────────────────
    const subQuestionEls = questionEl.querySelectorAll('.reading_answer, .filling_answer');
    if (subQuestionEls.length > 0) {
      const children = [];
      subQuestionEls.forEach(subEl => {
        const subData = parseSubQuestion(subEl);
        if (subData) children.push(subData);
      });
      return { id, title, type, options: [], answer: '', children };
    }

    // ── 选项（兼容 .answerBg 与 .hoverDiv 两种结构）──────────
    const options = [];
    const optionEls = questionEl.querySelectorAll('.stem_answer .answerBg, .stem_answer .hoverDiv');
    optionEls.forEach(el => {
      const p = el.querySelector('.answer_p');
      options.push(extractContentWithImages(p || el).trim());
    });

    // 答案 - 考试中页面，将已选/已填内容作为答案
    let answer = '未找到答案';

    if (type === 'single_choice' || type === 'multiple_choice' || type === 'true_false') {
        // 查找选中的选项
        // 单选/判断/多选: .check_answer
        const checkedEls = questionEl.querySelectorAll('.check_answer');
        if (checkedEls.length > 0) {
            const checkedValues = Array.from(checkedEls).map(el => {
                const dataVal = el.getAttribute('data'); // A, B, C...
                return dataVal || el.innerText.trim();
            });
            answer = checkedValues.join(''); // 单选/判断通常一个，多选拼接
        } else {
            // 尝试查找 hidden input answer+id
            const answerInput = questionEl.querySelector(`input[name="answer${id}"]`);
            if (answerInput && answerInput.value) {
                answer = answerInput.value;
            }
        }
    } else if (type === 'fill_blank') {
        // 填空题
        // 通常在 iframe 中，或者 .textDIV 中
        // 尝试查找 .tiankong 后的 .divText 中的内容
        const blanks = questionEl.querySelectorAll('.Answer.sub_que_div');
        const blankAnswers = [];
        
        blanks.forEach(blank => {
             const textDiv = blank.querySelector('.textDIV');
             if (textDiv) {
                 // 1. 尝试从 iframe 获取内容
                 const iframe = textDiv.querySelector('iframe');
                 if (iframe) {
                     try {
                         const doc = iframe.contentDocument || iframe.contentWindow.document;
                         if (doc && doc.body) {
                             // 提取纯文本，移除 HTML 标签
                             const text = doc.body.innerText.trim();
                             if (text) {
                                blankAnswers.push(text);
                                return;
                             }
                         }
                     } catch (e) {
                         console.warn('无法直接访问 iframe 内容，尝试其他方式');
                     }
                 }
                 
                 // 2. 尝试从 hidden input 获取 (如 answerEditor...)
                 const editorId = blank.getAttribute('dataid');
                 if (editorId) {
                     // 尝试查找相关的 input/textarea
                     // 常见的有 name="answerEditor9058629651"
                     const input = document.querySelector(`[name="answerEditor${editorId}"]`) || 
                                   document.querySelector(`[name="answer${editorId}"]`);
                     if (input && input.value) {
                         // input.value 可能是 HTML，需要提取纯文本
                         const tempDiv = document.createElement('div');
                         tempDiv.innerHTML = input.value;
                         blankAnswers.push(tempDiv.innerText.trim());
                         return;
                     }
                 }

                 // 3. 尝试直接从 .textDIV 获取 (如果不是 iframe)
                 const content = extractContentWithImages(textDiv);
                 if (content) {
                     blankAnswers.push(content);
                 } else {
                     // 如果都失败了
                     blankAnswers.push('[未填写]');
                 }
             }
        });
        if (blankAnswers.length > 0) {
            answer = blankAnswers.join('###');
        }
    } else if (type === 'short_answer') {
        // 简答题 & 论述题
        // 同填空题，通常是 UEditor
        
        // 1. 尝试从 .textDIV 中的 iframe 获取 (优先直接读取编辑器内容)
        let foundContent = false;
        const textDiv = questionEl.querySelector('.textDIV');
        if (textDiv) {
            const iframe = textDiv.querySelector('iframe');
            if (iframe) {
                try {
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    if (doc && doc.body) {
                        const text = doc.body.innerText.trim();
                        if (text) {
                            answer = text;
                            foundContent = true;
                        }
                    }
                } catch (e) {
                    console.warn('无法直接访问简答/论述题 iframe 内容');
                }
            }
        }

        // 2. 如果没获取到，尝试查找 textarea 或 hidden input
        if (!foundContent) {
            const inputEl = questionEl.querySelector(`textarea[name="answer${id}"]`) || 
                            questionEl.querySelector(`textarea[name="answerEditor${id}"]`) ||
                            questionEl.querySelector(`input[name="answer${id}"]`) ||
                            questionEl.querySelector(`input[name="answerEditor${id}"]`);
            
            if (inputEl && inputEl.value) {
                let rawValue = inputEl.value;
                 // 可能包含 JSON 格式的 answer: [{answer: "..."}]
                 try {
                     const parsed = JSON.parse(rawValue);
                     if (Array.isArray(parsed) && parsed[0] && parsed[0].answer) {
                         rawValue = parsed[0].answer;
                     }
                 } catch {
                     // ignore JSON parse error
                 }
                 
                 // 清理 HTML
                 const tempDiv = document.createElement('div');
                 tempDiv.innerHTML = rawValue;
                 answer = tempDiv.innerText.trim();
                 foundContent = true;
            }
        }

        // 3. 最后尝试直接从 .textDIV 获取文本
        if (!foundContent && textDiv) {
             const content = extractContentWithImages(textDiv);
             if (content) answer = content;
        }
    }

    if (answer === '未找到答案') {
        // 再次尝试通用 hidden input
        const hiddenInput = questionEl.querySelector(`input[name="answer${id}"]`);
        if (hiddenInput) {
            answer = hiddenInput.value;
        }
    }

    // 对于填空题，如果获取到的是编辑器内容标记，尝试规范化
    if (type === 'fill_blank' && answer !== '未找到答案') {
        answer = normalizeFillBlankAnswer(answer)
    }

    return {
      id,
      title,
      type,
      options,
      answer
    };
  } catch (error) {
    console.error('解析题目失败:', error);
    return null;
  }
};

// 添加题目到试卷
const addQuestionToExam = async (data, context) => {
  const { token, courseId, folderId } = context;
  if (!token) {
    alert('请先登录');
    return 'failed';
  }

  // 获取现有题目进行查重
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

  // 含子题的大题（阅读理解/听力题/完形填空）
  if (data.children && data.children.length > 0) {
    const existingParent = existingQuestions.find(q => q.Content === data.title);
    if (existingParent) {
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
          } catch (e) { console.error('上传子题失败:', e); }
        } else if (childData.answer && childData.answer !== '未找到答案' && existingChild.Answer !== childData.answer) {
          try {
            const res = await fetch(`https://campuses.zerror.cc/questions/${existingChild.ID}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: token },
              body: JSON.stringify({ answer: childData.answer })
            });
            if (res.ok) { existingChild.Answer = childData.answer; anyUpdated = true; }
          } catch (e) { console.error('更新子题失败:', e); }
        }
      }
      return anyUpdated ? 'updated' : 'duplicate';
    } else {
      try {
        const parentRes = await fetch(`https://campuses.zerror.cc/courses/${courseId}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: token },
          body: JSON.stringify({
            type: data.type, content: data.title, answer: '',
            options: '[]', question_bank_id: parseInt(folderId), add_to_top: false
          })
        });
        if (!parentRes.ok) return 'failed';
        const { ID: parentId } = await parentRes.json();
        context.existingQuestions?.push({ Content: data.title, Answer: '', ID: parentId, children: [] });
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
          } catch (e) { console.error('上传子题失败:', e); }
        }
        return 'success';
      } catch (e) { console.error('上传大题失败:', e); return 'error'; }
    }
  }

  const existingQuestion = existingQuestions.find(q => q.Content === data.title);
  if (existingQuestion) {
    if (data.answer && data.answer !== '未找到答案' && existingQuestion.Answer !== data.answer) {
      try {
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
        if (updateRes.ok) { existingQuestion.Answer = data.answer; return 'updated'; }
        return 'update_failed';
      } catch (e) { console.error('更新请求异常:', e); return 'update_error'; }
    }
    return 'duplicate';
  }

  // 新题上传
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

// 创建展示面板
const createInfoPanel = (data) => {
  const panel = document.createElement('div');
  panel.className = 'zerror-xxt-parser-panel';

  let optionsHtml = '';
  if (data.options && data.options.length > 0) {
    optionsHtml = `
      <div class="zerror-xxt-parser-item">
        <div class="zerror-xxt-parser-label">选项:</div>
        <ul class="zerror-xxt-parser-options" style="list-style: none; padding: 0;">
          ${data.options.map(opt => `<li>${opt}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  panel.innerHTML = `
    <h4>题目解析结果 (考试中)</h4>
    <div class="zerror-xxt-parser-item">
      <span class="zerror-xxt-parser-label">题干:</span>
      <span>${data.title}</span>
    </div>
    ${optionsHtml}
    <div class="zerror-xxt-parser-item">
      <span class="zerror-xxt-parser-label">提取答案(你的作答):</span>
      <span class="zerror-xxt-parser-answer">${data.answer}</span>
    </div>
  `;
  
  return panel;
};

// 主功能函数
export const initXXTExamingParser = async (context = {}) => {
  console.log('正在初始化学习通考试中解析器...');
  injectStyles();

  // 预先获取试卷题目进行缓存
  if (context.token && context.folderId && !context.existingQuestions) {
    try {
      const existingRes = await fetch(`https://campuses.zerror.cc/folders/${context.folderId}/questions`, {
        headers: { Authorization: context.token }
      });
      if (existingRes.ok) {
        context.existingQuestions = (await existingRes.json()) || [];
      }
    } catch (e) {
      console.error('加载现有题目失败:', e);
      context.existingQuestions = [];
    }
  }

  // 获取题目列表
  // 考试中页面结构: .questionLi
  const questions = document.querySelectorAll('.questionLi');
  console.log(`检测到 ${questions.length} 道题目`);

  let count = 0;
  const parsedQuestions = [];

  questions.forEach(questionEl => {
    // 允许重复解析，以便刷新数据
    // if (questionEl.querySelector('.zerror-xxt-parser-marker')) return;

    const data = parseQuestion(questionEl);
    if (!data) return;

    parsedQuestions.push(data);
    count++;

    // 仅当没有标记时才添加标记按钮
    if (questionEl.querySelector('.zerror-xxt-parser-marker')) return;

    // 添加标记按钮
    const marker = document.createElement('span');
    marker.className = 'zerror-xxt-parser-marker';
    marker.textContent = '查看解析(作答)';
    
    // 插入位置
    const titleArea = questionEl.querySelector('.mark_name');
    if (titleArea) {
      titleArea.appendChild(marker);

      // 添加操作按钮
      if (context && context.token && context.courseId && context.folderId) {
        // 检查题目是否已添加
        let isAdded = false;
        if (context.existingQuestions) {
            isAdded = context.existingQuestions.some(q => q.Content === data.title);
        }

        const btn = document.createElement('button');
        btn.className = 'zerror-xxt-parser-btn';
        
        if (isAdded) {
            btn.textContent = '已存在于试卷';
            btn.style.backgroundColor = '#ea580c';
            btn.disabled = true;
        } else {
            btn.textContent = '添加到当前试卷';
            btn.onclick = async (e) => {
                e.stopPropagation(); // 防止触发 marker 点击
                btn.disabled = true;
                btn.textContent = '正在处理...';
                
                // 重新解析以获取最新作答
                const currentData = parseQuestion(questionEl);
                if (!currentData) {
                     btn.textContent = '解析失败';
                     btn.disabled = false;
                     return;
                }

                const result = await addQuestionToExam(currentData, context);
                
                if (result === 'success') {
                    btn.textContent = '已添加';
                    btn.style.backgroundColor = '#16a34a';
                    if (context.existingQuestions) {
                        context.existingQuestions.push({ Content: currentData.title, Answer: currentData.answer, ID: 'temp' });
                    }
                } else if (result === 'updated') {
                    btn.textContent = '已更新答案';
                    btn.style.backgroundColor = '#16a34a';
                } else if (result === 'duplicate') {
                    btn.textContent = '已存在于试卷';
                    btn.style.backgroundColor = '#ea580c';
                } else {
                    btn.textContent = '添加失败，重试';
                    btn.disabled = false;
                    btn.style.backgroundColor = '#dc2626';
                }
            };
        }
        titleArea.appendChild(btn);
      }
      
      let panel = null;
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        if (panel) {
          panel.remove();
          panel = null;
          marker.textContent = '查看解析(作答)';
        } else {
          // 重新解析以获取最新作答
          const currentData = parseQuestion(questionEl);
          panel = createInfoPanel(currentData || data);
          titleArea.parentNode.insertBefore(panel, titleArea.nextSibling);
          marker.textContent = '收起解析';
        }
      });
    }
  });

  return { count, questions: parsedQuestions, addQuestionToExam };
};
