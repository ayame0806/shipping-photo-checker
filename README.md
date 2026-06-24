# 今日外包出貨確認

純前端靜態網頁 App，用於手機瀏覽器執行「今日外包出貨確認」。

## 功能

- 新增外包商與箱數。
- 同一外包商重複新增時，自動合併箱數。
- 清除外包商箱數清單。
- 選擇出貨人員。
- 複製固定格式 LINE 回報文字。
- 進入頁面後先嘗試詢問相機權限。
- P1 / P2 / P3 在同一列，按下後直接開啟手機相機預覽。
- 共用一個拍照、照片預覽與儲存區。
- 快速模式預設開啟，拍照後會直接觸發儲存，不顯示預覽，並保持在目前 P1 / P2 / P3 拍照狀態。
- 按「拍照」後用 Canvas 自動加上 P1 / P2 / P3、確認文字與年月日時間。
- 儲存標示後 JPG 圖片。
- 確認已存檔後，可按「已存檔，清除照片」清掉目前圖片。

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
3. 按「複製資訊」複製 LINE 回報文字。
4. 瀏覽器跳出相機權限時，允許使用相機。
5. 按 P1、P2 或 P3。
6. 快速模式預設開啟，對準畫面後按「拍照」會直接觸發儲存，不顯示預覽，並停留在同一個 P 繼續拍。
7. 若取消快速模式，照片處理完成後會顯示預覽，需手動按「儲存 P1 圖片」、「儲存 P2 圖片」或「儲存 P3 圖片」。
8. 手動模式儲存完成後，按「已存檔，清除照片」會回到同一個 P 的相機狀態。
9. iPhone Safari 若無法直接存到相簿，可取消快速模式並長按預覽圖儲存。

## LINE 回報格式

```text
【今日外包出貨確認】

外包商箱數：亞克x2，馗鼎x1

出貨人員：蕭伊呈

P1－刀盒/填充物/螺絲 確認
P2－箱內填充確認
P3－箱外束帶/膠帶固定、地址確認
```

## 技術說明

- 不使用後端。
- 不使用資料庫。
- 不使用框架。
- 使用 `navigator.mediaDevices.getUserMedia()` 開啟手機相機。
- 優先使用後鏡頭 `facingMode: environment`。
- 使用 Canvas 擷取相機畫面並加上文字。
- 快速模式使用同步 `canvas.toDataURL("image/jpeg")` 產生圖片並立即觸發儲存，降低手機瀏覽器把下載視為非使用者操作的機率。
- 部署到 GitHub Pages 後為 HTTPS，可正常使用相機權限。
- 手機瀏覽器沒有標準的「預先允許多張自動下載」網頁權限；快速模式會嘗試在按下拍照後直接觸發儲存，但 Android Chrome 或 iPhone Safari 仍可能依瀏覽器規則提示或阻擋。

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

## 第一版不包含

- 自動傳 LINE 群組
- 登入功能
- 資料庫
- 歷史紀錄
- 雲端同步
- 權限管理
- 選擇手機內既有圖片

此版本僅處理直接拍照、加字、儲存圖片、複製文字與手動回報 LINE。
