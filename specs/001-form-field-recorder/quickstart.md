# 快速開始指南: 表單欄位錄製器

**功能分支**: `001-form-field-recorder`  
**建立日期**: 2025-11-29

## 前置需求

- Chrome 瀏覽器 (版本 88+，支援 Manifest V3)
- Node.js 18+ (用於開發與建置，若有需要)
- Git (用於版本控制)

## 安裝步驟

### 1. 取得原始碼

```bash
git clone https://github.com/your-org/saviors.git
cd saviors
git checkout 001-form-field-recorder
```

### 2. 載入 Extension

1. 開啟 Chrome 瀏覽器
2. 前往 `chrome://extensions/`
3. 開啟右上角「開發人員模式」
4. 點擊「載入未封裝項目」
5. 選擇 `saviors` 專案資料夾

### 3. 確認安裝成功

- 工具列出現 Saviors 圖示
- 點擊圖示開啟 popup，應顯示「歡迎使用 Saviors 擴充功能！」

---

## 開發指南

### 專案結構

```
saviors/
├── manifest.json          # Extension 配置
├── popup.html             # Popup 主介面
├── popup.css              # Popup 樣式
├── popup.js               # Popup 邏輯
├── content/
│   ├── content.js         # 頁面注入腳本
│   └── content.css        # 頁面注入樣式
├── background/
│   └── service-worker.js  # Service Worker
├── lib/
│   ├── storage.js         # Storage 封裝
│   ├── field-detector.js  # 欄位偵測
│   └── captcha-filter.js  # 驗證碼過濾
└── icons/                 # Extension 圖示
```

### 開發流程

1. **修改程式碼**後，前往 `chrome://extensions/`
2. 點擊 Saviors Extension 區塊的「重新載入」圖示
3. 刷新測試頁面以載入更新的 Content Script
4. 開啟 DevTools 檢查 Console 訊息

### 除錯方式

**Popup 除錯**:
- 右鍵點擊 Extension 圖示 → 「檢查彈出式視窗」

**Content Script 除錯**:
- 在目標網頁開啟 DevTools (F12)
- 切換至 Console 分頁，確認來源為 content.js

**Service Worker 除錯**:
- 前往 `chrome://extensions/`
- 點擊 Saviors 區塊的「Service Worker」連結

---

## 使用說明

### 錄製表單

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
2. 選擇要應用的歷史紀錄
3. 點擊欄位名稱可捲動至該欄位
4. 點擊「帶入」按鈕將值填入欄位

---

## 測試指南

### 手動測試項目

1. **錄製功能**
   - [ ] 點擊錄製圖示可切換錄製狀態
   - [ ] 欄位 blur 後值被儲存
   - [ ] 驗證碼欄位不被儲存

2. **自動提醒**
   - [ ] 未錄製時 5 次欄位變動觸發提醒
   - [ ] 選擇「否」後不再提醒
   - [ ] 開關歷史清單會重置拒絕設定

3. **歷史紀錄**
   - [ ] 可檢視歷史紀錄清單
   - [ ] 點擊欄位 key 頁面捲動
   - [ ] 點擊帶入按鈕值被填入

4. **邊界情況**
   - [ ] 快速切換分頁時資料正確儲存
   - [ ] 動態載入欄位可被偵測
   - [ ] 清除 storage 後功能正常

### 效能指標

- Popup 載入時間 < 200ms
- 欄位儲存延遲 < 1s
- 記憶體使用 < 50MB

---

## 常見問題

### Q: Content Script 沒有注入到頁面

**A**: 確認以下事項：
1. `manifest.json` 已正確配置 `scripting` 權限
2. 已在 `chrome://extensions/` 重新載入 Extension
3. 頁面不是 Chrome 內部頁面 (chrome://, edge://)

### Q: Storage 資料無法讀取

**A**: 確認以下事項：
1. `manifest.json` 已配置 `storage` 權限
2. 使用正確的 Storage API (`chrome.storage.local` vs `chrome.storage.session`)
3. 在 DevTools → Application → Storage 檢查資料

### Q: Service Worker 意外停止

**A**: 這是 Manifest V3 的正常行為。確保：
1. Service Worker 設計為無狀態
2. 重要狀態存於 Storage 中
3. 每次喚醒時從 Storage 恢復狀態

---

## 下一步

實作計畫完成後，請執行 `/speckit.tasks` 指令產生任務清單，開始進行實際開發。
