const logger = require('../utils/logger');

class ProductService {
  constructor() {
    this.productCache = new Map();
  }

  /**
   * 根據產品ID獲取產品詳情
   */
  async getProduct(productId, useCrawler = true) {
    try {
      // 先嘗試從快取獲取
      if (this.productCache.has(productId)) {
        return this.productCache.get(productId);
      }
      
      // 如果快取中沒有，且允許使用爬蟲
      if (useCrawler) {
        const product = await this.getProductFromCrawler(productId);
        if (product) {
          this.productCache.set(productId, product);
        }
        return product;
      }
      
      return null;
      
    } catch (error) {
      logger.error('Error getting product:', error);
      throw error;
    }
  }

  /**
   * 從爬蟲服務獲取產品資訊
   */
  async getProductFromCrawler(productId) {
    try {
      // 這裡應該調用爬蟲服務
      // const crawlerService = require('./crawlerService');
      // const crawlerData = await crawlerService.getProduct(productId);
      
      // 暫時返回模擬資料
      const mockData = {
        id: productId,
        name: '商品名稱',
        price: 1000,
        platform: 'pchome',
        url: '#',
        image: '/placeholder.svg'
      };
      
      return this.formatCrawlerProduct(mockData, mockData.platform, productId);
    } catch (error) {
      logger.error('Error getting product from crawler:', error);
      return null;
    }
  }

  /**
   * 格式化爬蟲資料
   */
  async formatCrawlerProduct(crawlerData, platform, productId) {
    return {
      id: productId,
      name: crawlerData.name,
      brand: 'Unknown',
      description: `來自 ${platform} 的商品`,
      category: 'Unknown',
      images: [crawlerData.image || '/placeholder.svg'],
      platforms: [{
        name: platform === 'pchome' ? 'PChome 24h' : 'momo購物網',
        price: crawlerData.price,
        url: crawlerData.url,
        availability: 'in_stock',
        lastUpdated: new Date().toISOString()
      }],
      specifications: null,
      priceHistory: null,
      relatedProducts: null
    };
  }

  /**
   * 格式化產品資料
   */
  formatProduct(product) {
    return {
      id: product.id,
      name: product.name,
      brand: product.brand_name || 'Unknown',
      description: product.description,
      category: product.category_name || 'Unknown',
      images: product.images ? [product.images] : ['/placeholder.svg'],
      platforms: this.generatePlatformData(product),
      specifications: product.specifications
    };
  }

  generatePlatformData(product) {
    return [{
      name: product.platform_name,
      price: product.current_price / 100, // 轉換為元
      url: product.product_url,
      availability: product.in_stock ? 'in_stock' : 'out_of_stock',
      lastUpdated: product.last_scraped_at
    }];
  }

  /**
   * 獲取商品組詳情
   */
  async getProductGroupDetail(groupId) {
    try {
      // 模擬商品組資料
      const mockProductGroup = {
        id: groupId,
        name: '商品組名稱',
        brand: '品牌名稱',
        category: '分類名稱',
        description: '商品描述',
        images: ['/placeholder.svg'],
        platforms: [
          {
            platform_name: 'PChome 24h',
            price: 1000,
            url: 'https://pchome.com/product',
            in_stock: true,
            rating: 4.5,
            review_count: 100,
            last_scraped_at: new Date().toISOString()
          },
          {
            platform_name: 'momo購物網',
            price: 950,
            url: 'https://momo.com/product',
            in_stock: true,
            rating: 4.3,
            review_count: 80,
            last_scraped_at: new Date().toISOString()
          }
        ],
        price_stats: {
          min: 950,
          max: 1000,
          avg: 975,
          count: 2
        }
      };
      
      return mockProductGroup;
      
    } catch (error) {
      logger.error('Error getting product group detail:', error);
      throw error;
    }
  }

  /**
   * 獲取商品價格歷史
   */
  async getProductPriceHistory(groupId, days = 30) {
    try {
      // 模擬價格歷史資料
      const historyByPlatform = {
        'PChome 24h': [
          { price: 1000, date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          { price: 980, date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          { price: 1050, date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000) }
        ],
        'momo購物網': [
          { price: 950, date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          { price: 970, date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          { price: 1000, date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000) }
        ]
      };
      
      return {
        history: historyByPlatform,
        period_days: days,
        total_records: 6
      };
      
    } catch (error) {
      logger.error('Error getting price history:', error);
      throw error;
    }
  }

  /**
   * 獲取相似商品推薦
   */
  async getSimilarProducts(groupId, limit = 10) {
    try {
      // 模擬相似商品資料
      const similarProducts = [
        {
          id: 'similar_1',
          name: '相似商品 1',
          brand: '品牌A',
          images: ['/placeholder.svg'],
          category_name: '分類A',
          min_price: 800,
          platform_count: 2
        },
        {
          id: 'similar_2',
          name: '相似商品 2',
          brand: '品牌B',
          images: ['/placeholder.svg'],
          category_name: '分類B',
          min_price: 1200,
          platform_count: 3
        }
      ];
      
      return similarProducts.slice(0, limit);
      
    } catch (error) {
      logger.error('Error getting similar products:', error);
      throw error;
    }
  }

  /**
   * 獲取商品規格分析
   */
  async getProductSpecs(groupId) {
    try {
      // 模擬規格資料
      const specsByPlatform = {
        'PChome 24h': {
          '尺寸': '10cm x 5cm x 2cm',
          '重量': '100g',
          '材質': '塑膠',
          '顏色': '黑色'
        },
        'momo購物網': {
          '尺寸': '10cm x 5cm x 2cm',
          '重量': '100g',
          '材質': '塑膠',
          '顏色': '黑色 / 白色'
        }
      };
      
      const mergedSpecs = {
        '尺寸': '10cm x 5cm x 2cm',
        '重量': '100g',
        '材質': '塑膠',
        '顏色': '黑色 / 白色'
      };
      
      return {
        merged: mergedSpecs,
        by_platform: specsByPlatform
      };
      
    } catch (error) {
      logger.error('Error getting product specs:', error);
      throw error;
    }
  }

  /**
   * 檢查商品組是否存在
   */
  async checkProductGroupExists(groupId) {
    try {
      // 模擬檢查結果
      return groupId && groupId.length > 0;
      
    } catch (error) {
      logger.error('Error checking product group existence:', error);
      throw error;
    }
  }

  /**
   * 清理快取
   */
  clearCache() {
    this.productCache.clear();
    logger.info('Product cache cleared');
  }

  /**
   * 獲取快取統計
   */
  getCacheStats() {
    return {
      size: this.productCache.size,
      keys: Array.from(this.productCache.keys())
    };
  }
}

module.exports = new ProductService(); 