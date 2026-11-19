# AG Neovo Product Gallery 維護規範

- 修改前閱讀本檔與 README.md；正式站只在明確授權範圍內操作。
- 使用 WooCommerce 原生圖庫、FlexSlider 與 PhotoSwipe，不修改 WooCommerce 或舊外掛原始檔。
- 商品主圖、圖庫、語系、價格與庫存一律透過 WooCommerce API 讀取，不另存或搬移商品資料。
- CSS、事件及 PHP 名稱限制在 `agneovo` 專屬命名空間；只在單一商品頁載入資源。
- 舊圖庫外掛仍啟用時，一般請求維持舊圖庫；只有有效、與商品 ID 相符的預覽 nonce 可使用新圖庫。
- 預覽不得修改設定、商品或使用者資料；必須禁止頁面快取。
- JavaScript 載入失敗時，商品圖片與原圖連結仍須可見。
- PHP 變更執行語法檢查；JS 變更檢查語法，並在桌面、手機驗證縮圖、箭頭、滑動、燈箱、單張／無圖片及商城流程。
- 不新增全站 purge、背景排程、外部追蹤或無關後台設定。
- Git 提交與發布只使用使用者指定的 GitHub App connector，提交訊息使用繁體中文。



## 儲存庫與來源交付

- 使用者於 2026-11-19 指定 `https://github.com/jasonwang-tw/AG-Neovo-Product-Gallery.git`，授權推送目前 1.0.8；僅使用本專案預設 `main`，不混入其他外掛或主題修改。
- 所有遠端提交／推送／發布只能使用 GitHub App connector，提交訊息一律繁體中文。不得使用 git add／commit／push、GitHub CLI 或直接 HTTP 寫入作為替代；connector 無法完成時立即停止並回報。
- 完成條件：遠端成功、提交 SHA 與完整 tree 核對、本地 main／origin/main 安全同步且工作區乾淨。發現額外檔案、內容不符或可能覆寫使用者變更時停止；不得 reset --hard 或清除變更。
- 本地 Git 工作副本置於非公開目錄；正式外掛目錄不放 .git。部署同步前逐檔核對，保留原文件備份。
- 不提交驗證腳本、截圖、備份、快取、日誌、環境秘密、會員或訂單資料。此交付不改動正式站啟用狀態、角色、設定、商品或內容。
