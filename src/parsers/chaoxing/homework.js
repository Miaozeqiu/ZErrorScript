/**
 * 学习通作业页面解析器
 * 用于解析题目内容、选项和答案，并在页面上进行标记
 */

import { extractContentWithImages, normalizeFillBlankAnswer, injectStyles, addQuestionToExam } from './common.js';

// 注入样式（调用 common.js）
const injectStylesLocal = () => injectStyles('zerror-xxt-parser-styles');


// 解析子题目（小题）
// 兼容四种结构：
//   A. 章节页  .readCompreHensionItem  (i.index + ul.choice li)
//   B. 作业页  .reading_answer         (听力/阅读理解，.reader_answer_tit + .stem_answer .hoverDiv)
//   C. 作业页  .filling_answer         (完型填空，.filling_num + .stem_answer .hoverDiv)
//   D. 作业页  .mark_read .mark_item   (听力题子题，.mark_name.workTextWrap + dl.mark_fill.colorGreen dd)
const parseSubQuestion = (subEl) => {
  try {
    let type = 'single_choice';
    let title = '未知子题';
    const options = [];

    const indexEl    = subEl.querySelector('i.index');           // A
    const readerTit  = subEl.querySelector('.reader_answer_tit'); // B
    const fillingNum = subEl.querySelector('.filling_num');       // C
    // D: .mark_item 直接含 .mark_name.workTextWrap 的听力子题结构
    const markNameWorkText = subEl.querySelector('.mark_name.workTextWrap');
    const isMarkItem = !indexEl && !readerTit && !fillingNum && markNameWorkText;

    if (indexEl) {
      // ── A. 章节页结构 ──────────────────────────────────────
      const indexText = indexEl.innerText || indexEl.textContent || '';
      if (indexText.includes('单选')) type = 'single_choice';
      else if (indexText.includes('多选')) type = 'multiple_choice';
      else if (indexText.includes('判断')) type = 'true_false';
      else if (indexText.includes('填空')) type = 'fill_blank';
      else if (indexText.includes('简答')) type = 'short_answer';
      else if (indexText.includes('论述')) type = 'essay';
      else if (indexText.includes('计算')) type = 'calculation';
      else if (indexText.includes('名词解释')) type = 'definition';

      const clearDiv = subEl.querySelector('.clear');
      if (clearDiv) {
        const contentEl = clearDiv.querySelector('.clearfix');
        if (contentEl) title = extractContentWithImages(contentEl).trim();
      }

      subEl.querySelectorAll('ul.choice li, .Zy_ulTop.choice li').forEach(el => {
        const spans = el.querySelectorAll('span.fl');
        if (spans.length >= 2) {
          options.push(extractContentWithImages(spans[1]).trim());
        } else {
          options.push(extractContentWithImages(el).replace(/^[A-Z][、\s]+/, '').trim());
        }
      });

    } else if (readerTit) {
      // ── B. 作业页 听力/阅读理解结构 ───────────────────────
      const readType = readerTit.querySelector('.read_type');
      const typeText = readType?.innerText || readType?.textContent || '';
      if (typeText.includes('单选')) type = 'single_choice';
      else if (typeText.includes('多选')) type = 'multiple_choice';
      else if (typeText.includes('判断')) type = 'true_false';
      else if (typeText.includes('填空')) type = 'fill_blank';
      else if (typeText.includes('简答') || typeText.includes('名词解释')) type = 'short_answer';

      // 题干：克隆标题元素，移除类型标签后取文本
      const titClone = readerTit.cloneNode(true);
      titClone.querySelector('.read_type')?.remove();
      title = extractContentWithImages(titClone).replace(/^\(\d+\)\s*/, '').trim();

      // 选项：.stem_answer 内每个 .hoverDiv 的 .answer_p
      subEl.querySelectorAll('.stem_answer .hoverDiv .answer_p').forEach(el => {
        options.push(extractContentWithImages(el).trim());
      });

    } else if (fillingNum) {
      // ── C. 作业页 完型填空结构（每空固定为单选）────────────
      type = 'single_choice';
      title = (fillingNum.innerText || fillingNum.textContent || '').trim();

      subEl.querySelectorAll('.stem_answer .hoverDiv .answer_p').forEach(el => {
        options.push(extractContentWithImages(el).trim());
      });
    } else if (isMarkItem) {
      // ── D. 作业页 听力题子题结构（.mark_read .mark_item）──────
      const typeText = markNameWorkText.querySelector('.colorShallow')?.innerText || '';
      if (typeText.includes('单选')) type = 'single_choice';
      else if (typeText.includes('多选')) type = 'multiple_choice';
      else if (typeText.includes('判断')) type = 'true_false';
      else if (typeText.includes('填空')) type = 'fill_blank';
      else if (typeText.includes('简答') || typeText.includes('名词解释')) type = 'short_answer';

      const titleClone = markNameWorkText.cloneNode(true);
      titleClone.querySelector('.colorShallow')?.remove();
      title = extractContentWithImages(titleClone).replace(/^\(\d+\)\s*/, '').trim();

      subEl.querySelectorAll('.mark_letter li, .stem_answer .hoverDiv .answer_p').forEach(el => {
        const optionText = extractContentWithImages(el).replace(/^[A-Z][\.、\s]+/, '').trim();
        if (optionText) options.push(optionText);
      });
    }

    // 答案：优先取明确的“正确答案”区域，其次回退到“我的答案”
    let answer = '未找到答案';
    const greenAnswerEls = subEl.querySelectorAll('dl.mark_fill.colorGreen dd, dl.mark_fill.colorGreen .rightAnswerContent');
    if (greenAnswerEls.length > 0) {
      const parts = Array.from(greenAnswerEls)
        .map(el => normalizeFillBlankAnswer(extractContentWithImages(el)))
        .filter(Boolean);
      if (parts.length > 1) {
        answer = parts.join('###');
      } else if (parts.length === 1) {
        answer = parts[0];
      }
    }

    if (answer === '未找到答案') {
      const rightAnsEl = subEl.querySelector('.mark_answer .rightAnswerContent, .mark_fill .rightAnswerContent, .rightAnswerContent');
      if (rightAnsEl) answer = extractContentWithImages(rightAnsEl).trim();
    }

    if (answer === '未找到答案') {
      const myAnswerEl = subEl.querySelector('.myAnswer .answerCon, .mark_fill.colorDeep .answer_span, .mark_fill.colorDeep dd .answer_span');
      if (myAnswerEl) answer = extractContentWithImages(myAnswerEl).trim();
    }

    if (type === 'fill_blank' && answer !== '未找到答案') {
      answer = normalizeFillBlankAnswer(answer);
    }

    return { title, type, options, answer };
  } catch (error) {
    console.error('解析子题失败:', error);
    return null;
  }
};

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
    
    // 移除开头的题号 (如 "1. ", "1、")，要求数字后跟明确分隔符，避免将数字内容的题干误删
    title = title.replace(/^\s*\d+(?:[\.\.、]\s*|\s+)/, '').trim();
    // 移除末尾的题型标识（支持 ()（）【】，含新增题型）
    title = title.replace(/\s*[\(（【](单选题|多选题|判断题|填空题|简答题|名词解释|论述题|听力题|阅读理解|完形填空|完型填空|计算题)[\)）】]\s*/g, '');

    // 题目类型推断
    let type = 'single_choice';
    const typeText = questionEl.querySelector('.mark_name .colorShallow')?.innerText || '';
    if (typeText.includes('单选题')) type = 'single_choice';
    else if (typeText.includes('多选题')) type = 'multiple_choice';
    else if (typeText.includes('判断')) type = 'true_false';
    else if (typeText.includes('完形') || typeText.includes('完型')) type = 'cloze';
    else if (typeText.includes('填空')) type = 'fill_blank';
    else if (typeText.includes('简答题')) type = 'short_answer';
    else if (typeText.includes('论述题')) type = 'essay';
    else if (typeText.includes('计算题')) type = 'calculation';
    else if (typeText.includes('名词解释')) type = 'definition';
    else if (typeText.includes('听力')) type = 'listening';
    else if (typeText.includes('阅读')) type = 'reading';

    // 检查是否有子题目
    // 章节: .readCompreHensionItem | 作业听力/阅读: .reading_answer | 作业完型: .filling_answer | 作业听力子题: .mark_read .mark_item
    const subQuestionEls = questionEl.querySelectorAll(
      '.readCompreHensionItem, .readComprehensionQues .reading_answer, .clozeTextQues .filling_answer, .mark_read .mark_item'
    );
    if (subQuestionEls.length > 0) {
      const children = [];
      subQuestionEls.forEach(subEl => {
        const subData = parseSubQuestion(subEl);
        if (subData) children.push(subData);
      });
      return { id, title, type, options: [], answer: '', children };
    }

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
        if (isCorrect) {
            // 如果已做答且正确，提取“我的答案”作为正确答案
            const myAnswerEl = questionEl.querySelector('.myAnswer .answerCon');
            if (myAnswerEl) {
                answer = extractContentWithImages(myAnswerEl);
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
