# Message API Contracts: 表單欄位錄製器

**功能分支**: `001-form-field-recorder`  
**建立日期**: 2025-11-29  
**狀態**: 完成

## 概述

本文件定義 Chrome Extension 各 context 之間的訊息通訊契約，包含 Content Script、Service Worker 與 Popup 之間的所有訊息類型。

---

## 訊息類型定義

### 基礎訊息結構

```typescript
interface Message<T = unknown> {
  type: MessageType;
  payload: T;
  timestamp: number;
}

interface Response<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
```

---

## Content Script → Service Worker

### FIELD_CHANGED

欄位值變動通知。

**Request**:
```typescript
interface FieldChangedPayload {
  tabId: number;
  url: string;
  field: {
    identifier: FieldIdentifier;
    value: string;
    type: FieldType;
    label?: string;
  };
}
```

**Response**:
```typescript
interface FieldChangedResponse {
  saved: boolean;
  sessionTimestamp?: number;
}
```

**範例**:
```javascript
// Content Script
chrome.runtime.sendMessage({
  type: 'FIELD_CHANGED',
  payload: {
    tabId: 12345,
    url: 'https://example.com/form',
    field: {
      identifier: { id: 'email', name: 'user_email', selector: '#email' },
      value: 'user@example.com',
      type: 'email',
      label: 'Email 地址'
    }
  },
  timestamp: Date.now()
});
```

---

### RECORDING_STARTED

錄製開始通知。

**Request**:
```typescript
interface RecordingStartedPayload {
  tabId: number;
  url: string;
  timestamp: number;  // Session timestamp
}
```

**Response**:
```typescript
interface RecordingStartedResponse {
  acknowledged: boolean;
}
```

---

### RECORDING_STOPPED

錄製停止通知。

**Request**:
```typescript
interface RecordingStoppedPayload {
  tabId: number;
  sessionTimestamp: number;
  fieldsCount: number;
}
```

**Response**:
```typescript
interface RecordingStoppedResponse {
  saved: boolean;
}
```

---

### PROMPT_RESPONSE

使用者對錄製提醒的回應。

**Request**:
```typescript
interface PromptResponsePayload {
  tabId: number;
  accepted: boolean;
  url: string;
}
```

**Response**:
```typescript
interface PromptResponseResponse {
  sessionTimestamp?: number;  // 若 accepted 為 true
}
```

---

## Service Worker → Content Script

### START_RECORDING

開始錄製指令。

**Request**:
```typescript
interface StartRecordingPayload {
  sessionTimestamp: number;
}
```

**Response**:
```typescript
interface StartRecordingResponse {
  started: boolean;
}
```

**使用**:
```javascript
// Service Worker
chrome.tabs.sendMessage(tabId, {
  type: 'START_RECORDING',
  payload: { sessionTimestamp: Date.now() },
  timestamp: Date.now()
});
```

---

### STOP_RECORDING

停止錄製指令。

**Request**:
```typescript
interface StopRecordingPayload {
  reason: 'user_action' | 'history_panel_opened' | 'tab_closed';
}
```

**Response**:
```typescript
interface StopRecordingResponse {
  stopped: boolean;
  fieldsRecorded: number;
}
```

---

### APPLY_FIELD_VALUE

將歷史值填入欄位。

**Request**:
```typescript
interface ApplyFieldValuePayload {
  identifier: FieldIdentifier;
  value: string;
}
```

**Response**:
```typescript
interface ApplyFieldValueResponse {
  applied: boolean;
  elementFound: boolean;
}
```

---

### SCROLL_TO_FIELD

捲動至指定欄位。

**Request**:
```typescript
interface ScrollToFieldPayload {
  identifier: FieldIdentifier;
}
```

**Response**:
```typescript
interface ScrollToFieldResponse {
  scrolled: boolean;
  elementFound: boolean;
}
```

---

### SHOW_PROMPT

顯示錄製提醒。

**Request**:
```typescript
interface ShowPromptPayload {
  fieldChangeCount: number;
}
```

**Response**:
```typescript
interface ShowPromptResponse {
  shown: boolean;
}
```

---

## Popup → Service Worker

### GET_RECORDS

取得歷史紀錄。

**Request**:
```typescript
interface GetRecordsPayload {
  url?: string;           // 特定 URL 的紀錄
  limit?: number;         // 限制回傳數量
  offset?: number;        // 分頁偏移
}
```

**Response**:
```typescript
interface GetRecordsResponse {
  records: {
    [normalizedUrl: string]: {
      [timestamp: string]: RecordSessionSummary;
    };
  };
  total: number;
}

interface RecordSessionSummary {
  url: string;
  createdAt: number;
  fieldsCount: number;
  pageTitle?: string;
}
```

---

### GET_RECORDING_STATE

取得當前分頁錄製狀態。

**Request**:
```typescript
interface GetRecordingStatePayload {
  tabId: number;
}
```

**Response**:
```typescript
interface GetRecordingStateResponse {
  isRecording: boolean;
  currentTimestamp?: number;
  fieldChangeCount: number;
}
```

---

### GET_SESSION_DETAIL

取得特定 Session 的完整資料。

**Request**:
```typescript
interface GetSessionDetailPayload {
  normalizedUrl: string;
  timestamp: number;
}
```

**Response**:
```typescript
interface GetSessionDetailResponse {
  session: RecordSession;
}
```

---

### TOGGLE_RECORDING

切換錄製狀態。

**Request**:
```typescript
interface ToggleRecordingPayload {
  tabId: number;
  start: boolean;
}
```

**Response**:
```typescript
interface ToggleRecordingResponse {
  isRecording: boolean;
  sessionTimestamp?: number;
}
```

---

### DELETE_RECORD

刪除歷史紀錄。

**Request**:
```typescript
interface DeleteRecordPayload {
  normalizedUrl: string;
  timestamp?: number;  // 若無指定則刪除該 URL 所有紀錄
}
```

**Response**:
```typescript
interface DeleteRecordResponse {
  deleted: boolean;
  deletedCount: number;
}
```

---

### NOTIFY_HISTORY_PANEL_STATE

通知歷史面板狀態變化。

**Request**:
```typescript
interface NotifyHistoryPanelStatePayload {
  tabId: number;
  isOpen: boolean;
}
```

**Response**:
```typescript
interface NotifyHistoryPanelStateResponse {
  acknowledged: boolean;
  recordingPaused?: boolean;
}
```

---

## Service Worker → Popup

### RECORDS_UPDATED

紀錄更新通知（透過 Storage onChange）。

```typescript
interface RecordsUpdatedEvent {
  type: 'RECORDS_UPDATED';
  payload: {
    normalizedUrl: string;
    timestamp: number;
    action: 'created' | 'updated' | 'deleted';
  };
}
```

---

### STATE_CHANGED

錄製狀態變化通知。

```typescript
interface StateChangedEvent {
  type: 'STATE_CHANGED';
  payload: {
    tabId: number;
    isRecording: boolean;
    currentTimestamp?: number;
  };
}
```

---

## 錯誤代碼

| 代碼 | 說明 |
|------|------|
| `ELEMENT_NOT_FOUND` | 找不到指定欄位 |
| `STORAGE_ERROR` | Storage 操作失敗 |
| `TAB_NOT_FOUND` | 找不到指定分頁 |
| `CONTENT_SCRIPT_NOT_INJECTED` | Content Script 尚未注入 |
| `INVALID_MESSAGE_FORMAT` | 訊息格式錯誤 |
| `SESSION_NOT_FOUND` | 找不到指定 Session |
| `PERMISSION_DENIED` | 權限不足 |

---

## 訊息流程範例

### 自動提醒錄製流程

```
1. Content Script 偵測到欄位變動
   └─→ [FIELD_CHANGED] → Service Worker
                          ├─ 更新 fieldChangeCount
                          └─ 若 count >= 5
                             └─→ [SHOW_PROMPT] → Content Script
                                                 └─ 顯示提醒 UI
                                                    └─→ [PROMPT_RESPONSE] → Service Worker
                                                                             ├─ 若 accepted: 建立 Session
                                                                             │   └─→ [START_RECORDING] → Content Script
                                                                             └─ 若 declined: 更新 Session Storage
```

### 應用歷史值流程

```
1. 使用者在 Popup 點擊「帶入」按鈕
   └─→ [APPLY_FIELD_VALUE] → Service Worker
                              └─→ [APPLY_FIELD_VALUE] → Content Script
                                                        ├─ 尋找欄位
                                                        ├─ 填入值
                                                        └─→ Response → Popup 顯示結果
```
