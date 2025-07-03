const puppeteer = require('puppeteer');
const axios = require('axios');
const logger = require('../../utils/logger');
const path = require('path');
const os = require('os');

class BaseCrawler {
  constructor(platformName, config = {}) {
    this.platformName = platformName;
    this.config = {
      delay: config.delay || 2000,
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      userAgent: config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...config
    };
    this.browser = null;
    this.page = null;
  }

  /**
   * 取得 Chrome 執行檔路徑
   */
  getChromeExecutablePath() {
    // Windows 環境
    if (process.platform === 'win32') {
      const possiblePaths = [
        path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
      ];
      
      for (const path of possiblePaths) {
        if (require('fs').existsSync(path)) {
          return path;
        }
      }
    }
    
    // Linux 環境
    if (process.platform === 'linux') {
      return '/usr/bin/google-chrome-stable';
    }
    
    // macOS 環境
    if (process.platform === 'darwin') {
      return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    }
    
    return null;
  }

  /**
   * 初始化瀏覽器
   */
  async init() {
    try {
      if (!this.browser) {
        const chromePath = this.getChromeExecutablePath();
        const launchOptions = {
          headless: 'new',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--disable-gpu'
          ]
        };

        // 如果找到 Chrome 路徑，就使用它
        if (chromePath) {
          launchOptions.executablePath = chromePath;
        }

        this.browser = await puppeteer.launch(launchOptions);
      }

      if (!this.page) {
        this.page = await this.browser.newPage();
        await this.page.setUserAgent(this.config.userAgent);
        await this.page.setViewport({ width: 1366, height: 768 });
        
        // 設置請求攔截，減少不必要的資源載入
        await this.page.setRequestInterception(true);
        this.page.on('request', (req) => {
          const resourceType = req.resourceType();
          if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
            req.abort();
          } else {
            req.continue();
          }
        });
      }

      logger.info(`${this.platformName} 爬蟲初始化完成`);
    } catch (error) {
      logger.error(`${this.platformName} 爬蟲初始化失敗:`, error);
      throw error;
    }
  }

  /**
   * 清理資源
   */
  async cleanup() {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      logger.info(`${this.platformName} 爬蟲資源清理完成`);
    } catch (error) {
      logger.error(`${this.platformName} 爬蟲清理失敗:`, error);
    }
  }

  /**
   * 延遲函數
   */
  async delay(ms = null) {
    const delayTime = ms || this.config.delay;
    await new Promise(resolve => setTimeout(resolve, delayTime));
  }

  /**
   * 重試機制
   */
  async retry(operation, maxRetries = null) {
    const retries = maxRetries || this.config.maxRetries;
    let lastError;

    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        logger.warn(`${this.platformName} 操作失敗，重試 ${i + 1}/${retries}:`, error.message);
        
        if (i < retries - 1) {
          await this.delay(1000 * (i + 1)); // 遞增延遲
        }
      }
    }

    throw lastError;
  }

  /**
   * 安全的頁面導航
   */
  async navigateToPage(url) {
    try {
      await this.page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: this.config.timeout 
      });
      await this.delay();
    } catch (error) {
      logger.error(`${this.platformName} 頁面導航失敗 ${url}:`, error);
      throw error;
    }
  }

  /**
   * 規範化價格
   */
  normalizePrice(priceText) {
    if (!priceText) return 0;
    
    // 移除所有非數字字符，保留小數點
    const cleanedPrice = priceText.toString()
      .replace(/[^\d.]/g, '')
      .replace(/\.(?=.*\.)/g, ''); // 移除多餘的小數點
    
    const price = parseFloat(cleanedPrice) || 0;
    
    // 轉換為分（避免浮點數精度問題）
    return Math.round(price * 100);
  }

  /**
   * 清理商品名稱
   */
  cleanProductName(name) {
    if (!name) return '';
    
    return name
      .replace(/\s+/g, ' ')
      .replace(/【.*?】/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/（.*?）/g, '')
      .replace(/\(.*?\)/g, '')
      .trim();
  }

  /**
   * 提取商品圖片 URL
   */
  normalizeImageUrl(imageUrl, baseUrl) {
    if (!imageUrl) return '/placeholder.svg';
    
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    } else if (imageUrl.startsWith('//')) {
      return 'https:' + imageUrl;
    } else if (imageUrl.startsWith('/')) {
      return baseUrl + imageUrl;
    } else {
      return baseUrl + '/' + imageUrl;
    }
  }

  /**
   * 生成商品 ID
   */
  generateProductId(name, platform, url) {
    const crypto = require('crypto');
    const source = `${platform}-${name}-${url}`;
    return crypto.createHash('md5').update(source).digest('hex').substring(0, 16);
  }

  /**
   * 抽象方法：必須由子類實現
   */
  async searchProducts(keyword, options = {}) {
    throw new Error(`${this.platformName} 必須實現 searchProducts 方法`);
  }

  /**
   * 檢查平台是否可用
   */
  async checkHealth() {
    try {
      await this.init();
      // 子類可以覆蓋此方法進行特定檢查
      return { status: 'healthy', platform: this.platformName };
    } catch (error) {
      return { status: 'unhealthy', platform: this.platformName, error: error.message };
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 格式化搜尋結果
   */
  formatSearchResult(products, keyword, metadata = {}) {
    return {
      success: true,
      platform: this.platformName,
      keyword,
      timestamp: new Date().toISOString(),
      total: products.length,
      products: products.map(product => ({
        id: this.generateProductId(product.name, this.platformName, product.url),
        name: this.cleanProductName(product.name),
        price: this.normalizePrice(product.price),
        currency: 'TWD',
        url: product.url,
        image: this.normalizeImageUrl(product.image, metadata.baseUrl),
        platform: this.platformName,
        inStock: product.inStock !== false,
        shipping: product.shipping || '依商家規定',
        rating: product.rating || null,
        reviewCount: product.reviewCount || 0,
        seller: product.seller || null,
        description: product.description || '',
        crawledAt: new Date().toISOString()
      })),
      metadata: {
        searchUrl: metadata.searchUrl,
        totalPages: metadata.totalPages || 1,
        currentPage: metadata.currentPage || 1,
        ...metadata
      }
    };
  }

  /**
   * 處理錯誤結果
   */
  formatErrorResult(error, keyword) {
    return {
      success: false,
      platform: this.platformName,
      keyword,
      timestamp: new Date().toISOString(),
      error: error.message,
      products: [],
      metadata: {}
    };
  }

  formatProduct(product) {
    return {
      name: product.name,
      price: product.price,
      url: product.url,
      image: product.image,
      inStock: product.inStock !== false,
      seller: product.seller || this.platformName,
      description: product.description || '',
      shipping: product.shipping || '依商家規定'
    };
  }
}

module.exports = BaseCrawler; 