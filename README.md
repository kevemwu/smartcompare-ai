# SmartCompare AI - 智能比價搜尋平台 🤖

<div align="center">

**基於本地 LLM + 雲端 API 的電商智能分類比價搜尋平台**

🌐 [線上體驗](http://localhost:4000/) •
[📝 設計文檔](docs/DESIGN.md) •
[💡 Lovable Prompts](docs/LOVABLE_PROMPTS.md)

</div>

## 🎯 專案概述

SmartCompare AI 是一個的電商智能分類比價搜尋平台，**使用本地 Ollama LLM + 雲端 Gemini API 智能降級架構**。整合多個電商網站的商品資訊，使用**三層 AI 降級策略**提供智能搜尋和價格分析功能。


## 🚀 快速開始

> 💡 您可以直接訪問 [http://localhost:4000/](http://localhost:4000/) 體驗網站功能，無需本地部署！（此網域使用 Cloudfalre 代理）

### 本地開發

#### 1. 安裝 Ollama

```bash
# Windows
# 下載安裝: https://ollama.ai/download

# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# 下載模型
ollama serve
ollama pull qwen2:7b-instruct-q8_0  # 推薦模型
# 或
ollama pull qwen2:1.5b-instruct     # 輕量版
```

#### 2. 取得 Gemini API

1. 前往 [Google AI Studio](https://ai.google.dev/)
2. 註冊/登入 Google 帳號
3. 建立新專案
4. 生成 API 金鑰

#### 3. 環境設定

建立 `.env` 檔案：

```env
# LLM 設定
LLM_PROVIDER=auto  # auto | ollama | gemini
OLLAMA_ENABLED=true
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2:7b-instruct-q8_0

GEMINI_ENABLED=true
GEMINI_API_KEY=your-api-key-here

# 爬蟲設定
CHROME_PATH=/usr/bin/google-chrome  # 依系統調整
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# 後端 API 設定
BACKEND_PORT=4001  # 後端 API 端口
FRONTEND_URL=http://localhost:4000  # 前端開發伺服器網址

# 前端設定
VITE_API_URL=http://localhost:4000  # API 基礎網址
```

#### 4. 啟動服務

```bash
# 後端
cd backend
npm install
npm run dev  # 啟動在 4001 端口

# 前端
cd frontend
npm install
npm run dev  # 啟動在 4000 端口
```

## 🤖 智能 LLM 系統詳解

### 配置策略

#### 自動模式 (推薦)
```env
LLM_PROVIDER=auto
LLM_FALLBACK_ORDER=gemini,ollama,keyword
```
- 優先使用 Gemini API (穩定性高)
- 請求限制時切換到 Ollama
- 最後使用關鍵字匹配

#### 強制雲端模式
```env
LLM_PROVIDER=gemini
OLLAMA_ENABLED=false
GEMINI_ENABLED=true
```
- 僅使用 Gemini API
- 穩定性優先
- 適合無本地運算資源環境

#### 強制本地模式
```env
LLM_PROVIDER=ollama
OLLAMA_ENABLED=true
GEMINI_ENABLED=false
```
- 僅使用 Ollama
- 隱私保護最大化
- 零 API 成本

### 分類處理參數

```env
# Ollama 優化 (本地性能優先)
OLLAMA_TIMEOUT=120000        # 2分鐘超時
OLLAMA_MAX_RETRIES=3         # 重試次數
OLLAMA_RETRY_DELAY=5000      # 5秒重試延遲

# Gemini 優化 (API 頻率限制)
GEMINI_TIMEOUT=30000         # 30秒超時
GEMINI_MAX_RETRIES=3         # 重試次數
GEMINI_RETRY_DELAY=60000     # 60秒重試延遲 (避免429錯誤)

# 智能降級閾值
LLM_FALLBACK_THRESHOLD=3     # 連續失敗3次後降級
LLM_PERFORMANCE_MONITORING=true
```

### 本地部署注意事項

如果您想要在本地部署而不是使用公開測試網站，需要注意以下幾點：

1. 前端配置：
   - 修改 `frontend/.env` 中的 `VITE_API_URL` 為您的本地後端地址
   - 預設為 `http://localhost:4000`

2. 後端配置：
   - 修改 `backend/.env` 中的 `FRONTEND_URL` 為您的前端開發伺服器地址
   - 預設為 `http://localhost:4001`

3. CORS 設定：
   - 確保後端的 CORS 設定允許您的前端地址訪問
   - 開發環境預設允許 `http://localhost:4000`