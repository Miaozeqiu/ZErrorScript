/**
 * 学习通考试页面解析器 (考试中)
 * 针对 https://mooc1.chaoxing.com/exam-ans/mooc2/exam/preview 页面
 * 将用户当前的作答内容作为答案解析
 */

// 注入样式
const injectStyles = () => {
  const styleId = 'zerror-xxt-exam-parser-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .zerror-xxt-parser-marker {
      display: inline-block;
      margin-left: 10px;
      padding: 2px 6px;
      background-color: #e0f2fe;
      color: #0284c7;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      border: 1px solid #bae6fd;
      position: relative;
      z-index: 999;
    }
    .zerror-xxt-parser-marker:hover {
      background-color: #bae6fd;
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
      clear: both;
    }
    .zerror-xxt-parser-item { margin-bottom: 8px; }
    .zerror-xxt-parser-label { font-weight: 600; color: #64748b; margin-right: 5px; }
    .zerror-xxt-parser-answer { color: #16a34a; font-weight: bold; }
    .zerror-xxt-parser-btn {
        display: inline-block; margin-left: 10px; padding: 2px 8px;
        background-color: #3b82f6; color: #fff; border-radius: 4px;
        font-size: 12px; cursor: pointer; border: none;
    }
    .zerror-xxt-parser-btn:disabled { background-color: #94a3b8; }
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
  const clone = element.cloneNode(true);
  
  const imgs = clone.querySelectorAll('img');
  imgs.forEach(img => {
    let src = img.getAttribute('src');
    if (src) {
      src = normalizeUrl(src);
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
const parseExamQuestion = (questionEl) => {
  try {
    const id = questionEl.getAttribute('data') || questionEl.id;
    
    // 题干
    let title = '未知题目';
    // 考试页面题干通常在 h3.mark_name div
    const titleDiv = questionEl.querySelector('h3.mark_name div');
    if (titleDiv) {
      title = extractContentWithImages(titleDiv);
    } else {
       // 备用查找
       const titleP = questionEl.querySelector('h3.mark_name p');
       if (titleP) title = extractContentWithImages(titleP);
    }

    // 移除开头的题号
    title = title.replace(/^\s*\d+[\.\、\s]*/, '').trim();

    // 题型
    let type = 'single_choice';
    const typeSpan = questionEl.querySelector('h3.mark_name .colorShallow');
    let typeText = typeSpan ? typeSpan.innerText : '';
    
    if (typeText.includes('单选题')) type = 'single_choice';
    else if (typeText.includes('多选题')) type = 'multiple_choice';
    else if (typeText.includes('判断')) type = 'true_false';
    else if (typeText.includes('填空')) type = 'fill_blank';
    else if (typeText.includes('简答')) type = 'short_answer';

    // 选项
    const options = [];
    // 单选/多选选项在 .stem_answer .answerBg .answer_p
    const optionEls = questionEl.querySelectorAll('.stem_answer .answerBg .answer_p');
    optionEls.forEach(el => {
      options.push(extractContentWithImages(el));
    });

    // 答案解析 (考试中模式：提取用户作答)
    let answer = '未找到答案';

    if (type === 'single_choice' || type === 'multiple_choice') {
       // 查找被选中的选项 .check_answer
       // 注意：考试页面中选中的选项通常有 check_answer 类
       const checkedEls = questionEl.querySelectorAll('.check_answer');
       if (checkedEls.length > 0) {
           const answers = [];
           checkedEls.forEach(el => {
               // 选项可能是 A, B, C...
               const choice = el.innerText.trim();
               // 我们需要找到对应的选项内容，或者直接用 A/B/C
               // 这里我们尝试找到对应的 answer_p 内容
               const parent = el.closest('.answerBg');
               if (parent) {
                   const p = parent.querySelector('.answer_p');
                   if (p) {
                        // 如果能找到内容，优先用内容吗？
                        // 通常题库需要保存具体内容，还是选项字母？
                        // ZError 题库通常建议保存内容，或者字母。
                        // 这里我们为了通用性，保存选项字母，或者如果 options 已提取，则保存内容？
                        // 观察 homework.js，它似乎保存的是内容（如果是提取自 .answer_p）
                        // 让我们再看下 homework.js 的实现：
                        // homework.js 中 options 是 push(extractContentWithImages(el))
                        // 答案也是 extractContentWithImages(answerEl)
                        // 所以应该是内容。
                        answers.push(extractContentWithImages(p));
                   } else {
                       answers.push(choice);
                   }
               } else {
                   answers.push(choice);
               }
           });
           answer = answers.join('#'); // 多选通常用 # 分隔？或者 ZError 规范是？
           // 检查 homework.js 中并没有特殊的 join 逻辑，通常是单个字符串
           // 如果是多选，通常 ZError 题库可能接受数组或特定分隔符
           // 暂时用 # 分隔，或者直接用逗号
           // 实际上 homework.js 对多选的处理看起来是基于 correct answer 文本提取的
       }
    } else if (type === 'true_false') {
        // 判断题，类似单选
        const checkedEl = questionEl.querySelector('.check_answer');
        if (checkedEl) {
            const parent = checkedEl.closest('.answerBg');
            const p = parent.querySelector('.answer_p');
            if (p) answer = extractContentWithImages(p);
            else answer = checkedEl.innerText.trim();
        }
    } else if (type === 'fill_blank') {
        // 填空题
        // 多个填空通常在 .sub_que_div
        // 填空题在考试中通常是 ueditor 或者 input
        // 观察 HTML，发现有 .subEditor iframe，或者 input
        // 但这里我们很难从 iframe 中获取内容（跨域限制通常存在，或者太复杂）
        // 不过，注意 HTML 中有 input type="hidden" name="answer..." 吗？
        // 或者有 textarea?
        // 示例 HTML 中有 <textarea name="answerEditor..." ...></textarea>
        // 但通常内容在 iframe 里。
        // 如果是“考试中”，用户正在作答，我们可能无法轻易获取 iframe 内容，除非我们能访问 UE 对象
        // 尝试查找 UE.getEditor(...).getContent() ?
        // 这需要 unsafeWindow
        
        // 尝试从 input[name^="answer"] 获取？
        // 示例中有 <input type="hidden" name="answer905862955" value="D"> 对于单选题
        // 对于填空题：<textarea ...> 是空的
        
        // 如果无法获取，就标记为“未作答/无法获取”
        // 但用户说“直接将作答的当成答案”
        
        // 尝试使用 unsafeWindow 获取 UE 内容
        if (typeof unsafeWindow !== 'undefined' && unsafeWindow.UE) {
             const subDivs = questionEl.querySelectorAll('.sub_que_div');
             const parts = [];
             subDivs.forEach(div => {
                 const dataId = div.getAttribute('dataid'); // 9058629651
                 // 编辑器 ID 通常是 answerEditor + dataId
                 const editorId = 'answerEditor' + dataId;
                 try {
                     const editor = unsafeWindow.UE.getEditor(editorId);
                     if (editor) {
                         // getContent() 获取 HTML，getContentTxt() 获取文本
                         let txt = editor.getContentTxt().trim();
                         if (txt) parts.push(txt);
                     }
                 } catch (e) {
                     // ignore
                 }
             });
             if (parts.length > 0) answer = parts.join('###');
        }
    } else if (type === 'short_answer') {
        // 简答题，类似填空，通常也是 UE
        if (typeof unsafeWindow !== 'undefined' && unsafeWindow.UE) {
             const editorId = 'answer' + id; // 简答题 ID 可能直接是 answer + questionId?
             // 示例 HTML: <textarea ... name="answer905862973" id="answer905862973">
             try {
                 const editor = unsafeWindow.UE.getEditor('answer' + id);
                 if (editor) {
                     answer = editor.getContentTxt().trim();
                 }
             } catch (e) {}
        }
    }

    // 再次尝试从 hidden input 获取（针对选择题更可靠）
    if ((type === 'single_choice' || type === 'true_false') && answer === '未找到答案') {
        const input = questionEl.querySelector(`input[name="answer${id}"]`);
        if (input && input.value) {
            // value 是选项字母，如 "D"
            // 我们需要转换成内容
            const val = input.value;
            // 找到对应选项
            const optionSpan = questionEl.querySelector(`.choice${id}[data="${val}"]`);
            if (optionSpan) {
                const parent = optionSpan.closest('.answerBg');
                const p = parent.querySelector('.answer_p');
                if (p) answer = extractContentWithImages(p);
            } else {
                answer = val;
            }
        }
    }

    if (answer === '未找到答案') {
        console.warn('【未找到作答】题目', title);
    }

    return {
      id,
      title,
      type,
      options,
      answer
    };
  } catch (error) {
    console.error('解析考试题目失败:', error);
    return null;
  }
};

// 添加题目到试卷
const addQuestionToExam = async (data, context) => {
  const { token, courseId, folderId } = context;
  if (!token) return false;
  
  // 1. 获取现有题目进行查重
  let existingQuestions = context.existingQuestions || [];
  
  if (existingQuestions.length === 0) {
    try {
      const existingRes = await fetch(`https://campuses.zerror.cc/folders/${folderId}/questions`, {
        headers: { Authorization: token }
      });
      if (existingRes.ok) {
        existingQuestions = await existingRes.json();
        context.existingQuestions = existingQuestions;
      }
    } catch (e) {
      console.error('查重失败:', e);
    }
  }

  const existingQuestion = existingQuestions.find(q => q.Content === data.title);
  if (existingQuestion) {
    // 检查是否需要更新答案 (只要有作答就更新)
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
      question_bank_id: parseInt(folderId)
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
    <h4>题目解析结果 (考试模式)</h4>
    <div class="zerror-xxt-parser-item">
      <span class="zerror-xxt-parser-label">题干:</span>
      <span>${data.title}</span>
    </div>
    ${optionsHtml}
    <div class="zerror-xxt-parser-item">
      <span class="zerror-xxt-parser-label">提取作答:</span>
      <span class="zerror-xxt-parser-answer">${data.answer}</span>
    </div>
  `;
  
  return panel;
};

// 主功能函数
export const initXXTExamParser = async (context = {}) => {
  console.log('正在初始化学习通考试解析器...');
  injectStyles();

  // 预先获取试卷题目进行缓存
  if (context.token && context.folderId && !context.existingQuestions) {
    try {
      const existingRes = await fetch(`https://campuses.zerror.cc/folders/${context.folderId}/questions`, {
        headers: { Authorization: context.token }
      });
      if (existingRes.ok) {
        context.existingQuestions = await existingRes.json();
      }
    } catch (e) {
      console.error('加载现有题目失败:', e);
      context.existingQuestions = [];
    }
  }

  const questions = document.querySelectorAll('.questionLi');
  console.log(`检测到 ${questions.length} 道题目`);

  let count = 0;
  const parsedQuestions = [];

  questions.forEach(questionEl => {
    // 避免重复
    if (questionEl.querySelector('.zerror-xxt-parser-marker')) return;

    const data = parseExamQuestion(questionEl);
    if (!data) return;

    parsedQuestions.push(data);
    count++;

    // 添加标记
    const marker = document.createElement('span');
    marker.className = 'zerror-xxt-parser-marker';
    marker.textContent = '查看解析';
    
    // 插入位置
    const titleArea = questionEl.querySelector('h3.mark_name');
    
    if (titleArea) {
      titleArea.appendChild(marker);

      // 添加操作按钮
      if (context && context.token && context.courseId && context.folderId) {
        let isAdded = false;
        if (context.existingQuestions) {
            isAdded = context.existingQuestions.some(q => q.Content === data.title);
        }

        const btn = document.createElement('button');
        btn.className = 'zerror-xxt-parser-btn';
        
        if (isAdded) {
            // 如果已存在，检查答案是否一致，如果不一致提示可更新
            const existing = context.existingQuestions.find(q => q.Content === data.title);
            if (existing && existing.Answer !== data.answer && data.answer !== '未找到答案') {
                btn.textContent = '更新作答';
                btn.style.backgroundColor = '#eab308'; // 黄色
            } else {
                btn.textContent = '已存在';
                btn.style.backgroundColor = '#ea580c';
                btn.disabled = true;
            }
        } else {
            btn.textContent = '添加作答';
        }

        btn.onclick = async (e) => {
            e.stopPropagation();
            btn.disabled = true;
            btn.textContent = '处理中...';
            
            const result = await addQuestionToExam(data, context);
            
            if (result === 'success') {
                btn.textContent = '已添加';
                btn.style.backgroundColor = '#16a34a';
                if (context.existingQuestions) {
                    context.existingQuestions.push({ Content: data.title, Answer: data.answer, ID: 'temp' });
                }
            } else if (result === 'updated') {
                btn.textContent = '已更新';
                btn.style.backgroundColor = '#16a34a';
            } else if (result === 'duplicate') {
                btn.textContent = '已存在';
                btn.style.backgroundColor = '#ea580c';
            } else {
                btn.textContent = '失败，重试';
                btn.disabled = false;
                btn.style.backgroundColor = '#dc2626';
            }
        };
        titleArea.appendChild(btn);
      }
      
      let panel = null;
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        if (panel) {
          panel.remove();
          panel = null;
          marker.textContent = '查看解析';
        } else {
          panel = createInfoPanel(data, context);
          if (titleArea.nextSibling) {
              titleArea.parentNode.insertBefore(panel, titleArea.nextSibling);
          } else {
              titleArea.parentNode.appendChild(panel);
          }
          marker.textContent = '收起解析';
        }
      });
    }
  });

  return { count, questions: parsedQuestions, addQuestionToExam };
};
