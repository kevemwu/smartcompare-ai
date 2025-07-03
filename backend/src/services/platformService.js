const mockDataService = require('./mockDataService');
const logger = require('../utils/logger');

class PlatformService {
  constructor() {
    this.platforms = [
      {
        id: 1,
        name: 'PChome 24h',
        domain: 'pchome.com.tw',
        logo_url: '/images/pchome-logo.png',
        reliability_score: 95,
        is_active: true
      },
      {
        id: 2,
        name: 'momo購物網',
        domain: 'momoshop.com.tw',
        logo_url: '/images/momo-logo.png',
        reliability_score: 92,
        is_active: true
      },
      {
        id: 3,
        name: 'Yahoo購物中心',
        domain: 'tw.buy.yahoo.com',
        logo_url: '/images/yahoo-logo.png',
        reliability_score: 88,
        is_active: true
      }
    ];
  }

  /**
   * 獲取所有啟用的平台列表
   */
  async getAllPlatforms() {
    try {
      return mockDataService.getAllPlatforms();
    } catch (error) {
      logger.error('Error getting all platforms:', error);
      throw error;
    }
  }

  /**
   * 獲取啟用的平台列表
   */
  async getActivePlatforms() {
    try {
      return this.platforms.filter(platform => platform.is_active);
    } catch (error) {
      logger.error('Error getting active platforms:', error);
      throw error;
    }
  }

  /**
   * 獲取平台詳細資訊
   */
  async getPlatformById(platformId) {
    try {
      const platform = this.platforms.find(p => p.id === parseInt(platformId));
      
      if (!platform) {
        throw new Error('平台不存在');
      }
      
      // 模擬統計資料
      return {
        ...platform,
        total_products: Math.floor(Math.random() * 10000) + 1000,
        recent_updates: Math.floor(Math.random() * 100) + 10,
        avg_price_7d: Math.floor(Math.random() * 5000) + 1000
      };
      
    } catch (error) {
      logger.error('Error getting platform by id:', error);
      throw error;
    }
  }

  /**
   * 獲取平台統計資訊
   */
  async getPlatformStats() {
    try {
      return this.platforms.map(platform => ({
        ...platform,
        total_products: Math.floor(Math.random() * 10000) + 1000,
        daily_updates: Math.floor(Math.random() * 100) + 10,
        weekly_updates: Math.floor(Math.random() * 500) + 50,
        avg_price: Math.floor(Math.random() * 5000) + 1000,
        min_price: Math.floor(Math.random() * 1000) + 100,
        max_price: Math.floor(Math.random() * 10000) + 5000,
        last_update: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
      }));
      
    } catch (error) {
      logger.error('Error getting platform stats:', error);
      throw error;
    }
  }

  /**
   * 獲取平台健康狀態
   */
  async getPlatformHealth() {
    try {
      return this.platforms.map(platform => {
        const successful = Math.floor(Math.random() * 50) + 10;
        const failed = Math.floor(Math.random() * 10) + 1;
        const successRate = (successful / (successful + failed)) * 100;
        const recentUpdates = Math.floor(Math.random() * 20) + 5;
        
        return {
          ...platform,
          successful_crawls_24h: successful,
          failed_crawls_24h: failed,
          success_rate_24h: successRate,
          recent_updates: recentUpdates,
          last_successful_crawl: new Date(Date.now() - Math.random() * 60 * 60 * 1000).toISOString(),
          health_status: this._calculateHealthStatus(successRate, recentUpdates, platform.is_active)
        };
      });
      
    } catch (error) {
      logger.error('Error getting platform health:', error);
      throw error;
    }
  }

  /**
   * 更新平台可靠性評分
   */
  async updatePlatformReliability(platformId, score) {
    try {
      const platform = this.platforms.find(p => p.id === parseInt(platformId));
      
      if (!platform) {
        throw new Error('平台不存在');
      }
      
      if (score < 0 || score > 100) {
        throw new Error('可靠性評分必須在 0-100 之間');
      }
      
      platform.reliability_score = score;
      
      logger.info(`Updated platform ${platform.name} reliability score to ${score}`);
      
      return {
        id: platform.id,
        name: platform.name,
        reliability_score: score,
        updated_at: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('Error updating platform reliability:', error);
      throw error;
    }
  }

  /**
   * 切換平台狀態
   */
  async togglePlatformStatus(platformId, isActive) {
    try {
      const platform = this.platforms.find(p => p.id === parseInt(platformId));
      
      if (!platform) {
        throw new Error('平台不存在');
      }
      
      platform.is_active = isActive;
      
      logger.info(`Updated platform ${platform.name} status to ${isActive ? 'active' : 'inactive'}`);
      
      return {
        id: platform.id,
        name: platform.name,
        is_active: isActive,
        updated_at: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('Error toggling platform status:', error);
      throw error;
    }
  }

  /**
   * 計算健康狀態
   */
  _calculateHealthStatus(successRate, recentUpdates, isActive) {
    if (!isActive) return 'inactive';
    if (successRate >= 90 && recentUpdates >= 10) return 'excellent';
    if (successRate >= 80 && recentUpdates >= 5) return 'good';
    if (successRate >= 70 && recentUpdates >= 3) return 'fair';
    return 'poor';
  }

  /**
   * 獲取平台分類統計
   */
  async getPlatformCategoryStats(platformId) {
    try {
      const platform = this.platforms.find(p => p.id === parseInt(platformId));
      
      if (!platform) {
        throw new Error('平台不存在');
      }
      
      // 模擬分類統計資料
      const categories = [
        { name: '3C產品', count: Math.floor(Math.random() * 1000) + 100, avg_price: Math.floor(Math.random() * 5000) + 1000 },
        { name: '家電', count: Math.floor(Math.random() * 800) + 80, avg_price: Math.floor(Math.random() * 3000) + 500 },
        { name: '服飾', count: Math.floor(Math.random() * 1200) + 150, avg_price: Math.floor(Math.random() * 1000) + 200 },
        { name: '食品', count: Math.floor(Math.random() * 600) + 50, avg_price: Math.floor(Math.random() * 500) + 100 }
      ];
      
      return {
        platform: platform.name,
        total_categories: categories.length,
        categories: categories
      };
      
    } catch (error) {
      logger.error('Error getting platform category stats:', error);
      throw error;
    }
  }

  /**
   * 獲取平台搜尋建議
   */
  async getPlatformSearchSuggestions(platformId, keyword) {
    try {
      const platform = this.platforms.find(p => p.id === parseInt(platformId));
      
      if (!platform) {
        throw new Error('平台不存在');
      }
      
      // 模擬搜尋建議
      const suggestions = [
        `${keyword} 推薦`,
        `${keyword} 評價`,
        `${keyword} 比較`,
        `${keyword} 價格`,
        `${keyword} 優惠`
      ];
      
      return {
        platform: platform.name,
        keyword: keyword,
        suggestions: suggestions
      };
      
    } catch (error) {
      logger.error('Error getting platform search suggestions:', error);
      throw error;
    }
  }
}

module.exports = new PlatformService(); 