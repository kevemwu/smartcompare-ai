const crypto = require('crypto');
const logger = require('../../utils/logger');

/**
 * 商品分類結果暫存管理器
 * 提供快取、批量處理、去重等功能
 */
class ClassificationCache {
  constructor(options = {}) {
    this.cache = new Map(); // 記憶體快取
    this.config = {
      ttl: options.ttl || 24 * 60 * 60 * 1000, // 24小時過期
      maxSize: options.maxSize || 10000, // 最大快取項目數
      batchSize: options.batchSize || 20, // 批量處理大小
      ...options
    };
    
    // 統計追蹤
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
    
    // 定期清理過期快取
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000); // 每小時清理一次
    
    logger.info(`分類快取初始化完成，TTL: ${this.config.ttl}ms, 最大大小: ${this.config.maxSize}`);
  }

  /**
   * 生成商品快取鍵
   */
  generateCacheKey(productName, queryContext = null) {
    // 使用商品名稱和查詢上下文生成唯一鍵
    const contextStr = queryContext ? 
      `${queryContext.originalQuery}_${queryContext.mainCategory}` : 'default';
    const rawKey = `${productName}_${contextStr}`;
    return crypto.createHash('md5').update(rawKey).digest('hex');
  }

  /**
   * 獲取快取的分類結果
   */
  get(productName, queryContext = null) {
    const key = this.generateCacheKey(productName, queryContext);
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    // 檢查是否過期
    if (Date.now() > item.expireAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    logger.debug(`快取命中: ${productName} → ${item.category}`);
    return item.category;
  }

  /**
   * 設置快取分類結果
   */
  set(productName, category, queryContext = null) {
    const key = this.generateCacheKey(productName, queryContext);
    const expireAt = Date.now() + this.config.ttl;
    
    this.cache.set(key, {
      productName,
      category,
      queryContext: queryContext ? queryContext.originalQuery : null,
      createdAt: Date.now(),
      expireAt
    });
    
    this.stats.sets++;
    
    // 檢查快取大小限制
    if (this.cache.size > this.config.maxSize) {
      this.evictOldest();
    }
    
    logger.debug(`快取設置: ${productName} → ${category}`);
  }

  /**
   * 批量獲取分類結果
   */
  batchGet(products, queryContext = null) {
    const results = [];
    const uncachedProducts = [];
    
    for (const product of products) {
      const productName = typeof product === 'string' ? product : product.name;
      const cached = this.get(productName, queryContext);
      
      if (cached) {
        results.push({
          product: product,
          category: cached,
          fromCache: true
        });
      } else {
        uncachedProducts.push(product);
      }
    }
    
    logger.info(`批量快取查詢: ${results.length}/${products.length} 命中快取`);
    
    return {
      cached: results,
      uncached: uncachedProducts
    };
  }

  /**
   * 批量設置分類結果
   */
  batchSet(classifications, queryContext = null) {
    let setCount = 0;
    
    for (const item of classifications) {
      if (item.productName && item.category) {
        this.set(item.productName, item.category, queryContext);
        setCount++;
      }
    }
    
    logger.info(`批量快取設置: ${setCount} 個分類結果`);
  }

  /**
   * 淘汰最舊的快取項目
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, item] of this.cache) {
      if (item.createdAt < oldestTime) {
        oldestTime = item.createdAt;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug('淘汰最舊快取項目');
    }
  }

  /**
   * 清理過期快取
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, item] of this.cache) {
      if (now > item.expireAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info(`清理過期快取: ${cleanedCount} 個項目`);
    }
  }

  /**
   * 獲取快取統計信息
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, item] of this.cache) {
      if (now > item.expireAt) {
        expiredCount++;
      }
    }
    
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    
    return {
      totalItems: this.cache.size,
      expiredItems: expiredCount,
      validItems: this.cache.size - expiredCount,
      maxSize: this.config.maxSize,
      ttlMs: this.config.ttl,
      batchSize: this.config.batchSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      hitRate: hitRate
    };
  }

  /**
   * 清除統計信息
   */
  clearStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
    logger.debug('清除快取統計信息');
  }

  /**
   * 獲取快取大小
   */
  getSize() {
    return this.cache.size;
  }

  /**
   * 清空所有快取
   */
  clear() {
    const oldSize = this.cache.size;
    this.cache.clear();
    logger.info(`清空快取: ${oldSize} 個項目`);
  }

  /**
   * 預熱快取 - 為常見商品預先分類
   */
  async warmup(commonProducts, classifier, queryContext = null) {
    logger.info(`開始快取預熱: ${commonProducts.length} 個商品`);
    
    const uncached = commonProducts.filter(product => {
      const productName = typeof product === 'string' ? product : product.name;
      return !this.get(productName, queryContext);
    });
    
    if (uncached.length === 0) {
      logger.info('所有商品已有快取，跳過預熱');
      return;
    }
    
    try {
      const classifications = await classifier.batchClassifyProducts(uncached, queryContext);
      this.batchSet(classifications, queryContext);
      logger.info(`快取預熱完成: ${classifications.length} 個新分類`);
    } catch (error) {
      logger.error('快取預熱失敗:', error);
    }
  }

  /**
   * 銷毀快取管理器
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
    logger.info('分類快取管理器已銷毀');
  }
}

module.exports = ClassificationCache; 