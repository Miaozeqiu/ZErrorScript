/**
 * 学习通考试复习（查看试卷）页面解析器
 * 针对 /exam/test/reVersionPaperMarkContentNew 页面
 * 用于解析题目内容、选项和答案（通常包含正确答案），并在页面上进行标记
 */

import { extractContentWithImages, normalizeFillBlankAnswer, injectStyles, addQuestionToExam } from './common.js';

const injectStylesLocal = () => injectStyles('zerror-xxt-exam-review-parser-styles');

// 解析子题目（review 页 .mark_read .mark_item 结构）
// 结构：.mark_name(.colorShallow 类型 + 直接的 <p> 题干) + ul.mark_letter li 选项
//       + .mark_answer .mark_key .colorDeep（"我的答案: X"）
//       + .mark_judge_name (.marking_dui / .marking_cuo / .marking_bandui)
const parseSubQuestion = (subEl) => {
  try {
    let type = 'single_choice';
    let title = '未知子题';
    const options = [];

    const markName = subEl.querySelector('.mark_name');
    if (markName) {
      const typeText = markName.querySelector('.colorShallow')?.innerText || '';
      if (typeText.includes('单选')) type = 'single_choice';
      else if (typeText.includes('多选')) type = 'multiple_choice';
      else if (typeText.includes('判断')) type = 'true_false';
      else if (typeText.includes('填空')) type = 'fill_blank';
      else if (typeText.includes('简答') || typeText.includes('名词解释')) type = 'short_answer';

      const clone = markName.cloneNode(true);
      clone.querySelector('.colorShallow')?.remove();
      title = extractContentWithImages(clone)
        .replace(/^\(\d+\)\s*/, '')   // 移除 (1) 前缀
        .trim();
    }

    subEl.querySelectorAll('ul.mark_letter li').forEach(el => {
      options.push(extractContentWithImages(el).replace(/^[A-Z]\.\s*/, '').trim());
    });

    // 答案：只有做对时（marking_dui）才用"我的答案"作为正确答案
    let answer = '未找到答案';
    if (subEl.querySelector('.marking_dui')) {
      // .mark_key 下的 .colorDeep span 内容如 "<i>我的答案:</i> B"
      // 先尝试去掉 <i> 标签内容，只取后面的纯文字
      const colorDeepEl = subEl.querySelector('.mark_key .colorDeep');
      if (colorDeepEl) {
        const cloneEl = colorDeepEl.cloneNode(true);
        // 移除 <i> 元素（包含"我的答案:"标签）
        cloneEl.querySelectorAll('i').forEach(el => el.remove());
        const myAns = cloneEl.innerText.trim();
        if (myAns) {
          answer = myAns;
        } else {
          // 回退：用完整文本去掉前缀
          const fullText = colorDeepEl.innerText.replace(/^我的答案[:：]\s*/i, '').trim();
          if (fullText) answer = fullText;
        }
      }
    }

    console.log('[exam_review] 子题:', title, '| 类型:', type, '| 答案:', answer);
    return { title, type, options, answer };
  } catch (e) {
    console.error('解析子题失败:', e);
    return null;
  }
};

// 解析单个题目
const parseQuestion = (questionEl) => {
  try {
    const id = questionEl.id;

    // 题目类型推断
    let type = 'single_choice';
    const typeText = questionEl.querySelector('.mark_name .colorShallow')?.innerText || '';
    if (typeText.includes('单选')) type = 'single_choice';
    else if (typeText.includes('多选')) type = 'multiple_choice';
    else if (typeText.includes('判断')) type = 'true_false';
    else if (typeText.includes('填空')) type = 'fill_blank';
    else if (typeText.includes('简答')) type = 'short_answer';
    else if (typeText.includes('论述')) type = 'essay';
    else if (typeText.includes('计算')) type = 'calculation';
    else if (typeText.includes('名词解释')) type = 'definition';
    else if (typeText.includes('完形填空') || typeText.includes('完型填空')) type = 'cloze';
    else if (typeText.includes('阅读理解') || typeText.includes('阅读')) type = 'reading';
    else if (typeText.includes('听力')) type = 'listening';

    // 题干
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
    // 移除开头题号 (如 “1. “, “1、”)
    title = title.replace(/^\s*\d+[\.、\s]+/, '').trim();
    // 移除题型标识，格式如 (名词解释, 5.0 分) 或 (单选题)
    title = title.replace(/\s*[\(（][^\)）]*[\)）]\s*/g, '').trim();

    // 检测子题目（阅读/听力等大题）
    const subQuestionEls = questionEl.querySelectorAll('.mark_read .mark_item');
    console.log(`[exam_review] 题目 "${title}" 检测到 ${subQuestionEls.length} 个子题`);
    if (subQuestionEls.length > 0) {
      const children = [];
      subQuestionEls.forEach(subEl => {
        const sub = parseSubQuestion(subEl);
        if (sub) children.push(sub);
      });
      return { id, title, type, options: [], answer: '未找到答案', children };
    }

    // 选项
    const options = [];
    questionEl.querySelectorAll('.mark_letter li').forEach(el => {
      options.push(extractContentWithImages(el).replace(/^[A-Z]\.\s*/, '').trim());
    });

    // 答案
    let answer = '未找到答案';
    const answerEls = questionEl.querySelectorAll('.mark_answer .rightAnswerContent, .mark_fill .rightAnswerContent');
    if (type === 'fill_blank' && answerEls.length > 1) {
      const parts = Array.from(answerEls)
        .map(el => normalizeFillBlankAnswer(extractContentWithImages(el)))
        .filter(Boolean);
      if (parts.length) answer = parts.join('###');
    }
    const answerEl = answerEls[0];
    if (answer === '未找到答案' && answerEl) {
      const txt = extractContentWithImages(answerEl);
      if (txt) answer = txt;
    }
    if (answer === '未找到答案' && questionEl.querySelector('.marking_dui')) {
      const myAnswerEl = questionEl.querySelector('.myAnswer .answerCon');
      if (myAnswerEl) answer = extractContentWithImages(myAnswerEl);
    }

    if (type === 'fill_blank' && answer !== '未找到答案') {
      answer = normalizeFillBlankAnswer(answer);
    }

    if (answer === '未找到答案') {
      console.warn('【未找到答案】题目', title);
    }

    return { id, title, type, options, answer };
  } catch (error) {
    console.error('解析题目失败:', error);
    return null;
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

  let childrenHtml = '';
  if (data.children && data.children.length > 0) {
    childrenHtml = data.children.map((sub, i) => {
      const subOptsHtml = sub.options && sub.options.length > 0
        ? `<ul class="zerror-xxt-parser-options" style="list-style:none;padding:0;margin:4px 0 0 0;">
            ${sub.options.map(o => `<li>${o}</li>`).join('')}
          </ul>`
        : '';
      return `
        <div class="zerror-xxt-parser-item" style="border-left:3px solid #bae6fd;padding-left:8px;margin-bottom:10px;">
          <div><span class="zerror-xxt-parser-label">(${i + 1})</span> ${sub.title}</div>
          ${subOptsHtml}
          <div><span class="zerror-xxt-parser-label">答案:</span>
            <span class="zerror-xxt-parser-answer">${sub.answer}</span>
          </div>
        </div>`;
    }).join('');
  }

  panel.innerHTML = `
    <h4>题目解析结果 (试卷复习)</h4>
    <div class="zerror-xxt-parser-item">
      <span class="zerror-xxt-parser-label">题干:</span>
      <span>${data.title}</span>
    </div>
    ${optionsHtml}
    ${data.children && data.children.length > 0
      ? `<div class="zerror-xxt-parser-item"><span class="zerror-xxt-parser-label">子题目 (${data.children.length}题):</span></div>${childrenHtml}`
      : `<div class="zerror-xxt-parser-item">
          <span class="zerror-xxt-parser-label">正确答案:</span>
          <span class="zerror-xxt-parser-answer">${data.answer}</span>
        </div>`
    }
  `;

  return panel;
};

// 主功能函数
export const initXXTExamReviewParser = async (context = {}) => {
  console.log('正在初始化学习通试卷复习解析器...');
  injectStylesLocal();

  // 预先获取试卷题目进行缓存
  if (context.token && context.folderId && !context.existingQuestions) {
    try {
      const existingRes = await fetch(`https://campuses.zerror.cc/folders/${context.folderId}/questions`, {
        headers: { Authorization: context.token }
      });
      if (existingRes.ok) {
        context.existingQuestions = (await existingRes.json()) || [];
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
          panel = createInfoPanel(data);
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
