/**
 * 智能 LLM 服務 - 支持自動降級和性能監控
 * 架構: Gemini (雲端) → Ollama (本地) → 關鍵字匹配 (降級)
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { getLLMConfig, getActiveProvider, LLM_PROVIDERS } = require('../config/llm');
const { LLM_PROMPTS, KEYWORD_RULES } = require('../config/classification');

class SmartLLMService {
  constructor() {
    this.config = getLLMConfig();
    this.currentProvider = getActiveProvider(this.config);
    this.performanceStats = new Map(); // 性能統計
    this.failureCount = new Map();     // 失敗計數
    this.lastHealthCheck = new Map();  // 健康檢查
    
    // 初始化性能監控
    this.initPerformanceMonitoring();
    
    logger.info(`🤖 智能 LLM 服務初始化完成`);
    logger.info(`   當前提供商: ${this.currentProvider}`);
    logger.info(`   降級策略: ${this.config.fallbackOrder.join(' → ')}`);
  }

  /**
   * 主要分類方法 - 智能選擇最佳 LLM 提供商
   */
  async categorizeSearchResults(products, searchQuery) {
    const startTime = Date.now();
    
    try {
      logger.info(`🔍 開始智能分類: ${products.length} 個商品，查詢: "${searchQuery}"`);
      
      // 如果是 auto 模式,確保按照優先順序嘗試
      const providers = this.config.provider === 'auto' ? 
        this.config.fallbackOrder : 
        [this.config.provider];
      
      // 嘗試按降級順序調用 LLM
      for (const provider of providers) {
        try {
          const result = await this.tryProvider(provider, products, searchQuery);
          
          // 記錄成功統計
          this.recordSuccess(provider, Date.now() - startTime);
          
          logger.info(`✅ ${provider.toUpperCase()} 分類成功: ${result.categories.length} 個分類`);
          
          const finalResult = {
            success: true,
            mode: `${provider}_classification`,
            provider: provider,
            categories: result.categories,
            totalProducts: products.length,
            searchQuery: searchQuery,
            responseTime: Date.now() - startTime,
            timestamp: new Date().toISOString()
          };
          
          return finalResult;
          
        } catch (error) {
          logger.warn(`❌ ${provider.toUpperCase()} 分類失敗: ${error.message}`);
          this.recordFailure(provider, error);
          
          // 如果不是最後一個提供商，繼續嘗試下一個
          if (provider !== providers[providers.length - 1]) {
            logger.info(`🔄 切換到下一個提供商...`);
            continue;
          }
        }
      }
      
      // 所有提供商都失敗
      throw new Error('所有 LLM 提供商都無法使用');
      
    } catch (error) {
      logger.error('🛑 智能分類完全失敗:', error);
      
      // 返回空結果或錯誤
      const failedResult = {
        success: false,
        error: error.message,
        mode: 'failed',
        categories: [],
        totalProducts: products.length,
        searchQuery: searchQuery,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
      
      return failedResult;
    }
  }

  /**
   * 嘗試特定提供商
   */
  async tryProvider(provider, products, searchQuery) {
    switch (provider) {
      case LLM_PROVIDERS.OLLAMA:
        return await this.useOllama(products, searchQuery);
      
      case LLM_PROVIDERS.GEMINI:
        return await this.useGemini(products, searchQuery);
      
      case LLM_PROVIDERS.KEYWORD:
        return await this.useKeywordMatching(products, searchQuery);
      
      default:
        throw new Error(`不支援的提供商: ${provider}`);
    }
  }

  /**
   * 使用 Ollama 本地模型
   */
  async useOllama(products, searchQuery) {
    if (!this.config.ollama.enabled) {
      throw new Error('Ollama 未啟用');
    }

    // 健康檢查
    await this.checkOllamaHealth();

    const prompt = this.buildClassificationPrompt(products, searchQuery);
    
    let lastError;
    for (let attempt = 1; attempt <= this.config.ollama.maxRetries; attempt++) {
      try {
        logger.info(`🦙 調用 Ollama API (${this.config.ollama.model})，嘗試 ${attempt}/${this.config.ollama.maxRetries}`);
        
        const response = await axios.post(
          `${this.config.ollama.url}/api/generate`,
          {
            model: this.config.ollama.model,
            prompt: prompt,
            stream: false,
            format: "json",
            options: {
              temperature: 0.01,  // 極低溫度確保穩定性
              num_predict: this.config.ollama.maxTokens,
              top_p: 0.1,
              top_k: 1,
              repeat_penalty: 1.1,
              seed: 42, // 固定種子增加穩定性
              stop: ["\n\n", "```", "注意", "說明", "重要"] // 防止生成額外文字
            }
          },
          {
            timeout: this.config.ollama.timeout,
            headers: { 'Content-Type': 'application/json' }
          }
        );

        if (response.data && response.data.response) {
          const result = response.data.response.trim();
          logger.debug(`🦙 Ollama 原始回應 (${result.length} 字符):`, result.substring(0, 500));
          return this.parseClassificationResult(result, products);
        }

        logger.error('❌ Ollama 回應格式錯誤:', response.data);
        throw new Error('Ollama 回應格式錯誤');
        
      } catch (error) {
        lastError = error;
        
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Ollama 服務未運行，請先啟動 Ollama');
        }
        
        if (attempt < this.config.ollama.maxRetries) {
          logger.warn(`⏰ Ollama 重試 ${attempt + 1}/${this.config.ollama.maxRetries}，等待 ${this.config.ollama.retryDelay}ms`);
          await new Promise(resolve => setTimeout(resolve, this.config.ollama.retryDelay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * 使用 Gemini API
   */
  async useGemini(products, searchQuery) {
    if (!this.config.gemini.enabled || !this.config.gemini.apiKey) {
      throw new Error('Gemini 未啟用或缺少 API Key');
    }

    const prompt = this.buildClassificationPrompt(products, searchQuery);
    
    let lastError;
    for (let attempt = 1; attempt <= this.config.gemini.maxRetries; attempt++) {
      try {
        logger.info(`🔶 調用 Gemini API (${this.config.gemini.model})，嘗試 ${attempt}/${this.config.gemini.maxRetries}`);
        
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${this.config.gemini.model}:generateContent?key=${this.config.gemini.apiKey}`,
          {
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: this.config.gemini.temperature,
              maxOutputTokens: this.config.gemini.maxTokens,
              topP: 0.8,
              topK: 10
            }
          },
          {
            timeout: this.config.gemini.timeout,
            headers: { 'Content-Type': 'application/json' }
          }
        );

        if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          const result = response.data.candidates[0].content.parts[0].text.trim();
          return this.parseClassificationResult(result, products);
        }

        throw new Error('Gemini 回應格式錯誤');
        
      } catch (error) {
        lastError = error;
        
        if (error.response?.status === 429) {
          logger.warn(`🚨 Gemini API 頻率限制，等待 ${this.config.gemini.retryDelay}ms`);
          if (attempt < this.config.gemini.maxRetries) {
            await new Promise(resolve => setTimeout(resolve, this.config.gemini.retryDelay));
            continue;
          }
        }
        
        if (attempt < this.config.gemini.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * 使用關鍵字匹配 (最後降級選項)
   */
  async useKeywordMatching(products, searchQuery) {
    logger.info(`🔑 使用關鍵字匹配分類`);
    
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
        description: group.description,
        totalProducts: group.totalProducts,
        priceRange: {
          min: group.priceRange.min === Infinity ? 0 : group.priceRange.min,
          max: group.priceRange.max === 0 ? 0 : group.priceRange.max,
          avg: Math.round(avgPrice)
        },
        platforms: Array.from(group.platforms),
        products: group.products
      };
    });

    return { categories };
  }

  /**
   * 關鍵字匹配邏輯
   */
  keywordMatch(productName, searchQuery = '') {
    const lowerName = productName.toLowerCase();
    const lowerQuery = searchQuery.toLowerCase();
    
    // 搜尋查詢相關匹配
    if (searchQuery) {
      if (lowerQuery.includes('烏龜') || lowerQuery.includes('龜')) {
        if (lowerName.includes('缸') || lowerName.includes('過濾') || 
            lowerName.includes('燈') || lowerName.includes('飼料')) {
          return '寵物用品';
        }
      }
    }
    
    // 品牌匹配
    for (const [brand, category] of Object.entries(KEYWORD_RULES.BRANDS || {})) {
      if (lowerName.includes(brand)) {
        return category;
      }
    }
    
    // 分類關鍵字匹配
    for (const [type, rule] of Object.entries(KEYWORD_RULES)) {
      if (type === 'BRANDS') continue;
      
      if (rule.keywords?.some(keyword => lowerName.includes(keyword))) {
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
    
    return this.config.fallback.defaultCategory;
  }

  /**
   * 構建分類 Prompt
   */
  buildClassificationPrompt(products, searchQuery) {
    const productList = products.map((product, index) => {
      return `${index + 1}. [ID:${index}] ${product.name} - ${product.description || '無描述'} - $${product.price}元 - 平台:${product.platform}`;
    }).join('\n');

    return LLM_PROMPTS.CATEGORY_CLASSIFICATION
      .replace('{{SEARCH_QUERY}}', searchQuery)
      .replace('{{PRODUCT_LIST}}', productList)
      .replace(
        /products.*?\[\s*\{[\s\S]*?\}\s*\]/,
        `"productIndexes": [商品索引數組，例如: [0, 1, 2]]`
      );
  }

  /**
   * 智能 JSON 修復工具
   */
  repairJSON(jsonString) {
    try {
      // 先嘗試直接解析
      return JSON.parse(jsonString);
    } catch (error) {
      logger.warn(`🔧 JSON 解析失敗，嘗試修復: ${error.message}`);
      
      let repaired = jsonString;
      
      // 修復策略 1: 移除末尾多餘的逗號
      repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
      
      // 修復策略 2: 處理未閉合的字符串
      repaired = repaired.replace(/("[^"]*")([^",}\]]*)/g, '$1');
      
      // 修復策略 3: 處理未閉合的對象/數組
      const openBraces = (repaired.match(/\{/g) || []).length;
      const closeBraces = (repaired.match(/\}/g) || []).length;
      if (openBraces > closeBraces) {
        repaired += '}'.repeat(openBraces - closeBraces);
      }
      
      const openBrackets = (repaired.match(/\[/g) || []).length;
      const closeBrackets = (repaired.match(/\]/g) || []).length;
      if (openBrackets > closeBrackets) {
        repaired += ']'.repeat(openBrackets - closeBrackets);
      }
      
      // 修復策略 4: 移除無效字符
      repaired = repaired.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      
      try {
        logger.info('✅ JSON 修復成功');
        return JSON.parse(repaired);
      } catch (secondError) {
        logger.error('❌ JSON 修復失敗，使用降級解析');
        throw new Error(`JSON 修復失敗: ${secondError.message}`);
      }
    }
  }

  /**
   * 降級 JSON 解析 (提取關鍵信息)
   */
  fallbackParseJSON(text, originalProducts) {
    logger.warn('🚨 使用降級 JSON 解析模式');
    
    try {
      // 嘗試提取分類名稱
      const categoryMatches = text.match(/"name"\s*:\s*"([^"]+)"/g) || [];
      const categories = [];
      
      // 如果找到分類名稱，創建簡單分類
      if (categoryMatches.length > 0) {
        categoryMatches.forEach((match, index) => {
          const nameMatch = match.match(/"([^"]+)"/);
          const categoryName = nameMatch ? nameMatch[1] : `分類 ${index + 1}`;
          
          // 平均分配商品到各分類
          const startIndex = Math.floor((originalProducts.length / categoryMatches.length) * index);
          const endIndex = Math.floor((originalProducts.length / categoryMatches.length) * (index + 1));
          const categoryProducts = originalProducts.slice(startIndex, endIndex);
          
          categories.push(this.createCategoryFromProducts(categoryName, categoryProducts));
        });
      } else {
        // 如果完全無法解析，創建單一分類
        logger.warn('📦 無法解析分類，將所有商品歸為一類');
        categories.push(this.createCategoryFromProducts('所有商品', originalProducts));
      }
      
      return { categories };
    } catch (error) {
      logger.error('降級解析也失敗:', error);
      // 最終降級：單一分類
      return {
        categories: [this.createCategoryFromProducts('所有商品', originalProducts)]
      };
    }
  }

  /**
   * 從商品列表創建分類對象
   */
  createCategoryFromProducts(categoryName, products) {
    const prices = products.filter(p => p.price > 0).map(p => p.price);
    const platforms = [...new Set(products.map(p => p.platform))];

    return {
      name: categoryName,
      description: `${categoryName}相關商品`,
      totalProducts: products.length,
      priceRange: {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0,
        avg: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0
      },
      platforms: platforms,
      products: products.map(product => ({
        id: product.id || `product_${Math.random().toString(36).substr(2, 9)}`,
        name: product.name || '未知商品',
        price: product.price || 0,
        platform: product.platform || 'unknown',
        url: product.url || null,
        image: product.image || null,
        inStock: product.inStock !== false,
        shipping: product.shipping || '依商家規定',
        currency: product.currency || 'TWD',
        crawledAt: product.crawledAt || new Date().toISOString()
      }))
    };
  }

  /**
   * 解析 LLM 分類結果 - 增強版
   */
  parseClassificationResult(llmResult, originalProducts) {
    logger.info('🔍 開始解析 LLM 分類結果');
    
    try {
      // 記錄原始回應長度，用於調試
      logger.debug(`📝 LLM 原始回應長度: ${llmResult.length} 字符`);
      
      // 提取 JSON 部分
      const jsonMatch = llmResult.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.error('❌ 未找到 JSON 格式回應，回應內容:', llmResult.substring(0, 200));
        return this.fallbackParseJSON(llmResult, originalProducts);
      }

      const jsonString = jsonMatch[0];
      logger.debug(`🔧 提取的 JSON 長度: ${jsonString.length} 字符`);
      
      // 智能 JSON 解析
      let parsedData;
      try {
        parsedData = this.repairJSON(jsonString);
        logger.info('✅ JSON 解析成功');
      } catch (jsonError) {
        logger.error('❌ JSON 解析和修復都失敗:', jsonError.message);
        logger.debug('🔍 JSON 片段:', jsonString.substring(0, 300));
        return this.fallbackParseJSON(llmResult, originalProducts);
      }

      // 驗證數據結構
      if (!parsedData.categories || !Array.isArray(parsedData.categories)) {
        logger.error('❌ 解析結果缺少 categories 陣列');
        return this.fallbackParseJSON(llmResult, originalProducts);
      }

      logger.info(`📊 發現 ${parsedData.categories.length} 個分類`);

      // 處理每個分類
      const validatedCategories = parsedData.categories.map((category, index) => {
        try {
          const categoryProducts = (category.productIndexes || [])
            .filter(index => {
              const valid = index >= 0 && index < originalProducts.length;
              if (!valid) {
                logger.warn(`⚠️  無效的商品索引: ${index} (總共 ${originalProducts.length} 個商品)`);
              }
              return valid;
            })
            .map(index => {
              const originalProduct = originalProducts[index];
              return {
                id: originalProduct.id || `product_${index}`,
                name: originalProduct.name || '未知商品',
                price: originalProduct.price || 0,
                platform: originalProduct.platform || 'unknown',
                url: originalProduct.url || null,
                image: originalProduct.image || null,
                inStock: originalProduct.inStock !== false,
                shipping: originalProduct.shipping || '依商家規定',
                currency: originalProduct.currency || 'TWD',
                crawledAt: originalProduct.crawledAt || new Date().toISOString()
              };
            });

          logger.debug(`📦 分類 "${category.name}" 包含 ${categoryProducts.length} 個商品`);

          // 計算統計數據
          const prices = categoryProducts.filter(p => p.price > 0).map(p => p.price);
          const platforms = [...new Set(categoryProducts.map(p => p.platform))];

          return {
            name: category.name || `${this.config.fallback.defaultCategory} ${index + 1}`,
            description: category.description || `${category.name || '商品'}分類`,
            totalProducts: categoryProducts.length,
            priceRange: {
              min: prices.length > 0 ? Math.min(...prices) : 0,
              max: prices.length > 0 ? Math.max(...prices) : 0,
              avg: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0
            },
            platforms: platforms,
            products: categoryProducts
          };
        } catch (categoryError) {
          logger.error(`❌ 處理分類 ${index} 時出錯:`, categoryError.message);
          return this.createCategoryFromProducts(
            category.name || `分類 ${index + 1}`, 
            originalProducts.slice(0, Math.ceil(originalProducts.length / parsedData.categories.length))
          );
        }
      });

      logger.info(`✅ 成功解析 ${validatedCategories.length} 個分類`);
      return { categories: validatedCategories };
      
    } catch (error) {
      logger.error('🛑 解析LLM分類結果完全失敗:', error.message);
      logger.debug('🔍 錯誤堆疊:', error.stack);
      
      // 最終降級策略
      return this.fallbackParseJSON(llmResult, originalProducts);
    }
  }

  /**
   * Ollama 健康檢查
   */
  async checkOllamaHealth() {
    const lastCheck = this.lastHealthCheck.get('ollama') || 0;
    const now = Date.now();
    
    // 如果最近檢查過且成功，跳過
    if (now - lastCheck < this.config.ollama.healthCheckInterval) {
      return;
    }
    
    try {
      const response = await axios.get(`${this.config.ollama.url}/api/tags`, {
        timeout: 5000
      });
      
      if (response.status === 200) {
        this.lastHealthCheck.set('ollama', now);
        logger.debug('🦙 Ollama 健康檢查通過');
      }
    } catch (error) {
      throw new Error(`Ollama 健康檢查失敗: ${error.message}`);
    }
  }

  /**
   * 記錄成功統計
   */
  recordSuccess(provider, responseTime) {
    if (!this.performanceStats.has(provider)) {
      this.performanceStats.set(provider, {
        successCount: 0,
        totalRequests: 0,
        totalResponseTime: 0,
        lastSuccess: Date.now()
      });
    }
    
    const stats = this.performanceStats.get(provider);
    stats.successCount++;
    stats.totalRequests++;
    stats.totalResponseTime += responseTime;
    stats.lastSuccess = Date.now();
    
    // 重置失敗計數
    this.failureCount.set(provider, 0);
  }

  /**
   * 記錄失敗統計
   */
  recordFailure(provider, error) {
    const currentFailures = this.failureCount.get(provider) || 0;
    this.failureCount.set(provider, currentFailures + 1);
    
    if (!this.performanceStats.has(provider)) {
      this.performanceStats.set(provider, {
        successCount: 0,
        totalRequests: 0,
        totalResponseTime: 0,
        lastFailure: Date.now()
      });
    }
    
    const stats = this.performanceStats.get(provider);
    stats.totalRequests++;
    stats.lastFailure = Date.now();
    stats.lastError = error.message;
  }

  /**
   * 初始化性能監控
   */
  initPerformanceMonitoring() {
    if (!this.config.performanceMonitoring) return;
    
    // 每5分鐘報告性能統計
    setInterval(() => {
      this.reportPerformanceStats();
    }, 300000);
  }

  /**
   * 報告性能統計
   */
  reportPerformanceStats() {
    logger.info('📊 LLM 性能統計報告:');
    
    for (const [provider, stats] of this.performanceStats.entries()) {
      const successRate = stats.totalRequests > 0 ? 
        (stats.successCount / stats.totalRequests * 100).toFixed(1) : 0;
      const avgResponseTime = stats.successCount > 0 ? 
        Math.round(stats.totalResponseTime / stats.successCount) : 0;
      
      logger.info(`   ${provider.toUpperCase()}: 成功率 ${successRate}%, 平均響應 ${avgResponseTime}ms, 總請求 ${stats.totalRequests}`);
    }
  }

  /**
   * 健康檢查
   */
  async healthCheck() {
    const results = {};
    
    // 檢查 Ollama
    if (this.config.ollama.enabled) {
      try {
        await this.checkOllamaHealth();
        results.ollama = { status: 'healthy', model: this.config.ollama.model };
      } catch (error) {
        results.ollama = { status: 'unhealthy', error: error.message };
      }
    }
    
    // 檢查 Gemini
    if (this.config.gemini.enabled) {
      try {
        results.gemini = { status: 'healthy', model: this.config.gemini.model };
      } catch (error) {
        results.gemini = { status: 'unhealthy', error: error.message };
      }
    }
    
    return {
      status: 'healthy',
      currentProvider: this.currentProvider,
      fallbackOrder: this.config.fallbackOrder,
      providers: results,
      performanceStats: Object.fromEntries(this.performanceStats),
      logSystem: logTest
    };
  }

  /**
   * 使用 Gemini 進行分類
   */
  async categorizeWithGemini(products, searchQuery) {
    const startTime = Date.now();
    
    try {
      if (!this.config.gemini.enabled || !this.config.gemini.apiKey) {
        throw new Error('Gemini 未啟用或缺少 API Key');
      }

      const result = await this.useGemini(products, searchQuery);
      
      // 記錄成功統計
      this.recordSuccess(LLM_PROVIDERS.GEMINI, Date.now() - startTime);
      
      logger.info(`✅ Gemini 分類成功: ${result.categories.length} 個分類`);
      
      return {
        success: true,
        mode: 'gemini_classification',
        provider: LLM_PROVIDERS.GEMINI,
        categories: result.categories,
        totalProducts: products.length,
        searchQuery: searchQuery,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('🛑 Gemini 分類失敗:', error);
      this.recordFailure(LLM_PROVIDERS.GEMINI, error);
      throw error;
    }
  }

  /**
   * 使用 Ollama 進行分類
   */
  async categorizeWithOllama(products, searchQuery) {
    const startTime = Date.now();
    
    try {
      if (!this.config.ollama.enabled) {
        throw new Error('Ollama 未啟用');
      }

      const result = await this.useOllama(products, searchQuery);
      
      // 記錄成功統計
      this.recordSuccess(LLM_PROVIDERS.OLLAMA, Date.now() - startTime);
      
      logger.info(`✅ Ollama 分類成功: ${result.categories.length} 個分類`);
      
      return {
        success: true,
        mode: 'ollama_classification',
        provider: LLM_PROVIDERS.OLLAMA,
        categories: result.categories,
        totalProducts: products.length,
        searchQuery: searchQuery,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('🛑 Ollama 分類失敗:', error);
      this.recordFailure(LLM_PROVIDERS.OLLAMA, error);
      throw error;
    }
  }
}

module.exports = SmartLLMService; 