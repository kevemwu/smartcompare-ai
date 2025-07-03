const BaseCrawler = require('./baseCrawler');
const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../../utils/logger');

class PChomeCrawler extends BaseCrawler {
  constructor() {
    super('pchome', {
      delay: 2000,
      timeout: 30000,
      maxRetries: 3
    });
    
    this.baseUrl = 'https://ecshweb.pchome.com.tw';
    this.searchApiUrl = 'https://ecshweb.pchome.com.tw/search/v3.3/all/results';
    this.productBaseUrl = 'https://24h.pchome.com.tw/prod/';
  }

  /**
   * 搜尋商品
   */
  async searchProducts(keyword, options = {}) {
    try {
      logger.info(`PChome 開始搜尋: ${keyword}`);
      
      const {
        maxResults = 100,
        page = 1,
        sortBy = 'sale/dc' // 銷量降序
      } = options;

      // 先嘗試使用 API 搜尋
      let result = await this.searchViaAPI(keyword, { maxResults, page, sortBy });
      
      // 如果 API 失敗，使用網頁爬取
      if (!result.success || result.products.length === 0) {
        logger.warn('PChome API 搜尋失敗，改用網頁爬取');
        result = await this.searchViaWeb(keyword, options);
      }

      logger.info(`PChome 搜尋完成: ${keyword}, 找到 ${result.products.length} 個商品`);
      return result;
      
    } catch (error) {
      logger.error(`PChome 搜尋失敗: ${keyword}`, error);
      return this.formatErrorResult(error, keyword);
    }
  }

  /**
   * 使用 API 搜尋
   */
  async searchViaAPI(keyword, options = {}) {
    try {
      const { maxResults, page, sortBy } = options;
      
      // 計算需要請求的頁數來達到目標數量
      const pageSize = 50; // PChome API 每頁最多 50 筆
      const totalPages = Math.ceil(maxResults / pageSize);
      let allProducts = [];
      
      // 多頁請求來達到目標數量
      for (let currentPage = 1; currentPage <= totalPages && allProducts.length < maxResults; currentPage++) {
        const params = {
          q: keyword,
          page: currentPage,
          size: pageSize,
          sort: sortBy,
          region: 'tw'
        };

        const response = await axios.get(this.searchApiUrl, {
          params,
          headers: {
            'User-Agent': this.config.userAgent,
            'Accept': 'application/json',
            'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
            'Referer': 'https://24h.pchome.com.tw/'
          },
          timeout: this.config.timeout
        });

        if (response.data && response.data.prods) {
          const products = this.parseAPIProducts(response.data.prods);
          allProducts = allProducts.concat(products);
          
          // 如果沒有更多商品，停止請求
          if (response.data.prods.length === 0) {
            break;
          }
          
          // 添加延遲避免請求過於頻繁
          if (currentPage < totalPages) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } else {
          break;
        }
      }
      
      // 限制到目標數量
      allProducts = allProducts.slice(0, maxResults);
      
      return this.formatSearchResult(allProducts, keyword, {
        searchUrl: `${this.searchApiUrl}?q=${encodeURIComponent(keyword)}`,
        baseUrl: this.baseUrl,
        totalPages: totalPages,
        currentPage: page,
        totalResults: allProducts.length
      });
      
    } catch (error) {
      logger.warn('PChome API 搜尋失敗:', error.message);
      throw error;
    }
  }

  /**
   * 使用網頁爬取
   */
  async searchViaWeb(keyword, options = {}) {
    await this.init();
    
    try {
      const { maxResults = 100 } = options;
      const searchUrl = `https://24h.pchome.com.tw/search/${encodeURIComponent(keyword)}`;
      
      await this.navigateToPage(searchUrl);
      
      // 等待商品載入
      await this.page.waitForSelector('.prod_info, .ItemList', { timeout: 10000 });
      
      // 滾動載入更多商品直到達到目標數量
      let currentProductCount = 0;
      let scrollAttempts = 0;
      const maxScrollAttempts = 10; // 最多滾動 10 次
      
      while (currentProductCount < maxResults && scrollAttempts < maxScrollAttempts) {
        // 計算當前商品數量
        currentProductCount = await this.page.evaluate(() => {
          return document.querySelectorAll('.prod_info, .item').length;
        });
        
        if (currentProductCount >= maxResults) {
          break;
        }
        
        // 滾動到頁面底部載入更多商品
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        
        // 等待新商品載入
        await this.page.waitForTimeout(2000);
        
        scrollAttempts++;
      }
      
      // 提取商品資訊
      const products = await this.page.evaluate((maxResults) => {
        const productElements = document.querySelectorAll('.prod_info, .item');
        const products = [];
        
        for (let i = 0; i < Math.min(productElements.length, maxResults); i++) {
          const element = productElements[i];
          
          try {
            // 商品名稱（優先使用完整描述）
            const descElement = element.querySelector('.prod_desc, .describe');
            const nameElement = element.querySelector('.prod_name a, .name a, h5 a');
            const name = (descElement?.textContent || nameElement?.textContent || '').trim();
            
            // 商品連結
            const linkElement = element.querySelector('a[href*="/prod/"]');
            const href = linkElement?.getAttribute('href');
            const url = href ? (href.startsWith('http') ? href : 'https://24h.pchome.com.tw' + href) : '';
            
            // 價格
            const priceElement = element.querySelector('.price, .prod_price .value');
            const priceText = priceElement?.textContent?.replace(/[^\d]/g, '') || '0';
            
            // 圖片
            const imgElement = element.querySelector('img');
            const image = imgElement?.getAttribute('src') || imgElement?.getAttribute('data-src') || '';
            
            if (name && url) {
              products.push({
                name,
                url,
                price: parseInt(priceText),
                image,
                inStock: true
              });
            }
          } catch (e) {
            console.warn('解析商品失敗:', e);
          }
        }
        
        return products;
      }, maxResults);

      return this.formatSearchResult(products, keyword, {
        searchUrl,
        baseUrl: 'https://24h.pchome.com.tw'
      });
      
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 解析 API 商品資料
   */
  parseAPIProducts(prods) {
    return prods.map(prod => {
      try {
        // 使用 name 作為商品名稱，describe 作為描述
        const name = (prod.name || '').replace(/\\r\\n/g, '').trim();
        const description = (prod.describe || '').replace(/\\r\\n/g, '').trim();
        
        // 建構正確的圖片 URL
        let imageUrl = '';
        if (prod.picB) {
          // 大圖優先
          imageUrl = prod.picB.startsWith('http') ? prod.picB : `https://a.ecimg.tw${prod.picB}`;
        } else if (prod.picS) {
          // 小圖
          imageUrl = prod.picS.startsWith('http') ? prod.picS : `https://a.ecimg.tw${prod.picS}`;
        } else if (prod.pic) {
          // 其他圖片格式
          imageUrl = prod.pic.startsWith('http') ? prod.pic : `https://a.ecimg.tw${prod.pic}`;
        }
        
        return {
          name: name,
          price: prod.price || '0',
          url: prod.Id ? `${this.productBaseUrl}${prod.Id}` : '',
          image: imageUrl,
          inStock: prod.buttonType !== 'D', // D 表示缺貨
          seller: prod.store || 'PChome 24h購物',
          description: description || '', // 使用 describe 作為描述
          shipping: this.getShippingInfo(prod)
        };
      } catch (error) {
        logger.warn('解析 PChome 商品失敗:', error);
        return null;
      }
    }).filter(Boolean);
  }

  /**
   * 獲取配送資訊
   */
  getShippingInfo(prod) {
    if (prod.isBigSize) {
      return '大型商品配送';
    } else if (prod.isDelivery) {
      return '24小時到貨';
    } else if (prod.isSuperStore) {
      return '超商取貨';
    }
    return '宅配到府';
  }

  /**
   * 提取商品規格
   */
  async extractSpecifications(document) {
    try {
      const specs = {};
      const specElements = document.querySelectorAll('.spec-table tr, .specification-item');
      
      specElements.forEach(element => {
        const label = element.querySelector('.spec-name, .label')?.textContent?.trim();
        const value = element.querySelector('.spec-value, .value')?.textContent?.trim();
        
        if (label && value) {
          specs[label] = value;
        }
      });
      
      return specs;
    } catch (error) {
      return {};
    }
  }

  /**
   * 檢查 PChome 健康狀態
   */
  async checkHealth() {
    try {
      // 測試搜尋 API
      const response = await axios.get(this.searchApiUrl, {
        params: { q: 'test', size: 1 },
        timeout: 5000
      });
      
      if (response.status === 200) {
        return {
          status: 'healthy',
          platform: this.platformName,
          apiStatus: 'working',
          responseTime: response.headers['x-response-time'] || 'N/A'
        };
      }
      
      throw new Error('API 回應異常');
      
    } catch (error) {
      return {
        status: 'unhealthy',
        platform: this.platformName,
        error: error.message,
        apiStatus: 'failed'
      };
    }
  }
}

module.exports = PChomeCrawler; 