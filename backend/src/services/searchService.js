const mockDataService = require('./mockDataService');
const CrawlerManager = require('./crawlers/crawlerManager');
const logger = require('../utils/logger');

// 創建爬蟲管理器實例
const crawlerManager = new CrawlerManager();

// 搜尋結果快取（記憶體快取）
const searchCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30分鐘快取

/**
 * 智能商品搜尋
 */
const searchProducts = async ({ 
  query: searchQuery, 
  filters = {}, 
  sort = 'relevance', 
  page = 1, 
  limit = 40, // 增加默認顯示數量
  useCrawler = true,
  categorySummary = true 
}) => {
  try {
    logger.info(`開始搜尋: ${searchQuery}`, { filters, sort, page, limit });
    
    // 檢查快取
    const cacheKey = `${searchQuery}_${JSON.stringify(filters)}_${sort}`;
    const cachedResult = searchCache.get(cacheKey);
    
    if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_TTL) {
      logger.info(`使用快取結果: ${searchQuery}`);
      
      // 從快取中分頁
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedProducts = cachedResult.products.slice(startIndex, endIndex);
      
      return {
        success: true,
        products: paginatedProducts,
        total: cachedResult.products.length,
        page,
        limit,
        hasMore: endIndex < cachedResult.products.length,
        categories: cachedResult.categories,
        metadata: {
          ...cachedResult.metadata,
          fromCache: true
        }
      };
    }

    // 沒有快取或快取過期，執行搜尋
    let result;
    
    if (useCrawler) {
      // 使用爬蟲搜尋
      const crawlerOptions = {
        platforms: filters.platforms || ['pchome', 'momo'],
        maxResults: Math.max(limit * 3, 100), // 獲取更多商品以便分類
        enableNLP: true,
        enableGrouping: false,
        enableCategorySummary: categorySummary,
        sortBy: sort
      };

      result = await crawlerManager.searchProducts(searchQuery, crawlerOptions);
      
      if (!result.success) {
        throw new Error('爬蟲搜尋失敗');
      }
    } else {
      // 使用資料庫搜尋（如果有的話）
      result = { products: [] };
    }

    // 根據 categorySummary 參數和爬蟲返回模式決定處理方式
    let categoryArray = [];
    let categorizedProducts = [];
    
    if (categorySummary && result.mode === 'category_summary') {
      // 爬蟲已經進行了分類，直接使用結果
      categoryArray = result.categories || [];
      
      // 從分類中提取所有商品
      categorizedProducts = [];
      categoryArray.forEach(category => {
        if (category.products && Array.isArray(category.products)) {
          category.products.forEach(product => {
            categorizedProducts.push({ ...product, category: category.name });
          });
        }
      });
      
      logger.info(`使用爬蟲分類結果，共 ${categoryArray.length} 個分類，${categorizedProducts.length} 個商品`);
    } else if (result.products && Array.isArray(result.products)) {
      // 使用商品列表模式
      categorizedProducts = result.products;
      
      if (categorySummary) {
        // 使用 LLM 分類服務重新分類
        const { categorizeProducts } = require('./nlp/nlpProcessor');
        const categories = await categorizeProducts(result.products, searchQuery);
        categoryArray = categories;
        
        // 為商品添加分類信息
        categorizedProducts = result.products.map(product => {
          // 找到商品所屬的分類
          for (const category of categories) {
            if (category.products && category.products.some(p => p.name === product.name || p.id === product.id)) {
              return { ...product, category: category.name };
            }
          }
          return { ...product, category: '其他商品' };
        });
      } else {
        // 不使用分類，所有商品歸為一類
        categoryArray = [{
          name: '所有商品',
          totalProducts: result.products.length,
          priceRange: calculatePriceRange(result.products),
          platforms: [...new Set(result.products.map(p => p.platform))],
          products: result.products.slice(0, 40) // 增加每個分類顯示的商品數量
        }];
      }
    } else {
      // 沒有商品數據，返回空結果
      logger.warn('爬蟲沒有返回商品數據');
      categorizedProducts = [];
      categoryArray = [{
        name: '所有商品',
        totalProducts: 0,
        priceRange: { min: 0, max: 0, avg: 0 },
        platforms: [],
        products: []
      }];
    }

    // 儲存到快取
    const cacheData = {
      products: categorizedProducts,
      categories: categoryArray,
      timestamp: Date.now(),
      metadata: {
        totalProducts: categorizedProducts.length,
        totalCategories: categoryArray.length,
        platforms: [...new Set(categorizedProducts.map(p => p.platform))],
        searchTime: Date.now()
      }
    };
    searchCache.set(cacheKey, cacheData);
    
    // 清理舊快取（保持記憶體使用合理）
    if (searchCache.size > 100) {
      const oldestKey = searchCache.keys().next().value;
      searchCache.delete(oldestKey);
    }

    // 分頁處理
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = categorizedProducts.slice(startIndex, endIndex);

    // 搜尋歷史記錄功能已移除

    return {
      success: true,
      products: paginatedProducts,
      total: categorizedProducts.length,
      page,
      limit,
      hasMore: endIndex < categorizedProducts.length,
      categories: categoryArray,
      metadata: {
        totalProducts: categorizedProducts.length,
        totalCategories: categoryArray.length,
        platforms: [...new Set(categorizedProducts.map(p => p.platform))],
        fromCache: false
      }
    };

  } catch (error) {
    logger.error('搜尋失敗:', error);
    throw error;
  }
};

/**
 * 群組化相似商品
 */
const groupSimilarProducts = async (products) => {
  // 這裡可以使用 AI 模型來群組化相似商品
  // 暫時使用簡單的名稱相似度
  const groups = [];
  const used = new Set();

  for (let i = 0; i < products.length; i++) {
    if (used.has(i)) continue;

    const group = {
      groupId: `group_${groups.length + 1}`,
      groupName: products[i].name,
      lowestPrice: products[i].current_price,
      platforms: []
    };

    // 找出相似的商品
    for (let j = i; j < products.length; j++) {
      if (used.has(j)) continue;

      const similarity = calculateNameSimilarity(products[i].name, products[j].name);
      
      if (similarity > 0.7) { // 70% 相似度閾值
        used.add(j);
        
        group.platforms.push({
          platformId: products[j].platform_name,
          platformName: products[j].platform_name,
          price: products[j].current_price,
          url: products[j].platform_url,
          stock: products[j].in_stock ? '有庫存' : '缺貨',
          rating: products[j].rating,
          reviewCount: products[j].review_count
        });

        // 更新最低價格
        if (products[j].current_price < group.lowestPrice) {
          group.lowestPrice = products[j].current_price;
        }
      }
    }

    groups.push(group);
  }

  return groups;
};

/**
 * 計算名稱相似度
 */
const calculateNameSimilarity = (name1, name2) => {
  // 簡單的 Jaccard 相似度計算
  const set1 = new Set(name1.toLowerCase().split(/\s+/));
  const set2 = new Set(name2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
};

/**
 * 取得搜尋建議
 */
const getSuggestions = async (prefix) => {
  try {
    return mockDataService.getSuggestions(prefix);
  } catch (error) {
    logger.error('Error getting suggestions:', error);
    throw error;
  }
};

/**
 * 取得熱門搜尋關鍵字
 */
const getTrending = async (limit = 10) => {
  try {
    return mockDataService.getTrending();
  } catch (error) {
    logger.error('Error getting trending:', error);
    throw error;
  }
};

/**
 * 取得商品分類
 */
const getCategories = async () => {
  try {
    return mockDataService.getCategories();
  } catch (error) {
    logger.error('Error getting categories:', error);
    throw error;
  }
};

// 用戶搜尋歷史功能已移除

/**
 * 檢查爬蟲平台健康狀態
 */
const checkCrawlerHealth = async () => {
  try {
    return await crawlerManager.checkPlatformsHealth();
  } catch (error) {
    logger.error('檢查爬蟲健康狀態失敗:', error);
    throw error;
  }
};

/**
 * 獲取支援的平台列表
 */
const getSupportedPlatforms = () => {
  return crawlerManager.getSupportedPlatforms();
};

/**
 * 清理爬蟲資源
 */
const cleanupCrawlers = async () => {
  try {
    await crawlerManager.cleanup();
    logger.info('爬蟲資源清理完成');
  } catch (error) {
    logger.error('爬蟲資源清理失敗:', error);
  }
};

/**
 * 獲取特定分類的商品詳情
 */
const getCategoryProducts = async ({ 
  originalQuery, 
  categoryName, 
  sortBy = 'price_asc', 
  page = 1, 
  limit = 50 
}) => {
  try {
    logger.info(`獲取分類商品: ${categoryName} (來源搜尋: ${originalQuery})`);
    
    // 檢查快取
    const cacheKey = `${originalQuery}_${JSON.stringify({})}_relevance`;
    let cachedResult = searchCache.get(cacheKey);
    
    // 如果沒有快取或快取已過期，執行新的搜尋
    if (!cachedResult || (Date.now() - cachedResult.timestamp) >= CACHE_TTL) {
      logger.info('快取不存在或已過期，執行新搜尋');
      
      // 使用分類名稱作為搜尋關鍵字
      const searchResult = await searchProducts({
        query: categoryName,
        filters: {},
        sort: 'relevance',
        page: 1,
        limit: 100,
        useCrawler: true,
        categorySummary: true
      });
      
      if (!searchResult.success) {
        throw new Error('搜尋失敗');
      }
      
      // 更新快取
      cachedResult = {
        products: searchResult.products,
        categories: searchResult.categories,
        timestamp: Date.now(),
        metadata: searchResult.metadata
      };
      searchCache.set(cacheKey, cachedResult);
    }
    
    // 從快取中篩選指定分類的商品
    const categoryProducts = cachedResult.products.filter(product => 
      product.category === categoryName
    );
    
    if (categoryProducts.length === 0) {
      logger.info(`分類 ${categoryName} 中沒有找到商品`);
      return {
        success: true,
        categoryName,
        originalQuery,
        products: [],
        total: 0,
        page,
        limit,
        hasMore: false,
        metadata: {
          totalInCategory: 0,
          platforms: [],
          priceRange: { min: 0, max: 0 },
          sortBy,
          fromCache: true
        }
      };
    }

    // 排序商品
    const sortedProducts = sortProducts(categoryProducts, sortBy);

    // 分頁處理
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = sortedProducts.slice(startIndex, endIndex);

    // 轉換為統一格式
    const formattedProducts = paginatedProducts.map(product => {
      let price = product.price;
      
      // 如果價格是字串，轉換為數字
      if (typeof price === 'string') {
        price = parseInt(price.replace(/[^\d]/g, '')) || 0;
      }
      
      // 處理圖片URL
      let imageUrl = product.image || product.imageUrl || '/placeholder.svg';
      if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
        // 如果是 PChome 的圖片，確保使用正確的格式
        if (product.platform === 'pchome' && imageUrl.includes('items/')) {
          imageUrl = `https://img.pchome.com.tw/cs/${imageUrl}`;
        } else {
          imageUrl = `https://a.ecimg.tw${imageUrl}`;
        }
      }
      
      return {
        id: product.id || `${product.platform}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: product.name || '商品名稱未知',
        description: product.description || '',
        image: imageUrl,
        price: price,
        platform: product.platform === 'pchome' ? 'PChome 24h' : 
                 product.platform === 'momo' ? 'momo購物網' : 
                 product.platform || '未知平台',
        url: product.url || product.productUrl || '#',
        inStock: product.inStock !== false,
        category: categoryName
      };
    });

    return {
      success: true,
      categoryName,
      originalQuery,
      products: formattedProducts,
      total: categoryProducts.length,
      page,
      limit,
      hasMore: endIndex < categoryProducts.length,
      metadata: {
        totalInCategory: categoryProducts.length,
        platforms: [...new Set(categoryProducts.map(p => p.platform))],
        priceRange: calculatePriceRange(categoryProducts),
        sortBy,
        fromCache: true
      }
    };

  } catch (error) {
    logger.error(`獲取分類商品失敗: ${categoryName}`, error);
    throw error;
  }
};

/**
 * 商品排序
 */
const sortProducts = (products, sortBy) => {
  const sortedProducts = [...products];
  
  switch (sortBy) {
    case 'price_asc':
      return sortedProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
    case 'price_desc':
      return sortedProducts.sort((a, b) => (b.price || 0) - (a.price || 0));
    case 'relevance':
    default:
      return sortedProducts.sort((a, b) => (b.searchRelevance || 0) - (a.searchRelevance || 0));
  }
};

/**
 * 計算價格範圍
 */
const calculatePriceRange = (products) => {
  if (products.length === 0) return { min: 0, max: 0, avg: 0 };
  
  const prices = products.map(p => p.price || 0).filter(p => p > 0);
  if (prices.length === 0) return { min: 0, max: 0, avg: 0 };
  
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);
  
  return { min, max, avg };
};

module.exports = {
  searchProducts,
  groupSimilarProducts,
  getSuggestions,
  getTrending,
  getCategories,
  checkCrawlerHealth,
  getSupportedPlatforms,
  cleanupCrawlers,
  getCategoryProducts
}; 