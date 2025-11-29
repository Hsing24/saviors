# Storage API Contracts: 表單欄位錄製器

**功能分支**: `001-form-field-recorder`  
**建立日期**: 2025-11-29  
**狀態**: 完成

## 概述

本文件定義 Chrome Storage API 的操作契約，涵蓋 Local Storage（持久化資料）與 Session Storage（暫時性狀態）的完整 CRUD 操作。

---

## Storage Service Interface

```typescript
interface StorageService {
  // RecordSession 操作
  createSession(url: string, metadata?: SessionMetadata): Promise<RecordSession>;
  getSession(normalizedUrl: string, timestamp: number): Promise<RecordSession | null>;
  updateSession(normalizedUrl: string, timestamp: number, updates: Partial<RecordSession>): Promise<RecordSession>;
  deleteSession(normalizedUrl: string, timestamp: number): Promise<boolean>;
  
  // 查詢操作
  getSessionsForUrl(normalizedUrl: string): Promise<RecordSession[]>;
  getAllSessions(): Promise<Map<string, RecordSession[]>>;
  searchSessions(query: SessionQuery): Promise<RecordSession[]>;
  
  // 欄位操作
  addField(normalizedUrl: string, timestamp: number, field: FieldRecord): Promise<boolean>;
  updateField(normalizedUrl: string, timestamp: number, identifier: FieldIdentifier, updates: Partial<FieldRecord>): Promise<boolean>;
  removeField(normalizedUrl: string, timestamp: number, identifier: FieldIdentifier): Promise<boolean>;
  
  // 設定操作
  getSettings(): Promise<Settings>;
  updateSettings(updates: Partial<Settings>): Promise<Settings>;
  
  // 清理操作
  cleanup(normalizedUrl?: string): Promise<number>;
  clearAll(): Promise<void>;
}
```

---

## Local Storage 操作

### 建立 Session

**Function**: `createSession(url, metadata?)`

**Input**:
```typescript
{
  url: string;           // 完整網址
  metadata?: {
    pageTitle?: string;
    formId?: string;
    formAction?: string;
  };
}
```

**Output**:
```typescript
{
  url: string;
  normalizedUrl: string;
  createdAt: number;
  updatedAt: number;
  fields: [];
  metadata?: SessionMetadata;
}
```

**Storage Operation**:
```javascript
async function createSession(url, metadata = {}) {
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
  await cleanupIfNeeded(normalizedUrl);
  
  return session;
}
```

---

### 取得 Session

**Function**: `getSession(normalizedUrl, timestamp)`

**Input**:
```typescript
{
  normalizedUrl: string;
  timestamp: number;
}
```

**Output**:
```typescript
RecordSession | null
```

**Storage Operation**:
```javascript
async function getSession(normalizedUrl, timestamp) {
  const storage = await chrome.storage.local.get('records');
  const records = storage.records || {};
  
  return records[normalizedUrl]?.[timestamp.toString()] || null;
}
```

---

### 更新 Session

**Function**: `updateSession(normalizedUrl, timestamp, updates)`

**Input**:
```typescript
{
  normalizedUrl: string;
  timestamp: number;
  updates: Partial<RecordSession>;
}
```

**Output**:
```typescript
RecordSession  // 更新後的完整 Session
```

**Storage Operation**:
```javascript
async function updateSession(normalizedUrl, timestamp, updates) {
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
```

---

### 刪除 Session

**Function**: `deleteSession(normalizedUrl, timestamp)`

**Input**:
```typescript
{
  normalizedUrl: string;
  timestamp: number;
}
```

**Output**:
```typescript
boolean  // 是否成功刪除
```

**Storage Operation**:
```javascript
async function deleteSession(normalizedUrl, timestamp) {
  const storage = await chrome.storage.local.get('records');
  const records = storage.records || {};
  
  if (!records[normalizedUrl]?.[timestamp.toString()]) {
    return false;
  }
  
  delete records[normalizedUrl][timestamp.toString()];
  
  // 若該 URL 無其他紀錄，刪除整個 URL 索引
  if (Object.keys(records[normalizedUrl]).length === 0) {
    delete records[normalizedUrl];
  }
  
  await chrome.storage.local.set({ records });
  return true;
}
```

---

### 新增欄位

**Function**: `addField(normalizedUrl, timestamp, field)`

**Input**:
```typescript
{
  normalizedUrl: string;
  timestamp: number;
  field: FieldRecord;
}
```

**Output**:
```typescript
boolean  // 是否成功新增
```

**Storage Operation**:
```javascript
async function addField(normalizedUrl, timestamp, field) {
  const session = await getSession(normalizedUrl, timestamp);
  if (!session) {
    throw new Error('SESSION_NOT_FOUND');
  }
  
  // 檢查是否已存在相同欄位
  const existingIndex = session.fields.findIndex(
    f => matchIdentifier(f.identifier, field.identifier)
  );
  
  if (existingIndex >= 0) {
    // 更新現有欄位
    session.fields[existingIndex] = {
      ...session.fields[existingIndex],
      ...field,
      recordedAt: Date.now()
    };
  } else {
    // 新增欄位
    session.fields.push({
      ...field,
      recordedAt: Date.now()
    });
  }
  
  await updateSession(normalizedUrl, timestamp, { fields: session.fields });
  return true;
}
```

---

### 查詢 Sessions

**Function**: `searchSessions(query)`

**Input**:
```typescript
interface SessionQuery {
  normalizedUrl?: string;
  startDate?: number;
  endDate?: number;
  hasFields?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}
```

**Output**:
```typescript
RecordSession[]
```

**Storage Operation**:
```javascript
async function searchSessions(query) {
  const storage = await chrome.storage.local.get('records');
  const records = storage.records || {};
  
  let sessions = [];
  
  // 收集所有符合條件的 sessions
  for (const [url, urlRecords] of Object.entries(records)) {
    if (query.normalizedUrl && url !== query.normalizedUrl) {
      continue;
    }
    
    for (const session of Object.values(urlRecords)) {
      // 日期過濾
      if (query.startDate && session.createdAt < query.startDate) continue;
      if (query.endDate && session.createdAt > query.endDate) continue;
      
      // 欄位過濾
      if (query.hasFields === true && session.fields.length === 0) continue;
      if (query.hasFields === false && session.fields.length > 0) continue;
      
      sessions.push(session);
    }
  }
  
  // 排序
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder || 'desc';
  sessions.sort((a, b) => {
    const diff = a[sortBy] - b[sortBy];
    return sortOrder === 'desc' ? -diff : diff;
  });
  
  // 分頁
  const offset = query.offset || 0;
  const limit = query.limit || 50;
  
  return sessions.slice(offset, offset + limit);
}
```

---

### 清理舊紀錄

**Function**: `cleanup(normalizedUrl?)`

**Input**:
```typescript
{
  normalizedUrl?: string;  // 若指定則只清理該 URL
}
```

**Output**:
```typescript
number  // 刪除的紀錄數量
```

**Storage Operation**:
```javascript
async function cleanup(normalizedUrl = null) {
  const storage = await chrome.storage.local.get(['records', 'settings']);
  const records = storage.records || {};
  const settings = storage.settings || { maxRecordsPerUrl: 50 };
  
  let deletedCount = 0;
  const urlsToClean = normalizedUrl 
    ? [normalizedUrl] 
    : Object.keys(records);
  
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
```

---

## Session Storage 操作

### 取得錄製狀態

**Function**: `getRecordingState(tabId)`

**Input**:
```typescript
{
  tabId: number;
}
```

**Output**:
```typescript
RecordingState | null
```

**Storage Operation**:
```javascript
async function getRecordingState(tabId) {
  const storage = await chrome.storage.session.get('recording');
  const recording = storage.recording || {};
  
  return recording[tabId.toString()] || null;
}
```

---

### 設定錄製狀態

**Function**: `setRecordingState(tabId, state)`

**Input**:
```typescript
{
  tabId: number;
  state: RecordingState;
}
```

**Output**:
```typescript
void
```

**Storage Operation**:
```javascript
async function setRecordingState(tabId, state) {
  const storage = await chrome.storage.session.get('recording');
  const recording = storage.recording || {};
  
  recording[tabId.toString()] = state;
  
  await chrome.storage.session.set({ recording });
}
```

---

### 清除錄製狀態

**Function**: `clearRecordingState(tabId)`

**Input**:
```typescript
{
  tabId: number;
}
```

**Output**:
```typescript
void
```

**Storage Operation**:
```javascript
async function clearRecordingState(tabId) {
  const storage = await chrome.storage.session.get('recording');
  const recording = storage.recording || {};
  
  delete recording[tabId.toString()];
  
  await chrome.storage.session.set({ recording });
}
```

---

### 更新欄位變動計數

**Function**: `incrementFieldChangeCount(tabId)`

**Input**:
```typescript
{
  tabId: number;
}
```

**Output**:
```typescript
{
  count: number;
  shouldPrompt: boolean;
}
```

**Storage Operation**:
```javascript
async function incrementFieldChangeCount(tabId) {
  const settings = await getSettings();
  const state = await getRecordingState(tabId) || {
    isRecording: false,
    declinedPrompt: false,
    fieldChangeCount: 0,
    isHistoryPanelOpen: false
  };
  
  // 不在以下情況下計數：正在錄製、已拒絕、歷史面板開啟
  if (state.isRecording || state.declinedPrompt || state.isHistoryPanelOpen) {
    return { count: state.fieldChangeCount, shouldPrompt: false };
  }
  
  state.fieldChangeCount++;
  await setRecordingState(tabId, state);
  
  const shouldPrompt = state.fieldChangeCount >= settings.promptThreshold;
  
  return { count: state.fieldChangeCount, shouldPrompt };
}
```

---

### 重置拒絕設定

**Function**: `resetDeclinedPrompt(tabId)`

**Input**:
```typescript
{
  tabId: number;
}
```

**Output**:
```typescript
void
```

**Storage Operation**:
```javascript
async function resetDeclinedPrompt(tabId) {
  const state = await getRecordingState(tabId);
  if (!state) return;
  
  state.declinedPrompt = false;
  state.fieldChangeCount = 0;
  
  await setRecordingState(tabId, state);
}
```

---

## 設定操作

### 取得設定

**Function**: `getSettings()`

**Output**:
```typescript
Settings
```

**Storage Operation**:
```javascript
async function getSettings() {
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
```

---

### 更新設定

**Function**: `updateSettings(updates)`

**Input**:
```typescript
{
  updates: Partial<Settings>;
}
```

**Output**:
```typescript
Settings  // 更新後的完整設定
```

**Storage Operation**:
```javascript
async function updateSettings(updates) {
  const currentSettings = await getSettings();
  const newSettings = { ...currentSettings, ...updates };
  
  await chrome.storage.local.set({ settings: newSettings });
  
  return newSettings;
}
```

---

## Storage 事件監聽

```javascript
// 監聽 Storage 變化
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.records) {
    // 通知相關 context 資料已更新
    notifyRecordsUpdated(changes.records.newValue);
  }
  
  if (areaName === 'session' && changes.recording) {
    // 通知相關 context 狀態已更新
    notifyStateChanged(changes.recording.newValue);
  }
});
```
