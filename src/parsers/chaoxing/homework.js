/**
 * 学习通作业页面解析器
 * 用于解析题目内容、选项和答案，并在页面上进行标记
 */

// 注入样式
const injectStyles = () => {
  const styleId = 'zerror-xxt-parser-styles';
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

// 提取内容并保留图片 URL
const extractContentWithImages = (element) => {
  if (!element) return '';
  // 克隆节点以免破坏原页面
  const clone = element.cloneNode(true);
  
  // 处理图片
  const imgs = clone.querySelectorAll('img');
  imgs.forEach(img => {
    let src = img.getAttribute('src');
    if (src) {
      src = normalizeUrl(src);
      // 替换图片为纯 URL 文本
      const textNode = document.createTextNode(src);
      img.parentNode.replaceChild(textNode, img);
    }
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

// 解析单个题目
const parseQuestion = (questionEl) => {
  try {
    const id = questionEl.id;
    // 题干
    let title = '未知题目';
    const titleEl = questionEl.querySelector('.mark_name .qtContent');
    
    if (titleEl) {
        title = extractContentWithImages(titleEl);
    } else {
        // 尝试直接获取 .mark_name (针对新版页面)
        const markName = questionEl.querySelector('.mark_name');
        if (markName) {
            const clone = markName.cloneNode(true);
            // 移除类型标签 (如 (单选题))
            const typeSpan = clone.querySelector('.colorShallow');
            if (typeSpan) typeSpan.remove();
            // 移除题号 (通常在文本开头)
            title = extractContentWithImages(clone);
        }
    }
    
    // 移除开头的题号 (如 "1. ", "1、")
    title = title.replace(/^\s*\d+[\.\、\s]*/, '').trim();
    // 移除末尾的题型标识 (如 (单选题))
    title = title.replace(/\s*\((单选题|多选题|判断题|填空题|简答题)\)\s*$/, '');

    // 题目类型推断
    let type = 'single_choice';
    const typeText = questionEl.querySelector('.mark_name .colorShallow')?.innerText || '';
    if (typeText.includes('单选题')) type = 'single_choice';
    else if (typeText.includes('多选题')) type = 'multiple_choice';
    else if (typeText.includes('判断')) type = 'true_false';
    else if (typeText.includes('填空')) type = 'fill_blank';
    else if (typeText.includes('简答题')) type = 'short_answer';

    // 选项
    const options = [];
    const optionEls = Array.from(questionEl.querySelectorAll('.mark_letter li'));
    
    if (optionEls.length > 0) {
        // 旧版结构: .mark_letter li
        optionEls.forEach(el => {
          // 移除选项前缀，如 "A. "
          let optText = extractContentWithImages(el);
          optText = optText.replace(/^[A-Z]\.\s*/, '');
          options.push(optText);
        });
    } else {
        // 新版结构: .stem_answer .answerBg .answer_p
        const newOptionEls = questionEl.querySelectorAll('.stem_answer .answerBg .answer_p');
        newOptionEls.forEach(el => {
            options.push(extractContentWithImages(el));
        });
    }

    // 答案 (尝试从页面已有结构获取)
    let answer = '未找到答案';
    const answerEls = questionEl.querySelectorAll('.mark_answer .rightAnswerContent, .mark_fill .rightAnswerContent');
    if (type === 'fill_blank' && answerEls.length > 1) {
      const parts = Array.from(answerEls)
        .map(el => normalizeFillBlankAnswer(extractContentWithImages(el)))
        .filter(Boolean)
      if (parts.length) {
        answer = parts.join('###')
      }
    }
    const answerEl = answerEls[0];
    if (answer === '未找到答案' && answerEl && extractContentWithImages(answerEl)) {
        answer = extractContentWithImages(answerEl);
    } else if (answer === '未找到答案') {
        // 检查是否已做答且正确（marking_dui）
        const isCorrect = questionEl.querySelector('.marking_dui');
        // 考试模式下，如果没有 marking_dui 也没有 marking_cuo，可能正在考试中
        // 此时，用户填写的内容应该被视为"答案"（虽然不知道对错，但用户要求提取）
        const isExamMode = window.location.href.includes('exam/preview');
        
        if (isCorrect) {
            // 如果已做答且正确，提取“我的答案”作为正确答案
            const myAnswerEl = questionEl.querySelector('.myAnswer .answerCon');
            if (myAnswerEl) {
                answer = extractContentWithImages(myAnswerEl);
            }
        } else if (isExamMode) {
             // 考试模式下，提取作答内容
             // 1. 填空题/简答题 (UEditor)
             const subEditors = questionEl.querySelectorAll('.subEditor iframe');
             if (subEditors.length > 0) {
                 const parts = [];
                 subEditors.forEach(iframe => {
                     try {
                         const doc = iframe.contentDocument || iframe.contentWindow.document;
                         const body = doc.body;
                         if (body) {
                            parts.push(body.innerText.trim());
                         }
                     } catch(e) {
                         console.warn('无法访问编辑器 iframe', e);
                     }
                 });
                 if (parts.length > 0) {
                    answer = parts.join('###');
                 }
             } else {
                 // 尝试 textarea
                 const textareas = questionEl.querySelectorAll('textarea');
                 if (textareas.length > 0) {
                      const parts = Array.from(textareas).map(t => t.value.trim()).filter(Boolean);
                      if (parts.length > 0) answer = parts.join('###');
                 }
             }
             
             // 2. 单选/多选/判断 (从选中状态获取)
             // 通常选中项会有特定的 class 或者 input:checked
             // 学习通考试页面选中项可能在 .answerBg .answer_p 或者是 input[checked]
             if (answer === '未找到答案') {
                 // 尝试查找选中的 input
                 const checkedInputs = questionEl.querySelectorAll('input:checked');
                 if (checkedInputs.length > 0) {
                     const selectedOptions = [];
                     checkedInputs.forEach(input => {
                         // 找到对应的选项文本
                         // input 通常在 li 中，文本在 li 的其他地方
                         const li = input.closest('li');
                          if (li) {
                              let optText = extractContentWithImages(li);
                              // 移除 A. B. 前缀
                              optText = optText.replace(/^[A-Z][\.\、\s]+/, '');
                              selectedOptions.push(optText);
                          }
                      });
                      if (selectedOptions.length > 0) {
                          if (type === 'multiple_choice') answer = selectedOptions.join('#');
                          else answer = selectedOptions[0];
                      }
                  }
              }
         } else {
             // 检查错题情况
             const isWrong = questionEl.querySelector('.marking_cuo');
             if (isWrong) {
                 console.log('【错题】发现一道错题', title);
                 console.log('ID:', id);
                 // 尝试寻找是否有隐藏的正确答案
                 if (answerEl) {
                     console.log('  -> 但发现显示了正确答案:', extractContentWithImages(answerEl));
                 } else {
                     console.log('  -> 未显示正确答案');
                 }
             }
        }
    }

    if (type === 'fill_blank' && answer !== '未找到答案') {
      answer = normalizeFillBlankAnswer(answer)
    }

    if (answer === '未找到答案') {
        console.warn('【未找到答案】题目', title);
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
    return false;
  }
  
  // 1. 获取现有题目进行查重
  // 如果 context 中已有缓存，优先使用缓存
  let existingQuestions = context.existingQuestions || [];
  
  if (existingQuestions.length === 0) {
    try {
      const existingRes = await fetch(`https://campuses.zerror.cc/folders/${folderId}/questions`, {
        headers: { Authorization: token }
      });
      if (existingRes.ok) {
        existingQuestions = await existingRes.json();
        // 更新缓存
        context.existingQuestions = existingQuestions;
      }
    } catch (e) {
      console.error('查重失败:', e);
    }
  }

  const existingQuestion = existingQuestions.find(q => q.Content === data.title);
  if (existingQuestion) {
    // 检查是否需要更新答案
    if (data.answer && data.answer !== '未找到答案' && existingQuestion.Answer !== data.answer) {
        try {
            console.log(`更新题目 ${existingQuestion.ID} 的答案 ${existingQuestion.Answer} -> ${data.answer}`);
            const updatePayload = {
                content: data.title,
                answer: data.answer,
                options: JSON.stringify(data.options),
                type: data.type
            };
            
            const updateRes = await fetch(`https://campuses.zerror.cc/questions/${existingQuestion.ID}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: token 
                },
                body: JSON.stringify(updatePayload)
            });

            if (updateRes.ok) {
                existingQuestion.Answer = data.answer;
                return 'updated';
            } else {
                return 'update_failed';
            }
        } catch (e) {
            console.error('更新请求异常:', e);
            return 'update_error';
        }
    }
    return 'duplicate'; 
  }

  // 2. 添加题目
  try {
    const payload = {
      type: data.type,
      content: data.title,
      answer: data.answer,
      options: JSON.stringify(data.options),
      add_to_top: false,
      question_bank_id: parseInt(folderId) // 使用传入的 folderId
    };

    const addRes = await fetch(`https://campuses.zerror.cc/courses/${courseId}/questions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: token 
      },
      body: JSON.stringify(payload)
    });

    if (addRes.ok) {
      return 'success';
    } else {
      return 'failed';
    }
  } catch (e) {
    console.error('添加题目失败:', e);
    return 'error';
  }
};

// 创建展示面板
const createInfoPanel = (data, context) => {
  const panel = document.createElement('div');
  panel.className = 'zerror-xxt-parser-panel';
  
  // 检查题目是否已添加
  let isAdded = false;
  if (context && context.existingQuestions) {
    isAdded = context.existingQuestions.some(q => q.Content === data.title);
  }
  
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
    <h4>题目解析结果</h4>
    <div class="zerror-xxt-parser-item">
      <span class="zerror-xxt-parser-label">题干:</span>
      <span>${data.title}</span>
    </div>
    ${optionsHtml}
    <div class="zerror-xxt-parser-item">
      <span class="zerror-xxt-parser-label">正确答案:</span>
      <span class="zerror-xxt-parser-answer">${data.answer}</span>
    </div>
  `;
  
  // 添加到试卷按钮
  if (context && context.token && context.courseId && context.folderId) {
    // 按钮已移至外层，这里不再添加
  }

  return panel;
};

// 主功能函数
export const initXXTParser = async (context = {}) => {
  console.log('正在初始化学习通题目解析器...');
  injectStyles();

  // 预先获取试卷题目进行缓存
  if (context.token && context.folderId && !context.existingQuestions) {
    try {
      const existingRes = await fetch(`https://campuses.zerror.cc/folders/${context.folderId}/questions`, {
        headers: { Authorization: context.token }
      });
      if (existingRes.ok) {
        context.existingQuestions = await existingRes.json();
        console.log(`已加载 ${context.existingQuestions.length} 道现有题目`);
      }
    } catch (e) {
      console.error('加载现有题目失败:', e);
      context.existingQuestions = [];
    }
  }

  const questions = document.querySelectorAll('.questionLi');
  if (questions.length === 0) {
    console.warn('未检测到题目元素 (.questionLi)');
    return { count: 0, questions: [] };
  }

  let count = 0;
  const parsedQuestions = [];
  
  questions.forEach(questionEl => {
    // 允许重复解析
    // if (questionEl.querySelector('.zerror-xxt-parser-marker')) return;

    const data = parseQuestion(questionEl);
    if (!data) return;

    // 收集题目数据
    parsedQuestions.push(data);
    count++;

    // 仅当没有标记时才添加标记按钮
    if (questionEl.querySelector('.zerror-xxt-parser-marker')) return;

    // 添加标记按钮
    const marker = document.createElement('span');
    marker.className = 'zerror-xxt-parser-marker';
    marker.textContent = '查看解析';
    
    // 找到标题区域并插入标记
    const titleArea = questionEl.querySelector('.mark_name');
    if (titleArea) {
      titleArea.appendChild(marker);
      
      // 添加操作按钮 (显示在外面)
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
                
                const result = await addQuestionToExam(data, context);
                
                if (result === 'success') {
                    btn.textContent = '已添加';
                    btn.style.backgroundColor = '#16a34a';
                    if (context.existingQuestions) {
                        context.existingQuestions.push({ Content: data.title, Answer: data.answer, ID: 'temp' });
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
      
      // 点击事件
      let panel = null;
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        if (panel) {
          panel.remove();
          panel = null;
          marker.textContent = '查看解析';
        } else {
          panel = createInfoPanel(data, context);
          // 插入到标题下面
          titleArea.parentNode.insertBefore(panel, titleArea.nextSibling);
          marker.textContent = '收起解析';
        }
      });
    }
  });

  console.log(`解析完成，共处理 ${count} 道题目`);
  return { count, questions: parsedQuestions, addQuestionToExam };
};
