/**
 * 中国大学MOOC (icourse163.org) 题目解析器
 * 用于解析题目内容、选项和答案
 */

// 注入样式 (复用 xxtParser 的样式)
const injectStyles = () => {
  const styleId = 'zerror-mooc-parser-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .zerror-mooc-parser-marker {
      display: inline-block;
      margin-left: 10px;
      padding: 4px 8px;
      background-color: #e0f2fe;
      color: #0284c7;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      border: 1px solid #bae6fd;
      z-index: 100;
      position: relative;
    }
    .zerror-mooc-parser-marker:hover {
      background-color: #bae6fd;
    }
    .zerror-mooc-parser-btn {
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
    .zerror-mooc-parser-btn:hover {
      background-color: #2563eb;
    }
    .zerror-mooc-parser-btn:disabled {
      background-color: #94a3b8;
      cursor: not-allowed;
    }
    .zerror-mooc-parser-panel {
      margin-top: 10px;
      padding: 15px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      color: #334155;
      animation: fadeIn 0.3s ease;
    }
    .zerror-mooc-parser-panel h4 {
      margin: 0 0 10px 0;
      color: #0f172a;
      font-size: 15px;
      font-weight: 600;
    }
    .zerror-mooc-parser-item {
      margin-bottom: 8px;
      line-height: 1.5;
    }
    .zerror-mooc-parser-label {
      font-weight: 600;
      color: #64748b;
      margin-right: 5px;
    }
    .zerror-mooc-parser-options li {
      margin-bottom: 4px;
      padding: 4px 8px;
      background: #fff;
      border-radius: 4px;
      border: 1px solid #f1f5f9;
    }
    .zerror-mooc-parser-answer {
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

// 规范化填空题答案
const normalizeFillBlankAnswer = (value) => {
  if (!value) return value;
  const raw = String(value).replace(/\u00a0/g, ' ').trim();
  const parts = raw
    .split(/\r?\n+/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => part.replace(/^正确答案[:：]\s*/, '').replace(/^((?:\(?\d+\)?|（\d+）|[\d]+[\.、\s]*)+)/, ''));
  if (parts.length > 1) return parts.join('###');
  return raw.replace(/^正确答案[:：]\s*/, '').trim();
};

// 解析单个题目
const parseMoocQuestion = (questionEl) => {
  try {
    // 尝试获取 ID
    // 很多时候没有直接的 ID，可以用随机 ID 或其他属性
    let id = questionEl.id || questionEl.getAttribute('data-id') || ('mooc_' + Math.random().toString(36).substr(2, 9));
    
    // 题干
    // 通常在 .j-richTxt 中
    const titleEl = questionEl.querySelector('.j-title .j-richTxt');
    let title = titleEl ? titleEl.innerText.trim() : '未知题目';
    
    // 移除题干中可能的序号（虽然 MOOC 的序号在 .position div 中，不在 richTxt 中，但以防万一）
    title = title.replace(/^\d+[\.、\s]*/, '');

    // 题型推断
    let type = 'single_choice';
    const cateEl = questionEl.querySelector('.j-qacate');
    const cateText = cateEl ? cateEl.innerText : '';
    
    if (cateText.includes('单选')) type = 'single_choice';
    else if (cateText.includes('多选')) type = 'multiple_choice';
    else if (cateText.includes('判断')) type = 'true_false';
    else if (cateText.includes('填空')) type = 'fill_blank';
    else if (cateText.includes('简答')) type = 'short_answer';

    // 选项
    const options = [];
    const optionEls = questionEl.querySelectorAll('.choices li');
    const optionMap = {}; // 用于映射 A/B/C -> 文本内容
    
    optionEls.forEach((el, index) => {
      const posEl = el.querySelector('.optionPos');
      const cntEl = el.querySelector('.optionCnt');
      
      let letter = '';
      if (posEl) {
        letter = posEl.innerText.trim().replace('.', ''); // "A." -> "A"
      } else {
        // 如果没有 explicit pos，假设按顺序 A, B, C...
        letter = String.fromCharCode(65 + index);
      }
      
      let optText = cntEl ? cntEl.innerText.trim() : '';
      options.push(optText);
      optionMap[letter] = optText;
    });

    // 答案
    let answer = '未找到答案';
    const analysisEl = questionEl.querySelector('.analysisInfo');
    
    if (analysisEl) {
      // 获取正确答案文本，通常在 .tt2 中
      const answerSpan = analysisEl.querySelector('.tt2');
      if (answerSpan) {
        let ansRaw = answerSpan.innerText.trim(); // "B" 或 "A、C" 或 "A,C"
        
        if (type === 'single_choice' || type === 'multiple_choice' || type === 'true_false') {
          // 将字母映射回文本
          // 处理可能的分隔符
          const letters = ansRaw.split(/[\s,、]+/).filter(Boolean);
          const ansTexts = letters.map(l => optionMap[l] || l).filter(Boolean);
          
          if (ansTexts.length > 0) {
            answer = ansTexts.join('###'); // 使用 ### 连接多选答案，或者保持原样？
            // xxtParser 似乎没有显式处理多选连接符，通常是一个字符串
            // 但为了兼容，如果多个答案，最好用某种方式连接
            // 这里为了与 xxtParser 保持一致，如果 xxt 是直接取 innerText，那可能是 "A" 或 "内容"
            // 既然我们要上传到题库，题库通常存的是文本内容
            if (ansTexts.length === 1) {
              answer = ansTexts[0];
            } else {
              answer = ansTexts.join('###');
            }
          }
        } else if (type === 'fill_blank') {
          // 填空题答案可能直接就是文本
          answer = normalizeFillBlankAnswer(ansRaw);
        } else {
          answer = ansRaw;
        }
      }
    }

    // 再次确认答案是否有效
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

// 添加题目到试卷 (复用逻辑)
const addQuestionToExam = async (data, context) => {
  const { token, courseId, folderId } = context;
  if (!token) {
    alert('请先登录');
    return false;
  }
  
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
  panel.className = 'zerror-mooc-parser-panel';
  
  let optionsHtml = '';
  if (data.options && data.options.length > 0) {
    optionsHtml = `
      <div class="zerror-mooc-parser-item">
        <div class="zerror-mooc-parser-label">选项:</div>
        <ul class="zerror-mooc-parser-options" style="list-style: none; padding: 0;">
          ${data.options.map(opt => `<li>${opt}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  panel.innerHTML = `
    <h4>题目解析结果</h4>
    <div class="zerror-mooc-parser-item">
      <span class="zerror-mooc-parser-label">题干:</span>
      <span>${data.title}</span>
    </div>
    ${optionsHtml}
    <div class="zerror-mooc-parser-item">
      <span class="zerror-mooc-parser-label">正确答案:</span>
      <span class="zerror-mooc-parser-answer">${data.answer}</span>
    </div>
  `;
  
  return panel;
};

// 主功能函数
export const initMoocParser = async (context = {}) => {
  console.log('正在初始化 MOOC 题目解析器...');
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

  // 查找所有题目容器
  // icourse163 的题目容器通常在 .u-questionItem
  const questions = document.querySelectorAll('.u-questionItem');
  if (questions.length === 0) {
    console.warn('未检测到 MOOC 题目元素 (.u-questionItem)');
    return { count: 0, questions: [] };
  }

  let count = 0;
  const parsedQuestions = [];
  
  questions.forEach(questionEl => {
    const data = parseMoocQuestion(questionEl);
    if (!data) return;

    parsedQuestions.push(data);
    count++;

    if (questionEl.querySelector('.zerror-mooc-parser-marker')) return;

    // 添加标记按钮
    const marker = document.createElement('span');
    marker.className = 'zerror-mooc-parser-marker';
    marker.textContent = '查看解析';
    
    // 找到标题区域并插入标记
    // .j-title 是标题区域
    const titleArea = questionEl.querySelector('.j-title');
    if (titleArea) {
      // 插入到标题内或标题后
      // MOOC 的 titleArea 内部布局比较复杂，我们可以 append 到 titleArea 的末尾，或者放到 .qaDescription 后面
      const qaDesc = titleArea.querySelector('.qaDescription');
      if (qaDesc) {
          qaDesc.appendChild(marker);
      } else {
          titleArea.appendChild(marker);
      }
      
      // 添加操作按钮
      if (context && context.token && context.courseId && context.folderId) {
        let isAdded = false;
        if (context.existingQuestions) {
            isAdded = context.existingQuestions.some(q => q.Content === data.title);
        }

        const btn = document.createElement('button');
        btn.className = 'zerror-mooc-parser-btn';
        
        if (isAdded) {
            btn.textContent = '已存在于试卷';
            btn.style.backgroundColor = '#ea580c';
            btn.disabled = true;
        } else {
            btn.textContent = '添加到当前试卷';
            btn.onclick = async (e) => {
                e.stopPropagation();
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
        if (qaDesc) {
            qaDesc.appendChild(btn);
        } else {
            titleArea.appendChild(btn);
        }
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
          // 插入到 questionEl 的合适位置，例如 .j-choicebox 之前
          const choiceBox = questionEl.querySelector('.j-choicebox');
          if (choiceBox) {
              questionEl.insertBefore(panel, choiceBox);
          } else {
              questionEl.appendChild(panel);
          }
          marker.textContent = '收起解析';
        }
      });
    }
  });

  console.log(`MOOC 解析完成，共处理 ${count} 道题目`);
  return { count, questions: parsedQuestions, addQuestionToExam };
};
