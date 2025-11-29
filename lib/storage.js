// Storage Service: Form Field Recorder
// 封裝 Chrome Storage API 操作

/**
 * 正規化 URL（移除 query string 與 hash）
 * @param {string} url - 完整網址
 * @returns {string} - 正規化後的網址
 */
export function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
  } catch (e) {
    console.error('[Storage] Invalid URL:', url);
    return url;
  }
}

/**
 * 取得設定
 * @returns {Promise<Settings>}
 */
export async function getSettings() {
  const storage = await chrome.storage.local.get('settings');
  return {
    captchaBlocklist: [
      '[name*="captcha"]',
      '[name*="verify"]',
      '[id*="captcha"]',
      '[autocomplete="one-time-code"]'
    ],
    maxRecordsPerUrl: 50,
    autoPromptEnabled: true,
    promptThreshold: 5,
    ...storage.settings
  };
}

/**
 * 更新設定
 * @param {Partial<Settings>} updates
 * @returns {Promise<Settings>}
 */
export async function updateSettings(updates) {
  const currentSettings = await getSettings();
  const newSettings = { ...currentSettings, ...updates };
  await chrome.storage.local.set({ settings: newSettings });
  return newSettings;
}

/**
 * 建立 Session
 * @param {string} url - 完整網址
 * @param {SessionMetadata} metadata - 額外中繼資料
 * @returns {Promise<RecordSession>}
 */
export async function createSession(url, metadata = {}) {
  const timestamp = Date.now();
  const normalizedUrl = normalizeUrl(url);
  
  const session = {
    url,
    normalizedUrl,
    createdAt: timestamp,
    updatedAt: timestamp,
    fields: [],
    metadata
  };
  
  const storage = await chrome.storage.local.get('records');
  const records = storage.records || {};
  
  if (!records[normalizedUrl]) {
    records[normalizedUrl] = {};
  }
  
  records[normalizedUrl][timestamp.toString()] = session;
  
  await chrome.storage.local.set({ records });
  await cleanup(normalizedUrl);
  
  return session;
}

/**
 * 取得 Session
 * @param {string} normalizedUrl
 * @param {number} timestamp
 * @returns {Promise<RecordSession|null>}
 */
export async function getSession(normalizedUrl, timestamp) {
  const storage = await chrome.storage.local.get('records');
  const records = storage.records || {};
  return records[normalizedUrl]?.[timestamp.toString()] || null;
}

/**
 * 更新 Session
 * @param {string} normalizedUrl
 * @param {number} timestamp
 * @param {Partial<RecordSession>} updates
 * @returns {Promise<RecordSession>}
 */
export async function updateSession(normalizedUrl, timestamp, updates) {
  const storage = await chrome.storage.local.get('records');
  const records = storage.records || {};
  
  const session = records[normalizedUrl]?.[timestamp.toString()];
  if (!session) {
    throw new Error('SESSION_NOT_FOUND');
  }
  
  const updatedSession = {
    ...session,
    ...updates,
    updatedAt: Date.now()
  };
  
  records[normalizedUrl][timestamp.toString()] = updatedSession;
  await chrome.storage.local.set({ records });
  
  return updatedSession;
}

/**
 * 刪除 Session
 * @param {string} normalizedUrl
 * @param {number} timestamp
 * @returns {Promise<boolean>}
 */
export async function deleteSession(normalizedUrl, timestamp) {
  const storage = await chrome.storage.local.get('records');
  const records = storage.records || {};
  
  if (!records[normalizedUrl]?.[timestamp.toString()]) {
    return false;
  }
  
  delete records[normalizedUrl][timestamp.toString()];
  
  if (Object.keys(records[normalizedUrl]).length === 0) {
    delete records[normalizedUrl];
  }
  
  await chrome.storage.local.set({ records });
  return true;
}

/**
 * 比對欄位識別碼
 * @param {FieldIdentifier} a
 * @param {FieldIdentifier} b
 * @returns {boolean}
 */
function matchIdentifier(a, b) {
  if (a.id && b.id && a.id === b.id) return true;
  if (a.name && b.name && a.name === b.name) return true;
  if (a.selector === b.selector) return true;
  return false;
}

/**
 * 新增或更新欄位
 * @param {string} normalizedUrl
 * @param {number} timestamp
 * @param {FieldRecord} field
 * @returns {Promise<boolean>}
 */
export async function addField(normalizedUrl, timestamp, field) {
  const session = await getSession(normalizedUrl, timestamp);
  if (!session) {
    throw new Error('SESSION_NOT_FOUND');
  }
  
  const existingIndex = session.fields.findIndex(
    f => matchIdentifier(f.identifier, field.identifier)
  );
  
  if (existingIndex >= 0) {
    session.fields[existingIndex] = {
      ...session.fields[existingIndex],
      ...field,
      recordedAt: Date.now()
    };
  } else {
    session.fields.push({
      ...field,
      recordedAt: Date.now()
    });
  }
  
  await updateSession(normalizedUrl, timestamp, { fields: session.fields });
  return true;
}

/**
 * 取得特定 URL 的所有 Sessions
 * @param {string} normalizedUrl
 * @returns {Promise<RecordSession[]>}
 */
export async function getSessionsForUrl(normalizedUrl) {
  const storage = await chrome.storage.local.get('records');
  const records = storage.records || {};
  
  if (!records[normalizedUrl]) {
    return [];
  }
  
  return Object.values(records[normalizedUrl])
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * 取得所有 Sessions
 * @returns {Promise<Object>}
 */
export async function getAllSessions() {
  const storage = await chrome.storage.local.get('records');
  return storage.records || {};
}

/**
 * 清理舊紀錄
 * @param {string} normalizedUrl - 若指定則只清理該 URL
 * @returns {Promise<number>} - 刪除的紀錄數量
 */
export async function cleanup(normalizedUrl = null) {
  const storage = await chrome.storage.local.get(['records', 'settings']);
  const records = storage.records || {};
  const settings = storage.settings || { maxRecordsPerUrl: 50 };
  
  let deletedCount = 0;
  const urlsToClean = normalizedUrl ? [normalizedUrl] : Object.keys(records);
  
  for (const url of urlsToClean) {
    if (!records[url]) continue;
    
    const timestamps = Object.keys(records[url])
      .map(Number)
      .sort((a, b) => a - b);
    
    while (timestamps.length > settings.maxRecordsPerUrl) {
      const oldestTimestamp = timestamps.shift();
      delete records[url][oldestTimestamp.toString()];
      deletedCount++;
    }
    
    if (Object.keys(records[url]).length === 0) {
      delete records[url];
    }
  }
  
  await chrome.storage.local.set({ records });
  return deletedCount;
}

/**
 * 清除所有資料
 * @returns {Promise<void>}
 */
export async function clearAll() {
  await chrome.storage.local.set({ records: {} });
}

// Session Storage 操作

/**
 * 取得錄製狀態
 * @param {number} tabId
 * @returns {Promise<RecordingState|null>}
 */
export async function getRecordingState(tabId) {
  const storage = await chrome.storage.session.get('recording');
  const recording = storage.recording || {};
  return recording[tabId.toString()] || null;
}

/**
 * 設定錄製狀態
 * @param {number} tabId
 * @param {RecordingState} state
 * @returns {Promise<void>}
 */
export async function setRecordingState(tabId, state) {
  const storage = await chrome.storage.session.get('recording');
  const recording = storage.recording || {};
  recording[tabId.toString()] = state;
  await chrome.storage.session.set({ recording });
}

/**
 * 清除錄製狀態
 * @param {number} tabId
 * @returns {Promise<void>}
 */
export async function clearRecordingState(tabId) {
  const storage = await chrome.storage.session.get('recording');
  const recording = storage.recording || {};
  delete recording[tabId.toString()];
  await chrome.storage.session.set({ recording });
}

/**
 * 更新欄位變動計數
 * @param {number} tabId
 * @returns {Promise<{count: number, shouldPrompt: boolean}>}
 */
export async function incrementFieldChangeCount(tabId) {
  const settings = await getSettings();
  const state = await getRecordingState(tabId) || {
    isRecording: false,
    declinedPrompt: false,
    fieldChangeCount: 0,
    isHistoryPanelOpen: false
  };
  
  if (state.isRecording || state.declinedPrompt || state.isHistoryPanelOpen) {
    return { count: state.fieldChangeCount, shouldPrompt: false };
  }
  
  state.fieldChangeCount++;
  await setRecordingState(tabId, state);
  
  const shouldPrompt = state.fieldChangeCount >= settings.promptThreshold;
  
  return { count: state.fieldChangeCount, shouldPrompt };
}

/**
 * 重置拒絕設定
 * @param {number} tabId
 * @returns {Promise<void>}
 */
export async function resetDeclinedPrompt(tabId) {
  const state = await getRecordingState(tabId);
  if (!state) return;
  
  state.declinedPrompt = false;
  state.fieldChangeCount = 0;
  
  await setRecordingState(tabId, state);
}
