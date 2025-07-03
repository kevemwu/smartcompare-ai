const express = require('express');
const axios = require('axios');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * 圖片代理路由 - 解決跨域圖片載入問題
 * GET /api/images/proxy?url=encoded_image_url
 */
router.get('/proxy', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: '缺少圖片 URL 參數'
      });
    }

    // 解碼 URL
    let decodedUrl = decodeURIComponent(url);
    
    // 修正 PChome 圖片 URL - 將 ecshweb.pchome.com.tw 替換為正確的 a.ecimg.tw
    if (decodedUrl.includes('ecshweb.pchome.com.tw/items/')) {
      // 從 ecshweb.pchome.com.tw/items/ 格式轉換為 a.ecimg.tw 格式
      const match = decodedUrl.match(/ecshweb\.pchome\.com\.tw\/items\/([^\/]+)\/(.+)/);
      if (match) {
        const [, itemId, filename] = match;
        decodedUrl = `https://a.ecimg.tw/items/${itemId}/${filename}`;
        logger.info(`🔄 修正 PChome 圖片 URL: ${url} -> ${decodedUrl}`);
      }
    }
    
    // 驗證 URL 格式
    if (!decodedUrl.startsWith('http://') && !decodedUrl.startsWith('https://')) {
      return res.status(400).json({
        success: false,
        message: '無效的圖片 URL'
      });
    }

    // 只允許特定域名的圖片
    const allowedDomains = [
      'pchome.com.tw',
      'img.pchome.com.tw',
      'ecshweb.pchome.com.tw',
      'a.ecimg.tw',        // PChome 圖片服務器
      'b.ecimg.tw',        // PChome 圖片服務器
      'c.ecimg.tw',        // PChome 圖片服務器
      'd.ecimg.tw',        // PChome 圖片服務器
      'e.ecimg.tw',        // PChome 圖片服務器
      'f.ecimg.tw',        // PChome 圖片服務器
      'momo.dm.com.tw',
      'static.momo.dm.com.tw'
    ];

    const urlObj = new URL(decodedUrl);
    const isAllowedDomain = allowedDomains.some(domain => 
      urlObj.hostname.includes(domain) || urlObj.hostname === domain
    );

    if (!isAllowedDomain) {
      logger.warn(`🚫 不支援的圖片來源: ${urlObj.hostname}`);
      return res.status(403).json({
        success: false,
        message: '不支援的圖片來源'
      });
    }

    // 設置請求頭以模擬瀏覽器訪問
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };

    // 對於不同域名，添加適當的 Referer
    if (decodedUrl.includes('pchome.com.tw') || decodedUrl.includes('ecimg.tw')) {
      headers['Referer'] = 'https://24h.pchome.com.tw/';
      headers['Origin'] = 'https://24h.pchome.com.tw';
    } else if (decodedUrl.includes('momo')) {
      headers['Referer'] = 'https://www.momoshop.com.tw/';
      headers['Origin'] = 'https://www.momoshop.com.tw';
    }

    logger.info(`📥 代理圖片請求: ${decodedUrl}`);

    // 請求圖片
    const response = await axios.get(decodedUrl, {
      headers,
      responseType: 'stream',
      timeout: 15000, // 15秒超時
      maxRedirects: 3, // 允許重定向
    });

    // 設置響應頭 - 重要：先設置 CORS 頭
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 緩存24小時
    
    // 如果有內容長度，設置它
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }

    logger.info(`✅ 圖片代理成功: ${decodedUrl}, Content-Type: ${response.headers['content-type']}`);

    // 將圖片流傳遞給客戶端
    response.data.pipe(res);

    // 處理流錯誤
    response.data.on('error', (error) => {
      logger.error('圖片流錯誤:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: '圖片傳輸失敗'
        });
      }
    });

  } catch (error) {
    logger.error('圖片代理錯誤:', {
      url: req.query.url,
      error: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText
    });

    // 避免重複發送響應
    if (res.headersSent) {
      return;
    }

    // 如果是網路錯誤，返回更具體的錯誤信息
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(404).json({
        success: false,
        message: '圖片來源無法訪問'
      });
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return res.status(408).json({
        success: false,
        message: '圖片載入超時'
      });
    }

    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: '圖片不存在'
      });
    }

    if (error.response?.status === 403) {
      return res.status(403).json({
        success: false,
        message: '圖片訪問被拒絕'
      });
    }

    return res.status(500).json({
      success: false,
      message: '圖片載入失敗',
      detail: error.message
    });
  }
});

/**
 * 處理 OPTIONS 請求 (CORS preflight)
 */
router.options('/proxy', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(200).end();
});

/**
 * 健康檢查路由
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '圖片代理服務正常運行',
    timestamp: new Date().toISOString(),
    supportedDomains: [
      'a.ecimg.tw (PChome)',
      'pchome.com.tw',
      'momo.dm.com.tw'
    ]
  });
});

module.exports = router; 