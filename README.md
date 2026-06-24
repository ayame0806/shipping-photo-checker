# 今日外包出貨確認

純前端靜態網頁 App，用於手機瀏覽器執行「今日外包出貨確認」。

## 功能

- 新增外包商與箱數。
- 同一外包商重複新增時，自動合併箱數。
- 清除外包商箱數清單。
- 選擇出貨人員。
- 按 P1 / P2 / P3 後直接開啟手機相機預覽，不提供選擇既有圖片。
- 按「拍照」後用 Canvas 自動加上 P1 / P2 / P3、確認文字與年月日時間。
- 顯示標示後圖片預覽。
- 儲存標示後 JPG 圖片。
- 一鍵複製固定格式 LINE 回報文字。

## 檔案結構

```text
shipping-photo-checker/
├─ index.html
├─ style.css
├─ app.js
└─ README.md
```

## 使用方式

1. 選擇外包廠商與箱數，按「加入」。
2. 選擇出貨人員。
3. 按「P1 拍照」、「P2 拍照」或「P3 拍照」。
4. 瀏覽器跳出相機權限時，允許使用相機。
5. 對準畫面後按「拍照」。
6. 照片處理完成後，按「儲存 P1 圖片」、「儲存 P2 圖片」或「儲存 P3 圖片」。
7. iPhone Safari 若無法直接存到相簿，可長按預覽圖儲存。
8. 按「複製資訊」後，將文字貼到 LINE 群組，並手動上傳 P1 / P2 / P3 圖片。

## LINE 回報格式

```text
【今日外包出貨確認】

外包商箱數：亞克x2，馗鼎x1

出貨人員：蕭伊呈

P1－刀盒/填充物/螺絲 確認
P2－箱內填充確認
P3－箱外束帶/膠帶固定、地址確認
```

外包商箱數與出貨人員會依頁面輸入內容產生，其餘文字固定。

## 技術說明

- 不使用後端。
- 不使用資料庫。
- 不使用框架。
- 使用 `navigator.mediaDevices.getUserMedia()` 開啟手機相機。
- 優先使用後鏡頭 `facingMode: environment`。
- 使用 Canvas 擷取相機畫面並加上文字。
- 部署到 GitHub Pages 後為 HTTPS，可正常使用相機權限。

## GitHub Pages 部署步驟

1. 建立 GitHub Public Repository。
2. 上傳以下檔案到 Repository：
   - `index.html`
   - `style.css`
   - `app.js`
   - `README.md`
3. 到 Repository 的 `Settings`。
4. 找到 `Pages`。
5. `Source` 選擇 `Deploy from a branch`。
6. `Branch` 選擇 `main`，資料夾選擇 `/root`。
7. 儲存後等待 GitHub Pages 產生網址。

GitHub Pages 的網址通常會是：

```text
https://你的GitHub帳號.github.io/shipping-photo-checker/
```

如果 Repository 名稱是：

```text
你的GitHub帳號.github.io
```

則網址通常會是：

```text
https://你的GitHub帳號.github.io/
```

GitHub 官方 Quickstart 也說明，若要建立使用者網站，Repository 名稱可使用 `username.github.io` 格式。

## 第一版不包含

- 自動傳 LINE 群組
- 登入功能
- 資料庫
- 歷史紀錄
- 雲端同步
- 權限管理
- 選擇手機內既有圖片

此版本僅處理直接拍照、加字、儲存圖片、複製文字與手動回報 LINE。
