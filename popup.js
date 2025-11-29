// Saviors Chrome Extension - Popup
// 表單欄位錄製器 Popup 邏輯

/**
 * 訊息類型定義
 */
const MessageTypes = {
  GET_RECORDS: 'GET_RECORDS',
  GET_RECORDING_STATE: 'GET_RECORDING_STATE',
  GET_SESSION_DETAIL: 'GET_SESSION_DETAIL',
  TOGGLE_RECORDING: 'TOGGLE_RECORDING',
  NOTIFY_HISTORY_PANEL_STATE: 'NOTIFY_HISTORY_PANEL_STATE',
  SCROLL_TO_FIELD: 'SCROLL_TO_FIELD',
  APPLY_FIELD_VALUE: 'APPLY_FIELD_VALUE'
};

/**
 * 狀態
 */
let currentTabId = null;
let currentUrl = null;
let isRecording = false;
let isHistoryPanelOpen = false;

/**
 * DOM 元素
 */
const elements = {
  recordingBtn: null,
  btnIcon: null,
  btnText: null,
  statusIndicator: null,
  statusText: null,
  urlValue: null,
  currentSession: null,
  historyList: null,
  urlSelector: null,
  tabCurrent: null,
  tabHistory: null,
  currentContent: null,
  historyContent: null
};

/**
 * 初始化
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Popup] Initializing');
  
  // 取得 DOM 元素
  elements.recordingBtn = document.getElementById('recordingBtn');
  elements.btnIcon = document.getElementById('btnIcon');
  elements.btnText = document.getElementById('btnText');
  elements.statusIndicator = document.getElementById('statusIndicator');
  elements.statusText = document.getElementById('statusText');
  elements.urlValue = document.getElementById('urlValue');
  elements.currentSession = document.getElementById('currentSession');
  elements.historyList = document.getElementById('historyList');
  elements.urlSelector = document.getElementById('urlSelector');
  elements.tabCurrent = document.getElementById('tabCurrent');
  elements.tabHistory = document.getElementById('tabHistory');
  elements.currentContent = document.getElementById('currentContent');
  elements.historyContent = document.getElementById('historyContent');
  
  // 取得當前分頁資訊
  await getCurrentTab();
  
  // 取得錄製狀態
  await getRecordingState();
  
  // 載入歷史紀錄
  await loadHistoryRecords();
  
  // 綁定事件
  bindEvents();
  
  console.log('[Popup] Initialized');
});

/**
 * 取得當前分頁
 */
async function getCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      currentTabId = tab.id;
      currentUrl = tab.url;
      
      // 顯示網址
      const urlObj = new URL(currentUrl);
      elements.urlValue.textContent = urlObj.hostname + urlObj.pathname;
    }
  } catch (error) {
    console.error('[Popup] Error getting current tab:', error);
  }
}

/**
 * 取得錄製狀態
 */
async function getRecordingState() {
  try {
    const response = await sendMessage(MessageTypes.GET_RECORDING_STATE, {
      tabId: currentTabId
    });
    
    if (response.success) {
      isRecording = response.data.isRecording;
      updateRecordingUI();
    }
  } catch (error) {
    console.error('[Popup] Error getting recording state:', error);
  }
}

/**
 * 更新錄製 UI
 */
function updateRecordingUI() {
  if (isRecording) {
    elements.recordingBtn.classList.add('stop');
    elements.btnIcon.textContent = '⏹';
    elements.btnText.textContent = '停止錄製';
    elements.statusIndicator.classList.add('recording');
    elements.statusText.textContent = '錄製中';
  } else {
    elements.recordingBtn.classList.remove('stop');
    elements.btnIcon.textContent = '⏺';
    elements.btnText.textContent = '開始錄製';
    elements.statusIndicator.classList.remove('recording');
    elements.statusText.textContent = '未錄製';
  }
}

/**
 * 載入歷史紀錄
 */
async function loadHistoryRecords() {
  try {
    const response = await sendMessage(MessageTypes.GET_RECORDS, {});
    
    if (response.success && response.data.records) {
      renderHistoryRecords(response.data.records);
      populateUrlSelector(response.data.records);
    }
  } catch (error) {
    console.error('[Popup] Error loading history:', error);
  }
}

/**
 * 填充 URL 選擇器
 */
function populateUrlSelector(records) {
  const urls = Object.keys(records);
  
  // 清空現有選項（保留第一個）
  while (elements.urlSelector.options.length > 1) {
    elements.urlSelector.remove(1);
  }
  
  // 加入 URL 選項
  urls.forEach(url => {
    const option = document.createElement('option');
    option.value = url;
    option.textContent = url.replace(/^https?:\/\//, '');
    elements.urlSelector.appendChild(option);
  });
}

/**
 * 渲染歷史紀錄
 */
function renderHistoryRecords(records, filterUrl = null) {
  elements.historyList.innerHTML = '';
  
  const urlsToShow = filterUrl ? [filterUrl] : Object.keys(records);
  let hasRecords = false;
  
  urlsToShow.forEach(normalizedUrl => {
    const urlRecords = records[normalizedUrl];
    if (!urlRecords) return;
    
    // 依時間排序（新的在前）
    const timestamps = Object.keys(urlRecords).sort((a, b) => b - a);
    
    timestamps.forEach(timestamp => {
      hasRecords = true;
      const session = urlRecords[timestamp];
      
      const itemEl = document.createElement('div');
      itemEl.className = 'history-item';
      itemEl.dataset.url = normalizedUrl;
      itemEl.dataset.timestamp = timestamp;
      
      const time = new Date(parseInt(timestamp));
      const timeStr = formatTime(time);
      
      itemEl.innerHTML = `
        <div class="history-header">
          <div class="history-meta">
            <span class="history-title">${session.pageTitle || normalizedUrl.replace(/^https?:\/\//, '')}</span>
            <span class="history-time">${timeStr}</span>
          </div>
          <span class="history-count">${session.fieldsCount} 個欄位</span>
          <span class="history-expand-icon">▼</span>
        </div>
        <div class="history-fields">
          <div class="fields-list" data-loading="true">
            <p class="no-session">載入中...</p>
          </div>
        </div>
      `;
      
      elements.historyList.appendChild(itemEl);
    });
  });
  
  if (!hasRecords) {
    elements.historyList.innerHTML = '<p class="no-history">尚無歷史紀錄</p>';
  }
}

/**
 * 格式化時間
 */
function formatTime(date) {
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return '剛剛';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`;
  
  return date.toLocaleDateString('zh-TW', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * 綁定事件
 */
function bindEvents() {
  // 錄製按鈕
  elements.recordingBtn.addEventListener('click', toggleRecording);
  
  // 分頁切換
  elements.tabCurrent.addEventListener('click', () => switchTab('current'));
  elements.tabHistory.addEventListener('click', () => switchTab('history'));
  
  // URL 選擇器
  elements.urlSelector.addEventListener('change', handleUrlFilter);
  
  // 歷史紀錄展開/收合（事件委派）
  elements.historyList.addEventListener('click', handleHistoryClick);
}

/**
 * 切換錄製狀態
 */
async function toggleRecording() {
  try {
    const response = await sendMessage(MessageTypes.TOGGLE_RECORDING, {
      tabId: currentTabId,
      start: !isRecording
    });
    
    if (response.success) {
      isRecording = response.data.isRecording;
      updateRecordingUI();
    }
  } catch (error) {
    console.error('[Popup] Error toggling recording:', error);
  }
}

/**
 * 切換分頁
 */
function switchTab(tabName) {
  const isHistory = tabName === 'history';
  
  elements.tabCurrent.classList.toggle('active', !isHistory);
  elements.tabHistory.classList.toggle('active', isHistory);
  elements.currentContent.classList.toggle('active', !isHistory);
  elements.historyContent.classList.toggle('active', isHistory);
  
  // 通知歷史面板狀態
  if (isHistory !== isHistoryPanelOpen) {
    isHistoryPanelOpen = isHistory;
    notifyHistoryPanelState(isHistory);
  }
}

/**
 * 通知歷史面板狀態
 */
async function notifyHistoryPanelState(isOpen) {
  try {
    await sendMessage(MessageTypes.NOTIFY_HISTORY_PANEL_STATE, {
      tabId: currentTabId,
      isOpen: isOpen
    });
    
    // 如果面板開啟導致錄製暫停，更新 UI
    if (isOpen && isRecording) {
      isRecording = false;
      updateRecordingUI();
    }
  } catch (error) {
    console.error('[Popup] Error notifying history panel state:', error);
  }
}

/**
 * 處理 URL 篩選
 */
async function handleUrlFilter() {
  const selectedUrl = elements.urlSelector.value;
  
  try {
    const response = await sendMessage(MessageTypes.GET_RECORDS, {
      url: selectedUrl || undefined
    });
    
    if (response.success && response.data.records) {
      renderHistoryRecords(response.data.records, selectedUrl || null);
    }
  } catch (error) {
    console.error('[Popup] Error filtering history:', error);
  }
}

/**
 * 處理歷史紀錄點擊
 */
async function handleHistoryClick(event) {
  const historyItem = event.target.closest('.history-item');
  const fieldKey = event.target.closest('.field-key');
  const applyBtn = event.target.closest('.action-btn.apply');
  
  if (applyBtn) {
    // 處理帶入按鈕點擊
    const fieldItem = applyBtn.closest('.field-item');
    const identifier = JSON.parse(fieldItem.dataset.identifier);
    const value = fieldItem.dataset.value;
    
    await applyFieldValue(identifier, value);
    return;
  }
  
  if (fieldKey) {
    // 處理欄位 key 點擊（捲動至欄位）
    const fieldItem = fieldKey.closest('.field-item');
    const identifier = JSON.parse(fieldItem.dataset.identifier);
    
    await scrollToField(identifier);
    return;
  }
  
  if (historyItem && event.target.closest('.history-header')) {
    // 處理展開/收合
    const isExpanded = historyItem.classList.contains('expanded');
    
    if (!isExpanded) {
      // 載入欄位詳情
      await loadSessionFields(historyItem);
    }
    
    historyItem.classList.toggle('expanded');
  }
}

/**
 * 載入 Session 欄位詳情
 */
async function loadSessionFields(historyItem) {
  const normalizedUrl = historyItem.dataset.url;
  const timestamp = parseInt(historyItem.dataset.timestamp);
  const fieldsList = historyItem.querySelector('.fields-list');
  
  if (fieldsList.dataset.loading === 'false') return;
  
  try {
    const response = await sendMessage(MessageTypes.GET_SESSION_DETAIL, {
      normalizedUrl,
      timestamp
    });
    
    if (response.success && response.data.session) {
      renderFieldsList(fieldsList, response.data.session.fields);
    } else {
      fieldsList.innerHTML = '<p class="no-session">無法載入欄位資料</p>';
    }
    
    fieldsList.dataset.loading = 'false';
  } catch (error) {
    console.error('[Popup] Error loading session fields:', error);
    fieldsList.innerHTML = '<p class="no-session">載入失敗</p>';
  }
}

/**
 * 渲染欄位列表
 */
function renderFieldsList(container, fields) {
  if (!fields || fields.length === 0) {
    container.innerHTML = '<p class="no-session">此錄製沒有欄位資料</p>';
    return;
  }
  
  container.innerHTML = fields.map(field => {
    const key = field.label || field.identifier.name || field.identifier.id || '未知欄位';
    const value = field.value || '';
    const displayValue = value.length > 20 ? value.substring(0, 20) + '...' : value;
    
    return `
      <div class="field-item" data-identifier='${JSON.stringify(field.identifier)}' data-value="${escapeHtml(value)}">
        <span class="field-key" title="點擊捲動至欄位">${escapeHtml(key)}</span>
        <span class="field-value" title="${escapeHtml(value)}">${escapeHtml(displayValue)}</span>
        <div class="field-actions">
          <button class="action-btn apply" title="帶入此值">帶入</button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * 捲動至欄位
 */
async function scrollToField(identifier) {
  try {
    await chrome.tabs.sendMessage(currentTabId, {
      type: MessageTypes.SCROLL_TO_FIELD,
      payload: { identifier }
    });
  } catch (error) {
    console.error('[Popup] Error scrolling to field:', error);
  }
}

/**
 * 帶入欄位值
 */
async function applyFieldValue(identifier, value) {
  try {
    await chrome.tabs.sendMessage(currentTabId, {
      type: MessageTypes.APPLY_FIELD_VALUE,
      payload: { identifier, value }
    });
  } catch (error) {
    console.error('[Popup] Error applying field value:', error);
  }
}

/**
 * 發送訊息至 Service Worker
 */
function sendMessage(type, payload) {
  return chrome.runtime.sendMessage({
    type,
    payload,
    timestamp: Date.now()
  });
}

/**
 * HTML 轉義
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
