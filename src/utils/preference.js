const gmAvailable = typeof GM_getValue === 'function' && typeof GM_setValue === 'function'

const getUrlParam = (name) => {
  const reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)');
  const r = window.location.search.substr(1).match(reg);
  if (r != null) return decodeURIComponent(r[2]);
  return null;
}

const getCurrentCourseKey = () => {
  const host = window.location.host;
  
  if (host.includes('icourse163.org')) {
    const match = window.location.href.match(/learn\/([^\/#\?]+)/);
    if (match) {
      return `mooc_${match[1]}`;
    }
  }
  
  if (host.includes('chaoxing.com')) {
    const courseId = getUrlParam('courseid') || getUrlParam('courseId');
    if (courseId) {
      return `cx_${courseId}`;
    }
  }

  if (host.includes('icve.com.cn')) {
    const examId = getUrlParam('examId');
    if (examId) {
      return `icve_exam_${examId}`;
    }
  }
  
  return null;
}

let detectedActiveId = null;

export const setDetectedActiveId = (id) => {
  detectedActiveId = id;
}

const getCurrentWorkKey = () => {
  const host = window.location.host;

  if (host.includes('icve.com.cn')) {
    const examId = getUrlParam('examId');
    if (examId) {
      console.log(`[ZError] 定位文件夹原因: URL包含 examId (${examId})`);
      return `icve_exam_${examId}`;
    }
  }

  if (host.includes('chaoxing.com')) {
    // 0. 优先使用跨帧检测到的 activeId
    if (detectedActiveId) {
      console.log(`[ZError] 定位文件夹原因: 检测到跨帧 activeId (${detectedActiveId})`);
      return `cx_active_${detectedActiveId}`;
    }

    // 1. 优先尝试 workId (作业页面)
    const workId = getUrlParam('workId') || getUrlParam('workid');
    if (workId) {
      console.log(`[ZError] 定位文件夹原因: URL包含 workId (${workId})`);
      return `cx_work_${workId}`;
    }
    
    // 2. 其次尝试 studentstudy 路由 (章节测验页面)
    // 路由示例: /mycourse/studentstudy?chapterId=1089012369&courseId=...
    // 需求变更：使用 studentstudy 这个路由作为 key，而不是 chapterId
    // 这样同一个课程下的所有章节测验都会共享同一个文件夹选择
    if (window.location.pathname.includes('/studentstudy')) {
      const courseId = getUrlParam('courseid') || getUrlParam('courseId');
      if (courseId) {
        console.log(`[ZError] 定位文件夹原因: 章节页面 studentstudy 路由 (课程ID: ${courseId})`);
        return `cx_studentstudy_${courseId}`;
      }
    }

    // 3. 尝试从 iframe 中获取 activeId (随堂练习)
    try {
        // 先检查 URL 参数 (如果脚本运行在 iframe 中)
        const activeId = getUrlParam('activeId') || getUrlParam('activeid');
        if (activeId) {
            console.log(`[ZError] 定位文件夹原因: Iframe URL包含 activeId (${activeId})`);
            return `cx_active_${activeId}`;
        }

        // 如果在顶层页面，遍历 iframe 查找
        const iframes = document.querySelectorAll('iframe');
        for (const iframe of iframes) {
            // 检查 src 属性
            const src = iframe.src;
            if (src && src.includes('activeId=')) {
                const match = src.match(/activeId=(\d+)/);
                if (match) {
                    console.log(`[ZError] 定位文件夹原因: 发现子 Iframe src 包含 activeId (${match[1]})`);
                    return `cx_active_${match[1]}`;
                }
            }
            
            // 尝试检查 contentWindow (同源策略允许的情况下)
            try {
                const loc = iframe.contentWindow?.location?.href;
                if (loc && loc.includes('activeId=')) {
                    const match = loc.match(/activeId=(\d+)/);
                    if (match) {
                        console.log(`[ZError] 定位文件夹原因: 发现子 Iframe location 包含 activeId (${match[1]})`);
                        return `cx_active_${match[1]}`;
                    }
                }
            } catch (e) {
                // 忽略跨域错误
            }
        }
    } catch (e) {
        console.warn('查找 activeId 失败', e);
    }
    
    // 如果没有找到 workId, chapterId, 或 activeId，则不返回任何 key，避免错误定位
    console.log('[ZError] 未能定位文件夹: 未找到有效标识符');
    return null;
  }
  return null;
}

const saveToStorage = (key, value) => {
  try {
    if (gmAvailable) {
      GM_setValue(key, value);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) {
    console.warn('保存数据失败', e);
  }
}

const getFromStorage = (key) => {
  try {
    if (gmAvailable) {
      return GM_getValue(key, null);
    } else {
      const dataStr = localStorage.getItem(key);
      return dataStr ? JSON.parse(dataStr) : null;
    }
  } catch (e) {
    return null;
  }
}

export const saveWindowState = (isMinimized) => {
  saveToStorage('zerror_window_state', { isMinimized });
}

export const getSavedWindowState = () => {
  const data = getFromStorage('zerror_window_state');
  // 默认为 false (展开状态)
  return data ? !!data.isMinimized : false;
}

export const saveSelection = (courseId, folderId) => {
  const courseKey = getCurrentCourseKey();
  const workKey = getCurrentWorkKey();
  
  if (courseKey && courseId) {
    saveToStorage(`pref_course_${courseKey}`, { courseId });
  }
  
  if (workKey && folderId) {
    saveToStorage(`pref_folder_${workKey}`, { folderId });
  } else if (!workKey) {
    console.log('[ZError] 未找到有效 workKey，跳过文件夹保存');
  }
}

export const getSavedSelection = () => {
  const courseKey = getCurrentCourseKey();
  // 注意：这里调用 getCurrentWorkKey 会打印日志
  const workKey = getCurrentWorkKey();
  
  if (!courseKey) return null;
  
  const courseData = getFromStorage(`pref_course_${courseKey}`);
  const oldData = getFromStorage(`course_selection_${courseKey}`);
  const targetCourseId = courseData?.courseId || oldData?.courseId;
  
  if (!targetCourseId) return null;
  
  let targetFolderId = '';
  
  if (workKey) {
    const folderData = getFromStorage(`pref_folder_${workKey}`);
    if (folderData?.folderId) {
      targetFolderId = folderData.folderId;
    }
  }
  
  // 只有当 workKey 存在时，才允许回退到 oldData
  // 或者，如果策略是"没有 workKey 就完全不定位文件夹"，那么这里也要修改。
  // 根据日志 "[ZError] 未能定位文件夹: 未找到有效标识符 却任然选择了文件夹"，
  // 说明 workKey 为 null，但 targetFolderId 仍然被赋值了。
  // 罪魁祸首是下面这段代码：
  /*
  if (!targetFolderId && oldData?.folderId) {
     targetFolderId = oldData.folderId;
  }
  */
  
  // 修改后：只有当 workKey 存在（即明确知道当前是在哪个作业/练习中）时，
  // 或者处于非学习通环境（如MOOC）时，才允许使用旧数据。
  // 对于学习通，必须严格要求 workKey。
  
  const isChaoxing = window.location.host.includes('chaoxing.com');
  
  if (!targetFolderId && oldData?.folderId) {
     // 如果是学习通，且没有找到 workKey，则不允许使用旧的 folderId
     if (isChaoxing && !workKey) {
         console.log('[ZError] 学习通环境下未找到 workKey，忽略旧版默认文件夹');
     } else {
         targetFolderId = oldData.folderId;
     }
  }
  
  return {
    courseId: targetCourseId,
    folderId: targetFolderId
  };
}
