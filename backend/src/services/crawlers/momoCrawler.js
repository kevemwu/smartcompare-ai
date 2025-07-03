const BaseCrawler = require('./baseCrawler');
const axios = require('axios');
const logger = require('../../utils/logger');

class MomoCrawler extends BaseCrawler {
  constructor() {
    super('momo', {
      delay: 2500,
      timeout: 35000,
      maxRetries: 3
    });
    
    this.baseUrl = 'https://www.momoshop.com.tw';
    this.searchUrl = 'https://www.momoshop.com.tw/search/searchShop.jsp';
  }

  /**
   * 搜尋商品
   */
  async searchProducts(keyword, options = {}) {
    try {
      logger.info(`momo 開始搜尋: ${keyword}`);
      
      const {
        maxResults = 40,
        page = 1
      } = options;

      // 使用網頁爬取
      const result = await this.searchViaWeb(keyword, options);
      
      logger.info(`momo 搜尋完成: ${keyword}, 找到 ${result.products.length} 個商品`);
      return result;
      
    } catch (error) {
      logger.error(`momo 搜尋失敗: ${keyword}`, error);
      return {
        success: false,
        platform: 'momo',
        keyword,
        products: [],
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 使用網頁爬取
   */
  async searchViaWeb(keyword, options = {}) {
    await this.init();
    
    try {
      const { maxResults = 40, page = 1 } = options;
      const searchUrl = `${this.searchUrl}?keyword=${encodeURIComponent(keyword)}&searchType=1&curPage=${page}&_isFuzzy=0&showType=chessboardType`;
      
      logger.info(`開始網頁爬取: ${searchUrl}`);
      
      await this.navigateToPage(searchUrl);
      
      // 等待商品列表載入
      await this.page.waitForSelector('div.listArea', { timeout: 15000 });
      
      // 等待具體商品元素出現
      await this.delay(2000);
      
      // 捲動載入更多商品
      await this.scrollToLoadMore();

      // 提取商品資訊
      const products = await this.page.evaluate(() => {
        const productElements = Array.from(document.querySelectorAll('div.listArea li'))
          .filter(el => el.querySelector('.prdName')); // 確保是商品元素

        return productElements.map(element => {
          try {
            // 商品名稱
            const nameElement = element.querySelector('.prdName');
            const name = nameElement ? nameElement.textContent.trim() : '';

            // 價格
            const priceElement = element.querySelector('.price, .money');
            let price = 0;
            if (priceElement) {
              const priceText = priceElement.textContent.trim().replace(/[^\d]/g, '');
              price = parseInt(priceText) * 100; // 轉換為分
            }

            // 商品連結
            let productUrl = '';
            const linkElement = element.querySelector('a[href*="/goods/"], a[href*="GoodsDetail"], .prdName a, h3 a');
            if (linkElement) {
              productUrl = linkElement.href;
              if (!productUrl.startsWith('http')) {
                productUrl = `https://www.momoshop.com.tw${productUrl.startsWith('/') ? '' : '/'}${productUrl}`;
              }
            }

            // 圖片
            const imgElement = element.querySelector('img');
            let imageUrl = '';
            if (imgElement) {
              imageUrl = imgElement.getAttribute('data-original') || 
                        imgElement.getAttribute('src') || 
                        imgElement.getAttribute('data-src') || '';
              
              if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : `https://www.momoshop.com.tw${imageUrl}`;
              }

              // 轉換為高品質圖片
              imageUrl = imageUrl.replace(/_[SM]\.(jpg|webp)$/, '_L.$1');
            }

            if (name && price > 0) {
              return {
                name,
                price,
                originalPrice: price,
                url: productUrl,
                image: imageUrl,
                platform: 'momo',
                rating: 0,
                reviewCount: 0,
                inStock: true,
                seller: 'momo購物網',
                source: 'momo'
              };
            }
            return null;
          } catch (error) {
            console.error('解析商品失敗:', error);
            return null;
          }
        }).filter(Boolean); // 過濾掉無效的商品
      });

      if (products.length === 0) {
        throw new Error('未找到商品');
      }

      return {
        success: true,
        platform: 'momo',
        keyword,
        products: products.slice(0, maxResults),
        searchUrl,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`網頁爬取失敗: ${error.message}`);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 捲動載入更多商品
   */
  async scrollToLoadMore() {
    try {
      await this.page.evaluate(async () => {
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        let lastHeight = document.body.scrollHeight;
        
        for (let i = 0; i < 5; i++) { // 增加捲動次數
          window.scrollTo(0, document.body.scrollHeight);
          await delay(1500); // 增加等待時間
          
          const newHeight = document.body.scrollHeight;
          if (newHeight === lastHeight && i > 1) { // 至少捲動2次
            break;
          }
          lastHeight = newHeight;
        }
      });
      
      await this.delay(3000); // 增加最終等待時間
    } catch (error) {
      logger.warn('捲動載入失敗:', error.message);
    }
  }

  /**
   * 清理商品資料
   */
  cleanProducts(products) {
    return products
      .filter(product => {
        const isValid = 
          product.name &&
          product.price > 0 &&
          product.url &&
          product.image;
        
        if (!isValid) {
          logger.debug(`過濾無效商品: ${JSON.stringify(product)}`);
        }
        
        return isValid;
      })
      .map(product => ({
        ...product,
        name: this.cleanProductName(product.name),
        image: this.cleanUrl(product.image),
        url: this.cleanUrl(product.url),
        price: parseInt(product.price),
        originalPrice: parseInt(product.originalPrice || product.price),
        rating: product.rating || 0,
        reviewCount: product.reviewCount || 0,
        inStock: true,
        platform: 'momo',
        source: 'momo',
        seller: 'momo購物網'
      }));
  }

  /**
   * 清理商品名稱
   */
  cleanProductName(name) {
    return name
      .replace(/[^\w\s\u4e00-\u9fff.,()（）【】［］-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 清理URL
   */
  cleanUrl(url) {
    if (!url) return '';
    
    url = url.trim();
    
    // 如果是相對路徑，添加完整域名
    if (!url.startsWith('http')) {
      if (url.startsWith('//')) {
        url = 'https:' + url;
      } else {
        url = 'https://www.momoshop.com.tw' + (url.startsWith('/') ? '' : '/') + url;
      }
    }
    
    // 處理圖片URL，使用較大尺寸的圖片
    if (url.includes('/goodsimg/')) {
      url = url.replace('_S.jpg', '_L.jpg')
               .replace('_S.webp', '_L.webp')
               .replace('_m.jpg', '_L.jpg')
               .replace('_m.webp', '_L.webp');
    }
    
    return url;
  }

  /**
   * 檢查平台健康狀態
   */
  async checkHealth() {
    try {
      const response = await axios.get(this.baseUrl, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      return {
        status: response.status === 200 ? 'healthy' : 'unhealthy',
        platform: 'momo',
        responseTime: response.headers['x-response-time'] || 'N/A',
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        platform: 'momo',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }
}

module.exports = MomoCrawler; 