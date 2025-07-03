const compromise = require('compromise');
const SmartLLMService = require('../smartLLMService');
const ClassificationCache = require('./classificationCache');
const logger = require('../../utils/logger');

// 初始化智能分類服務和快取
const smartLLMService = new SmartLLMService();
const classificationCache = new ClassificationCache({
  ttl: 24 * 60 * 60 * 1000, // 24小時
  maxSize: 10000,
  batchSize: 20
});

// 中文停用詞
const chineseStopWords = new Set([
  '的', '在', '是', '與', '和', '或', '但', '然而', '因為', '所以', '雖然', '不過',
  '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '個', '台', '件',
  '超', '很', '非常', '特別', '最', '更', '比較', '蠻', '還算', '頗', '相當'
]);

// 商品相關同義詞對應（專注於電子產品）
const synonymMap = new Map([
  // 手機相關
  ['手機', ['智慧型手機', '智能手機', 'phone', 'smartphone', 'mobile']],
  ['手機配件', ['保護貼', '保護殼', '充電器', '手機架', '手機支架']],
  ['充電配件', ['充電線', '充電器', '行動電源', '無線充電', '快充', 'charger', 'power bank']],
  ['手機保護', ['保護殼', '保護套', '保護貼', '玻璃貼', 'case', 'cover', 'protector']],
  
  // 電腦相關
  ['筆記型電腦', ['筆電', '筆記本電腦', 'laptop', 'notebook', '手提電腦']],
  ['桌上型電腦', ['桌機', '台式電腦', 'desktop', 'pc', '主機']],
  ['電腦周邊', ['鍵盤', '滑鼠', '螢幕', '耳機', '喇叭', '攝影機']],
  ['電腦配件', ['記憶體', '硬碟', 'SSD', '散熱器', '電源供應器']],
  
  // 平板相關
  ['平板電腦', ['平板', 'tablet', 'ipad', '平板裝置']],
  ['平板配件', ['平板保護套', '平板鍵盤', '觸控筆', 'apple pencil']],
  
  // 耳機音響
  ['耳機', ['藍牙耳機', '無線耳機', '有線耳機', 'airpods', 'headphone', 'earphone']],
  ['音響設備', ['喇叭', '音箱', '擴大機', 'speaker', 'soundbar']],
  
  // 遊戲相關
  ['遊戲主機', ['ps5', 'ps4', 'xbox', 'switch', 'playstation', 'nintendo']],
  ['遊戲配件', ['手把', '控制器', '搖桿', '遊戲片', '記憶卡']],
  
  // 相機攝影
  ['相機', ['數位相機', '單眼相機', '攝影機', 'camera', 'gopro']],
  ['相機配件', ['鏡頭', '腳架', '記憶卡', '相機包', '濾鏡']],
  
  // 智慧穿戴
  ['智慧手錶', ['手錶', 'smartwatch', 'apple watch', '運動手環']],
  ['穿戴配件', ['錶帶', '充電座', '保護貼', '保護殼']],
  
  // 網路設備
  ['網路設備', ['路由器', '網路卡', 'wifi', '網通設備', 'router']],
  
  // 規格相關
  ['容量', ['GB', 'TB', '記憶體', '儲存空間', 'storage']],
  ['連線', ['wifi', 'bluetooth', '藍牙', '無線', '有線']],
  ['效能', ['處理器', 'cpu', 'gpu', '顯卡', '記憶體']],
  
  // 顏色
  ['黑色', ['黑', 'black', '深色']],
  ['白色', ['白', 'white', '淺色']],
  ['金色', ['金', 'gold', '香檳金']],
  ['銀色', ['銀', 'silver', '太空灰']],
  ['特殊色', ['玫瑰金', '午夜色', '星光色', '紫色']]
]);

// 品牌名稱標準化
const brandNormalization = new Map([
  ['apple', ['蘋果', 'iPhone', 'iPad', 'MacBook', 'iMac', 'AirPods']],
  ['samsung', ['三星', 'Galaxy', 'Note']],
  ['huawei', ['華為', 'Mate', 'P系列']],
  ['xiaomi', ['小米', 'MI', 'Redmi']],
  ['oppo', ['OPPO', 'Find', 'Reno']],
  ['vivo', ['VIVO', 'X系列', 'Y系列']],
  ['sony', ['索尼', 'Xperia', 'PlayStation', 'WH', 'WF']],
  ['asus', ['華碩', 'ZenFone', 'ROG']],
  ['acer', ['宏碁', 'Aspire', 'Predator']],
  ['hp', ['惠普', 'Pavilion', 'EliteBook']],
  ['dell', ['戴爾', 'Inspiron', 'XPS', 'Latitude']],
  ['lenovo', ['聯想', 'ThinkPad', 'IdeaPad']],
  ['msi', ['微星', 'Gaming', 'Creator']],
  ['google', ['谷歌', 'Pixel', 'Nest']],
  ['microsoft', ['微軟', 'Surface', 'Xbox']],
  ['nintendo', ['任天堂', 'Switch']],
  ['bose', ['Bose', 'QuietComfort', 'SoundLink']],
  ['jbl', ['JBL', 'Flip', 'Charge']],
  ['beats', ['Beats', 'Studio', 'Solo']],
  ['logitech', ['羅技', 'MX', 'G系列']],
  ['razer', ['雷蛇', 'DeathAdder', 'BlackWidow']],
  ['gopro', ['GoPro', 'Hero']],
  ['canon', ['佳能', 'EOS', 'PowerShot']],
  ['nikon', ['尼康', 'D系列', 'Z系列']],
  ['fujifilm', ['富士', 'X系列', 'Instax']]
]);

/**
 * 處理搜尋查詢
 */
const processSearchQuery = async (query) => {
  try {
    // 基本文字處理
    const tokens = await tokenizeAndTag(query);
    const cleanTokens = removeStopWords(tokens);
    const expandedTokens = expandSynonyms(cleanTokens);
    
    // 提取實體
    const entities = extractEntities(query);
    
    // 分析意圖
    const intent = analyzeIntent(query, entities);
    
    // 處理後的查詢
    const processedQuery = expandedTokens.join(' ');
    
    return {
      originalQuery: query,
      processedQuery,
      tokens: cleanTokens,
      expandedTokens,
      entities,
      intent,
      keywords: extractKeywords(cleanTokens)
    };
  } catch (error) {
    logger.error('處理搜尋查詢時發生錯誤:', error);
    return {
      originalQuery: query,
      processedQuery: query,
      tokens: [query],
      expandedTokens: [query],
      entities: {},
      intent: { type: 'search', confidence: 0.5 },
      keywords: [query]
    };
  }
};

/**
 * 分詞和詞性標註
 */
const tokenizeAndTag = async (text) => {
  try {
    // 使用 compromise 進行基本的 NLP 處理
    const doc = compromise(text);
    
    // 提取重要詞彙
    const nouns = doc.nouns().out('array');
    const adjectives = doc.adjectives().out('array');
    const verbs = doc.verbs().out('array');
    
    // 合併所有重要詞彙
    const tokens = [...nouns, ...adjectives, ...verbs];
    
    return tokens.length > 0 ? tokens : [text];
  } catch (error) {
    // 如果 NLP 處理失敗，使用簡單分詞
    return text.split(/\s+/).filter(token => token.length > 0);
  }
};

/**
 * 移除停用詞
 */
const removeStopWords = (tokens) => {
  return tokens.filter(token => 
    !chineseStopWords.has(token.toLowerCase()) && 
    token.length > 1
  );
};

/**
 * 同義詞擴展
 */
const expandSynonyms = (tokens) => {
  const expandedTokens = [...tokens];
  
  tokens.forEach(token => {
    const lowerToken = token.toLowerCase();
    
    // 檢查同義詞映射
    for (const [key, synonyms] of synonymMap) {
      if (synonyms.includes(lowerToken) || key === lowerToken) {
        expandedTokens.push(key);
        break;
      }
    }
  });
  
  return [...new Set(expandedTokens)]; // 去重
};

/**
 * 提取實體
 */
const extractEntities = (text) => {
  const entities = {
    brands: [],
    products: [],
    specifications: [],
    colors: [],
    numbers: []
  };

  const lowerText = text.toLowerCase();

  // 提取品牌
  for (const [brand, variations] of brandNormalization) {
    if (variations.some(variation => lowerText.includes(variation.toLowerCase()))) {
      entities.brands.push(brand);
    }
  }

  // 提取規格相關信息
  const specPatterns = [
    /(\d+)(gb|tb|吋|inch)/gi,
    /(pro|max|mini|air|ultra)/gi,
    /(黑|白|紅|藍|綠|金|銀|粉|紫|灰)/gi
  ];

  specPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      entities.specifications.push(...matches);
    }
  });

  // 提取數字
  const numberMatches = text.match(/\d+/g);
  if (numberMatches) {
    entities.numbers = numberMatches.map(num => parseInt(num));
  }

  return entities;
};

/**
 * 分析意圖
 */
const analyzeIntent = (text, entities) => {
  const lowerText = text.toLowerCase();
  
  // 商品搜尋意圖
  if (entities.brands.length > 0 || entities.specifications.length > 0) {
    return {
      type: 'product_search',
      confidence: 0.9,
      category: 'electronics'
    };
  }
  
  // 價格比較意圖
  if (lowerText.includes('價格') || lowerText.includes('比較') || lowerText.includes('便宜')) {
    return {
      type: 'price_comparison',
      confidence: 0.8
    };
  }
  
  // 一般搜尋
  return {
    type: 'general_search',
    confidence: 0.6
  };
};

/**
 * 提取關鍵字
 */
const extractKeywords = (tokens) => {
  // 移除常見詞彙，保留重要關鍵字
  const importantTokens = tokens.filter(token => {
    const lowerToken = token.toLowerCase();
    return !['的', '是', '和', '或', '但', '很', '最', '更'].includes(lowerToken);
  });
  
  return importantTokens.slice(0, 5); // 最多返回5個關鍵字
};

/**
 * 計算文字相似度
 */
const calculateSimilarity = (text1, text2) => {
  const tokens1 = new Set(text1.toLowerCase().split(/\s+/));
  const tokens2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);
  
  return intersection.size / union.size;
};

/**
 * 標準化商品名稱
 */
const normalizeProductName = (name) => {
  return name
    .replace(/[^\w\s\u4e00-\u9fff]/g, ' ') // 移除特殊字符，保留中文
    .replace(/\s+/g, ' ') // 合併多個空格
    .trim()
    .toLowerCase();
};

/**
 * 商品分類 - 使用 LLM 分類服務
 */
const categorizeProducts = async (products, searchQuery = '') => {
  try {
    // 檢查 products 參數
    if (!products || !Array.isArray(products)) {
      logger.warn('商品列表為空或格式錯誤，返回空分類');
      return [{
        name: '所有商品',
        totalProducts: 0,
        priceRange: { min: 0, max: 0, avg: 0 },
        platforms: [],
        products: []
      }];
    }
    
    if (products.length === 0) {
      logger.info('商品列表為空，返回空分類');
      return [{
        name: '所有商品',
        totalProducts: 0,
        priceRange: { min: 0, max: 0, avg: 0 },
        platforms: [],
        products: []
      }];
    }
    
    logger.info(`開始分類 ${products.length} 個商品`);
    
    // 使用智能 LLM 分類服務進行分類
    const result = await smartLLMService.categorizeSearchResults(products, searchQuery);
    
    if (result.success) {
      logger.info(`分類完成，使用模式: ${result.mode}，產生 ${result.categories.length} 個分類`);
      return result.categories.map(category => ({
        name: category.name,
        description: category.description,
        totalProducts: category.totalProducts,
        priceRange: {
          min: category.priceRange.min === Infinity ? 0 : category.priceRange.min,
          max: category.priceRange.max === 0 ? 0 : category.priceRange.max,
          avg: Math.round(category.priceRange.avg)
        },
        platforms: Array.from(category.platforms),
        products: category.products
      }));
    } else {
      throw new Error('分類服務返回失敗結果');
    }
    
  } catch (error) {
    logger.error('商品分類失敗:', error);
    
    // 檢查 products 是否有效
    const safeProducts = products || [];
    
    // 最終降級：返回所有商品為單一分類
    return [{
      name: '所有商品',
      totalProducts: safeProducts.length,
      priceRange: calculatePriceRange(safeProducts),
      platforms: [...new Set(safeProducts.map(p => p.platform))],
      products: safeProducts.slice(0, 10)
    }];
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

/**
 * 健康檢查
 */
const healthCheck = async () => {
  try {
    const health = await smartLLMService.healthCheck();
    return {
      nlpProcessor: 'healthy',
      smartLLMService: health
    };
  } catch (error) {
    return {
      nlpProcessor: 'unhealthy',
      error: error.message
    };
  }
};

module.exports = {
  processSearchQuery,
  tokenizeAndTag,
  removeStopWords,
  expandSynonyms,
  extractEntities,
  analyzeIntent,
  extractKeywords,
  calculateSimilarity,
  normalizeProductName,
  categorizeProducts,
  calculatePriceRange,
  healthCheck,
  
  // 導出服務實例供其他模組使用
  smartLLMService
}; 