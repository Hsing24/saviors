# Feature Specification: 表單欄位錄製器 (Form Field Recorder)

**Feature Branch**: `001-form-field-recorder`  
**Created**: 2025-11-29  
**Status**: Draft  
**Input**: Browser extension 表單欄位錄製功能，含儲存與歷史紀錄

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 啟用錄製功能 (Priority: P1)

使用者開啟瀏覽器 Extension 後，可以在視窗右上角看到錄製圖示，並選擇是否要開始記錄當前頁面的表單欄位值。

**Why this priority**: 這是功能的核心入口點，沒有錄製功能，其他功能都無法運作。

**Independent Test**: 可透過點擊 Extension 圖示並確認錄製圖示出現來測試，驗證使用者可以主動選擇開始錄製。

**Acceptance Scenarios**:

1. **Given** 使用者開啟任一網頁, **When** 點擊 Extension 圖示, **Then** 視窗右上角顯示錄製圖示
2. **Given** 錄製圖示已顯示, **When** 使用者點擊錄製圖示, **Then** 錄製功能啟用並開始追蹤欄位變動
3. **Given** 錄製功能已啟用, **When** 使用者再次點擊錄製圖示, **Then** 錄製功能停止

---

### User Story 2 - 自動提示錄製 (Priority: P1)

當使用者未主動開啟錄製功能時，系統會在偵測到 5 次欄位變動後，自動彈出提示詢問是否要開始記錄。

**Why this priority**: 這是提升使用者體驗的重要功能，確保使用者不會錯過錄製機會。

**Independent Test**: 可透過在未啟用錄製的情況下修改 5 個欄位，確認提示視窗出現。

**Acceptance Scenarios**:

1. **Given** 錄製功能未啟用, **When** 使用者變更 5 次欄位值, **Then** 右上角顯示錄製提醒視窗
2. **Given** 錄製提醒視窗顯示, **When** 使用者選擇「是」, **Then** 開始錄製並建立新的歷史紀錄
3. **Given** 錄製提醒視窗顯示, **When** 使用者選擇「否」, **Then** 將此選擇儲存至 session storage，此分頁不再詢問

---

### User Story 3 - 欄位值自動儲存 (Priority: P1)

當錄製功能啟用時，使用者離開任一輸入欄位（blur 事件）後，系統自動將該欄位的值儲存到 local storage。

**Why this priority**: 這是核心資料收集功能，確保使用者輸入的資料能被保存。

**Independent Test**: 可透過啟用錄製後輸入欄位值，然後檢查 local storage 確認資料已儲存。

**Acceptance Scenarios**:

1. **Given** 錄製功能已啟用, **When** 使用者在欄位輸入值並離開欄位, **Then** 該欄位值儲存至 local storage
2. **Given** 錄製功能已啟用, **When** 使用者修改已儲存的欄位值, **Then** 更新 local storage 中的對應值
3. **Given** 欄位為驗證碼類型, **When** 使用者離開該欄位, **Then** 系統不儲存該欄位值

---

### User Story 4 - 資料索引與歷史紀錄 (Priority: P2)

系統以網址作為資料索引，以 Unix Timestamp 作為歷史紀錄標識，讓使用者可以區分不同頁面和不同時間點的紀錄。

**Why this priority**: 資料組織結構對於後續的資料檢索和還原功能至關重要。

**Independent Test**: 可透過在同一頁面錄製多次，確認產生不同時間戳記的歷史紀錄。

**Acceptance Scenarios**:

1. **Given** 使用者開始錄製, **When** 建立新紀錄, **Then** 系統以當前網址和 Unix Timestamp 建立資料索引
2. **Given** 同一網址有多筆歷史紀錄, **When** 查看紀錄列表, **Then** 可依時間戳記區分不同版本

---

### User Story 5 - 檢視與應用歷史紀錄 (Priority: P2)

使用者可在 Extension 中選取已儲存的歷史紀錄，點擊欄位 key 可捲動至對應欄位，點擊 value 旁的按鈕可將值帶入對應欄位。

**Why this priority**: 這是使用者實際使用已錄製資料的關鍵功能。

**Independent Test**: 可透過開啟歷史紀錄列表，點擊特定欄位的 key 確認頁面捲動，點擊帶入按鈕確認值被填入。

**Acceptance Scenarios**:

1. **Given** 使用者開啟 Extension 歷史清單, **When** 點擊某欄位的 key, **Then** 頁面自動捲動至該欄位位置
2. **Given** 使用者開啟 Extension 歷史清單, **When** 點擊 value 旁的帶入按鈕, **Then** 該值自動填入對應欄位
3. **Given** 對應欄位已有值, **When** 點擊帶入按鈕, **Then** 原有值被覆蓋

---

### User Story 6 - 歷史清單與錄製互斥 (Priority: P3)

當 Extension 的歷史資料清單開啟時，錄製功能會暫停，需要使用者關閉歷史清單並再次觸發 5 次欄位變動才會重新詢問。

**Why this priority**: 確保使用者在瀏覽歷史資料時不會意外觸發錄製。

**Independent Test**: 可透過開啟歷史清單確認錄製停止，關閉後觸發 5 次變動確認提示再次出現。

**Acceptance Scenarios**:

1. **Given** 錄製功能啟用中, **When** 使用者開啟歷史清單, **Then** 錄製功能暫停
2. **Given** 歷史清單已開啟, **When** 使用者在頁面變更欄位, **Then** 系統不記錄該變更
3. **Given** 歷史清單關閉, **When** 使用者變更 5 次欄位值, **Then** 系統重新詢問是否錄製
4. **Given** 使用者先前選擇「否」不錄製, **When** 開啟歷史清單再關閉, **Then** Session storage 的拒絕設定被重置

---

### Edge Cases

- 使用者在欄位輸入後快速切換分頁，系統應確保資料仍能正確儲存
- 頁面動態載入新欄位時，系統應能偵測並追蹤這些新欄位
- 使用者清除瀏覽器 local storage 後，歷史紀錄應被清空且系統正常運作
- 網址包含查詢參數時，系統應決定是否視為同一資料索引（假設：相同路徑視為同一索引）
- 使用者在 iframe 內的欄位操作應被正確處理（假設：僅處理主文檔欄位）

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Extension MUST 在視窗右上角顯示錄製圖示，供使用者切換錄製狀態
- **FR-002**: Extension MUST 在未啟用錄製時，偵測到 5 次欄位變動後顯示錄製提醒
- **FR-003**: Extension MUST 將使用者拒絕錄製的選擇儲存至 session storage
- **FR-004**: Extension MUST 在使用者同意錄製時，以網址和 Unix Timestamp 建立資料索引
- **FR-005**: Extension MUST 在欄位 blur 事件觸發時，將欄位值儲存至 local storage
- **FR-006**: Extension MUST 排除驗證碼欄位，不儲存其值
- **FR-007**: Extension MUST 提供歷史紀錄清單檢視功能
- **FR-008**: Extension MUST 在點擊欄位 key 時，將頁面捲動至對應欄位
- **FR-009**: Extension MUST 在 value 旁提供帶入按鈕，點擊後將值填入對應欄位
- **FR-010**: Extension MUST 在歷史清單開啟時暫停錄製功能
- **FR-011**: Extension MUST 在歷史清單開啟時重置 session storage 中的拒絕紀錄設定

### Key Entities

- **RecordSession**: 代表一次錄製會話，包含網址（URL）、建立時間戳記（Unix Timestamp）、所有欄位值的集合
- **FieldRecord**: 代表單一欄位的紀錄，包含欄位識別碼（selector/id/name）、欄位值、欄位類型
- **UserPreference**: 代表使用者偏好設定，包含是否拒絕錄製提醒（session storage）、錄製狀態

## Clarifications

### Session 2025-11-29

- Q: CAPTCHA field detection strategy? → A: Configurable allowlist/blocklist of field selectors

## Assumptions

- 驗證碼欄位透過可配置的欄位選擇器 allowlist/blocklist 來識別，使用者可自訂排除規則
- 網址索引以路徑為主，不包含查詢參數（query string）
- 僅處理主文檔（main document）中的欄位，不處理 iframe 內容
- 欄位識別使用 CSS selector 或元素 id/name 屬性
- 每次開啟歷史清單都會重置 session storage 中的拒絕設定

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 使用者可在 3 秒內找到並點擊錄製圖示開始錄製
- **SC-002**: 欄位值在 blur 事件後 1 秒內成功儲存至 local storage
- **SC-003**: 95% 的欄位可被正確識別並儲存
- **SC-004**: 使用者可在 5 秒內從歷史紀錄中找到並應用先前儲存的資料
- **SC-005**: 頁面捲動到目標欄位的時間不超過 1 秒
- **SC-006**: 使用者重複填寫相同表單的時間減少 50% 以上
