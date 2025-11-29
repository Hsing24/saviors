# Research: 表單欄位錄製器 (Form Field Recorder)

**功能分支**: `001-form-field-recorder`  
**建立日期**: 2025-11-29  
**狀態**: 完成

## 研究摘要

本文件記錄表單欄位錄製功能開發過程中的技術研究成果，解決規格中標記為「NEEDS CLARIFICATION」的問題，並為各技術選型提供依據。

---

## 1. 欄位識別策略

### Decision: 使用複合識別碼 (Composite Identifier)

**選擇方案**: 結合多種識別符建立唯一欄位識別碼

**識別優先順序**:
1. `id` 屬性（最可靠）
2. `name` 屬性
3. CSS Selector（基於 DOM 路徑）
4. `data-*` 屬性（若有配置）

**Rationale**:
- 單一識別符可能因頁面變動而失效
- 複合識別碼提供 fallback 機制
- 優先使用語義化屬性確保跨 session 一致性

**Alternatives Considered**:
- 僅使用 XPath：太脆弱，DOM 變動即失效
- 僅使用 id：許多欄位無 id 屬性
- 機器學習識別：過於複雜，不符合最小化原則

---

## 2. 驗證碼欄位偵測

### Decision: 可配置的 Allowlist/Blocklist 機制

**選擇方案**: 使用可配置的選擇器規則過濾驗證碼欄位

**預設 Blocklist 規則**:
```javascript
const DEFAULT_CAPTCHA_PATTERNS = [
  // 常見驗證碼欄位特徵
  '[name*="captcha"]',
  '[name*="verify"]',
  '[name*="code"]',
  '[id*="captcha"]',
  '[id*="verify"]',
  '[class*="captcha"]',
  '[autocomplete="one-time-code"]',
  'input[type="text"][maxlength="4"]',  // 常見 4-6 碼驗證
  'input[type="text"][maxlength="5"]',
  'input[type="text"][maxlength="6"]'
];
```

**Rationale**:
- 規格明確指出使用 allowlist/blocklist 機制
- 預設規則涵蓋常見驗證碼模式
- 使用者可自訂規則以適應特殊情況

**Alternatives Considered**:
- AI 影像辨識：複雜度高、需要額外權限
- 固定欄位名稱清單：不夠靈活
- 完全不過濾：可能儲存敏感資料

---

## 3. Storage 結構設計

### Decision: 分層式 Storage 架構

**選擇方案**: 使用 URL 作為主索引，Timestamp 作為次索引

**Local Storage 結構**:
```javascript
{
  "records": {
    "[normalized-url]": {
      "[timestamp]": {
        "url": "https://example.com/form",
        "createdAt": 1701234567890,
        "updatedAt": 1701234568000,
        "fields": [
          {
            "identifier": { "id": "name", "name": "user_name", "selector": "#name" },
            "value": "John Doe",
            "type": "text",
            "label": "姓名"
          }
        ]
      }
    }
  },
  "settings": {
    "captchaBlocklist": [...],
    "maxRecordsPerUrl": 50
  }
}
```

**Session Storage 結構**:
```javascript
{
  "recording": {
    "[tab-id]": {
      "isRecording": true,
      "currentTimestamp": 1701234567890,
      "declinedPrompt": false,
      "fieldChangeCount": 0
    }
  }
}
```

**Rationale**:
- URL 正規化移除 query string，符合規格假設
- Timestamp 提供精確的版本識別
- 分離 Local/Session storage 符合資料生命週期

**Alternatives Considered**:
- IndexedDB：對此規模資料過於複雜
- 單層結構：查詢效率低
- 完整 URL 作為索引：query string 變化造成資料碎片

---

## 4. URL 正規化

### Decision: 移除 Query String 與 Hash

**選擇方案**: 僅保留 protocol + hostname + pathname

**正規化邏輯**:
```javascript
function normalizeUrl(url) {
  const urlObj = new URL(url);
  return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
}
```

**Rationale**:
- 規格假設「相同路徑視為同一索引」
- 避免因 tracking parameters 產生重複紀錄
- 簡化使用者的歷史紀錄管理

**Alternatives Considered**:
- 保留完整 URL：過多重複紀錄
- 可配置正規化規則：增加複雜度

---

## 5. Content Script 注入策略

### Decision: 使用 Programmatic Injection

**選擇方案**: 透過 Service Worker 動態注入 Content Script

**實作方式**:
```javascript
// manifest.json - 宣告 scripting 權限
{
  "permissions": ["scripting", "activeTab", "storage"],
  "host_permissions": ["<all_urls>"]
}

// service-worker.js - 動態注入
chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content/content.js']
  });
});
```

**Rationale**:
- 符合最小權限原則（僅在需要時注入）
- 使用者主動觸發，避免不必要的資源消耗
- Manifest V3 推薦做法

**Alternatives Considered**:
- 靜態注入 (content_scripts)：所有頁面都載入，資源浪費
- 僅使用 popup：無法監聽頁面事件

---

## 6. 訊息通訊架構

### Decision: 使用 Chrome Runtime Messaging

**選擇方案**: Content Script ↔ Service Worker ↔ Popup 三層架構

**訊息類型定義**:
```javascript
const MessageTypes = {
  // Content → Service Worker
  FIELD_CHANGED: 'field_changed',
  RECORDING_STARTED: 'recording_started',
  RECORDING_STOPPED: 'recording_stopped',
  
  // Service Worker → Content
  START_RECORDING: 'start_recording',
  STOP_RECORDING: 'stop_recording',
  APPLY_FIELD_VALUE: 'apply_field_value',
  SCROLL_TO_FIELD: 'scroll_to_field',
  
  // Popup → Service Worker
  GET_RECORDS: 'get_records',
  GET_RECORDING_STATE: 'get_recording_state',
  
  // Service Worker → Popup
  RECORDS_UPDATED: 'records_updated',
  STATE_CHANGED: 'state_changed'
};
```

**Rationale**:
- Chrome Extension 標準通訊模式
- Service Worker 作為中央協調者，簡化狀態管理
- 明確的訊息類型避免混淆

**Alternatives Considered**:
- 直接 Content ↔ Popup 通訊：Popup 關閉時無法通訊
- 共享 Storage 輪詢：效能差、即時性低

---

## 7. 欄位變動偵測

### Decision: 使用 Event Delegation + MutationObserver

**選擇方案**: 結合事件委派與 DOM 變動觀察

**實作策略**:
```javascript
// 事件委派監聽 blur 事件
document.addEventListener('blur', handleBlur, true);

// MutationObserver 偵測動態載入欄位
const observer = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        detectNewFields(node);
      }
    });
  });
});

observer.observe(document.body, { childList: true, subtree: true });
```

**Rationale**:
- 規格要求偵測動態載入欄位
- Event delegation 減少事件監聽器數量
- MutationObserver 是現代 DOM 觀察標準

**Alternatives Considered**:
- 輪詢 DOM：效能差、消耗資源
- 僅監聽已存在欄位：無法處理動態欄位

---

## 8. 歷史紀錄數量限制

### Decision: 每個 URL 最多保存 50 筆紀錄

**選擇方案**: 固定數量限制 + 自動清理最舊紀錄

**清理策略**:
```javascript
const MAX_RECORDS_PER_URL = 50;

function addRecord(url, record) {
  const records = getRecordsForUrl(url);
  records.push(record);
  
  // 超出限制時移除最舊紀錄
  while (records.length > MAX_RECORDS_PER_URL) {
    records.shift();
  }
  
  saveRecords(url, records);
}
```

**Rationale**:
- 符合憲法中的 Storage Efficiency 要求
- 50 筆足夠涵蓋一般使用情境
- 自動清理避免手動管理負擔

**Alternatives Considered**:
- 無限制：可能耗盡 storage quota
- 基於時間的過期：使用者可能需要舊紀錄
- 可配置數量：增加複雜度

---

## 技術依賴總結

| 依賴 | 用途 | 權限需求 |
|------|------|----------|
| chrome.storage.local | 持久化欄位紀錄 | `storage` |
| chrome.storage.session | 暫時性錄製狀態 | `storage` |
| chrome.scripting | 動態注入 content script | `scripting` |
| chrome.tabs | 取得當前分頁資訊 | `activeTab` |
| chrome.runtime | 跨 context 訊息通訊 | 無需額外權限 |
