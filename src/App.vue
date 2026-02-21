<template>
  <div class="zerror-window" :class="{ 'zerror-window--minimized': isMinimized, 'zerror-window--expanding': isExpanding }">
    <div class="zerror-window__header" @click="handleHeaderClick">
      <div class="zerror-window__tabs" v-if="!isMinimized">
        <div 
          class="zerror-window__tab"
          @click.stop="openCampusLink"
          style="display: flex; align-items: center; justify-content: center; cursor: pointer;"
          title="访问 ZError 题库"
        >
          <svg t="1769329335812" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="6910" width="20" height="20" style="fill: currentColor;">
            <path d="M485.376 931.84c-231.424 0-419.84-188.416-419.84-419.84s188.416-419.84 419.84-419.84c197.632 0 370.688 140.288 410.624 333.824 2.048 11.264 4.096 23.552 6.144 34.816 2.048 16.384-10.24 31.744-26.624 33.792-16.384 2.048-31.744-10.24-33.792-26.624-1.024-10.24-3.072-20.48-5.12-29.696-34.816-165.888-182.272-286.72-352.256-286.72-197.632 1.024-358.4 161.792-358.4 360.448S286.72 871.424 485.376 871.424c177.152 0 329.728-132.096 355.328-306.176 2.048-16.384 17.408-27.648 33.792-25.6 16.384 2.048 27.648 17.408 25.6 33.792C870.4 778.24 691.2 931.84 485.376 931.84z" p-id="6911"></path>
            <path d="M95.232 758.784c-45.056 0-70.656-12.288-80.896-36.864-19.456-45.056 34.816-94.208 77.824-126.976 13.312-10.24 31.744-8.192 41.984 5.12 10.24 13.312 8.192 31.744-5.12 41.984-36.864 28.672-51.2 46.08-56.32 55.296 39.936 10.24 202.752-16.384 464.896-130.048 262.144-113.664 393.216-215.04 412.672-250.88-12.288-3.072-47.104-5.12-131.072 14.336-16.384 4.096-32.768-6.144-35.84-22.528-4.096-16.384 6.144-32.768 22.528-35.84 122.88-28.672 185.344-22.528 203.776 18.432 17.408 40.96-19.456 90.112-121.856 158.72-82.944 56.32-198.656 117.76-325.632 173.056-126.976 55.296-250.88 98.304-349.184 119.808-48.128 11.264-87.04 16.384-117.76 16.384z" p-id="6912"></path>
          </svg>
        </div>
        <div 
          class="zerror-window__tab" 
          :class="{ 'zerror-window__tab--active': activeTab === 'upload' }"
          @click="activeTab = 'upload'"
          style="display: flex; align-items: center; justify-content: center;"
          title="题库上传页"
        >
          <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="20" height="20" style="fill: currentColor;"><path d="M920.5 457.5c-20.7-26.7-48.3-47.8-79.3-60.7-5.7-73.5-37-141.8-89.7-194.5-58.5-58.5-136.2-90.7-218.9-90.7-68.2 0-132.9 21.7-187.1 62.9-26 19.8-48.7 43.4-67.3 70.2-14.6 21.1-26.5 43.7-35.5 67.6-46.2 11-88.1 36.2-119.8 72.2-37.2 42.2-57.7 96.5-57.7 152.8 0 61.8 24.1 119.9 67.8 163.6 43.7 43.7 101.8 67.8 163.6 67.8 19.9 0 36-16.1 36-36s-16.1-36-36-36c-87.9 0-159.4-71.5-159.4-159.4 0-38.8 14.1-76.2 39.7-105.3 25.4-28.8 60.2-47.5 98-52.7h0.2c0.5-0.1 1-0.1 1.4-0.2 0.2 0 0.3-0.1 0.5-0.1 0.4-0.1 0.8-0.2 1.2-0.2 0.2-0.1 0.5-0.1 0.7-0.2 0.3-0.1 0.6-0.1 0.8-0.2 0.3-0.1 0.7-0.2 1-0.3 0.2-0.1 0.3-0.1 0.5-0.2 0.4-0.1 0.9-0.3 1.3-0.4 0.1 0 0.1 0 0.2-0.1 3.2-1.2 6.2-2.9 8.9-4.9l0.1-0.1 1.2-0.9c0.1-0.1 0.3-0.2 0.4-0.3 0.3-0.2 0.6-0.5 0.8-0.7 0.2-0.2 0.5-0.4 0.7-0.7l0.5-0.5 0.9-0.9c0.1-0.1 0.2-0.2 0.2-0.3 0.4-0.4 0.7-0.8 1-1.2l0.1-0.1c0.4-0.4 0.7-0.8 1-1.3v-0.1c0.3-0.4 0.6-0.9 1-1.3 0 0 0-0.1 0.1-0.1 0.3-0.4 0.6-0.8 0.8-1.2 0.1-0.1 0.1-0.2 0.2-0.3 0.2-0.4 0.4-0.7 0.7-1.1 0.1-0.2 0.2-0.3 0.3-0.5 0.2-0.3 0.3-0.6 0.5-0.9 0.1-0.3 0.3-0.5 0.4-0.8 0.1-0.2 0.2-0.4 0.3-0.7 0.2-0.4 0.3-0.7 0.5-1.1 0.1-0.1 0.1-0.3 0.2-0.4 0.2-0.5 0.4-0.9 0.5-1.4 0-0.1 0-0.1 0.1-0.2 0.2-0.5 0.4-1.1 0.5-1.7 14.2-48.2 44.2-91.5 84.4-122.1 41.6-31.5 91.2-48.2 143.5-48.2 63.5 0 123.1 24.7 168 69.6 44.9 44.9 69.6 104.5 69.6 168 0 11.5 5.4 21.8 13.8 28.3 4.2 4.1 9.4 7.2 15.5 8.8 52.6 14.5 89.4 62.8 89.4 117.5 0 67.2-54.7 121.9-121.9 121.9-19.9 0-36 16.1-36 36s16.1 36 36 36c106.9 0 193.9-87 193.9-193.9 0-42.9-13.9-83.9-40.3-118.1z"></path><path d="M539.6 530.7c-7.5-7.5-17.6-11-27.4-10.5-9.8-0.5-19.9 3-27.4 10.5L373.1 642.4c-14.1 14.1-14.1 36.9 0 50.9 7 7 16.2 10.5 25.5 10.5s18.4-3.5 25.5-10.5l52.2-52.2v235.8c0 19.9 16.1 36 36 36s36-16.1 36-36V641.1l52.2 52.2c7 7 16.2 10.5 25.5 10.5 9.2 0 18.4-3.5 25.5-10.5 14.1-14.1 14.1-36.9 0-50.9L539.6 530.7z"></path></svg>
        </div>
        <div 
          class="zerror-window__tab" 
          :class="{ 'zerror-window__tab--active': activeTab === 'user' }"
          @click="activeTab = 'user'"
          style="display: flex; align-items: center; justify-content: center;"
          title="用户页"
        >
          <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="20" height="20" style="fill: currentColor;"><path d="M512 447.223c-88.224 0-160-71.776-160-160s71.776-160 160-160c88.225 0 160 71.776 160 160s-71.775 160-160 160z m0-256c-52.935 0-96 43.065-96 96s43.065 96 96 96 96-43.065 96-96-43.065-96-96-96zM454.901 870.594c-96.594 0-184.933-3.802-231.263-49.955C203.308 800.386 193 774.164 193 742.701c0-31.629 10.247-62.812 30.457-92.686 17.978-26.573 42.908-50.741 74.098-71.833C359.256 536.46 437.418 512.53 512 512.53c74.55 0 152.55 23.943 214.002 65.691 31.05 21.094 55.861 45.273 73.746 71.867C819.822 679.937 830 711.096 830 742.701c0 31.552-10.317 57.827-30.664 78.097-50.714 50.521-151.822 50.128-258.88 49.723a7395.45 7395.45 0 0 0-56.914-0.001c-9.605 0.037-19.163 0.074-28.641 0.074zM512 806.447c9.567 0 19.149 0.037 28.701 0.073 49.52 0.191 96.284 0.37 135.808-4.396 38.418-4.633 64.546-13.604 77.659-26.668 5.079-5.06 11.832-13.96 11.832-32.755 0-38.089-27.688-78.744-75.963-111.54C638.933 596.442 574.04 576.53 512 576.53c-126.309 0-255 83.862-255 166.171 0 18.675 6.738 27.547 11.807 32.596 32.045 31.922 128.975 31.55 214.491 31.224 9.556-0.037 19.139-0.074 28.702-0.074z"></path></svg>
        </div>
      </div>
      
      

      <button class="zerror-window__minimize-btn" @click.stop="toggleMinimize" title="切换显示">
        <svg
          class="zerror-window__minimize-icon"
          :class="{ 'zerror-window__minimize-icon--rotated': isMinimized }"
          viewBox="0 0 1024 1024"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
        >
          <path d="M486.4 736L83.2 326.4c-12.8-6.4-12.8-12.8-12.8-19.2 0-6.4 6.4-19.2 12.8-25.6 6.4-6.4 12.8-12.8 25.6-12.8s12.8 6.4 19.2 12.8l384 384 384-384c6.4-6.4 12.8-12.8 25.6-12.8s19.2 6.4 25.6 12.8c6.4 6.4 12.8 12.8 12.8 25.6 0 6.4-6.4 19.2-12.8 25.6l-409.6 409.6c-6.4 6.4-12.8 12.8-25.6 12.8-6.4-6.4-19.2-6.4-25.6-19.2 0 6.4 0 0 0 0z" fill="currentColor"></path>
        </svg>
      </button>
    </div>
    
    <div class="zerror-window__body" ref="bodyRef" :style="bodyStyle" :aria-hidden="isMinimized ? 'true' : 'false'">
      <div ref="bodyContentRef" class="zerror-window__body-content">
        <!-- 题库上传页 -->
        <div v-show="activeTab === 'upload'">
          <div v-if="!token" class="zerror-window__hint-box">
            请先在用户页完成登录
          </div>
          <div v-else>
            <div v-if="campusInfo?.status === 'verified'" class="zerror-window__courses">
              <div class="zerror-window__courses-title">课程选择</div>
              <div class="zerror-window__field">
                <label class="zerror-window__field-label">课程</label>
                <div class="zerror-window__select-wrapper">
                  <input
                    class="zerror-window__select"
                    ref="courseInputRef"
                    :disabled="coursesLoading || !courses.length"
                    v-model="courseSearch"
                    @focus="openCourseOptions"
                    @input="handleCourseInput"
                    @blur="handleCourseBlur"
                    placeholder="请选择课程"
                  />
                  <Teleport to="body">
                    <div v-if="showCourseOptions" class="zerror-window__select-menu zerror-window__scrollbar" :style="courseMenuStyle">
                      <button
                        v-for="course in filteredCourses"
                        :key="course.ID"
                        type="button"
                        class="zerror-window__select-item"
                        @click="selectCourse(course)"
                      >
                        {{ course.Name }}
                      </button>
                      <div v-if="!filteredCourses.length" class="zerror-window__select-empty">无匹配课程</div>
                    </div>
                  </Teleport>
                </div>
              </div>
              <div class="zerror-window__field">
                <label class="zerror-window__field-label">试卷</label>
                <div class="zerror-window__select-wrapper">
                  <input
                    class="zerror-window__select"
                    ref="folderInputRef"
                    :disabled="foldersLoading || !folders.length"
                    v-model="folderSearch"
                    @focus="openFolderOptions"
                    @input="handleFolderInput"
                    @blur="handleFolderBlur"
                    placeholder="请选择试卷"
                  />
                  <Teleport to="body">
                    <div v-if="showFolderOptions" class="zerror-window__select-menu zerror-window__scrollbar" :style="folderMenuStyle">
                      <button
                        v-for="folder in filteredFolders"
                        :key="folder.ID"
                        type="button"
                        class="zerror-window__select-item"
                        @click="selectFolder(folder)"
                      >
                        {{ folder.Name }}
                      </button>
                      <div v-if="!filteredFolders.length" class="zerror-window__select-empty">无匹配文件夹</div>
                    </div>
                  </Teleport>
                </div>
              </div>
              <div v-if="coursesError" class="zerror-window__hint">{{ coursesError }}</div>
              <div v-else-if="foldersError" class="zerror-window__hint">{{ foldersError }}</div>
            </div>
            
            <div class="zerror-window__tools">
              <div class="zerror-window__courses-title">工具箱</div>
              <button class="zerror-window__button zerror-window__button--full" 
                :disabled="!selectedFolderId" 
                @click="runParser"
              >
                解析当前页题目
              </button>
              
              <div v-if="parsedCount > 0" class="zerror-window__parser-info">
                <div class="zerror-window__info-text">
                  正确 {{ validCount }} / 总共 {{ parsedCount }}
                </div>
                
                <div class="zerror-window__field checkbox-field" style="margin-bottom: 10px;">
                  <label class="zerror-window__field-label" style="display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" v-model="uploadAllQuestions" style="margin-right: 6px;" @change="updateParsedQuestions">
                    包含未找到答案的题目
                  </label>
                </div>

                <button 
                  class="zerror-window__button zerror-window__button--primary zerror-window__button--full"
                  :disabled="isUploading || parsedQuestions.length === 0"
                  @click="batchUpload"
                >
                  {{ isUploading ? `上传中 (${uploadProgress}/${parsedQuestions.length})` : uploadButtonText }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 用户页 -->
        <div v-show="activeTab === 'user'">
          <p class="zerror-window__subtitle" style="text-align: center;">
            {{ token ? '当前已登录，将保持登录状态。' : '请扫描下方二维码，在公众号回复数字验证码完成登录' }}
          </p>
          <div v-if="!token" class="zerror-window__code">
            <img src="https://cdn.zerror.cc/images/公众号二维码.jpg" alt="公众号二维码" />
            <span>{{ verificationCode || '获取中...' }}</span>
          </div>
          <div v-if="userInfo" class="zerror-window__user">
            <div class="zerror-window__user-name">{{ userInfo.nickname }}</div>
            <div class="zerror-window__user-time">{{ userInfo.createdTime }}</div>
          </div>
          <div v-if="token" class="zerror-window__campus">
            <div class="zerror-window__campus-title">校园状态</div>
            <div class="zerror-window__campus-content">
              <div class="zerror-window__campus-name">
                {{ campusName }}
              </div>
              <div class="zerror-window__campus-status">{{ campusMessage }}</div>
            </div>
            <button
              v-if="campusActionUrl"
              class="zerror-window__button zerror-window__button--primary zerror-window__button--full"
              @click="openCampusAction"
            >
              {{ campusActionText }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { initXXTParser } from './parsers/chaoxing/homework.js'
import { initXXTChapterParser } from './parsers/chaoxing/chapter.js'
import { initXXTSuitangParser } from './parsers/chaoxing/suitang.js'
import { initMoocParser } from './parsers/mooc/index.js'
import { initZhihuiZhijiaoParser } from './parsers/zhihuizhijiao/index.js'
import { saveSelection, getSavedSelection, setDetectedActiveId, saveWindowState, getSavedWindowState } from './utils/preference.js'

const verificationCode = ref('')
const statusText = ref('初始化')
const polling = ref(false)
const userInfo = ref(null)
const token = ref('')
const campusInfo = ref(null)
const campusMessage = ref('读取中')
const campusActionUrl = ref('')
const campusActionText = ref('')
const courses = ref([])
const folders = ref([])
const coursesLoading = ref(false)
const foldersLoading = ref(false)
const coursesError = ref('')
const foldersError = ref('')
const tags = ref([])
const selectedCourseId = ref('')
const selectedFolderId = ref('')
const courseSearch = ref('')
const folderSearch = ref('')
const showCourseOptions = ref(false)
const showFolderOptions = ref(false)
const courseInputRef = ref(null)
const folderInputRef = ref(null)
const courseMenuStyle = ref({})
const folderMenuStyle = ref({})
const isMinimized = ref(getSavedWindowState())
const isExpanding = ref(false)
const isWindowVisible = ref(true)
const activeTab = ref('upload')
const uploadAllQuestions = ref(false)
const bodyRef = ref(null)
const bodyContentRef = ref(null)
const bodyHeight = ref(null)
let bodyResizeObserver = null
let expandTimer = null
let bodyUpdateTimer = null
let pollingTimer = null
let storageListeners = [] // 存储监听器 ID
let courseBlurTimer = null
let folderBlurTimer = null
let urlCheckTimer = null
const lastUrl = ref(window.location.href)

// 解析相关状态
const parsedCount = ref(0)
const duplicateCount = ref(0)
const validCount = ref(0)
const parsedQuestions = ref([])
const addQuestionFn = ref(null)
const isUploading = ref(false)
const uploadProgress = ref(0)
const lastParserResult = ref(null) // 保存最近一次解析结果以便重新过滤

const uploadButtonText = computed(() => {
  if (isUploading.value) return ''
  const total = parsedQuestions.value.length
  // 计算将要跳过的重复题目（已有答案且远程一致）和更新的题目（已有答案但远程不一致）
  // 由于我们在这里没法直接预知远程答案，只能简单统计
  // 实际上 duplicateCount 是所有已存在的题目，无论是否更新
  // parsedQuestions 是已经过滤后的列表，包含了需要上传（新增）和更新的题目
  // 重新计算：parsedQuestions 中有多少是 existingQuestions 中有的（即更新），有多少是没有的（即新增）
  
  // 这里需要访问 context 中的 existingQuestions，但 context 在 runParser 中定义
  // 我们可以在 lastParserResult 中保存 existingQuestions
  const existingQuestions = lastParserResult.value?.existingQuestions || []
  
  let updateCount = 0
  let newCount = 0
  
  parsedQuestions.value.forEach(q => {
    if (existingQuestions.some(eq => eq.Content === q.title)) {
      updateCount++
    } else {
      newCount++
    }
  })
  
  // 跳过的题目数 = 解析到的总数 - 待上传列表数
  // 注意：parsedCount 是所有题目，包括没答案的（如果开关没开）
  // 这里的逻辑稍微复杂点，因为 parsedCount 包含所有解析到的题目
  // 跳过的 = 总数 - 待上传
  const skipCount = parsedCount.value - total
  
  return `一键批量上传 (新增${newCount}/更新${updateCount}/跳过${skipCount})`
})

const updateBodyHeight = (force = false) => {
  if (!bodyRef.value || !bodyContentRef.value) return
  if (!force && (isMinimized.value || isExpanding.value)) return
  const styles = window.getComputedStyle(bodyRef.value)
  let paddingTop = Number.parseFloat(styles.paddingTop) || 0
  let paddingBottom = Number.parseFloat(styles.paddingBottom) || 0
  if (isMinimized.value) {
    paddingTop = 16
    paddingBottom = 16
  }

  const rect = bodyContentRef.value.getBoundingClientRect()
  const contentHeight = rect?.height || 0
  bodyHeight.value = contentHeight + paddingTop + paddingBottom
}

const bodyStyle = computed(() => {
  if (isMinimized.value) {
    return { height: '0px' }
  }
  if (bodyHeight.value !== null) {
    return { height: `${bodyHeight.value}px` }
  }
  return { height: 'auto' }
})

const campusName = computed(() => {
  if (!campusInfo.value?.campus?.Name) return '未绑定校园'
  return campusInfo.value.campus.Name
})

const parseDomains = (domainsValue) => {
  if (!domainsValue) return []
  if (Array.isArray(domainsValue)) {
    return domainsValue.map(d => String(d).trim()).filter(Boolean)
  }
  if (typeof domainsValue === 'string') {
    const trimmed = domainsValue.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map(d => String(d).trim()).filter(Boolean)
      }
    } catch {
      return []
    }
  }
  return []
}

const getFolderTagId = (folder) => {
  const candidate = folder?.TagID
  if (candidate === 0 || candidate === '0') return 0
  const numeric = Number(candidate)
  if (Number.isFinite(numeric) && numeric > 0) return numeric
  return null
}

const matchingTagIds = computed(() => {
  const host = window.location.hostname
  if (!host || !tags.value.length) return []
  return tags.value
    .filter(tag => {
      const domains = parseDomains(tag?.domains)
      return domains.some(domain => host === domain || host.endsWith(`.${domain}`))
    })
    .map(tag => Number(tag.id))
    .filter(id => Number.isFinite(id))
})

const filteredCourses = computed(() => {
  const keyword = courseSearch.value.trim().toLowerCase()
  if (!keyword) return courses.value
  
  // 检查是否有完全匹配的项目
  const hasExactMatch = courses.value.some(course => course.Name?.toLowerCase() === keyword)
  if (hasExactMatch) return courses.value

  return courses.value.filter(course => course.Name?.toLowerCase().includes(keyword))
})

const filteredFolders = computed(() => {
  const keyword = folderSearch.value.trim().toLowerCase()
  const tagIds = matchingTagIds.value
  let visibleFolders = folders.value
  
  if (tagIds.length > 0) {
    // 如果当前页面匹配到了某些标签（即特定平台），则只显示该平台对应的试卷
    visibleFolders = visibleFolders.filter(folder => tagIds.includes(getFolderTagId(folder)))
  } else {
    // 如果当前页面没有匹配到任何标签（未知平台或通用页面），则显示所有试卷（或者显示未分类的试卷）
    // 根据用户需求："没有匹配则都显示"
    // 因此这里不做过滤，直接显示所有 folders
    // visibleFolders = folders.value 
  }
  
  if (!keyword) return visibleFolders

  // 检查是否有完全匹配的项目
  const hasExactMatch = visibleFolders.some(folder => folder.Name?.toLowerCase() === keyword)
  if (hasExactMatch) return visibleFolders

  return visibleFolders.filter(folder => folder.Name?.toLowerCase().includes(keyword))
})

const getMenuStyle = (inputElement) => {
  if (!inputElement) return {}
  const rect = inputElement.getBoundingClientRect()
  const menuWidth = 220
  const menuMaxHeight = 260
  const gap = 8
  const padding = 8
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  let left = rect.left - menuWidth - gap
  left = Math.max(padding, Math.min(left, viewportWidth - menuWidth - padding))
  let top = rect.top
  top = Math.max(padding, Math.min(top, viewportHeight - menuMaxHeight - padding))
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${menuWidth}px`,
    maxHeight: `${menuMaxHeight}px`,
  }
}

const updateCourseMenuPosition = () => {
  courseMenuStyle.value = getMenuStyle(courseInputRef.value)
}

const updateFolderMenuPosition = () => {
  folderMenuStyle.value = getMenuStyle(folderInputRef.value)
}

const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
  polling.value = false
}

const startPolling = () => {
  if (!verificationCode.value || token.value) return
  if (pollingTimer) return
  polling.value = true
  pollingTimer = setInterval(() => {
    pollLogin()
  }, 5000)
}

const gmAvailable = typeof GM_getValue === 'function' && typeof GM_setValue === 'function'
const apiBase = 'http://localhost:3001/api/login'

const persistLogin = async (payload) => {
  token.value = payload?.user?.token || ''
  userInfo.value = payload?.user || null
  if (!token.value) return
  if (gmAvailable) {
    GM_setValue('zaizhexue_token', token.value)
    GM_setValue('zaizhexue_user', JSON.stringify(userInfo.value || {}))
    return
  }
  await fetch(apiBase, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: token.value, user: userInfo.value }),
  })
  await fetchCampus()
}

const loadPersistedLogin = async () => {
  if (gmAvailable) {
    token.value = GM_getValue('zaizhexue_token', '')
    const savedUser = GM_getValue('zaizhexue_user', '')
    if (savedUser) {
      try {
        userInfo.value = JSON.parse(savedUser)
      } catch {
        userInfo.value = null
      }
    }
    if (token.value) {
      await fetchCampus()
    }
    return
  }
  const response = await fetch(apiBase)
  if (!response.ok) {
    throw new Error('读取登录信息失败')
  }
  const data = await response.json()
  token.value = data?.token || ''
  userInfo.value = data?.user || null
  if (token.value) {
    await fetchCampus()
  }
}

const clearPersistedLogin = async () => {
  if (gmAvailable) {
    if (typeof GM_deleteValue === 'function') {
      GM_deleteValue('zaizhexue_token')
      GM_deleteValue('zaizhexue_user')
      return
    }
    GM_setValue('zaizhexue_token', '')
    GM_setValue('zaizhexue_user', '')
    return
  }
  await fetch(`${apiBase}/clear`, { method: 'POST' })
}

const requestVerificationCode = async () => {
  statusText.value = '请求验证码'
  const response = await fetch('https://app.zaizhexue.top/trigger_login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  if (!response.ok) {
    throw new Error('验证码请求失败')
  }
  const data = await response.json()
  verificationCode.value = data?.verification_code || ''
  statusText.value = '验证码已获取'
}

const fetchCampus = async () => {
  if (!token.value) return
  campusMessage.value = '读取中'
  campusActionUrl.value = ''
  campusActionText.value = ''
  const response = await fetch('https://campuses.zerror.cc/user/campus', {
    headers: {
      Authorization: token.value,
    },
  })
  if (!response.ok) {
    campusMessage.value = '读取失败'
    return
  }
  const data = await response.json()
  campusInfo.value = data
  if (!data?.campus) {
    campusMessage.value = '未绑定校园，请先绑定'
    campusActionUrl.value = 'https://tiku.zerror.cc/campus'
    campusActionText.value = '去绑定'
    courses.value = []
    folders.value = []
    return
  }
  if (data?.status === 'unverified') {
    campusMessage.value = '未认证，请完成认证'
    campusActionUrl.value = 'https://tiku.zerror.cc/dashboard'
    campusActionText.value = '去认证'
    courses.value = []
    folders.value = []
    return
  }
  campusMessage.value = data?.status === 'verified' ? '已认证' : '已绑定'
  await fetchCourses()
  await loadCourseSelection()
}

const fetchTags = async () => {
  try {
    const response = await fetch('https://campuses.zerror.cc/tags')
    if (!response.ok) {
      tags.value = []
      return
    }
    const data = await response.json()
    tags.value = Array.isArray(data) ? data : []
  } catch {
    tags.value = []
  }
}

const loadCourseSelection = async () => {
  try {
    const saved = getSavedSelection();
    if (saved && saved.courseId) {
      // 等待课程列表加载
      if (courses.value.length === 0 && !coursesLoading.value) {
          await fetchCourses();
      }
      
      // 选中课程
      const course = courses.value.find(c => c.ID === saved.courseId);
      if (course) {
        selectCourse(course);
        
        // 等待文件夹加载
        const waitForFolders = () => {
            return new Promise(resolve => {
              const check = () => {
                  if (!foldersLoading.value) resolve();
                  else setTimeout(check, 100);
              }
              check();
            });
        };
        
        await waitForFolders();
        
        if (saved.folderId) {
          const folder = folders.value.find(f => f.ID === saved.folderId);
          if (folder) {
            selectFolder(folder);
          }
        }
      }
    }
  } catch (e) {
    console.warn('读取课程选择失败', e);
  }
}

const fetchCourses = async () => {
  if (!token.value || !campusInfo.value?.campus?.ID) return
  coursesLoading.value = true
  coursesError.value = ''
  courses.value = []
  folders.value = []
  selectedCourseId.value = ''
  selectedFolderId.value = ''
  courseSearch.value = ''
  folderSearch.value = ''
  try {
    const response = await fetch(
      `https://campuses.zerror.cc/campus/${campusInfo.value.campus.ID}/courses`,
      {
        headers: { Authorization: token.value },
      },
    )
    if (!response.ok) {
      throw new Error('课程加载失败')
    }
    const data = await response.json()
    courses.value = Array.isArray(data) ? data : []
  } catch (error) {
    coursesError.value = '课程加载失败'
  } finally {
    coursesLoading.value = false
  }
}

const fetchFolders = async (courseId) => {
  if (!token.value || !courseId) return
  foldersLoading.value = true
  foldersError.value = ''
  folders.value = []
  selectedFolderId.value = ''
  folderSearch.value = ''
  try {
    const response = await fetch(`https://campuses.zerror.cc/courses/${courseId}`, {
      headers: { Authorization: token.value },
    })
    if (!response.ok) {
      throw new Error('文件夹加载失败')
    }
    const data = await response.json()
    const rawFolders = Array.isArray(data?.folders) ? data.folders : []
    folders.value = rawFolders.sort((a, b) => {
      const timeA = new Date(a.UpdatedAt || a.updatedAt || 0).getTime()
      const timeB = new Date(b.UpdatedAt || b.updatedAt || 0).getTime()
      return timeB - timeA
    })
  } catch (error) {
    foldersError.value = '文件夹加载失败'
  } finally {
    foldersLoading.value = false
  }
}

const handleCourseChange = () => {
  if (!selectedCourseId.value) return
  fetchFolders(selectedCourseId.value)
}

const openCourseOptions = () => {
  if (courseBlurTimer) {
    clearTimeout(courseBlurTimer)
    courseBlurTimer = null
  }
  showCourseOptions.value = true
  nextTick(() => {
    updateCourseMenuPosition()
  })
}

const openFolderOptions = () => {
  if (folderBlurTimer) {
    clearTimeout(folderBlurTimer)
    folderBlurTimer = null
  }
  showFolderOptions.value = true
  nextTick(() => {
    updateFolderMenuPosition()
  })
}

const handleCourseInput = () => {
  showCourseOptions.value = true
  if (selectedCourseId.value) {
    selectedCourseId.value = ''
    selectedFolderId.value = ''
    folders.value = []
    folderSearch.value = ''
  }
  nextTick(() => {
    updateCourseMenuPosition()
  })
}

const handleFolderInput = () => {
  showFolderOptions.value = true
  if (selectedFolderId.value) {
    selectedFolderId.value = ''
  }
  nextTick(() => {
    updateFolderMenuPosition()
  })
}

const handleCourseBlur = () => {
  courseBlurTimer = setTimeout(() => {
    showCourseOptions.value = false
  }, 160)
}

const handleFolderBlur = () => {
  folderBlurTimer = setTimeout(() => {
    showFolderOptions.value = false
  }, 160)
}

const selectCourse = (course) => {
  selectedCourseId.value = course.ID
  courseSearch.value = course.Name || ''
  showCourseOptions.value = false
  handleCourseChange()
  saveSelection(selectedCourseId.value, selectedFolderId.value)
}

const selectFolder = (folder) => {
  selectedFolderId.value = folder.ID
  folderSearch.value = folder.Name || ''
  showFolderOptions.value = false
  saveSelection(selectedCourseId.value, selectedFolderId.value)
}

const pollLogin = async () => {
  if (!verificationCode.value || token.value) return
  statusText.value = '轮询中'
  const response = await fetch('https://app.zaizhexue.top/polling', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verification_code: verificationCode.value }),
  })
  if (!response.ok) {
    throw new Error('轮询失败')
  }
  const data = await response.json()
  if (data?.logged_in) {
    await persistLogin(data)
    statusText.value = '登录成功'
    stopPolling()
    await fetchCampus()
  } else {
    statusText.value = '等待登录'
  }
}

const startFlow = async () => {
  if (token.value) return
  stopPolling()
  verificationCode.value = ''
  statusText.value = '初始化'
  try {
    await requestVerificationCode()
    await pollLogin()
    if (!token.value) {
      startPolling()
    }
  } catch (error) {
    statusText.value = '请求失败'
  }
}

const restartFlow = () => {
  if (token.value) return
  startFlow()
}

const togglePolling = () => {
  if (token.value) {
    stopPolling()
    statusText.value = '已登录'
    return
  }
  if (polling.value) {
    stopPolling()
    statusText.value = '已暂停'
  } else {
    startPolling()
    statusText.value = '已恢复'
  }
}

const logout = () => {
  token.value = ''
  userInfo.value = null
  verificationCode.value = ''
  campusInfo.value = null
  campusMessage.value = '读取中'
  campusActionUrl.value = ''
  campusActionText.value = ''
  courses.value = []
  folders.value = []
  coursesError.value = ''
  foldersError.value = ''
  selectedCourseId.value = ''
  selectedFolderId.value = ''
  courseSearch.value = ''
  folderSearch.value = ''
  showCourseOptions.value = false
  showFolderOptions.value = false
  stopPolling()
  clearPersistedLogin().catch(() => {})
  statusText.value = '已退出'
}

const openCampusAction = () => {
  if (!campusActionUrl.value) return
  window.open(campusActionUrl.value, '_blank')
}

const openCampusLink = () => {
  window.open('https://tiku.zerror.cc/campus', '_blank')
}

const updateParsedQuestions = () => {
  if (!lastParserResult.value) return
  
  const { questions, existingQuestions } = lastParserResult.value
  
  parsedQuestions.value = questions.filter(q => 
    // 逻辑：
    // 1. 如果题目已存在（Content匹配）：
    //    - 如果有答案且答案不同，保留（为了更新）
    //    - 如果有答案且答案相同，跳过（重复）
    //    - 如果没答案，跳过（不更新为空）
    // 简化逻辑：只要已存在，且 (当前有答案 且 答案不同)，则保留
    // 或者
    // 2. 如果题目不存在：
    //    - 如果开关开启，保留
    //    - 如果开关关闭，且有答案，保留
    
    // 组合：
    // (已存在 && 有新答案 && 答案不同) || (!已存在 && (开关 || 有答案))
    
    // 修正：上面的 runParser 逻辑是：
    // !existingQuestions.some(...) && ...
    // 这意味着只要存在就过滤掉了，无法进入更新逻辑。
    // 我们需要修改过滤逻辑以允许“需要更新”的题目通过。
    
    // 正确逻辑：
    // 保留如果：
    // (是新题) AND (开关开启 OR 有有效答案)
    // OR
    // (是旧题) AND (有有效答案 AND 答案不同)
    {
      const existing = existingQuestions.find(eq => eq.Content === q.title)
      const hasValidAnswer = q.answer && q.answer !== '未找到答案'
      
      if (existing) {
        // 旧题：只有当有新答案且不同时才保留
        return hasValidAnswer && existing.Answer !== q.answer
      } else {
        // 新题
        return uploadAllQuestions.value || hasValidAnswer
      }
    }
  )
}

const runParser = async () => {
  // 重置状态
  parsedCount.value = 0
  duplicateCount.value = 0
  validCount.value = 0
  parsedQuestions.value = []
  addQuestionFn.value = null
  uploadProgress.value = 0
  lastParserResult.value = null
  
  if (!selectedFolderId.value) {
    alert('请先选择文件夹')
    return
  }

  if (token.value && selectedCourseId.value && selectedFolderId.value) {
      const context = {
        token: token.value,
        courseId: selectedCourseId.value,
        folderId: selectedFolderId.value
      }
      
      let result;
      // 根据当前 URL 选择解析器
      const isMooc = window.location.host.includes('icourse163.org');
      const isZhihuiZhijiao = window.location.host.includes('icve.com.cn');
      
      if (isMooc) {
        result = await initMoocParser(context);
      } else if (isZhihuiZhijiao) {
        result = await initZhihuiZhijiaoParser(context);
      } else if (window.location.href.includes('/mycourse/studentstudy') || window.location.href.includes('/knowledge/cards')) {
        result = await initXXTChapterParser(context);
      } else if (window.location.href.includes('/quiz/stu/') || window.location.href.includes('/mycourse/stu') || document.querySelector('.question-item')) {
        result = await initXXTSuitangParser(context);
      } else {
        result = await initXXTParser(context);
      }
      
      if (result && result.count > 0) {
      parsedCount.value = result.count
      validCount.value = result.questions.filter(q => q.answer && q.answer !== '未找到答案').length
      // 过滤出未添加的题目
      if (result.questions) {
        const existingQuestions = context.existingQuestions || []
        
        // 保存结果供重新计算
        lastParserResult.value = {
          questions: result.questions,
          existingQuestions: existingQuestions
        }
        
        // 计算已存在的题目数量
        duplicateCount.value = result.questions.filter(q => 
          existingQuestions.some(eq => eq.Content === q.title)
        ).length

        updateParsedQuestions()
      }
      addQuestionFn.value = result.addQuestionToExam
    } else {
      alert('未检测到题目，请确认是否在作业详情页')
    }
  } else {
    // 未选择课程文件夹时，仅解析不提供添加功能
    let result;
    const isMooc = window.location.host.includes('icourse163.org');
    const isZhihuiZhijiao = window.location.host.includes('icve.com.cn');

    if (isMooc) {
      result = await initMoocParser();
    } else if (isZhihuiZhijiao) {
      result = await initZhihuiZhijiaoParser();
    } else if (window.location.href.includes('/mycourse/studentstudy') || window.location.href.includes('/knowledge/cards')) {
      result = await initXXTChapterParser();
    } else if (window.location.href.includes('/quiz/stu/') || window.location.href.includes('/mycourse/stu') || document.querySelector('.question-item')) {
      result = await initXXTSuitangParser();
    } else {
      result = await initXXTParser();
    }
    
    if (result && result.count > 0) {
      validCount.value = result.questions ? result.questions.filter(q => q.answer && q.answer !== '未找到答案').length : 0
      alert(`已解析 ${result.count} 道题目 (未选择试卷，无法添加题目)`)
    } else {
      alert('未检测到题目，请确认是否在作业详情页或章节测验页')
    }
  }
}

const batchUpload = async () => {
  if (!addQuestionFn.value || parsedQuestions.value.length === 0) return
  
  isUploading.value = true
  uploadProgress.value = 0
  
  const context = {
    token: token.value,
    courseId: selectedCourseId.value,
    folderId: selectedFolderId.value,
    // 如果有缓存的 existingQuestions，可以传递进去，不过 addQuestionToExam 内部也会处理
  }
  
  let successCount = 0
  const questionsToUpload = [...parsedQuestions.value] // 复制一份
  
  for (let i = 0; i < questionsToUpload.length; i++) {
    const q = questionsToUpload[i]
    try {
      const result = await addQuestionFn.value(q, context)
      if (result === 'success' || result === 'duplicate') {
        successCount++
      }
      // 更新进度
      uploadProgress.value = i + 1
      
      // 添加间隔防止请求过快
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (e) {
      console.error('批量上传出错:', e)
    }
  }
  
  isUploading.value = false
  
  // 更新待上传列表 (移除已成功的)
  // 这里简化处理，重新解析一次或者清空列表
  // 为简单起见，我们直接清空列表，提示用户重新解析
  parsedQuestions.value = []
  alert(`批量上传完成，共处理 ${questionsToUpload.length} 道题目`)
}

const toggleMinimize = () => {
  if (isMinimized.value) {
    updateBodyHeight(true)
    
    isMinimized.value = false
    saveWindowState(false)
    isExpanding.value = true
    if (expandTimer) {
      clearTimeout(expandTimer)
    }
    expandTimer = setTimeout(() => {
      isExpanding.value = false
    }, 300)
    if (bodyUpdateTimer) {
      clearTimeout(bodyUpdateTimer)
    }
    bodyUpdateTimer = setTimeout(() => {
      updateBodyHeight(true)
    }, 300)
    return
  }
  isMinimized.value = true
  saveWindowState(true)
  isExpanding.value = false
  if (expandTimer) {
    clearTimeout(expandTimer)
    expandTimer = null
  }
  if (bodyUpdateTimer) {
    clearTimeout(bodyUpdateTimer)
  }
  bodyUpdateTimer = null
}

const handleHeaderClick = () => {
  if (isMinimized.value) {
    toggleMinimize()
  }
}

const toggleWindowVisible = () => {
  isWindowVisible.value = !isWindowVisible.value
  const root = document.getElementById('zerror-window-root')
  if (root) {
    // 强制操作 DOM 显示/隐藏
    root.style.setProperty('display', isWindowVisible.value ? 'block' : 'none', 'important')
  }
}

const handleKeydown = (event) => {
  if (event.key === 'F9') {
    event.preventDefault()
    toggleWindowVisible()
  }
}

const handleWindowChange = () => {
  if (showCourseOptions.value) {
    updateCourseMenuPosition()
  }
  if (showFolderOptions.value) {
    updateFolderMenuPosition()
  }
}

const handleMessage = (event) => {
  if (event.data && event.data.type === 'ZERROR_ACTIVE_ID') {
    const activeId = event.data.activeId;
    if (activeId) {
      setDetectedActiveId(activeId);
      // 收到 activeId 后尝试重新加载选择
      // 防抖，避免频繁调用
      if (window.zerrorLoadTimer) clearTimeout(window.zerrorLoadTimer);
      window.zerrorLoadTimer = setTimeout(() => {
        loadCourseSelection();
      }, 500);
    }
  }
}

onMounted(async () => {
  await nextTick()
  updateBodyHeight()
  if (bodyContentRef.value) {
    bodyResizeObserver = new ResizeObserver(() => {
      updateBodyHeight()
    })
    bodyResizeObserver.observe(bodyContentRef.value)
  }
  try {
    await loadPersistedLogin()
  } catch {
    statusText.value = '读取失败'
  }
  
  if (!token.value) {
    activeTab.value = 'user'
  }

  await fetchTags()

  // 设置跨标签页同步监听
  if (gmAvailable) {
    const tokenListener = GM_addValueChangeListener('zaizhexue_token', (key, oldValue, newValue, remote) => {
      if (remote) { // 只有来自其他标签页的更改才处理
        token.value = newValue || ''
        if (!token.value) {
          userInfo.value = null
          campusInfo.value = null
          statusText.value = '已在其他页面退出'
        } else {
          statusText.value = '已在其他页面登录'
          fetchCampus()
        }
      }
    })
    
    const userListener = GM_addValueChangeListener('zaizhexue_user', (key, oldValue, newValue, remote) => {
      if (remote) {
        try {
          userInfo.value = newValue ? JSON.parse(newValue) : null
        } catch {
          userInfo.value = null
        }
      }
    })
    
    storageListeners.push(tokenListener, userListener)
  }

  if (token.value) {
    stopPolling()
    statusText.value = '已登录'
    // return // 这里不要直接 return，后面还要加事件监听
  }
  startFlow()
  
  // 使用 window 对象监听，确保更广的捕获范围
  window.addEventListener('keydown', handleKeydown, true)
  window.addEventListener('resize', handleWindowChange)
  window.addEventListener('scroll', handleWindowChange, true)
  window.addEventListener('message', handleMessage)

  // 监听 URL 变化
  urlCheckTimer = setInterval(() => {
    if (window.location.href !== lastUrl.value) {
      lastUrl.value = window.location.href
      // URL 发生变化，重新加载选择
      loadCourseSelection()
    }
  }, 1000)
})

onUnmounted(() => {
  stopPolling()
  window.removeEventListener('keydown', handleKeydown, true)
  window.removeEventListener('resize', handleWindowChange)
  window.removeEventListener('scroll', handleWindowChange, true)
  window.removeEventListener('message', handleMessage)
  if (bodyResizeObserver && bodyContentRef.value) {
    bodyResizeObserver.unobserve(bodyContentRef.value)
    bodyResizeObserver.disconnect()
    bodyResizeObserver = null
  }
  if (expandTimer) {
    clearTimeout(expandTimer)
    expandTimer = null
  }
  if (bodyUpdateTimer) {
    clearTimeout(bodyUpdateTimer)
    bodyUpdateTimer = null
  }
  if (courseBlurTimer) {
    clearTimeout(courseBlurTimer)
    courseBlurTimer = null
  }
  if (folderBlurTimer) {
    clearTimeout(folderBlurTimer)
    folderBlurTimer = null
  }
  if (urlCheckTimer) {
    clearInterval(urlCheckTimer)
    urlCheckTimer = null
  }
  
  // 移除监听器
  if (gmAvailable && storageListeners.length > 0) {
    storageListeners.forEach(id => GM_removeValueChangeListener(id))
    storageListeners = []
  }
})
</script>
