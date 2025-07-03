# Lovable 前端開發提示集

## 🎨 SmartCompare AI - 智能比價搜尋平台前端

### 專案概述提示
```
請幫我建立一個名為 "SmartCompare AI" 的智能比價搜尋平台前端應用。

這是一個AI驅動的商品搜尋比價系統，主要功能包括：
1. 智能搜尋介面 - 支援中文自然語言搜尋
2. 商品展示頁面 - 多平台價格比較卡片
3. 價格趨勢圖表 - 歷史價格變化視覺化
4. 即時通知系統 - 價格變動提醒
5. 商品詳情頁面 - 完整規格和評價

技術要求：
- React + TypeScript
- Tailwind CSS 現代化設計
- Chart.js 或 Recharts 圖表
- React Query 數據管理
- Zustand 狀態管理
- Socket.io 即時更新
- 響應式設計 (Mobile First)

設計風格：
- 現代簡約風格
- 主色調：藍色系 (#2563eb)
- 輔色：綠色 (#16a34a, 價格下降)、紅色 (#dc2626, 價格上升)
- 圓角設計，柔和陰影
- 優雅的動畫效果
```

### 核心頁面結構提示

#### 1. 主頁搜尋介面
```
建立一個現代化的搜尋主頁，包含：

頁面佈局：
- 頂部導航欄：Logo + 搜尋框 + 用戶選單
- 英雄區域：大標題 "智能比價，聰明購物" + 主搜尋框 + 搜尋建議
- 熱門搜尋：顯示熱門關鍵字標籤
- 商品分類：快速分類入口 (手機、筆電、耳機等)
- 底部資訊：平台介紹和功能特色

搜尋框功能：
- 大型搜尋輸入框，placeholder: "搜尋您想要的商品..."
- 搜尋按鈕帶放大鏡圖示
- 即時搜尋建議下拉清單
- 語音搜尋按鈕 (裝飾用)
- 進階篩選按鈕

視覺設計：
- 漸層背景 (淺藍到白色)
- 搜尋框有柔和陰影和聚焦效果
- 分類卡片使用現代化圖示
- 動畫：搜尋框聚焦時放大效果
```

#### 2. 搜尋結果頁面
```
建立搜尋結果展示頁面，包含：

頁面結構：
- 搜尋列：固定在頂部，顯示當前搜尋關鍵字
- 篩選側邊欄：價格範圍、品牌、平台、評分篩選器
- 結果排序：相關度、價格 (低到高/高到低)、評分、最新
- 商品網格：響應式商品卡片佈局

商品卡片設計：
- 商品圖片 (正方形，圓角)
- 商品名稱 (2行文字截斷)
- 價格比較區域：
  - 最低價 (大字體，綠色)
  - 各平台價格清單
  - 價格趨勢小圖示 (上升/下降/持平)
- 平台Logo展示
- "查看詳情" 按鈕
- 加入追蹤愛心按鈕

互動功能：
- 懸停效果：卡片輕微上升 + 陰影加深
- 價格點擊：展開平台詳情
- 篩選即時更新結果
- 無限滾動載入更多
```

#### 3. 商品詳情頁面
```
建立詳細的商品比較頁面，包含：

頁面佈局：
- 商品標題區域：名稱 + 分享按鈕 + 收藏按鈕
- 左側：商品圖片輪播 + 基本資訊
- 右側：價格比較表格 + 設定價格提醒

價格比較表格：
- 表頭：平台、目前價格、歷史最低、庫存狀態、直達連結
- 行資料：平台Logo、價格 (帶變化標示)、庫存圖示、"前往購買"按鈕
- 價格趨勢：每個平台旁邊顯示小箭頭 (上升紅色/下降綠色)

價格歷史圖表：
- 使用 Chart.js 或 Recharts
- 折線圖顯示 30 天價格變化
- 多平台價格線條 (不同顏色)
- 可切換時間範圍：7天、30天、90天
- 懸停顯示具體日期和價格

價格提醒設定：
- 目標價格輸入框
- 提醒方式選擇 (瀏覽器通知)
- "設定提醒" 按鈕
- 已設定提醒的顯示狀態

商品規格表：
- 表格形式顯示商品詳細規格
- 可摺疊的區塊設計
```

#### 4. 價格提醒管理頁面
```
建立用戶的價格提醒管理頁面：

頁面結構：
- 頁面標題："我的價格提醒"
- 提醒清單：表格或卡片形式顯示所有提醒
- 操作按鈕：編輯、刪除、暫停/啟用

提醒清單項目：
- 商品縮圖 + 名稱
- 目標價格 vs 目前最低價
- 價格達成狀態 (已達成/未達成)
- 設定日期和最後檢查時間
- 操作按鈕組

狀態視覺化：
- 已達成：綠色背景 + 勾選圖示
- 未達成：灰色背景
- 接近目標：黃色背景 + 警告圖示

批量操作：
- 全選checkbox
- 批量刪除按鈕
- 批量暫停/啟用
```

### 組件設計提示

#### 搜尋框組件
```
建立一個功能豐富的搜尋框組件 (SearchBox)：

Props:
- placeholder: string
- onSearch: (query: string) => void
- suggestions: string[]
- loading: boolean

功能特性：
- 即時搜尋建議
- 搜尋歷史記錄
- 清除按鈕
- 載入狀態顯示
- Enter 鍵搜尋
- 防抖處理 (debounce 300ms)

樣式：
- 大尺寸輸入框 (h-12)
- 圓角設計 (rounded-lg)
- 左側放大鏡圖示
- 右側清除按鈕 (有內容時顯示)
- 聚焦時藍色邊框
- 建議下拉清單使用白色背景 + 陰影
```

#### 商品卡片組件
```
建立商品展示卡片組件 (ProductCard)：

Props:
- product: ProductData
- onViewDetail: (id: string) => void
- onToggleFavorite: (id: string) => void

商品資料結構：
- id, name, images, prices, platforms, trend

卡片內容：
- 商品圖片 (aspect-square)
- 商品名稱 (text-sm, 2行截斷)
- 價格資訊：
  - 最低價 (text-lg font-bold)
  - 價格趨勢圖示
  - 平台數量 "在 X 個平台有售"
- 平台Logo列表 (小圖示)
- 收藏按鈕 (右上角愛心)

懸停效果：
- transform scale-105
- shadow-lg
- 圖片輕微放大
```

#### 價格趨勢圖表組件
```
建立價格趨勢圖表組件 (PriceTrendChart)：

使用技術：
- Chart.js 或 Recharts
- React Hook 管理圖表實例

Props:
- data: PriceHistoryData[]
- timeRange: '7d' | '30d' | '90d'
- platforms: string[]

圖表配置：
- 折線圖類型
- 響應式設計
- 多個平台不同顏色線條
- X軸：日期
- Y軸：價格 (TWD)
- 懸停工具提示顯示具體資訊
- 圖例顯示平台名稱

樣式：
- 現代化配色
- 網格線淡化處理
- 平滑動畫效果
```

#### 即時通知組件
```
建立即時通知系統組件 (NotificationSystem)：

功能：
- Socket.io 連接管理
- 瀏覽器通知權限請求
- 通知佇列管理
- 通知歷史記錄

通知類型：
- 價格下降通知
- 價格目標達成
- 庫存變化通知
- 系統公告

通知樣式：
- Toast 通知 (右上角滑入)
- 圖示 + 標題 + 內容
- 自動消失或手動關閉
- 不同類型不同顏色 (成功/警告/資訊)
```

### API 整合提示

#### API 服務層
```
建立 API 服務層 (src/services/api.ts)：

使用技術：
- Axios 或 Fetch
- React Query 做快取和狀態管理

實際 API 端點：
- GET /api/search - 智能搜尋商品
- GET /api/compare - 跨平台比價
- GET /api/platforms - 取得支援平台列表
- GET /api/health - 健康檢查

API 請求格式：
// 搜尋商品
GET /api/search?q=iPhone%2015&platforms=pchome,momo&sort=price_asc&maxResults=20

// 跨平台比價
GET /api/compare?q=iPhone%2015%20128GB

// 取得平台列表
GET /api/platforms

API 回應格式：
{
  "success": true,
  "data": {
    "query": "iPhone 15",
    "totalResults": 25,
    "searchTime": 1245,
    "products": [
      {
        "id": "unique-product-id",
        "name": "iPhone 15 128GB 藍色",
        "price": 28900,
        "platform": "pchome",
        "url": "https://...",
        "image": "https://...",
        "totalScore": 0.892,
        "relevanceScore": 0.75,
        "tfidfScore": 0.234,
        "semanticScore": 0.856,
        "priceScore": 0.9,
        "matchedKeywords": ["iPhone", "15"],
        "searchMethod": "hybrid_ai"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25
    }
  }
}

錯誤處理：
- 統一錯誤攔截器
- 使用者友善的錯誤訊息
- 自動重試機制 (網路錯誤)
- 載入狀態管理

錯誤回應格式：
{
  "success": false,
  "error": "搜尋關鍵字不能為空",
  "code": "INVALID_QUERY"
}

速率限制：
- X-RateLimit-Limit: 每15分鐘最多100次請求
- X-RateLimit-Remaining: 剩餘請求數
- X-RateLimit-Reset: 重置時間戳

實際 API 服務實作範例：
// src/services/api.ts
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 請求攔截器
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🌐 API 請求: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// 回應攔截器
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429) {
      // 處理速率限制
      const retryAfter = error.response.headers['retry-after'];
      console.warn(`⚠️ 請求過於頻繁，請在 ${retryAfter} 秒後重試`);
    }
    return Promise.reject(error);
  }
);

export const searchAPI = {
  // 搜尋商品
  searchProducts: async (query: string, options = {}) => {
    const params = new URLSearchParams({
      q: query,
      ...options
    });
    const response = await apiClient.get(`/search?${params}`);
    return response.data;
  },

  // 跨平台比價
  compareProducts: async (query: string) => {
    const response = await apiClient.get(`/compare?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  // 取得平台列表
  getPlatforms: async () => {
    const response = await apiClient.get('/platforms');
    return response.data;
  },

  // 健康檢查
  healthCheck: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  }
};

React Query 整合：
// src/hooks/useSearch.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchAPI } from '../services/api';

export const useSearchProducts = (query: string, options = {}) => {
  return useQuery({
    queryKey: ['search', query, options],
    queryFn: () => searchAPI.searchProducts(query, options),
    enabled: !!query && query.length > 2,
    staleTime: 5 * 60 * 1000, // 5分鐘快取
    cacheTime: 10 * 60 * 1000, // 10分鐘快取
    retry: (failureCount, error) => {
      // 網路錯誤重試3次，API錯誤不重試
      return error.code === 'NETWORK_ERROR' && failureCount < 3;
    }
  });
};

export const useCompareProducts = (query: string) => {
  return useQuery({
    queryKey: ['compare', query],
    queryFn: () => searchAPI.compareProducts(query),
    enabled: !!query,
    staleTime: 2 * 60 * 1000 // 2分鐘快取
  });
};

export const usePlatforms = () => {
  return useQuery({
    queryKey: ['platforms'],
    queryFn: searchAPI.getPlatforms,
    staleTime: 30 * 60 * 1000 // 30分鐘快取
  });
};
```

#### 狀態管理
```
使用 Zustand 建立狀態管理，配合實際 API 資料結構：

Store 結構：
- searchStore: 搜尋相關狀態
  - query, results, loading, filters, searchHistory
- userStore: 用戶相關狀態  
  - favorites, settings, notifications
- platformStore: 平台狀態
  - availablePlatforms, selectedPlatforms

// src/stores/searchStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SearchState {
  query: string;
  results: any[];
  loading: boolean;
  filters: {
    platforms: string[];
    sortBy: 'relevance' | 'price_asc' | 'price_desc';
    priceRange: [number, number];
  };
  searchHistory: string[];
  setQuery: (query: string) => void;
  setResults: (results: any[]) => void;
  setLoading: (loading: boolean) => void;
  updateFilters: (filters: Partial<SearchState['filters']>) => void;
  addToHistory: (query: string) => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      query: '',
      results: [],
      loading: false,
      filters: {
        platforms: ['pchome', 'momo'],
        sortBy: 'relevance',
        priceRange: [0, 100000]
      },
      searchHistory: [],
      
      setQuery: (query) => set({ query }),
      setResults: (results) => set({ results }),
      setLoading: (loading) => set({ loading }),
      
      updateFilters: (newFilters) => 
        set((state) => ({
          filters: { ...state.filters, ...newFilters }
        })),
      
      addToHistory: (query) => 
        set((state) => ({
          searchHistory: [
            query,
            ...state.searchHistory.filter(q => q !== query)
          ].slice(0, 10) // 保留最近10筆
        }))
    }),
    {
      name: 'smartcompare-search-store',
      partialize: (state) => ({
        searchHistory: state.searchHistory,
        filters: state.filters
      })
    }
  )
);

狀態更新方法：
- setQuery, setResults, setLoading
- updateFilters, addToHistory
- clearResults, resetFilters
```

### 響應式設計提示

#### 斷點配置
```
Tailwind 響應式設計：

斷點：
- sm: 640px (手機橫向)
- md: 768px (平板)
- lg: 1024px (筆電)
- xl: 1280px (桌機)

佈局調整：
- 手機：單欄佈局，底部導航
- 平板：兩欄佈局，側邊篩選摺疊
- 桌機：三欄佈局，固定側邊欄

組件適配：
- 商品卡片：手機 1欄，平板 2欄，桌機 3-4欄
- 搜尋框：手機全寬，桌機置中
- 圖表：自適應容器寬度
```

### 性能優化提示

#### 效能最佳化
```
前端效能優化策略：

圖片優化：
- 使用 Next.js Image 組件
- 懶載入 (Intersection Observer)
- WebP 格式支援
- 縮圖和原圖分離

資料載入：
- React Query 快取策略
- 無限滾動分頁載入
- 搜尋防抖 (debounce)
- 預載入關鍵資源

程式碼分割：
- 路由層級代碼分割
- 動態 import 延遲載入
- Tree shaking 移除未使用代碼

快取策略：
- API 回應快取 (React Query)
- 瀏覽器 localStorage 快取
- Service Worker 快取靜態資源
```

### 無障礙設計提示

#### 可訪問性 (a11y)
```
無障礙設計實作：

鍵盤導航：
- Tab 鍵順序邏輯
- Enter/Space 鍵操作
- Escape 鍵關閉彈窗
- Arrow 鍵在清單中導航

螢幕閱讀器：
- 適當的 ARIA 標籤
- alt 屬性描述圖片
- 表格 header 關聯
- 表單 label 關聯

視覺輔助：
- 高對比度模式支援
- 字體大小調整
- 顏色不是唯一資訊來源
- 動畫可關閉選項

語意化 HTML：
- 使用適當的 HTML 標籤
- heading 層級結構
- landmark 角色定義
- 表單驗證訊息清晰
```

## 🚀 實作步驟建議

### Phase 1: 基礎架構 (2小時)
1. 建立 React + TypeScript 專案
2. 配置 Tailwind CSS
3. 建立基礎路由結構
4. 實作主頁面和搜尋頁面骨架

### Phase 2: 核心功能 (3小時)  
1. 完成搜尋功能和結果展示
2. 實作商品詳情頁面
3. 整合價格圖表組件
4. 建立價格提醒功能

### Phase 3: 進階功能 (1小時)
1. 實作即時通知系統
2. 加入響應式設計調整
3. 效能優化和測試
4. 無障礙設計完善

## 📱 最終效果期望

打造一個現代化、使用者友善的比價平台，具備：
- 🔍 直觀的搜尋體驗
- 📊 清晰的價格比較視覺化  
- 🔔 實用的價格追蹤功能
- 📱 完美的行動裝置適配
- ♿ 優秀的無障礙支援
- ⚡ 流暢的使用者體驗

---

**使用說明**: 將這些提示分段輸入 Lovable，根據開發進度逐步實作各個功能模組。 