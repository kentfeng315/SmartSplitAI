# 如何將此 App 部署到外部網址 (免費)

要將這個 App 發布到網路上讓朋友使用，推薦使用 **Vercel**。

## 方法一：使用 GitHub (推薦)

1. **建立 GitHub Repository**：
   - 到 GitHub 新增一個 repository。
   - 將目前的程式碼推送到該 repository。

2. **連結 Vercel**：
   - 去 [Vercel](https://vercel.com) 註冊帳號。
   - 點擊 "Add New..." -> "Project"。
   - 選擇 "Import" 您剛才建立的 GitHub repository。
   - Framework Preset 選擇 **Vite**。
   - 點擊 **Deploy**。

3. **完成**：
   - 等待約 1 分鐘，Vercel 會給您一個正式網址 (例如 `https://smart-split.vercel.app`)。
   - 這個網址就是您的「外部網址」。

## 方法二：修改 App 設定 (優化連結)

當您拿到正式網址後 (例如 `https://your-app.vercel.app`)：

1. 回到程式碼編輯器。
2. 開啟 `utils/sharing.ts`。
3. 找到 `const CUSTOM_APP_URL = "";`。
4. 填入您的網址，例如：`const CUSTOM_APP_URL = "https://your-app.vercel.app";`。
5. 重新部署 (如果是用 GitHub，只要 push 程式碼，Vercel 會自動更新)。

這樣以後按「複製連結」時，就會直接產生漂亮的網址，不會再跳出詢問視窗了。
