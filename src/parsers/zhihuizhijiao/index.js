
/**
 * 智慧职教 (icve.com.cn) 题目解析器
 * 用于解析题目内容、选项和答案
 */

// 注入样式
const injectStyles = () => {
  const styleId = 'zerror-zhihuizhijiao-parser-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .zerror-parser-marker {
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
    .zerror-parser-marker:hover {
      background-color: #bae6fd;
    }
  `;
  document.head.appendChild(style);
};

// 提取文本内容
const extractContent = (element) => {
  if (!element) return '';
  return element.innerText.trim();
};

// 解析单个题目
const parseQuestion = (questionEl) => {
  try {
    const id = questionEl.id;
    if (!id) return null;

    // 1. 获取题干和题目类型
    const titleEl = questionEl.querySelector('.seeTitle');
    if (!titleEl) return null;

    let fullTitle = extractContent(titleEl);
    
    // 提取题型
    let type = 'single_choice';
    if (fullTitle.includes('多选题')) type = 'multiple_choice';
    else if (fullTitle.includes('判断题')) type = 'true_false';
    else if (fullTitle.includes('填空题')) type = 'fill_blank';
    
    // 提取满分
    let fullScore = 0;
    const scoreMatch = fullTitle.match(/[（\(](\d+)分[）\)]/);
    if (scoreMatch) {
      fullScore = parseInt(scoreMatch[1], 10);
    }

    // 清理题干：去除 "1.【判断题】（10分）" 这种前缀
    // 也可以获取 .ql-editor 的内容作为纯题干
    const qlEditor = titleEl.querySelector('.ql-editor');
    let title = '';
    if (qlEditor) {
      title = extractContent(qlEditor);
    } else {
      title = fullTitle.replace(/^\s*\d+[\.、]\s*【.*?】\s*[（\(]\d+分[）\)]\s*/, '').trim();
    }

    // 2. 获取选项
    const options = [];
    const optionEls = questionEl.querySelectorAll('.optionList .el-radio-group label, .optionList .el-checkbox-group label');
    
    optionEls.forEach(el => {
      const labelEl = el.querySelector('.el-radio__label, .el-checkbox__label');
      if (labelEl) {
        let optText = extractContent(labelEl);
        // 去除 "A. " 前缀
        optText = optText.replace(/^[A-Z]\.\s*/, '');
        options.push(optText);
      }
    });

    // 3. 获取答案
    let answer = '未找到答案';

    // 优先尝试从 .answerDet .answer 获取显式答案
    const answerDetEl = questionEl.querySelector('.answerDet .answer');
    if (answerDetEl) {
        const answerText = extractContent(answerDetEl); // 如 " B "
        const cleanAnswer = answerText.trim();
        
        // 如果答案是字母（A, B, C...），则转换为对应的选项内容
        if (/^[A-Z]+$/.test(cleanAnswer)) {
            // 处理单选/多选，假设多选可能是 "AB" 或 "A,B"
            // 目前看到的例子是单选 "B"
            const letters = cleanAnswer.split(/[,，\s]*/).filter(Boolean);
            const mappedAnswers = [];
            
            letters.forEach(letter => {
                const index = letter.charCodeAt(0) - 'A'.charCodeAt(0);
                if (index >= 0 && index < options.length) {
                    mappedAnswers.push(options[index]);
                }
            });
            
            if (mappedAnswers.length > 0) {
                 answer = mappedAnswers.join('###');
            }
        } else {
             // 如果不是字母，可能是填空题答案，直接使用
             answer = cleanAnswer;
        }
    }
    
    // 如果没有找到显式答案，再尝试通过得分判断
    if (answer === '未找到答案') {
        // 尝试获取用户得分
        let userScore = 0;
        // 查找分数标签，通常在 titleBox 下的第二个 div 的 span
        // <div class="titleBox"> ... <div><span class="el-tag ...">10</span> 分 </div> </div>
        const scoreTag = questionEl.querySelector('.titleBox .el-tag');
        if (scoreTag) {
          userScore = parseInt(extractContent(scoreTag), 10);
        }

        // 如果用户得分等于满分，则用户选择的选项就是正确答案
        if (userScore > 0 && userScore === fullScore) {
          const checkedEls = questionEl.querySelectorAll('.is-checked');
          const myAnswers = [];
          checkedEls.forEach(el => {
            // el 可能是 span.el-radio__input.is-checked 或 label.is-checked
            // 我们需要找到对应的 label 文本
            let labelParent = el.closest('label');
            if (labelParent) {
                const labelEl = labelParent.querySelector('.el-radio__label, .el-checkbox__label');
                if (labelEl) {
                    let optText = extractContent(labelEl);
                    optText = optText.replace(/^[A-Z]\.\s*/, '');
                    myAnswers.push(optText);
                }
            }
          });
          
          if (myAnswers.length > 0) {
            // 去重
            const uniqueAnswers = [...new Set(myAnswers)];
            answer = uniqueAnswers.join('###'); // 暂时用 ### 分隔多选
            if (type === 'single_choice' || type === 'true_false') {
                answer = uniqueAnswers[0];
            }
          }
        }
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
    return 'error';
  }
  
  // 1. 获取现有题目进行查重 (context.existingQuestions 应由调用者填充或首次获取)
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
    // 检查是否需要更新答案
    if (data.answer && data.answer !== '未找到答案' && existingQuestion.Answer !== data.answer) {
        try {
            console.log(`更新题目 ${existingQuestion.ID} 的答案`);
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
                // 更新本地缓存
                existingQuestion.Answer = data.answer;
                return 'updated';
            }
        } catch (e) {
            console.error('更新题目失败:', e);
        }
    }
    return 'duplicate';
  }

  // 2. 上传新题目
  try {
    const payload = {
      type: data.type,
      content: data.title,
      answer: data.answer,
      options: JSON.stringify(data.options),
      add_to_top: false,
      question_bank_id: parseInt(folderId)
    };

    const response = await fetch(`https://campuses.zerror.cc/courses/${courseId}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      // 添加到本地缓存，避免重复上传
      context.existingQuestions.push({
          Content: data.title,
          Answer: data.answer,
          ID: 'temp_' + Date.now() // 临时ID
      });
      return 'success';
    } else {
      console.error('上传失败:', await response.text());
      return 'error';
    }
  } catch (error) {
    console.error('上传出错:', error);
    return 'error';
  }
};

export const initZhihuiZhijiaoParser = async (context = {}) => {
  console.log('正在使用解析器: 智慧职教 (icve.com.cn)');
  injectStyles();

  // 预先获取试卷题目进行缓存
  if (context.token && context.folderId && !context.existingQuestions) {
    try {
      const existingRes = await fetch(`https://campus.zerror.cc/folders/${context.folderId}/questions`, {
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
  
  const questionEls = document.querySelectorAll('.subjectDet');
  const questions = [];
  
  questionEls.forEach(el => {
    const q = parseQuestion(el);
    if (q) {
      questions.push(q);
      
      // 在题目旁添加标记
      const titleEl = el.querySelector('.seeTitle');
      if (titleEl && !titleEl.querySelector('.zerror-parser-marker')) {
        const marker = document.createElement('span');
        marker.className = 'zerror-parser-marker';
        marker.innerText = q.answer !== '未找到答案' ? '已解析 (有答案)' : '已解析 (无答案)';
        titleEl.appendChild(marker);

        // 添加操作按钮 (显示在外面)
        if (context && context.token && context.courseId && context.folderId) {
            // 检查题目是否已添加
            let isAdded = false;
            if (context.existingQuestions) {
                isAdded = context.existingQuestions.some(existing => existing.Content === q.title);
            }

            const btn = document.createElement('span');
            btn.className = 'zerror-parser-marker'; // 复用样式，或者新建 .zerror-parser-btn
            btn.style.marginLeft = '10px';
            btn.style.cursor = 'pointer';
            
            if (isAdded) {
                btn.innerText = '已存在';
                btn.style.backgroundColor = '#ea580c';
                btn.style.color = '#fff';
                btn.style.borderColor = '#ea580c';
            } else {
                btn.innerText = '上传';
                btn.style.backgroundColor = '#16a34a';
                btn.style.color = '#fff';
                btn.style.borderColor = '#16a34a';
                
                btn.onclick = async (e) => {
                    e.stopPropagation();
                    btn.innerText = '处理中...';
                    const result = await addQuestionToExam(q, context);
                    
                    if (result === 'success') {
                        btn.innerText = '已上传';
                        btn.style.backgroundColor = '#ea580c';
                        btn.style.borderColor = '#ea580c';
                        // 移除点击事件
                        btn.onclick = null;
                    } else if (result === 'updated') {
                        btn.innerText = '已更新';
                        btn.style.backgroundColor = '#ea580c';
                        btn.style.borderColor = '#ea580c';
                    } else if (result === 'duplicate') {
                        btn.innerText = '已存在';
                        btn.style.backgroundColor = '#ea580c';
                        btn.style.borderColor = '#ea580c';
                    } else {
                        btn.innerText = '重试';
                    }
                };
            }
            titleEl.appendChild(btn);
        }
      }
    }
  });

  return {
    count: questions.length,
    questions,
    addQuestionToExam
  };
};
