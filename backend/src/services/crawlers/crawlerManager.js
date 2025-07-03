const PChomeCrawler = require('./pchomeCrawler');
const MomoCrawler = require('./momoCrawler');
const SmartLLMService = require('../smartLLMService');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

class CrawlerManager {
  constructor() {
    this.crawlers = new Map();
    this.smartLLMService = new SmartLLMService();
    this.initializeCrawlers();
  }

  /**
   * 初始化所有爬蟲
   */
  initializeCrawlers() {
    this.crawlers.set('pchome', new PChomeCrawler());
    this.crawlers.set('momo', new MomoCrawler());
    
    logger.info(`爬蟲管理器初始化完成，共 ${this.crawlers.size} 個平台`);
  }

  /**
   * 嘗試使用不同的 LLM 服務進行分類
   */
  async tryLLMCategorization(products, keyword) {
    try {
      // 首先嘗試使用 Gemini
      try {
        logger.info('嘗試使用 Gemini 進行分類...');
        const geminiResult = await this.smartLLMService.categorizeWithGemini(products, keyword);
        if (geminiResult && geminiResult.categories) {
          logger.info('成功使用 Gemini 完成分類');
          return geminiResult;
        }
      } catch (geminiError) {
        logger.warn('Gemini 分類失敗，將嘗試使用 Ollama', {
          error: geminiError.message
        });
      }

      // 如果 Gemini 失敗，嘗試使用 Ollama
      try {
        logger.info('嘗試使用 Ollama 進行分類...');
        const ollamaResult = await this.smartLLMService.categorizeWithOllama(products, keyword);
        if (ollamaResult && ollamaResult.categories) {
          logger.info('成功使用 Ollama 完成分類');
          return ollamaResult;
        }
      } catch (ollamaError) {
        logger.error('Ollama 分類失敗', {
          error: ollamaError.message
        });
        throw ollamaError;
      }

      throw new Error('所有 LLM 服務都失敗了');
    } catch (error) {
      logger.error('LLM 分類過程發生錯誤', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 多平台搜尋商品
   */
  async searchProducts(keyword, options = {}) {
    try {
      logger.info(`開始多平台搜尋: ${keyword}`);
      
      const {
        platforms = ['pchome', 'momo'],
        maxResults = 20,
        enableCategorySummary = true,  // 預設啟用分類摘要
        sortBy = 'price'
      } = options;

      // 1. 並行執行所有平台搜尋
      const searchPromises = platforms.map(platform => 
        this.searchSinglePlatform(platform, keyword, { maxResults })
      );
      
      const results = await Promise.allSettled(searchPromises);
      
      // 2. 收集成功的結果
      const successfulResults = [];
      const failedPlatforms = [];
      
      results.forEach((result, index) => {
        const platformName = platforms[index];
        
        if (result.status === 'fulfilled' && result.value.success) {
          successfulResults.push({
            platform: platformName,
            ...result.value
          });
        } else {
          failedPlatforms.push({
            platform: platformName,
            error: result.reason?.message || result.value?.error || '未知錯誤'
          });
        }
      });

      // 3. 合併所有商品（保持完整資料）
      let allProducts = [];
      successfulResults.forEach(result => {
        const platformProducts = result.products.map(product => ({
          ...product,
          platform: product.platform || result.platform  // 避免覆蓋已有的 platform
        }));
        allProducts = allProducts.concat(platformProducts);
        logger.debug(`平台 ${result.platform} 提供 ${platformProducts.length} 個商品`);
      });
      
      logger.info(`合併後總計 ${allProducts.length} 個商品`);

      // 4. 如果沒有商品，返回空結果
      if (allProducts.length === 0) {
        return {
          success: true,
          query: keyword,
          mode: 'category_summary',
          categories: [],
          totalProducts: 0,
          platformResults: [],
          failedPlatforms,
          summary: {
            originalQuery: keyword,
            totalProducts: 0,
            successfulPlatforms: 0,
            failedPlatforms: failedPlatforms.length,
            platforms: platforms,
            categories: 0,
            mode: 'category_summary'
          },
          timestamp: new Date().toISOString()
        };
      }

      // 5. 使用智能LLM進行分類
      if (enableCategorySummary) {
        const categoryResult = await this.tryLLMCategorization(allProducts, keyword);
        
        // 在返回結果之前保存到檔案
        const searchResults = {
          success: true,
          query: keyword,
          mode: 'category_summary',
          categories: categoryResult.categories,
          totalProducts: allProducts.length,
          platformResults: successfulResults,
          failedPlatforms,
          summary: {
            originalQuery: keyword,
            totalProducts: allProducts.length,
            successfulPlatforms: successfulResults.length,
            failedPlatforms: failedPlatforms.length,
            platforms: platforms,
            categories: categoryResult.categories.length,
            mode: 'category_summary'
          },
          timestamp: new Date().toISOString()
        };

        return searchResults;
      } else {
        // 6. 如果不啟用分類摘要，返回簡單的商品列表
        allProducts.sort(this.getSortFunction(sortBy));
        
        // 在返回結果之前保存到檔案
        const searchResults = {
          success: true,
          query: keyword,
          mode: 'product_list',
          products: allProducts,
          platformResults: successfulResults,
          failedPlatforms,
          summary: {
            originalQuery: keyword,
            totalProducts: allProducts.length,
            successfulPlatforms: successfulResults.length,
            failedPlatforms: failedPlatforms.length,
            platforms: platforms,
            mode: 'product_list'
          },
          timestamp: new Date().toISOString()
        };

        return searchResults;
      }

    } catch (error) {
      // 安全地記錄錯誤，避免循環引用
      logger.error(`多平台搜尋失敗: ${keyword}`, {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return {
        success: false,
        query: keyword,
        error: error.message,
        products: [],
        categories: [],
        platformResults: [],
        failedPlatforms: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 搜尋單一平台
   */
  async searchSinglePlatform(platformName, keyword, options = {}) {
    const crawler = this.crawlers.get(platformName);
    
    if (!crawler) {
      throw new Error(`未找到平台爬蟲: ${platformName}`);
    }

    try {
      logger.info(`開始搜尋平台: ${platformName} - ${keyword}`);
      const result = await crawler.searchProducts(keyword, options);
      
      if (result.success) {
        logger.info(`平台搜尋完成: ${platformName}, 找到 ${result.products.length} 個商品`);
      }
      
      return result;
    } catch (error) {
      // 安全地記錄錯誤，避免循環引用
      logger.error(`平台搜尋失敗: ${platformName} - ${keyword}`, {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw error;
    }
  }

  /**
   * 獲取排序函數
   */
  getSortFunction(sortBy) {
    switch (sortBy) {
      case 'price_asc':
        return (a, b) => a.price - b.price;
      case 'price_desc':
        return (a, b) => b.price - a.price;
      default:
        return (a, b) => a.price - b.price;
    }
  }

  /**
   * 獲取平台健康狀態
   */
  async checkPlatformsHealth() {
    const healthPromises = Array.from(this.crawlers.entries()).map(
      async ([name, crawler]) => {
        try {
          const health = await crawler.checkHealth();
          return { platform: name, ...health };
        } catch (error) {
          return {
            platform: name,
            status: 'unhealthy',
            error: error.message
          };
        }
      }
    );

    const healthResults = await Promise.allSettled(healthPromises);
    
    return healthResults.map((result, index) => {
      const platformName = Array.from(this.crawlers.keys())[index];
      
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          platform: platformName,
          status: 'unhealthy',
          error: result.reason?.message || '未知錯誤'
        };
      }
    });
  }

  /**
   * 獲取支援的平台列表
   */
  getSupportedPlatforms() {
    return Array.from(this.crawlers.keys());
  }

  /**
   * 清理資源
   */
  async cleanup() {
    const cleanupPromises = Array.from(this.crawlers.values()).map(
      crawler => crawler.cleanup ? crawler.cleanup() : Promise.resolve()
    );
    
    await Promise.allSettled(cleanupPromises);
    logger.info('爬蟲管理器清理完成');
  }
}

module.exports = CrawlerManager; 