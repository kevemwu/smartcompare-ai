const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001';

// 簡化的 API 請求包裝器（無認證）
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}/api${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `找不到請求的資源: ${options.method || 'GET'} ${endpoint}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// API 方法（僅包含基本功能）
export const api = {
  // 搜尋相關
  search: {
    search: async (query: string, filters?: any) => {
      const params = new URLSearchParams({ q: query });
      if (filters) {
        Object.keys(filters).forEach(key => {
          if (filters[key] !== undefined && filters[key] !== null) {
            if (Array.isArray(filters[key])) {
              filters[key].forEach((val: any) => params.append(key, val));
            } else {
              params.append(key, filters[key]);
            }
          }
        });
      }
      return await apiRequest(`/search?${params.toString()}`);
    },

    getCategoryProducts: async (categoryName: string, params?: { 
      q?: string; 
      sortBy?: string; 
      page?: number; 
      limit?: number; 
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.q) searchParams.append('q', params.q);
      if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      
      const queryString = searchParams.toString();
      const url = `/search/category/${encodeURIComponent(categoryName)}${queryString ? `?${queryString}` : ''}`;
      return await apiRequest(url);
    },

    suggestions: async (query: string) => {
      return await apiRequest(`/search/suggestions?q=${encodeURIComponent(query)}`);
    },

    trending: async () => {
      return await apiRequest('/search/trending');
    },

    categories: async () => {
      return await apiRequest('/search/categories');
    },
  },

  // 商品相關
  products: {
    getDetail: async (id: string) => {
      return await apiRequest(`/products/${id}`);
    },

    getSimilar: async (id: string, limit: number = 10) => {
      return await apiRequest(`/products/${id}/similar?limit=${limit}`);
    },

    getSpecs: async (id: string) => {
      return await apiRequest(`/products/${id}/specs`);
    },
  },

  // 平台相關
  platforms: {
    getAll: async () => {
      return await apiRequest('/platforms');
    },

    getStats: async () => {
      return await apiRequest('/platforms/stats');
    },

    getHealth: async () => {
      return await apiRequest('/platforms/health');
    },

    getCategories: async () => {
      return await apiRequest('/platforms/categories');
    },

    getBrands: async (category?: string, limit?: number) => {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (limit) params.append('limit', limit.toString());
      return await apiRequest(`/platforms/brands?${params.toString()}`);
    },
  },

  // 爬蟲相關
  crawler: {
    trigger: async (data: { query: string; platforms: string[]; priority?: string; maxPages?: number }) => {
      return await apiRequest('/crawler/trigger', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getTaskStatus: async (taskId: string) => {
      return await apiRequest(`/crawler/status/${taskId}`);
    },

    getTasks: async (params?: { status?: string; platform?: string; page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.append('status', params.status);
      if (params?.platform) searchParams.append('platform', params.platform);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      return await apiRequest(`/crawler/tasks?${searchParams.toString()}`);
    },

    getLogs: async (params?: { platform?: string; status?: string; fromDate?: string; toDate?: string; page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.platform) searchParams.append('platform', params.platform);
      if (params?.status) searchParams.append('status', params.status);
      if (params?.fromDate) searchParams.append('fromDate', params.fromDate);
      if (params?.toDate) searchParams.append('toDate', params.toDate);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      return await apiRequest(`/crawler/logs?${searchParams.toString()}`);
    },

    getStats: async (period?: string) => {
      const params = period ? `?period=${period}` : '';
      return await apiRequest(`/crawler/stats${params}`);
    },

    getHealth: async () => {
      return await apiRequest('/crawler/health');
    },

    testPlatform: async (platform: string, query: string) => {
      return await apiRequest(`/crawler/platforms/${platform}/test`, {
        method: 'POST',
        body: JSON.stringify({ query }),
      });
    },
  },
};

export default api; 