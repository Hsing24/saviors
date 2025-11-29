# Data Model: 表單欄位錄製器 (Form Field Recorder)

**功能分支**: `001-form-field-recorder`  
**建立日期**: 2025-11-29  
**狀態**: 完成

## 實體關係圖

```
┌─────────────────────────────────────────────────────────────────┐
│                         Local Storage                           │
├─────────────────────────────────────────────────────────────────┤
│  StorageRoot                                                     │
│  ├── records: Map<NormalizedUrl, Map<Timestamp, RecordSession>> │
│  └── settings: Settings                                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        Session Storage                           │
├─────────────────────────────────────────────────────────────────┤
│  SessionState                                                    │
│  └── recording: Map<TabId, RecordingState>                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 實體定義

### RecordSession

代表一次完整的錄製會話，包含特定時間點某網頁所有欄位的值。

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| url | string | ✓ | 原始完整網址 |
| normalizedUrl | string | ✓ | 正規化後的網址（移除 query string） |
| createdAt | number | ✓ | 建立時間（Unix Timestamp，毫秒） |
| updatedAt | number | ✓ | 最後更新時間（Unix Timestamp，毫秒） |
| fields | FieldRecord[] | ✓ | 欄位紀錄陣列 |
| metadata | SessionMetadata | ✗ | 額外中繼資料 |

**驗證規則**:
- `url` 必須為有效的 URL 格式
- `createdAt` 必須小於等於 `updatedAt`
- `fields` 可為空陣列（錄製開始但尚未輸入）

**狀態轉換**:
```
[建立] → Active → [更新] → Active → [關閉] → Closed
```

---

### FieldRecord

代表單一表單欄位的紀錄。

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| identifier | FieldIdentifier | ✓ | 欄位識別資訊 |
| value | string | ✓ | 欄位值 |
| type | FieldType | ✓ | 欄位類型 |
| label | string | ✗ | 欄位標籤（若可取得） |
| recordedAt | number | ✓ | 紀錄時間（Unix Timestamp，毫秒） |

**驗證規則**:
- `identifier` 至少要有一個有效識別符
- `value` 可為空字串
- `type` 必須為定義的 FieldType 之一

---

### FieldIdentifier

欄位識別資訊，用於在頁面中定位欄位。

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| id | string | ✗ | 元素 id 屬性 |
| name | string | ✗ | 元素 name 屬性 |
| selector | string | ✓ | CSS 選擇器（fallback） |
| xpath | string | ✗ | XPath 路徑（備用） |

**驗證規則**:
- `selector` 為必填，作為最終 fallback
- 至少需有 `id` 或 `name` 其中一個（若可取得）

---

### FieldType

欄位類型列舉。

| 值 | 說明 |
|----|------|
| `text` | 文字輸入 |
| `email` | Email 輸入 |
| `tel` | 電話號碼 |
| `number` | 數字輸入 |
| `password` | 密碼欄位（不應儲存） |
| `textarea` | 多行文字 |
| `select` | 下拉選單 |
| `radio` | 單選按鈕 |
| `checkbox` | 核取方塊 |
| `date` | 日期選擇 |
| `time` | 時間選擇 |
| `datetime-local` | 日期時間 |
| `hidden` | 隱藏欄位（不應儲存） |
| `file` | 檔案上傳（不應儲存） |
| `other` | 其他類型 |

---

### SessionMetadata

錄製會話的額外中繼資料。

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| pageTitle | string | ✗ | 頁面標題 |
| formId | string | ✗ | 表單 id（若有） |
| formAction | string | ✗ | 表單 action URL |

---

### RecordingState

代表單一分頁的錄製狀態（Session Storage）。

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| isRecording | boolean | ✓ | 是否正在錄製 |
| currentTimestamp | number | ✗ | 當前錄製的 session timestamp |
| declinedPrompt | boolean | ✓ | 使用者是否已拒絕錄製提醒 |
| fieldChangeCount | number | ✓ | 未錄製時的欄位變動計數 |
| isHistoryPanelOpen | boolean | ✓ | 歷史清單是否開啟 |

**驗證規則**:
- `fieldChangeCount` 必須 >= 0
- 當 `isRecording` 為 true 時，`currentTimestamp` 必須有值

---

### Settings

使用者設定。

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| captchaBlocklist | string[] | ✓ | 驗證碼欄位選擇器清單 |
| maxRecordsPerUrl | number | ✓ | 每個 URL 最大紀錄數 |
| autoPromptEnabled | boolean | ✓ | 是否啟用自動提醒 |
| promptThreshold | number | ✓ | 觸發提醒的欄位變動次數 |

**預設值**:
```javascript
{
  captchaBlocklist: [
    '[name*="captcha"]',
    '[name*="verify"]',
    '[id*="captcha"]',
    '[autocomplete="one-time-code"]'
  ],
  maxRecordsPerUrl: 50,
  autoPromptEnabled: true,
  promptThreshold: 5
}
```

---

## Storage Schema

### chrome.storage.local

```typescript
interface LocalStorageSchema {
  records: {
    [normalizedUrl: string]: {
      [timestamp: string]: RecordSession;
    };
  };
  settings: Settings;
}
```

**範例**:
```json
{
  "records": {
    "https://example.com/form": {
      "1701234567890": {
        "url": "https://example.com/form?ref=abc",
        "normalizedUrl": "https://example.com/form",
        "createdAt": 1701234567890,
        "updatedAt": 1701234568500,
        "fields": [
          {
            "identifier": {
              "id": "user-name",
              "name": "username",
              "selector": "#user-name"
            },
            "value": "john_doe",
            "type": "text",
            "label": "使用者名稱",
            "recordedAt": 1701234568000
          }
        ],
        "metadata": {
          "pageTitle": "登入表單"
        }
      }
    }
  },
  "settings": {
    "captchaBlocklist": ["[name*='captcha']"],
    "maxRecordsPerUrl": 50,
    "autoPromptEnabled": true,
    "promptThreshold": 5
  }
}
```

### chrome.storage.session

```typescript
interface SessionStorageSchema {
  recording: {
    [tabId: string]: RecordingState;
  };
}
```

**範例**:
```json
{
  "recording": {
    "12345": {
      "isRecording": true,
      "currentTimestamp": 1701234567890,
      "declinedPrompt": false,
      "fieldChangeCount": 0,
      "isHistoryPanelOpen": false
    }
  }
}
```

---

## 資料操作

### 建立紀錄

```javascript
async function createRecordSession(tabId, url) {
  const timestamp = Date.now();
  const normalizedUrl = normalizeUrl(url);
  
  const session = {
    url,
    normalizedUrl,
    createdAt: timestamp,
    updatedAt: timestamp,
    fields: [],
    metadata: await getPageMetadata(tabId)
  };
  
  await saveSession(normalizedUrl, timestamp, session);
  return { normalizedUrl, timestamp };
}
```

### 更新欄位

```javascript
async function updateField(normalizedUrl, timestamp, fieldRecord) {
  const session = await getSession(normalizedUrl, timestamp);
  
  const existingIndex = session.fields.findIndex(
    f => matchIdentifier(f.identifier, fieldRecord.identifier)
  );
  
  if (existingIndex >= 0) {
    session.fields[existingIndex] = fieldRecord;
  } else {
    session.fields.push(fieldRecord);
  }
  
  session.updatedAt = Date.now();
  await saveSession(normalizedUrl, timestamp, session);
}
```

### 清理舊紀錄

```javascript
async function cleanupOldRecords(normalizedUrl, maxRecords) {
  const records = await getRecordsForUrl(normalizedUrl);
  const timestamps = Object.keys(records).sort((a, b) => a - b);
  
  while (timestamps.length > maxRecords) {
    const oldestTimestamp = timestamps.shift();
    delete records[oldestTimestamp];
  }
  
  await saveRecordsForUrl(normalizedUrl, records);
}
```
