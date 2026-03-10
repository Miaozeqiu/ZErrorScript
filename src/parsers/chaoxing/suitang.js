/**
 * 学习通随堂练习解析器
 * 针对 /quiz/stu/answerQuestion 页面
 */

import { extractContentWithImages, injectStyles, addQuestionToExam } from './common.js';

const injectStylesLocal = (doc) => injectStyles('zerror-xxt-suitang-parser-styles', doc);

// 创建展示面板
const createInfoPanel = (data, context, doc) => {
  const panel = doc.createElement('div');
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
  
  return panel;
};

// 解析单个题目
const parseSuitangQuestion = (questionEl) => {
  try {
    // 题干
    const nameEl = questionEl.querySelector('.question-name');
    let title = '未知题目';
    
    if (nameEl) {
        const titleClone = nameEl.cloneNode(true);
        const typeSpan = titleClone.querySelector('.grey-text');
        if (typeSpan) typeSpan.remove();
        title = extractContentWithImages(titleClone);
        title = title.replace(/^\d+[\.、\s]*/, '').trim();
    }

    // 题型推断
    let type = 'short_answer'; 
    const typeText = nameEl ? nameEl.innerText : '';
    if (typeText.includes('单选')) type = 'single_choice';
    else if (typeText.includes('多选')) type = 'multiple_choice';
    else if (typeText.includes('判断')) type = 'true_false';
    else if (typeText.includes('填空')) type = 'fill_blank';
    else if (typeText.includes('简答')) type = 'short_answer';

    // 选项
    const options = [];
    
    // Debug: 输出题目结构以便调试
    // console.log('Parsing Question Structure:', questionEl.innerHTML);

    // 策略 1: 常见的列表结构 (.question-option li, .mark_letter li)
    let optionEls = Array.from(questionEl.querySelectorAll('.question-option li, .mark_letter li'));
    
    // 策略 2: 查找 .question-option 下的非列表元素 (div, p, span)
    if (optionEls.length === 0) {
        const optContainer = questionEl.querySelector('.question-option');
        if (optContainer) {
             // 筛选出看起来像选项的元素
             // 优先查找 div, p
             let candidates = Array.from(optContainer.querySelectorAll('div, p'));
             // 如果没找到 div/p，尝试 span (有时选项是 span 布局)
             if (candidates.length === 0) {
                 candidates = Array.from(optContainer.querySelectorAll('span'));
             }
             
             optionEls = candidates.filter(el => {
                 // 排除空元素
                 return el.innerText && el.innerText.trim().length > 0;
             });
        }
    }

    // 策略 3: 尝试 .stem_answer 结构 (有时出现在查看答案页面)
    if (optionEls.length === 0) {
        optionEls = Array.from(questionEl.querySelectorAll('.stem_answer .answer_option'));
    }

    // 策略 4: 通用兜底 - 查找所有以 A-Z 开头并带有标点的块级元素 (排除题干部分)
    if (optionEls.length === 0) {
        // 获取题目容器下的所有可能元素，排除 question-name 内部的
        const allCandidates = Array.from(questionEl.querySelectorAll('div, p, li, dd'));
        optionEls = allCandidates.filter(el => {
             // 1. 不能在题干 (.question-name) 内
             if (el.closest('.question-name')) return false;
             
             // 2. 文本必须匹配选项模式 (A. B. C. A、B、 [A] 等)
             const text = el.innerText.trim();
             // 正则：以 A-Z 开头，后跟 . 、 或者是 [A-Z] 形式
             const isOptionPattern = /^(?:[A-Z][\.\、\s]|[\[\(][A-Z][\]\)])/.test(text);
             
             // 3. 必须包含有效内容 (长度 > 2，例如 "A. x")
             return isOptionPattern && text.length > 2;
        });
    }

    // 策略 5: 最后的尝试 - 查找纯文本节点 (某些极端情况)
    // 暂时不实现，因为很难区分普通文本

    optionEls.forEach(el => {
      let optText = extractContentWithImages(el);
      // 移除选项前缀 A. B. 等 (支持 A. A、 A [A] (A) 等格式)
      optText = optText.replace(/^(?:[A-Z][\.\、\s]*|[\[\(][A-Z][\]\)]\s*)/, '');
      if (optText.trim()) {
          options.push(optText.trim());
      }
    });

    // 答案
    let answer = '未找到答案';
    const correctAnsLabel = Array.from(questionEl.querySelectorAll('.pn-label')).find(el => el.innerText.includes('正确答案'));
    if (correctAnsLabel) {
      const parent = correctAnsLabel.parentNode;
      if (type === 'fill_blank') {
        // 多空填空题：正确答案在 .pn-val-list .pn-val-item 里
        const valItems = parent.querySelectorAll('.pn-val-item');
        if (valItems.length > 0) {
          const parts = Array.from(valItems).map(item => {
            const clone = item.cloneNode(true);
            // 去掉 (1) (2) 序号 span
            clone.querySelectorAll('span:first-child').forEach(s => {
              if (/^\(\d+\)$/.test(s.textContent.trim())) s.remove();
            });
            return extractContentWithImages(clone).trim();
          }).filter(Boolean);
          answer = parts.join('###');
        } else {
          const valEl = parent.querySelector('.pn-val');
          if (valEl) answer = extractContentWithImages(valEl);
        }
      } else {
        const valEl = parent.querySelector('.pn-val');
        if (valEl) answer = extractContentWithImages(valEl);
      }
    }

    if (answer === '未找到答案') {
      const answerEl = questionEl.querySelector('.mark_answer .rightAnswerContent');
      if (answerEl) answer = extractContentWithImages(answerEl);
    }

    return {
      title,
      type,
      options,
      answer
    };
  } catch (error) {
    console.error('解析随堂题目失败:', error);
    return null;
  }
};

// 主功能函数
export const initXXTSuitangParser = async (context = {}) => {
  console.log('正在初始化学习通随堂练习解析器...');
  
  let doc = document;
  let isIframeMode = false;

  // 1. 优先检查当前文档
  let questions = doc.querySelectorAll('.question-item');
  
  // 2. 如果当前文档没有，递归查找 iframe
  if (questions.length === 0) {
      isIframeMode = true;
      const findDocWithQuestions = (currentDoc) => {
          let qs = currentDoc.querySelectorAll('.question-item');
          if (qs.length > 0) return { doc: currentDoc, questions: qs };
          
          const frames = currentDoc.querySelectorAll('iframe');
          for (let i = 0; i < frames.length; i++) {
              try {
                  const frame = frames[i];
                  const frameDoc = frame.contentDocument || frame.contentWindow.document;
                  if (frameDoc && frameDoc.body && frameDoc.location.href !== 'about:blank') {
                      const result = findDocWithQuestions(frameDoc);
                      if (result) return result;
                  }
              } catch (e) {
                  // Ignore cross-origin frames
              }
          }
          return null;
      };

      const result = findDocWithQuestions(doc);
      if (result) {
          doc = result.doc;
          questions = result.questions;
      }
  }

  if (questions.length === 0) {
    console.warn('未检测到随堂题目元素 (.question-item)');
    return { count: 0, questions: [], addQuestionToExam };
  }

  injectStylesLocal(doc);

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
      context.existingQuestions = [];
    }
  }

  let count = 0;
  const parsedQuestions = [];
  
  questions.forEach(questionEl => {
    // 允许重复解析
    // if (questionEl.querySelector('.zerror-xxt-parser-marker')) return;

    const data = parseSuitangQuestion(questionEl);
    if (!data) return;

    parsedQuestions.push(data);
    count++;

    if (questionEl.querySelector('.zerror-xxt-parser-marker')) return;

    // 添加标记按钮
    const marker = doc.createElement('span');
    marker.className = 'zerror-xxt-parser-marker';
    marker.textContent = '查看解析';
    
    // 插入到题目名称后面
    const nameEl = questionEl.querySelector('.question-name');
    if (nameEl) {
      nameEl.appendChild(marker);
      
      // 添加操作按钮
      if (context && context.token && context.courseId && context.folderId) {
        let isAdded = false;
        if (context.existingQuestions) {
            isAdded = context.existingQuestions.some(q => q.Content === data.title);
        }

        const btn = doc.createElement('button');
        btn.className = 'zerror-xxt-parser-btn';
        
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
                    btn.textContent = '添加失败';
                    btn.disabled = false;
                    btn.style.backgroundColor = '#dc2626';
                }
            };
        }
        nameEl.appendChild(btn);
      }
      
      let panel = null;
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        if (panel) {
          panel.remove();
          panel = null;
          marker.textContent = '查看解析';
        } else {
          panel = createInfoPanel(data, context, doc);
          // 插入到 nameEl 后面
          if (nameEl.nextSibling) {
              nameEl.parentNode.insertBefore(panel, nameEl.nextSibling);
          } else {
              nameEl.parentNode.appendChild(panel);
          }
          marker.textContent = '收起解析';
        }
      });
    }
  });

  console.log(`随堂练习解析完成，共处理 ${count} 道题目`);
  return { count, questions: parsedQuestions, addQuestionToExam };
};
