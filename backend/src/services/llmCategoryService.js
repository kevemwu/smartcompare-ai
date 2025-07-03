const axios = require('axios');
const logger = require('../utils/logger');
const { 
  LLM_PROMPTS, 
  KEYWORD_RULES, 
  CLASSIFICATION_CONFIG 
} = require('../config/classification');

/**
 * LLM 商品分類服務
 * 使用 LLM 進行智能分類，失敗時降級到關鍵字匹配
 */
class LLMCategoryService {
  constructor() {
    this.config = CLASSIFICATION_CONFIG.llm;
    this.fallbackConfig = CLASSIFICATION_CONFIG.fallback;
    
    logger.info(`LLM分類服務初始化完成，使用提供商: ${this.config.provider}`);
  }

  /**
   * 主要分類方法 - 接收爬蟲結果，返回分類後的JSON
   */
  async categorizeSearchResults(products, searchQuery) {
    try {
      logger.info(`開始LLM分類處理: ${products.length} 個商品，查詢: ${searchQuery}`);
      logger.debug('原始商品資料範例:', products.slice(0, 2));
      
      // 構建分類Prompt
      const prompt = this.buildClassificationPrompt(products, searchQuery);
      
      // 調用LLM進行分類
      const classificationResult = await this.callLLM(prompt);
      
      // 解析LLM返回的JSON結果
      const categorizedData = this.parseClassificationResult(classificationResult, products);
      
      logger.info(`LLM分類完成: ${categorizedData.categories.length} 個分類`);
      logger.debug('分類後商品資料範例:', categorizedData.categories[0]?.products?.slice(0, 1));
      
      return {
        success: true,
        mode: 'llm_classification',
        categories: categorizedData.categories,
        totalProducts: products.length,
        searchQuery: searchQuery,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('LLM分類失敗:', error);
      
      // 降級處理：使用關鍵字匹配
      if (this.fallbackConfig.enabled && this.fallbackConfig.useKeywordMatch) {
        return this.fallbackClassification(products, searchQuery);
      }
      
      throw error;
    }
  }

  /**
   * 構建分類Prompt
   */
  buildClassificationPrompt(products, searchQuery) {
    const productList = products.map((product, index) => {
      // 提供更完整的商品資訊，但加上商品索引以便後續重新組織
      return `${index + 1}. [ID:${index}] ${product.name} - ${product.description || '無描述'} - $${product.price}元 - 平台:${product.platform}`;
    }).join('\n');

    // 修改 Prompt，要求 LLM 返回商品索引而不是完整商品資訊
    const modifiedPrompt = LLM_PROMPTS.CATEGORY_CLASSIFICATION
      .replace('{{SEARCH_QUERY}}', searchQuery)
      .replace('{{PRODUCT_LIST}}', productList)
      .replace(
        /products.*?\[\s*\{[\s\S]*?\}\s*\]/,
        `"productIndexes": [商品索引數組，例如: [0, 1, 2]]`
      );

    return modifiedPrompt;
  }

  /**
   * 調用LLM API
   */
  async callLLM(prompt) {
    // 根據配置的提供商選擇 API
    if (this.config.provider === 'ollama') {
      return this.callOllamaAPI(prompt);
    } else if (this.config.provider === 'gemini') {
      return this.callGeminiAPI(prompt);
    } else {
      throw new Error(`不支援的 LLM 提供商: ${this.config.provider}`);
    }
  }

  /**
   * 調用 Ollama API
   */
  async callOllamaAPI(prompt) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        logger.info(`🦙 調用 Ollama API (${this.config.model})，嘗試 ${attempt}/${this.config.maxRetries}`);
        
        const response = await axios.post(
          `${this.config.ollamaUrl}/api/generate`,
          {
            model: this.config.model,
            prompt: prompt,
            stream: false,
            options: {
              temperature: this.config.temperature,
              num_predict: this.config.maxTokens
            }
          },
          {
            timeout: this.config.timeout,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data && response.data.response) {
          const result = response.data.response.trim();
          logger.debug('Ollama 回應:', result);
          return result;
        }

        throw new Error('Ollama 回應格式錯誤');
        
      } catch (error) {
        lastError = error;
        
        if (error.code === 'ECONNABORTED') {
          logger.warn(`⏰ Ollama API 請求超時，嘗試 ${attempt}/${this.config.maxRetries}`);
        } else if (error.code === 'ECONNREFUSED') {
          logger.warn(`🔌 Ollama 服務連接失敗，請確認服務正在運行，嘗試 ${attempt}/${this.config.maxRetries}`);
        } else if (error.response) {
          logger.warn(`❌ Ollama API 錯誤 ${error.response.status}，嘗試 ${attempt}/${this.config.maxRetries}`);
        } else {
          logger.warn(`🔌 網路錯誤：${error.message}，嘗試 ${attempt}/${this.config.maxRetries}`);
        }
        
        if (attempt === this.config.maxRetries) {
          logger.error(`🛑 Ollama API 調用失敗，已達最大重試次數: ${error.message}`);
          throw lastError;
        }
        
        // 本地模型使用較短的重試延遲
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
      }
    }
    
    throw lastError;
  }

  /**
   * 調用 Gemini API（備用）
   */
  async callGeminiAPI(prompt) {
    if (!this.config.apiKey) {
      throw new Error('Gemini API Key 未設置');
    }

    let lastError;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${this.config.apiKey}`,
          {
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: this.config.temperature,
              maxOutputTokens: this.config.maxTokens,
              topP: 0.8,
              topK: 10
            }
          },
          {
            timeout: this.config.timeout,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data && response.data.candidates && response.data.candidates[0]) {
          const result = response.data.candidates[0].content.parts[0].text.trim();
          logger.debug('Gemini 回應:', result);
          return result;
        }

        throw new Error('Gemini 回應格式錯誤');
              } catch (error) {
          lastError = error;
          
          if (error.response && error.response.status === 429) {
            const waitTime = this.config.retryDelay;
            logger.warn(`🚨 Gemini API 頻率限制！正在等待 ${waitTime/1000} 秒後重試... (${attempt}/${this.config.maxRetries})`);
            logger.info(`💡 建議：降低請求頻率或考慮升級到 Gemini Pro API`);
            
            if (attempt < this.config.maxRetries) {
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
          }
          
          // 處理其他錯誤類型
          if (error.code === 'ECONNABORTED') {
            logger.warn(`⏰ Gemini API 請求超時，嘗試 ${attempt}/${this.config.maxRetries}`);
          } else if (error.response) {
            logger.warn(`❌ Gemini API 錯誤 ${error.response.status}，嘗試 ${attempt}/${this.config.maxRetries}`);
          } else {
            logger.warn(`🔌 網路錯誤：${error.message}，嘗試 ${attempt}/${this.config.maxRetries}`);
          }
          
          if (attempt === this.config.maxRetries) {
            logger.error(`🛑 Gemini API 調用失敗，已達最大重試次數: ${error.message}`);
            throw lastError;
          }
          
          // 對於非 429 錯誤，使用較短的重試延遲
          const retryDelay = error.response?.status === 429 ? this.config.retryDelay : 8000;
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
    
    throw lastError;
  }

  /**
   * 解析LLM分類結果（保持原始商品完整資料）
   */
  parseClassificationResult(llmResult, originalProducts) {
    try {
      // 提取JSON部分
      const jsonMatch = llmResult.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('無法找到JSON格式的回應');
      }

      const parsedData = JSON.parse(jsonMatch[0]);
      
      // 驗證和重新組織分類數據，使用原始商品完整資料
      const validatedCategories = parsedData.categories.map(category => {
        // 根據 LLM 返回的商品索引，重新組織原始商品資料
        const categoryProducts = (category.productIndexes || [])
          .filter(index => index >= 0 && index < originalProducts.length)
          .map(index => {
            const originalProduct = originalProducts[index];
            return {
              id: originalProduct.id || `product_${index}`,
              name: originalProduct.name || '未知商品',
              price: originalProduct.price || 0,
              platform: originalProduct.platform || 'unknown',
              url: originalProduct.url || null,
              image: originalProduct.image || null,
              rating: originalProduct.rating || null,
              reviewCount: originalProduct.reviewCount || 0,
              seller: originalProduct.seller || null,
              description: originalProduct.description || '',
              inStock: originalProduct.inStock !== false,
              shipping: originalProduct.shipping || '依商家規定',
              currency: originalProduct.currency || 'TWD',
              crawledAt: originalProduct.crawledAt || new Date().toISOString()
            };
          });

        // 計算實際的統計數據
        const prices = categoryProducts.filter(p => p.price > 0).map(p => p.price);
        const platforms = [...new Set(categoryProducts.map(p => p.platform))];

        return {
          name: category.name || this.fallbackConfig.defaultCategory,
          description: category.description || '',
          totalProducts: categoryProducts.length,
          priceRange: {
            min: prices.length > 0 ? Math.min(...prices) : 0,
            max: prices.length > 0 ? Math.max(...prices) : 0,
            avg: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0
          },
          platforms: platforms,
          products: categoryProducts
        };
      });

      return {
        categories: validatedCategories,
        summary: parsedData.summary || {
          totalProducts: originalProducts.length,
          totalCategories: validatedCategories.length,
          searchRelevance: 0.8,
          classificationReasoning: parsedData.summary?.classificationReasoning || '根據商品特性進行智能分類'
        }
      };

    } catch (error) {
      logger.error('解析LLM分類結果失敗:', error);
      logger.debug('LLM原始回應:', llmResult);
      throw new Error('LLM回應格式解析失敗');
    }
  }

  /**
   * 降級分類處理 - 使用關鍵字匹配
   */
  fallbackClassification(products, searchQuery) {
    logger.warn('使用關鍵字匹配降級處理');
    
    const categoryGroups = {};
    
    products.forEach(product => {
      const category = this.keywordMatch(product.name, searchQuery);
      
      if (!categoryGroups[category]) {
        categoryGroups[category] = {
          name: category,
          description: `基於關鍵字匹配的 ${category} 分類`,
          totalProducts: 0,
          priceRange: { min: Infinity, max: 0, avg: 0 },
          platforms: new Set(),
          products: []
        };
      }
      
      const group = categoryGroups[category];
      group.totalProducts++;
      group.products.push(product);
      group.platforms.add(product.platform);
      
      if (product.price) {
        group.priceRange.min = Math.min(group.priceRange.min, product.price);
        group.priceRange.max = Math.max(group.priceRange.max, product.price);
      }
    });
    
    // 轉換為標準格式
    const categories = Object.values(categoryGroups).map(group => {
      const avgPrice = group.products.reduce((sum, p) => sum + (p.price || 0), 0) / group.products.length;
      
      return {
        name: group.name,
        totalProducts: group.totalProducts,
        priceRange: {
          min: group.priceRange.min === Infinity ? 0 : group.priceRange.min,
          max: group.priceRange.max === 0 ? 0 : group.priceRange.max,
          avg: Math.round(avgPrice)
        },
        platforms: Array.from(group.platforms),
        products: group.products.slice(0, 10) // 每個分類最多顯示10個商品
      };
    });
    
    return {
      success: true,
      mode: 'keyword_fallback',
      categories: categories,
      totalProducts: products.length,
      searchQuery: searchQuery,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 關鍵字匹配方法
   */
  keywordMatch(productName, searchQuery = '') {
    const lowerName = productName.toLowerCase();
    const lowerQuery = searchQuery.toLowerCase();
    
    // 1. 優先根據搜尋查詢進行分類
    if (searchQuery) {
      // 檢查搜尋查詢相關的特殊情況
      if (lowerQuery.includes('烏龜') || lowerQuery.includes('龜')) {
        if (lowerName.includes('缸') || lowerName.includes('過濾') || 
            lowerName.includes('燈') || lowerName.includes('飼料')) {
          return '寵物用品';
        }
      }
      
      if (lowerQuery.includes('遊戲') || lowerQuery.includes('ps') || 
          lowerQuery.includes('xbox') || lowerQuery.includes('switch')) {
        if (lowerName.includes('ps') || lowerName.includes('xbox') || 
            lowerName.includes('switch') || lowerName.includes('遊戲')) {
          return '遊戲相關';
        }
      }
    }
    
    // 2. 檢查品牌匹配
    for (const [brand, category] of Object.entries(KEYWORD_RULES.BRANDS)) {
      if (lowerName.includes(brand)) {
        return category;
      }
    }
    
    // 3. 檢查分類關鍵字
    for (const [type, rule] of Object.entries(KEYWORD_RULES)) {
      if (type === 'BRANDS') continue;
      
      // 檢查主關鍵字
      if (rule.keywords.some(keyword => lowerName.includes(keyword))) {
        // 檢查子分類
        if (rule.subcategories) {
          for (const [subCategory, subKeywords] of Object.entries(rule.subcategories)) {
            if (subKeywords.some(keyword => lowerName.includes(keyword))) {
              return subCategory;
            }
          }
        }
        return rule.category;
      }
    }
    
    return this.fallbackConfig.defaultCategory;
  }

  /**
   * 健康檢查
   */
  async healthCheck() {
    try {
      const testProducts = [
        { name: 'iPhone 15 Pro', price: 33900, platform: 'pchome' },
        { name: 'PS5主機', price: 15990, platform: 'momo' }
      ];
      
      const result = await this.categorizeSearchResults(testProducts, 'iPhone');
      
      return {
        status: 'healthy',
        provider: this.config.provider,
        mode: result.mode,
        testResult: result.categories.length > 0 ? 'success' : 'failed'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        provider: this.config.provider,
        error: error.message
      };
    }
  }
}

module.exports = LLMCategoryService; 