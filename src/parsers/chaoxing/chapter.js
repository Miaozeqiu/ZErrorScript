/**
 * 学习通章节测验解析器
 * 针对 https://mooc1.chaoxing.com/mycourse/studentstudy 页面
 * 需要处理 iframe 内容
 */

import { mappingRecognize } from '../../utils/cx-decrypt.js';
import { extractContentWithImages, normalizeFillBlankAnswer, injectStyles, addQuestionToExam } from './common.js';

const injectStylesLocal = (doc) => injectStyles('xxt-chapter-parser-styles', doc);

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
  
  if (context && context.token && context.courseId && context.folderId) {
    // 按钮已移至外层，这里不再添加
  }

  return panel;
};


// 解析子题目（小题）
// 兼容三种结构：
//   A. 章节页  .readCompreHensionItem  (i.index + ul.choice li)
//   B. 作业页  .reading_answer         (听力/阅读理解，.reader_answer_tit + .stem_answer .hoverDiv)
//   C. 作业页  .filling_answer         (完型填空，.filling_num + .stem_answer .hoverDiv)
const parseSubQuestion = (subEl) => {
  try {
    let type = 'single_choice';
    let title = '未知子题';
    const options = [];

    const indexEl    = subEl.querySelector('i.index');            // A
    const readerTit  = subEl.querySelector('.reader_answer_tit'); // B
    const fillingNum = subEl.querySelector('.filling_num');       // C

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

      const titClone = readerTit.cloneNode(true);
      titClone.querySelector('.read_type')?.remove();
      title = extractContentWithImages(titClone).replace(/^\(\d+\)\s*/, '').trim();

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
    }

    // 答案提取
    let answer = '未找到答案';

    if (type === 'fill_blank') {
      // 章节听力/阅读子题填空：从 .myAllAnswerBx 逐空提取
      const allAnswerBx = subEl.querySelector('.myAllAnswerBx');
      if (allAnswerBx) {
        const blanks = allAnswerBx.querySelectorAll('.myAnswerBx');
        const parts = [];
        blanks.forEach(bx => {
          const isCorrect = !!bx.querySelector('.marking_dui');
          const myAnswerEl = bx.querySelector('.myAnswer');
          if (!myAnswerEl) {
            parts.push('此空答案未知');
            return;
          }

          // 优先取 myAnswer 内 <p> 的内容，避免“第一空/第二空”前缀混入
          const pEl = myAnswerEl.querySelector('p');
          let text;
          if (pEl) {
            text = extractContentWithImages(pEl).trim();
          } else {
            const clone = myAnswerEl.cloneNode(true);
            clone.querySelectorAll('.answerFont, p.clear').forEach(el => el.remove());
            text = (clone.innerText || clone.textContent || '')
              .replace(/^第[一二三四五六七八九十\d]+空[：:]\s*/, '')
              .replace(/\u00a0/g, ' ')
              .trim();
          }

          if (isCorrect && text) {
            parts.push(text);
          } else {
            parts.push('此空答案未知');
          }
        });
        if (parts.length > 0) answer = parts.join('###');
      } else {
        const rightAnsEl = subEl.querySelector('.mark_answer .rightAnswerContent, .mark_fill .rightAnswerContent, .rightAnswerContent');
        if (rightAnsEl) {
          answer = normalizeFillBlankAnswer(extractContentWithImages(rightAnsEl).trim());
        }
      }
    } else {
      // 非填空：做对取“我的答案”，否则尝试正确答案区域
      if (subEl.querySelector('.marking_dui')) {
        const myAnswerEl = subEl.querySelector('.myAnswer .answerCon');
        if (myAnswerEl) answer = extractContentWithImages(myAnswerEl).trim();
      }
      if (answer === '未找到答案') {
        const rightAnsEl = subEl.querySelector('.mark_answer .rightAnswerContent, .mark_fill .rightAnswerContent, .rightAnswerContent');
        if (rightAnsEl) answer = extractContentWithImages(rightAnsEl).trim();
      }
    }

    return { title, type, options, answer };
  } catch (error) {
    console.error('解析子题失败:', error);
    return null;
  }
};

// 解析单个题目
const parseChapterQuestion = (questionEl) => {
  try {
    // 章节测验常见结构: div.TiMu
    const id = questionEl.getAttribute('data-id') || questionEl.id || ('q_' + Math.random());
    
    // 题干
    // 通常在 .Zy_TItle .font-cx 中，或者 .Zy_TItle .qtContent
    let titleEl = questionEl.querySelector('.Zy_TItle .qtContent');
    if (!titleEl) titleEl = questionEl.querySelector('.Zy_TItle .font-cx');
    if (!titleEl) titleEl = questionEl.querySelector('.Zy_TItle .fontLabel'); // 适配 fontLabel 结构
    if (!titleEl) titleEl = questionEl.querySelector('.mark_name .qtContent'); // 兼容作业样式
    if (!titleEl) titleEl = questionEl.querySelector('.timu_title');
    
    // 如果仍然找不到，尝试直接获取 .Zy_TItle 的文本，并手动清理
    if (!titleEl) {
        const zyTitle = questionEl.querySelector('.Zy_TItle');
        if (zyTitle) {
            // 克隆节点以避免修改原始 DOM
            const clone = zyTitle.cloneNode(true);
            // 移除不需要的元素，如操作按钮
            const removeSelectors = ['.zerror-xxt-parser-marker', '.zerror-xxt-parser-btn', '.TiMu_ico', 'i.fl'];
            removeSelectors.forEach(sel => {
                const els = clone.querySelectorAll(sel);
                els.forEach(el => el.remove());
            });
            titleEl = clone;
        }
    }

    let title = titleEl ? extractContentWithImages(titleEl) : '未知题目';
    // 移除题号 (例如 "1. ")
    title = title.replace(/^\d+[\.、\s]*/, '');
    // 移除题型后缀/前缀 (支持 () 或 【】)
    title = title.replace(/\s*[\(（【](单选题|多选题|判断题|填空题|简答题|论述题|名词解释|计算题|听力题|阅读理解|完形填空)[\)）】]\s*/g, '');

    // 题型
    let type = 'single_choice';
    // .TiMu_ico 包含题型信息
    const typeEl = questionEl.querySelector('.TiMu_ico');
    if (typeEl) {
        const typeText = typeEl.innerText;
        if (typeText.includes('单选')) type = 'single_choice';
        else if (typeText.includes('多选')) type = 'multiple_choice';
        else if (typeText.includes('判断')) type = 'true_false';
        else if (typeText.includes('完形')) type = 'cloze';
        else if (typeText.includes('填空')) type = 'fill_blank';
        else if (typeText.includes('简答')) type = 'short_answer';
        else if (typeText.includes('论述')) type = 'essay';
        else if (typeText.includes('计算')) type = 'calculation';
        else if (typeText.includes('名词解释')) type = 'definition';
        else if (typeText.includes('听力')) type = 'listening';
        else if (typeText.includes('阅读')) type = 'reading';
    } else {
        // 尝试从 mark_name 获取
        let typeText = questionEl.querySelector('.mark_name .colorShallow')?.innerText || '';
        // 尝试从 titleEl 获取 (例如 【单选题】)
        if (!typeText && titleEl) {
             typeText = titleEl.innerText;
        }
        // 尝试从 .newZy_TItle 获取
        if (!typeText) {
             typeText = questionEl.querySelector('.newZy_TItle')?.innerText || '';
        }

        if (typeText.includes('单选')) type = 'single_choice';
        else if (typeText.includes('多选')) type = 'multiple_choice';
        else if (typeText.includes('判断')) type = 'true_false';
        else if (typeText.includes('完形')) type = 'cloze';
        else if (typeText.includes('填空')) type = 'fill_blank';
        else if (typeText.includes('简答')) type = 'short_answer';
        else if (typeText.includes('论述')) type = 'essay';
        else if (typeText.includes('计算')) type = 'calculation';
        else if (typeText.includes('名词解释')) type = 'definition';
        else if (typeText.includes('听力')) type = 'listening';
        else if (typeText.includes('阅读')) type = 'reading';
    }

    // 检查是否有子题目（大题：听力、阅读理解、完形填空等）
    const subQuestionEls = questionEl.querySelectorAll(
      '.readCompreHensionItem, .readComprehensionQues .reading_answer, .clozeTextQues .filling_answer'
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
    // 章节测验选项通常在 .Zy_ulTop li
    let optionEls = questionEl.querySelectorAll('.Zy_ulTop li');
    if (optionEls.length === 0) optionEls = questionEl.querySelectorAll('.mark_letter li');
    
    optionEls.forEach(el => {
      let optText = '';
      // 优先查找 a 标签中的文本
      const aTag = el.querySelector('a');
      if (aTag) {
          optText = extractContentWithImages(aTag);
      } else {
          optText = extractContentWithImages(el);
      }
      
      // 移除选项前缀 A. B. 等 (如果是从 li 直接获取的文本，可能包含前缀)
      if (!aTag) {
          optText = optText.replace(/^[A-Z][\.\、\s]+/, '');
      }
      
      options.push(optText);
    });

    // 答案
    // 章节测验可能没有直接显示答案，或者在 .Py_answer
    let answer = '未找到答案';
    const answerEl = questionEl.querySelector('.Py_answer');
    if (answerEl) {
        // 格式通常为 "正确答案： A"
        const text = extractContentWithImages(answerEl);
        const match = text.match(/正确答案[:：]\s*([^\s]+)/);
        if (match) {
            answer = match[1];
        } else {
            // 尝试移除 "正确答案" 前缀
            answer = text.replace(/正确答案[:：]\s*/, '');
        }
    } else {
        // 兼容作业样式
        const rightAnsEl = questionEl.querySelector('.mark_answer .rightAnswerContent');
        if (rightAnsEl) {
            answer = extractContentWithImages(rightAnsEl);
        } else {
             // 尝试 .correctAnswer .answerCon
             const correctAnsCon = questionEl.querySelector('.correctAnswer .answerCon');
             if (correctAnsCon) {
                 answer = extractContentWithImages(correctAnsCon);
             } else {
                // 尝试从 .correctAnswerBx .correctAnswer 提取（针对名词解释等题型）
                // 这种结构下，答案通常在第二个 .correctAnswer div 中，或者包含 .marTop6
                const correctAnswerBlock = questionEl.querySelector('.correctAnswerBx');
                if (correctAnswerBlock) {
                    // 如果是填空题，尝试提取所有空
                    if (type === 'fill_blank') {
                        const caDivs = correctAnswerBlock.querySelectorAll('.correctAnswer');
                        const answers = [];
                        caDivs.forEach(div => {
                            const text = extractContentWithImages(div);
                            // 排除 "正确答案：" 标签
                            if (!text.startsWith('正确答案：')) {
                                // 移除 "第一空：" "第二空：" 等前缀
                                const cleanText = text.replace(/^第[一二三四五六七八九十]+空[：:]\s*/, '').trim();
                                if (cleanText) {
                                    answers.push(cleanText);
                                }
                            }
                        });
                        if (answers.length > 0) {
                            answer = answers.join('###');
                        }
                    }

                    // 如果答案仍未找到（非填空题或提取失败），尝试默认逻辑
                    if (answer === '未找到答案') {
                        const contentDiv = correctAnswerBlock.querySelector('.correctAnswer.marTop6');
                        if (contentDiv) {
                            answer = extractContentWithImages(contentDiv);
                        } else {
                            // 如果没有 marTop6，尝试获取所有 .correctAnswer，排除包含“正确答案”标签的那个
                            const caDivs = correctAnswerBlock.querySelectorAll('.correctAnswer');
                            for (let i = 0; i < caDivs.length; i++) {
                                const divText = extractContentWithImages(caDivs[i]);
                                if (!divText.startsWith('正确答案')) {
                                    answer = divText;
                                    break;
                                }
                            }
                        }
                    }
                }
                
                if (answer !== '未找到答案') {
                    // 找到了答案，跳过后续检查
                } else {
                     // 检查是否已做答且正确（marking_dui）
                     const isCorrect = questionEl.querySelector('.marking_dui');
                     if (isCorrect) {
                         // 如果已做答且正确，提取“我的答案”作为正确答案
                         const myAnswerEl = questionEl.querySelector('.myAnswer .answerCon');
                         if (myAnswerEl) {
                             answer = extractContentWithImages(myAnswerEl);
                         }
                     } else {
                         // 如果没有正确答案，也没有 marking_dui，则认为是错题或未做题，不提取答案
                     }
                }
             }
        }
    }

    // 如果答案仍然未找到，且是填空题，尝试从多个空提取
    // 上面已经处理了 fill_blank 的情况，这里作为双重保险，或者处理其他未被覆盖的情况
    if (type === 'fill_blank' && (answer === '未找到答案' || answer.trim() === '')) {
        // 尝试从 .correctAnswerBx .correctAnswer 提取所有空
        const correctAnswerBlock = questionEl.querySelector('.correctAnswerBx');
        if (correctAnswerBlock) {
            const caDivs = correctAnswerBlock.querySelectorAll('.correctAnswer');
            const answers = [];
            caDivs.forEach(div => {
                const text = extractContentWithImages(div);
                // 排除 "正确答案：" 标签
                if (!text.startsWith('正确答案：')) {
                    // 移除 "第一空：" "第二空：" 等前缀
                    const cleanText = text.replace(/^第[一二三四五六七八九十]+空[：:]\s*/, '').trim();
                    if (cleanText) {
                        answers.push(cleanText);
                    }
                }
            });
            if (answers.length > 0) {
                // 将多个空的答案合并，通常用特定分隔符（如分号或换行）
                // 学习通的填空题多个空通常用 分号 或 ### 或 # 分隔，这里暂用 ### 以便后续处理
                answer = answers.join('###');
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
    console.error('解析章节题目失败:', error);
    return null;
  }
};

export const initXXTChapterParser = async (context = {}) => {
  console.log('正在初始化学习通章节解析器...');
  
  let doc = document;
  let isIframeMode = false;

  // 1. 优先检查当前文档是否直接包含题目
  // 章节测验题目通常在 .TiMu 类中
  let questions = doc.querySelectorAll('.TiMu');
  if (questions.length === 0) {
      // 尝试 .questionLi
      questions = doc.querySelectorAll('.questionLi');
  }

  // 2. 如果当前文档没有题目，尝试查找 iframe
  if (questions.length === 0) {
    isIframeMode = true;
    // 查找 iframe
    const iframe = document.getElementById('iframe');
    if (!iframe) {
      console.warn('当前页面未检测到题目，也未找到 iframe (id="iframe")');
      return { count: 0, questions: [], addQuestionToExam };
    }

    // 等待 iframe 加载完成
    const waitForIframe = () => {
      return new Promise((resolve) => {
        const checkIframe = () => {
            try {
                const frameDoc = iframe.contentDocument || iframe.contentWindow.document;
                console.log('Iframe Check - Location:', frameDoc.location.href);
                console.log('Iframe Check - ReadyState:', frameDoc.readyState);
                console.log('Iframe Check - Body Children:', frameDoc.body ? frameDoc.body.children.length : 'No Body');
                
                if (frameDoc && frameDoc.readyState === 'complete' && frameDoc.location.href !== 'about:blank') {
                    if (frameDoc.body && frameDoc.body.children.length > 0) {
                       console.log('Iframe Content Found!');
                       // 打印部分内容以确认
                       console.log('Iframe Body HTML (Preview):', frameDoc.body.innerHTML.substring(0, 500));
                       resolve(frameDoc);
                       return true;
                    }
                }
            } catch (e) {
                console.error('Iframe Access Error:', e);
            }
            return false;
        };

        // 立即检查一次
        if (checkIframe()) return;
  
        // 监听 load 事件
        const onLoad = () => {
          console.log('Iframe Load Event Triggered');
          iframe.removeEventListener('load', onLoad);
          if (!checkIframe()) {
             // 如果 load 事件触发但仍未通过检查（例如内容为空），尝试获取
             try {
                resolve(iframe.contentDocument || iframe.contentWindow.document);
             } catch(e) { resolve(null); }
          }
        };
        iframe.addEventListener('load', onLoad);
  
        // 轮询检查 (针对动态加载)
        let checks = 0;
        const interval = setInterval(() => {
            checks++;
            console.log(`Polling Iframe (${checks})...`);
            if (checkIframe()) {
                clearInterval(interval);
                iframe.removeEventListener('load', onLoad);
            } else if (checks > 20) { // 约 10 秒超时
                clearInterval(interval);
                iframe.removeEventListener('load', onLoad);
                console.warn('Iframe Polling Timeout');
                try {
                    resolve(iframe.contentDocument || iframe.contentWindow.document);
                } catch (e) {
                    resolve(null);
                }
            }
        }, 500);
      });
    };
  
    doc = await waitForIframe();
    
    if (!doc) {
      console.error('无法访问 iframe 内容 (可能是跨域限制或加载超时)');
      return { count: 0, questions: [], addQuestionToExam };
    }
  }

  // 在目标文档中注入样式
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
      console.error('加载现有题目失败:', e);
      context.existingQuestions = [];
    }
  }

  // 递归查找含有题目的文档
  const findDocWithQuestions = (currentDoc) => {
      // 1. 检查当前文档
      let qs = currentDoc.querySelectorAll('.TiMu');
      if (qs.length === 0) qs = currentDoc.querySelectorAll('.questionLi');
      
      if (qs.length > 0) {
          console.log('在当前层级找到题目', currentDoc.location.href);
          return { doc: currentDoc, questions: qs };
      }

      // 2. 递归检查 iframe
      const frames = currentDoc.querySelectorAll('iframe');
      console.log(`当前层级 (${currentDoc.location.href}) 未找到题目，检查 ${frames.length} 个 iframe...`);
      
      for (let i = 0; i < frames.length; i++) {
          try {
              const frame = frames[i];
              const frameDoc = frame.contentDocument || frame.contentWindow.document;
              
              // 检查是否可访问且有内容
              if (frameDoc && frameDoc.body && frameDoc.location.href !== 'about:blank') {
                  const result = findDocWithQuestions(frameDoc);
                  if (result) return result;
              }
          } catch (e) {
              console.warn('跳过无法访问的 iframe (可能是跨域):', e);
          }
      }
      return null;
  };

  // 查找题目
  // 章节测验题目通常在 .TiMu 类中
  // 如果之前已经找到（Step 1），或者切换了 doc (Step 2)，这里重新获取或复用
  if (questions.length === 0 || isIframeMode) {
      // 如果处于 iframe 模式，我们已经有了一个 doc，但可能需要进一步深入查找嵌套的 iframe
      const result = findDocWithQuestions(doc);
      if (result) {
          doc = result.doc;
          questions = result.questions;
      } else {
          // 如果递归查找也没找到，重置为空
          questions = [];
      }
  }

  // 在处理题目之前，先尝试解密字体
  if (questions.length > 0) {
    try {
      console.log('检测到题目，尝试进行字体解密...');
      await mappingRecognize(doc);
    } catch (e) {
      console.error('字体解密失败:', e);
    }
  }

  if (questions.length === 0) {
    console.warn('未检测到题目元素 (.TiMu 或 .questionLi)');
    return { count: 0, questions: [], addQuestionToExam };
  }

  // 确保在最终找到题目的 doc 中注入样式
  injectStylesLocal(doc);

  let count = 0;
  const parsedQuestions = [];

  questions.forEach(questionEl => {
    // 允许重复解析，以便刷新数据
    // if (questionEl.querySelector('.zerror-xxt-parser-marker')) return;

    const data = parseChapterQuestion(questionEl);
    if (!data) return;

    parsedQuestions.push(data);
    count++;

    // 仅当没有标记时才添加标记按钮
    if (questionEl.querySelector('.zerror-xxt-parser-marker')) return;

    // 添加标记按钮
    const marker = doc.createElement('span');
    marker.className = 'zerror-xxt-parser-marker';
    marker.textContent = '查看解析';
    
    // 插入位置
    // 章节测验中，通常插入到 .Zy_TItle 内部或后面
    let titleArea = questionEl.querySelector('.Zy_TItle');
    if (!titleArea) titleArea = questionEl.querySelector('.mark_name');
    
    if (titleArea) {
      titleArea.appendChild(marker);

      // 添加操作按钮 (显示在外面)
      if (context && context.token && context.courseId && context.folderId) {
        // 检查题目是否已添加
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
      
      let panel = null;
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        if (panel) {
          panel.remove();
          panel = null;
          marker.textContent = '查看解析';
        } else {
          panel = createInfoPanel(data, context, doc);
          // 插入到 titleArea 后面
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

  console.log(`章节解析完成，共处理 ${count} 道题目`);
  return { count, questions: parsedQuestions, addQuestionToExam };
};
