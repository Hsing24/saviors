// Service Worker: Form Field Recorder
// 負責狀態管理與訊息路由

import {
  normalizeUrl,
  getSettings,
  createSession,
  getSession,
  addField,
  getSessionsForUrl,
  getAllSessions,
  getRecordingState,
  setRecordingState,
  clearRecordingState,
  incrementFieldChangeCount,
  resetDeclinedPrompt,
  cleanup,
  deleteSession
} from '../lib/storage.js';

/**
 * 訊息類型定義
 */
const MessageTypes = {
  // Content → Service Worker
  FIELD_CHANGED: 'FIELD_CHANGED',
  RECORDING_STARTED: 'RECORDING_STARTED',
  RECORDING_STOPPED: 'RECORDING_STOPPED',
  PROMPT_RESPONSE: 'PROMPT_RESPONSE',
  
  // Service Worker → Content
  START_RECORDING: 'START_RECORDING',
  STOP_RECORDING: 'STOP_RECORDING',
  APPLY_FIELD_VALUE: 'APPLY_FIELD_VALUE',
  SCROLL_TO_FIELD: 'SCROLL_TO_FIELD',
  SHOW_PROMPT: 'SHOW_PROMPT',
  
  // Popup → Service Worker
  GET_RECORDS: 'GET_RECORDS',
  GET_RECORDING_STATE: 'GET_RECORDING_STATE',
  GET_SESSION_DETAIL: 'GET_SESSION_DETAIL',
  TOGGLE_RECORDING: 'TOGGLE_RECORDING',
  DELETE_RECORD: 'DELETE_RECORD',
  NOTIFY_HISTORY_PANEL_STATE: 'NOTIFY_HISTORY_PANEL_STATE'
};

/**
 * 處理訊息
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;
  const tabId = sender.tab?.id || payload?.tabId;
  
  console.log('[ServiceWorker] Received message:', type, payload);
  
  handleMessage(type, payload, tabId, sender)
    .then(response => {
      console.log('[ServiceWorker] Sending response:', response);
      sendResponse({ success: true, data: response });
    })
    .catch(error => {
      console.error('[ServiceWorker] Error:', error);
      sendResponse({ success: false, error: error.message });
    });
  
  return true; // 保持訊息通道開啟
});

/**
 * 訊息處理路由
 */
async function handleMessage(type, payload, tabId, sender) {
  switch (type) {
    // Content Script → Service Worker
    case MessageTypes.FIELD_CHANGED:
      return await handleFieldChanged(payload, tabId);
    
    case MessageTypes.PROMPT_RESPONSE:
      return await handlePromptResponse(payload, tabId);
    
    case MessageTypes.RECORDING_STARTED:
      return { acknowledged: true };
    
    case MessageTypes.RECORDING_STOPPED:
      return { saved: true };
    
    // Popup → Service Worker
    case MessageTypes.GET_RECORDS:
      return await handleGetRecords(payload);
    
    case MessageTypes.GET_RECORDING_STATE:
      return await handleGetRecordingState(payload.tabId);
    
    case MessageTypes.GET_SESSION_DETAIL:
      return await handleGetSessionDetail(payload);
    
    case MessageTypes.TOGGLE_RECORDING:
      return await handleToggleRecording(payload);
    
    case MessageTypes.DELETE_RECORD:
      return await handleDeleteRecord(payload);
    
    case MessageTypes.NOTIFY_HISTORY_PANEL_STATE:
      return await handleHistoryPanelState(payload);
    
    default:
      throw new Error('INVALID_MESSAGE_TYPE');
  }
}

/**
 * 處理欄位變動
 */
async function handleFieldChanged(payload, tabId) {
  const { url, field } = payload;
  const normalizedUrl = normalizeUrl(url);
  
  // 取得當前錄製狀態
  let state = await getRecordingState(tabId);
  
  // 如果正在錄製，儲存欄位值
  if (state?.isRecording && state.currentTimestamp) {
    try {
      await addField(normalizedUrl, state.currentTimestamp, field);
      return { saved: true, sessionTimestamp: state.currentTimestamp };
    } catch (error) {
      console.error('[ServiceWorker] Error saving field:', error);
      return { saved: false };
    }
  }
  
  // 如果未錄製，增加欄位變動計數
  const { count, shouldPrompt } = await incrementFieldChangeCount(tabId);
  
  if (shouldPrompt) {
    // 發送顯示提醒訊息至 Content Script
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: MessageTypes.SHOW_PROMPT,
        payload: { fieldChangeCount: count }
      });
    } catch (error) {
      console.error('[ServiceWorker] Error sending SHOW_PROMPT:', error);
    }
  }
  
  return { saved: false, fieldChangeCount: count };
}

/**
 * 處理使用者對錄製提醒的回應
 */
async function handlePromptResponse(payload, tabId) {
  const { accepted, url } = payload;
  
  if (accepted) {
    // 建立新 Session
    const session = await createSession(url);
    
    // 更新錄製狀態
    await setRecordingState(tabId, {
      isRecording: true,
      currentTimestamp: session.createdAt,
      declinedPrompt: false,
      fieldChangeCount: 0,
      isHistoryPanelOpen: false
    });
    
    // 通知 Content Script 開始錄製
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: MessageTypes.START_RECORDING,
        payload: { sessionTimestamp: session.createdAt }
      });
    } catch (error) {
      console.error('[ServiceWorker] Error sending START_RECORDING:', error);
    }
    
    return { sessionTimestamp: session.createdAt };
  } else {
    // 更新拒絕狀態
    const state = await getRecordingState(tabId) || {
      isRecording: false,
      declinedPrompt: true,
      fieldChangeCount: 0,
      isHistoryPanelOpen: false
    };
    state.declinedPrompt = true;
    await setRecordingState(tabId, state);
    
    return {};
  }
}

/**
 * 處理取得歷史紀錄
 */
async function handleGetRecords(payload) {
  const { url, limit, offset } = payload || {};
  
  let records;
  if (url) {
    const normalizedUrl = normalizeUrl(url);
    const sessions = await getSessionsForUrl(normalizedUrl);
    records = { [normalizedUrl]: {} };
    sessions.forEach(session => {
      records[normalizedUrl][session.createdAt.toString()] = {
        url: session.url,
        createdAt: session.createdAt,
        fieldsCount: session.fields.length,
        pageTitle: session.metadata?.pageTitle
      };
    });
  } else {
    const allSessions = await getAllSessions();
    records = {};
    
    for (const [normalizedUrl, urlRecords] of Object.entries(allSessions)) {
      records[normalizedUrl] = {};
      for (const [timestamp, session] of Object.entries(urlRecords)) {
        records[normalizedUrl][timestamp] = {
          url: session.url,
          createdAt: session.createdAt,
          fieldsCount: session.fields.length,
          pageTitle: session.metadata?.pageTitle
        };
      }
    }
  }
  
  const total = Object.values(records).reduce(
    (sum, urlRecords) => sum + Object.keys(urlRecords).length, 0
  );
  
  return { records, total };
}

/**
 * 處理取得錄製狀態
 */
async function handleGetRecordingState(tabId) {
  const state = await getRecordingState(tabId);
  
  return {
    isRecording: state?.isRecording || false,
    currentTimestamp: state?.currentTimestamp,
    fieldChangeCount: state?.fieldChangeCount || 0
  };
}

/**
 * 處理取得 Session 詳情
 */
async function handleGetSessionDetail(payload) {
  const { normalizedUrl, timestamp } = payload;
  const session = await getSession(normalizedUrl, timestamp);
  return { session };
}

/**
 * 處理切換錄製狀態
 */
async function handleToggleRecording(payload) {
  const { tabId, start } = payload;
  
  // 取得當前分頁資訊
  const tab = await chrome.tabs.get(tabId);
  const url = tab.url;
  
  if (start) {
    // 開始錄製
    const session = await createSession(url, {
      pageTitle: tab.title
    });
    
    await setRecordingState(tabId, {
      isRecording: true,
      currentTimestamp: session.createdAt,
      declinedPrompt: false,
      fieldChangeCount: 0,
      isHistoryPanelOpen: false
    });
    
    // 通知 Content Script
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: MessageTypes.START_RECORDING,
        payload: { sessionTimestamp: session.createdAt }
      });
    } catch (error) {
      console.error('[ServiceWorker] Error sending START_RECORDING:', error);
    }
    
    return { isRecording: true, sessionTimestamp: session.createdAt };
  } else {
    // 停止錄製
    const state = await getRecordingState(tabId);
    
    await setRecordingState(tabId, {
      ...state,
      isRecording: false,
      currentTimestamp: null
    });
    
    // 通知 Content Script
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: MessageTypes.STOP_RECORDING,
        payload: { reason: 'user_action' }
      });
    } catch (error) {
      console.error('[ServiceWorker] Error sending STOP_RECORDING:', error);
    }
    
    return { isRecording: false };
  }
}

/**
 * 處理刪除紀錄
 */
async function handleDeleteRecord(payload) {
  const { normalizedUrl, timestamp } = payload;
  
  if (timestamp) {
    const deleted = await deleteSession(normalizedUrl, timestamp);
    return { deleted, deletedCount: deleted ? 1 : 0 };
  } else {
    // 刪除該 URL 所有紀錄
    const sessions = await getSessionsForUrl(normalizedUrl);
    let deletedCount = 0;
    
    for (const session of sessions) {
      const deleted = await deleteSession(normalizedUrl, session.createdAt);
      if (deleted) deletedCount++;
    }
    
    return { deleted: deletedCount > 0, deletedCount };
  }
}

/**
 * 處理歷史面板狀態變化
 */
async function handleHistoryPanelState(payload) {
  const { tabId, isOpen } = payload;
  
  let state = await getRecordingState(tabId) || {
    isRecording: false,
    declinedPrompt: false,
    fieldChangeCount: 0,
    isHistoryPanelOpen: false
  };
  
  const wasRecording = state.isRecording;
  
  if (isOpen) {
    // 開啟歷史面板時暫停錄製
    state.isHistoryPanelOpen = true;
    if (state.isRecording) {
      state.isRecording = false;
      
      // 通知 Content Script 停止錄製
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: MessageTypes.STOP_RECORDING,
          payload: { reason: 'history_panel_opened' }
        });
      } catch (error) {
        console.error('[ServiceWorker] Error sending STOP_RECORDING:', error);
      }
    }
  } else {
    // 關閉歷史面板時重置拒絕設定
    state.isHistoryPanelOpen = false;
    state.declinedPrompt = false;
    state.fieldChangeCount = 0;
  }
  
  await setRecordingState(tabId, state);
  
  return { acknowledged: true, recordingPaused: wasRecording && isOpen };
}

/**
 * 轉發訊息至 Content Script
 */
async function sendToContentScript(tabId, type, payload) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type, payload });
    return response;
  } catch (error) {
    console.error(`[ServiceWorker] Error sending ${type} to tab ${tabId}:`, error);
    throw new Error('CONTENT_SCRIPT_NOT_INJECTED');
  }
}

// 監聽分頁關閉，清理狀態
chrome.tabs.onRemoved.addListener(async (tabId) => {
  await clearRecordingState(tabId);
  console.log('[ServiceWorker] Cleared recording state for closed tab:', tabId);
});

console.log('[ServiceWorker] Form Field Recorder initialized');
