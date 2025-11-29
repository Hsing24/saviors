# Implementation Plan: 表單欄位錄製器 (Form Field Recorder)

**Branch**: `001-form-field-recorder` | **Date**: 2025-11-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-form-field-recorder/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

實作 Chrome Extension 表單欄位錄製功能，當使用者在網頁上填寫表單時，系統可自動或手動錄製欄位值並儲存至 local storage。支援以網址為索引的歷史紀錄功能，使用者可檢視過往紀錄並將值帶入對應欄位。採用 Manifest V3 架構，使用 Content Script 監聽欄位事件，Service Worker 處理狀態管理。

## Technical Context

**Language/Version**: JavaScript ES2022 (Chrome Extension 環境)  
**Primary Dependencies**: Chrome Extension APIs (storage, tabs, scripting)  
**Storage**: Chrome Local Storage (欄位資料), Chrome Session Storage (使用者偏好)  
**Testing**: 手動測試 (Chrome 環境)、Chrome DevTools  
**Target Platform**: Chrome 瀏覽器 (Manifest V3)、Chrome-based 瀏覽器 (Edge, Brave)
**Project Type**: Chrome Extension (popup + content script + service worker)  
**Performance Goals**: Popup 載入 < 200ms、欄位儲存 < 1s、頁面捲動 < 1s  
**Constraints**: 記憶體 < 50MB、無外部網路請求、最小權限原則  
**Scale/Scope**: 單一使用者本機資料、每個網址預計保存 10-50 筆歷史紀錄

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality ✅
- **Readability**: 使用清晰的命名慣例，僅在複雜邏輯處加註解
- **Modularity**: Content script、Service worker、Popup 分離，單一職責
- **Consistency**: 遵循現有專案 ESLint/Prettier 設定（若有配置）
- **Error Handling**: 所有 Chrome API 呼叫使用 try-catch 處理錯誤
- **No Dead Code**: 合併前移除未使用的變數與函式

### II. Testing Standards ✅
- **Manual Testing**: 在 Chrome 中手動測試所有功能流程
- **Regression Testing**: 確認變更不影響現有 popup 功能
- **Edge Cases**: 測試空表單、快速切換分頁、動態欄位等情境
- **Extension Lifecycle**: 測試安裝、啟用/停用、更新場景

### III. User Experience Consistency ✅
- **Visual Consistency**: 錄製圖示、提醒視窗遵循現有設計語言
- **Interaction Patterns**: 點擊行為一致，提供即時視覺回饋
- **Accessibility**: 支援鍵盤操作，符合 WCAG AA 對比標準
- **Localization-Ready**: 使用者介面文字外部化（繁體中文）

### IV. Performance Requirements ✅
- **Popup Load Time**: Popup 載入 < 200ms
- **Memory Footprint**: Service worker 記憶體 < 50MB
- **Storage Efficiency**: 定期清理過期歷史紀錄
- **No Blocking**: 使用非同步 API，不阻塞主執行緒
- **Minimal Permissions**: 僅請求 storage、activeTab、scripting 權限

### V. Documentation Language ✅
- **Specifications**: 規格文件使用繁體中文撰寫
- **Plans**: 實作計畫使用繁體中文撰寫
- **User-Facing Documentation**: README、quickstart 使用繁體中文

### Chrome Extension Standards ✅
- **Manifest V3 Compliance**: 完全遵循 Manifest V3 規範
- **Content Security Policy**: 無內嵌腳本，資源皆打包
- **Service Worker Best Practices**: 無狀態設計，可重啟
- **Privacy First**: 資料僅存於本機，不外傳

## Project Structure

### Documentation (this feature)

```text
specs/001-form-field-recorder/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Chrome Extension 專案結構
popup.html               # Extension popup 主介面
popup.css                # Popup 樣式
popup.js                 # Popup 邏輯

content/
├── content.js           # Content script 主程式（欄位監聽、錄製）
└── content.css          # Content script 注入樣式（提醒視窗）

background/
└── service-worker.js    # Service worker（狀態管理、訊息路由）

lib/
├── storage.js           # Storage 操作封裝
├── field-detector.js    # 欄位偵測與識別
└── captcha-filter.js    # 驗證碼欄位過濾

icons/                   # Extension 圖示
manifest.json            # Manifest V3 配置
```

**Structure Decision**: 採用 Chrome Extension 標準結構，分離 content script（頁面互動）、service worker（背景邏輯）與 popup（使用者介面）。共用邏輯放置於 `lib/` 目錄。

## Complexity Tracking

> **無憲法違規需要額外說明**

本實作完全遵循 Saviors 專案憲法，無需追蹤複雜度例外。
