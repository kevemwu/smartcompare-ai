const logger = require('../utils/logger');

class CrawlerService {
  constructor() {
    this.activeCrawlers = new Map();
    this.crawlerHistory = [];
  }

  /**
   * 觸發爬蟲任務
   */
  async triggerCrawler(platform = null) {
    try {
      const crawlerId = this.generateCrawlerId();
      const logMessage = platform 
        ? `手動觸發 ${platform} 平台爬蟲` 
        : '手動觸發所有平台爬蟲';
      
      // 記錄爬蟲任務
      const crawlerTask = {
        id: crawlerId,
        platform: platform || 'all',
        status: 'triggered',
        message: logMessage,
        createdAt: new Date(),
        estimatedDuration: platform ? '2-5分鐘' : '10-15分鐘'
      };
      
      this.crawlerHistory.unshift(crawlerTask);
      
      // 模擬爬蟲執行
      setTimeout(async () => {
        await this._simulateCrawlerExecution(crawlerId, platform);
      }, 1000);
      
      return {
        crawler_id: crawlerId,
        status: 'triggered',
        platform: platform || 'all',
        message: logMessage,
        estimated_duration: platform ? '2-5分鐘' : '10-15分鐘'
      };
      
    } catch (error) {
      logger.error('Error triggering crawler:', error);
      throw error;
    }
  }

  /**
   * 獲取爬蟲狀態
   */
  async getCrawlerStatus() {
    try {
      const recentLogs = this.crawlerHistory
        .filter(log => {
          const hoursDiff = (new Date() - log.createdAt) / (1000 * 60 * 60);
          return hoursDiff <= 24;
        })
        .slice(0, 50);
      
      // 計算摘要統計
      const summary = this.calculateSummary(recentLogs);
      
      return {
        recent_logs: recentLogs,
        summary: summary
      };
      
    } catch (error) {
      logger.error('Error getting crawler status:', error);
      throw error;
    }
  }

  /**
   * 獲取爬蟲歷史記錄
   */
  async getCrawlerHistory(platform = null, limit = 100) {
    try {
      let filteredHistory = this.crawlerHistory;
      
      if (platform) {
        filteredHistory = this.crawlerHistory.filter(log => log.platform === platform);
      }
      
      return filteredHistory.slice(0, limit);
      
    } catch (error) {
      logger.error('Error getting crawler history:', error);
      throw error;
    }
  }

  /**
   * 獲取爬蟲統計資訊
   */
  async getCrawlerStats(days = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const filteredHistory = this.crawlerHistory.filter(log => 
        log.createdAt >= cutoffDate
      );
      
      const stats = this.calculateStats(filteredHistory, days);
      
      return {
        period_days: days,
        platforms: stats.platforms,
        overall: stats.overall
      };
      
    } catch (error) {
      logger.error('Error getting crawler stats:', error);
      throw error;
    }
  }

  /**
   * 停止正在運行的爬蟲
   */
  async stopCrawler(crawlerId) {
    try {
      const crawler = this.crawlerHistory.find(log => log.id === crawlerId);
      
      if (!crawler) {
        throw new Error('爬蟲任務不存在');
      }
      
      if (['running', 'triggered'].includes(crawler.status)) {
        crawler.status = 'stopped';
        crawler.message = '用戶手動停止';
        crawler.updatedAt = new Date();
        
        return {
          id: crawlerId,
          platform: crawler.platform,
          status: 'stopped'
        };
      } else {
        throw new Error('爬蟲任務無法停止');
      }
      
    } catch (error) {
      logger.error('Error stopping crawler:', error);
      throw error;
    }
  }

  /**
   * 清理舊的爬蟲記錄
   */
  async cleanupOldLogs(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const originalCount = this.crawlerHistory.length;
      this.crawlerHistory = this.crawlerHistory.filter(log => 
        log.createdAt >= cutoffDate
      );
      
      const deletedCount = originalCount - this.crawlerHistory.length;
      
      logger.info(`Cleaned up ${deletedCount} old crawler logs`);
      
      return {
        deleted_count: deletedCount,
        days_kept: daysToKeep
      };
      
    } catch (error) {
      logger.error('Error cleaning up old logs:', error);
      throw error;
    }
  }

  /**
   * 生成爬蟲ID
   */
  generateCrawlerId() {
    return `crawler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 計算摘要統計
   */
  calculateSummary(logs) {
    const summary = {};
    
    logs.forEach(log => {
      if (!summary[log.platform]) {
        summary[log.platform] = {};
      }
      if (!summary[log.platform][log.status]) {
        summary[log.platform][log.status] = {
          count: 0,
          last_run: null,
          total_products_found: 0,
          total_products_updated: 0
        };
      }
      
      summary[log.platform][log.status].count++;
      if (!summary[log.platform][log.status].last_run || 
          log.createdAt > summary[log.platform][log.status].last_run) {
        summary[log.platform][log.status].last_run = log.createdAt;
      }
      
      if (log.productsFound) {
        summary[log.platform][log.status].total_products_found += log.productsFound;
      }
      if (log.productsUpdated) {
        summary[log.platform][log.status].total_products_updated += log.productsUpdated;
      }
    });
    
    return Object.entries(summary).map(([platform, statuses]) => 
      Object.entries(statuses).map(([status, data]) => ({
        platform,
        status,
        count: data.count,
        last_run: data.last_run,
        total_products_found: data.total_products_found,
        total_products_updated: data.total_products_updated
      }))
    ).flat();
  }

  /**
   * 計算統計資訊
   */
  calculateStats(logs, days) {
    const platformStats = {};
    
    logs.forEach(log => {
      if (!platformStats[log.platform]) {
        platformStats[log.platform] = {
          total_runs: 0,
          successful_runs: 0,
          failed_runs: 0,
          total_products_found: 0,
          total_products_updated: 0,
          execution_times: []
        };
      }
      
      platformStats[log.platform].total_runs++;
      
      if (log.status === 'success') {
        platformStats[log.platform].successful_runs++;
      } else if (log.status === 'error') {
        platformStats[log.platform].failed_runs++;
      }
      
      if (log.productsFound) {
        platformStats[log.platform].total_products_found += log.productsFound;
      }
      if (log.productsUpdated) {
        platformStats[log.platform].total_products_updated += log.productsUpdated;
      }
      if (log.executionTime) {
        platformStats[log.platform].execution_times.push(log.executionTime);
      }
    });
    
    const platforms = Object.entries(platformStats).map(([platform, stats]) => {
      const successRate = stats.total_runs > 0 
        ? (stats.successful_runs / stats.total_runs) * 100 
        : 0;
      
      const avgExecutionTime = stats.execution_times.length > 0
        ? stats.execution_times.reduce((sum, time) => sum + time, 0) / stats.execution_times.length
        : null;
      
      return {
        platform,
        total_runs: stats.total_runs,
        successful_runs: stats.successful_runs,
        failed_runs: stats.failed_runs,
        success_rate: successRate,
        avg_execution_time: avgExecutionTime,
        total_products_found: stats.total_products_found,
        total_products_updated: stats.total_products_updated,
        last_run: logs.find(log => log.platform === platform)?.createdAt || null
      };
    });
    
    const overall = {
      total_runs: platforms.reduce((sum, p) => sum + p.total_runs, 0),
      successful_runs: platforms.reduce((sum, p) => sum + p.successful_runs, 0),
      failed_runs: platforms.reduce((sum, p) => sum + p.failed_runs, 0),
      total_products_found: platforms.reduce((sum, p) => sum + p.total_products_found, 0),
      total_products_updated: platforms.reduce((sum, p) => sum + p.total_products_updated, 0)
    };
    
    overall.success_rate = overall.total_runs > 0 
      ? (overall.successful_runs / overall.total_runs) * 100 
      : 0;
    
    return { platforms, overall };
  }

  /**
   * 模擬爬蟲執行
   */
  async _simulateCrawlerExecution(crawlerId, platform) {
    try {
      const crawler = this.crawlerHistory.find(log => log.id === crawlerId);
      if (!crawler) return;
      
      // 更新狀態為運行中
      crawler.status = 'running';
      crawler.message = '爬蟲執行中...';
      crawler.updatedAt = new Date();
      
      // 模擬執行時間
      const executionTime = Math.random() * 30000 + 10000; // 10-40秒
      await new Promise(resolve => setTimeout(resolve, executionTime));
      
      // 模擬結果
      const isSuccess = Math.random() > 0.1; // 90% 成功率
      const productsFound = isSuccess ? Math.floor(Math.random() * 50) + 10 : 0;
      const productsUpdated = isSuccess ? Math.floor(productsFound * 0.7) : 0;
      
      if (isSuccess) {
        crawler.status = 'success';
        crawler.message = '爬蟲執行完成';
        crawler.productsFound = productsFound;
        crawler.productsUpdated = productsUpdated;
        crawler.executionTime = Math.floor(executionTime);
      } else {
        crawler.status = 'error';
        crawler.message = '爬蟲執行失敗';
        crawler.errorDetails = '模擬錯誤：目標網站暫時無法訪問';
        crawler.executionTime = Math.floor(executionTime);
      }
      
      crawler.updatedAt = new Date();
      
    } catch (error) {
      logger.error('Error in crawler simulation:', error);
    }
  }
}

module.exports = new CrawlerService(); 