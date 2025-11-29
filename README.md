# Saviors - 表單欄位錄製器

一個 Chrome Extension，可自動或手動錄製網頁表單欄位值，並儲存至本機供日後快速填入。

## 功能特色

- 📝 **手動錄製**: 透過 Extension 圖示啟用/停用錄製功能
- 🔔 **自動提醒**: 偵測到 5 次欄位變動後自動彈出錄製提醒
- 💾 **自動儲存**: 錄製啟用時，欄位 blur 事件觸發自動儲存
- 📋 **歷史紀錄**: 以網址為索引，保存最多 50 筆歷史紀錄
- 🔍 **快速填入**: 點擊欄位可捲動至該欄位，一鍵帶入歷史值
- 🔒 **隱私安全**: 資料僅存於本機，不外傳，自動過濾驗證碼欄位

## 安裝說明

1. 開啟 Chrome 瀏覽器
2. 前往 `chrome://extensions/`
3. 開啟右上角的「開發人員模式」
4. 點擊「載入未封裝項目」
5. 選擇此專案資料夾

## 使用說明

### 開始錄製

1. 前往任一含有表單的網頁
2. 點擊工具列的 Saviors 圖示
3. 點擊「開始錄製」按鈕
4. 填寫表單欄位
5. 完成後點擊「停止錄製」

### 自動提醒

- 若未主動開始錄製，當您修改 5 個欄位後
- 系統會在頁面右上角顯示錄製提醒
- 選擇「是」開始錄製，「否」則此分頁不再詢問

### 應用歷史紀錄

1. 點擊 Saviors 圖示開啟 popup
2. 切換至「歷史紀錄」分頁
3. 點擊展開歷史紀錄查看欄位詳情
4. 點擊欄位名稱可捲動至該欄位
5. 點擊「帶入」按鈕將值填入欄位

## 專案結構

```
saviors/
├── manifest.json          # Chrome Extension 配置檔 (Manifest V3)
├── popup.html             # Popup 主介面
├── popup.css              # Popup 樣式
├── popup.js               # Popup 邏輯
├── content/
│   ├── content.js         # Content Script（頁面注入腳本）
│   └── content.css        # Content Script 樣式（提醒視窗）
├── background/
│   └── service-worker.js  # Service Worker（狀態管理、訊息路由）
├── lib/
│   ├── storage.js         # Storage 操作封裝
│   ├── field-detector.js  # 欄位偵測與識別
│   └── captcha-filter.js  # 驗證碼欄位過濾
├── icons/                 # Extension 圖示
├── specs/                 # 功能規格文件
├── LICENSE
└── README.md
```

## 技術規格

- **Manifest Version**: V3
- **Language**: JavaScript ES2022
- **Storage**: Chrome Local Storage（欄位資料）、Chrome Session Storage（使用者偏好）
- **Permissions**: storage, scripting, activeTab

## 效能指標

- Popup 載入時間 < 200ms
- 欄位儲存延遲 < 1s
- 記憶體使用 < 50MB

## 開發

### 除錯方式

**Popup 除錯**:
- 右鍵點擊 Extension 圖示 → 「檢查彈出式視窗」

**Content Script 除錯**:
- 在目標網頁開啟 DevTools (F12)
- 切換至 Console 分頁

**Service Worker 除錯**:
- 前往 `chrome://extensions/`
- 點擊 Saviors 區塊的「Service Worker」連結

## 授權

MIT License