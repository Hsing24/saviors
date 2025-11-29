# Tasks: 表單欄位錄製器 (Form Field Recorder)

**Input**: Design documents from `/specs/001-form-field-recorder/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: 未明確要求，本任務清單不包含測試任務。

**Organization**: 任務依使用者故事分組，可獨立實作與測試。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行執行（不同檔案、無相依性）
- **[Story]**: 所屬使用者故事（US1, US2, US3 等）
- 描述中包含確切檔案路徑

## Path Conventions

Chrome Extension 專案結構：
- `popup.*`: Extension popup 介面
- `content/`: Content script（頁面注入）
- `background/`: Service worker
- `lib/`: 共用邏輯

---

## Phase 1: Setup (專案初始化)

**Purpose**: 專案結構建立與基礎配置

- [ ] T001 更新 manifest.json 加入 Manifest V3 必要權限（storage, scripting, activeTab）與 content_scripts 配置
- [ ] T002 [P] 建立 content/ 目錄結構，含 content.js 與 content.css 空檔
- [ ] T003 [P] 建立 background/ 目錄結構，含 service-worker.js 空檔
- [ ] T004 [P] 建立 lib/ 目錄結構，含 storage.js、field-detector.js、captcha-filter.js 空檔

---

## Phase 2: Foundational (核心基礎設施)

**Purpose**: 所有使用者故事共用的核心元件

**⚠️ CRITICAL**: 此階段必須完成後，使用者故事才能開始實作

- [ ] T005 實作 Storage Service 基礎架構於 lib/storage.js，包含 Local/Session Storage 操作封裝
- [ ] T006 實作 URL 正規化函式（移除 query string 與 hash）於 lib/storage.js
- [ ] T007 [P] 實作訊息類型定義與訊息處理基礎架構於 background/service-worker.js
- [ ] T008 [P] 實作驗證碼欄位過濾器於 lib/captcha-filter.js，支援可配置的 blocklist 規則
- [ ] T009 [P] 實作欄位識別器於 lib/field-detector.js，支援複合識別碼策略（id → name → selector）
- [ ] T010 實作 Content Script 基礎架構於 content/content.js，包含事件委派與 MutationObserver 設置
- [ ] T011 實作 Service Worker 訊息路由於 background/service-worker.js，處理 Content ↔ Popup 通訊

**Checkpoint**: 基礎架構就緒 - 可開始實作使用者故事

---

## Phase 3: User Story 1 - 啟用錄製功能 (Priority: P1) 🎯 MVP

**Goal**: 使用者可透過 Extension 圖示啟用/停用錄製功能

**Independent Test**: 點擊 Extension 圖示確認錄製圖示出現，點擊可切換錄製狀態

### Implementation for User Story 1

- [ ] T012 [US1] 更新 popup.html 加入錄製圖示按鈕與狀態顯示區域
- [ ] T013 [US1] 更新 popup.css 加入錄製圖示樣式（啟用/停用狀態）
- [ ] T014 [US1] 實作 popup.js 錄製切換邏輯，發送 TOGGLE_RECORDING 訊息至 Service Worker
- [ ] T015 [US1] 實作 Service Worker 處理 TOGGLE_RECORDING，更新 Session Storage 錄製狀態
- [ ] T016 [US1] 實作 Content Script 接收 START_RECORDING/STOP_RECORDING 訊息並更新內部狀態
- [ ] T017 [US1] 實作 popup.js 載入時從 Service Worker 取得當前錄製狀態（GET_RECORDING_STATE）

**Checkpoint**: 使用者可透過 Popup 切換錄製狀態

---

## Phase 4: User Story 2 - 自動提示錄製 (Priority: P1)

**Goal**: 偵測到 5 次欄位變動後自動彈出錄製提醒

**Independent Test**: 未啟用錄製時修改 5 個欄位，確認提示視窗出現

### Implementation for User Story 2

- [ ] T018 [US2] 實作 Content Script 欄位變動偵測與計數邏輯於 content/content.js
- [ ] T019 [US2] 實作 Service Worker 處理 FIELD_CHANGED 訊息，更新欄位變動計數（incrementFieldChangeCount）
- [ ] T020 [US2] 建立錄製提醒視窗 UI 元件於 content/content.css
- [ ] T021 [US2] 實作 Content Script 顯示錄製提醒視窗（SHOW_PROMPT）
- [ ] T022 [US2] 實作提醒視窗「是/否」按鈕互動，發送 PROMPT_RESPONSE 訊息
- [ ] T023 [US2] 實作 Service Worker 處理 PROMPT_RESPONSE，若接受則建立新 Session，若拒絕則更新 Session Storage

**Checkpoint**: 自動提醒錄製功能可獨立運作

---

## Phase 5: User Story 3 - 欄位值自動儲存 (Priority: P1)

**Goal**: 錄製啟用時，blur 事件觸發欄位值儲存至 Local Storage

**Independent Test**: 啟用錄製後輸入欄位值，檢查 Local Storage 確認資料已儲存

### Implementation for User Story 3

- [ ] T024 [US3] 實作 Content Script 監聽 blur 事件，擷取欄位識別與值
- [ ] T025 [US3] 實作 Content Script 呼叫 captcha-filter.js 過濾驗證碼欄位
- [ ] T026 [US3] 實作 Service Worker 處理 FIELD_CHANGED 並儲存欄位值（addField）
- [ ] T027 [US3] 實作欄位更新邏輯：若欄位已存在則覆蓋，否則新增
- [ ] T028 [US3] 實作 RecordSession 建立邏輯（createSession），以網址+時間戳記為索引

**Checkpoint**: 欄位值可自動儲存至 Local Storage

---

## Phase 6: User Story 4 - 資料索引與歷史紀錄 (Priority: P2)

**Goal**: 以網址為索引，Unix Timestamp 為歷史紀錄標識

**Independent Test**: 同一頁面錄製多次，確認產生不同時間戳記的歷史紀錄

### Implementation for User Story 4

- [ ] T029 [US4] 實作 Storage Service 查詢函式：getSessionsForUrl、getAllSessions
- [ ] T030 [US4] 實作歷史紀錄數量限制與清理邏輯（cleanup），每 URL 最多 50 筆
- [ ] T031 [US4] 實作 Service Worker 處理 GET_RECORDS 訊息，回傳歷史紀錄摘要

**Checkpoint**: 歷史紀錄以正確結構儲存並可查詢

---

## Phase 7: User Story 5 - 檢視與應用歷史紀錄 (Priority: P2)

**Goal**: 使用者可檢視歷史紀錄，點擊捲動至欄位，點擊帶入值

**Independent Test**: 開啟歷史紀錄列表，點擊欄位 key 確認頁面捲動，點擊帶入按鈕確認值被填入

### Implementation for User Story 5

- [ ] T032 [US5] 更新 popup.html 加入歷史紀錄列表區域與 URL 選擇器
- [ ] T033 [US5] 更新 popup.css 加入歷史紀錄列表樣式
- [ ] T034 [US5] 實作 popup.js 載入並顯示歷史紀錄列表（依時間戳記排序）
- [ ] T035 [US5] 實作 popup.js 歷史紀錄展開/收合互動，顯示欄位詳情
- [ ] T036 [US5] 實作 Service Worker 處理 SCROLL_TO_FIELD 訊息，轉發至 Content Script
- [ ] T037 [US5] 實作 Content Script 處理 SCROLL_TO_FIELD，捲動頁面至目標欄位
- [ ] T038 [US5] 實作 Service Worker 處理 APPLY_FIELD_VALUE 訊息，轉發至 Content Script
- [ ] T039 [US5] 實作 Content Script 處理 APPLY_FIELD_VALUE，將值填入目標欄位
- [ ] T040 [US5] 實作 popup.js 點擊欄位 key 觸發捲動
- [ ] T041 [US5] 實作 popup.js 點擊帶入按鈕觸發值填入

**Checkpoint**: 歷史紀錄可檢視、捲動、帶入

---

## Phase 8: User Story 6 - 歷史清單與錄製互斥 (Priority: P3)

**Goal**: 開啟歷史清單時暫停錄製，關閉後重置拒絕設定

**Independent Test**: 開啟歷史清單確認錄製停止，關閉後觸發 5 次變動確認提示再次出現

### Implementation for User Story 6

- [ ] T042 [US6] 實作 popup.js 開啟歷史面板時發送 NOTIFY_HISTORY_PANEL_STATE（isOpen: true）
- [ ] T043 [US6] 實作 Service Worker 處理 NOTIFY_HISTORY_PANEL_STATE，暫停錄製並更新狀態
- [ ] T044 [US6] 實作 Service Worker 發送 STOP_RECORDING（reason: history_panel_opened）至 Content Script
- [ ] T045 [US6] 實作 popup.js 關閉歷史面板時發送 NOTIFY_HISTORY_PANEL_STATE（isOpen: false）
- [ ] T046 [US6] 實作 Service Worker 處理面板關閉，重置 Session Storage 中的 declinedPrompt 與 fieldChangeCount

**Checkpoint**: 歷史清單與錄製互斥機制完成

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: 跨功能改善與文件更新

- [ ] T047 [P] 更新 README.md 加入表單欄位錄製器使用說明
- [ ] T048 程式碼清理與重構，確保符合 ES2022 標準
- [ ] T049 [P] 加入錯誤處理與 console 日誌，便於除錯
- [ ] T050 效能驗證：Popup 載入 < 200ms、欄位儲存 < 1s
- [ ] T051 執行 quickstart.md 驗證所有功能流程

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無相依性 - 可立即開始
- **Foundational (Phase 2)**: 相依於 Setup 完成 - 阻擋所有使用者故事
- **User Stories (Phase 3-8)**: 全部相依於 Foundational 完成
  - US1, US2, US3 為 P1 優先級，建議依序完成
  - US4, US5 為 P2 優先級，相依於 US3（欄位儲存）
  - US6 為 P3 優先級，相依於 US2（自動提示）與 US5（歷史面板）
- **Polish (Phase 9)**: 相依於所有使用者故事完成

### User Story Dependencies

- **US1 (P1)**: 可在 Foundational 後立即開始 - 無跨故事相依
- **US2 (P1)**: 可在 Foundational 後開始 - 無跨故事相依
- **US3 (P1)**: 可在 Foundational 後開始 - 無跨故事相依
- **US4 (P2)**: 相依於 US3 完成（需要儲存的資料）
- **US5 (P2)**: 相依於 US4 完成（需要歷史紀錄結構）
- **US6 (P3)**: 相依於 US2、US5 完成（互斥機制）

### Within Each User Story

- 模型/工具 → 服務 → 介面
- 核心實作 → 整合

### Parallel Opportunities

- T002, T003, T004 可平行執行
- T007, T008, T009 可平行執行
- T032, T033 可平行執行
- T047, T049 可平行執行

---

## Parallel Example: Phase 2 (Foundational)

```bash
# 可同時啟動的任務：
Task: "實作訊息類型定義與訊息處理基礎架構於 background/service-worker.js"
Task: "實作驗證碼欄位過濾器於 lib/captcha-filter.js"
Task: "實作欄位識別器於 lib/field-detector.js"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: US1 - 啟用錄製功能
4. Complete Phase 4: US2 - 自動提示錄製
5. Complete Phase 5: US3 - 欄位值自動儲存
6. **STOP and VALIDATE**: 測試基本錄製流程
7. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → 基礎就緒
2. US1 → 可切換錄製（MVP 核心）
3. US2 → 自動提醒（提升 UX）
4. US3 → 欄位儲存（資料收集）
5. US4 + US5 → 歷史紀錄（資料應用）
6. US6 → 互斥機制（完整體驗）

---

## Notes

- [P] tasks = 不同檔案、無相依性
- [Story] label 對應 spec.md 中的使用者故事
- 每個使用者故事應可獨立完成與測試
- 每個任務或邏輯群組完成後提交
- 在任何 Checkpoint 可暫停驗證功能
