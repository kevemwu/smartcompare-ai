const express = require('express');
const router = express.Router();
const { catchAsync } = require('../middleware/errorHandler');
const searchService = require('../services/searchService');
const { body, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: 智能商品搜尋 (GET 方法)
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: 搜尋關鍵字
 *         example: "iPhone 15"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 商品分類
 *         example: "手機"
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: 最低價格
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: 最高價格
 *       - in: query
 *         name: platforms
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: 平台列表
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [price_asc, price_desc, relevance, rating]
 *         description: 排序方式
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 頁數
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: 每頁數量
 *       - in: query
 *         name: categorySummary
 *         schema:
 *           type: boolean
 *         description: 是否使用分類摘要模式
 *     responses:
 *       200:
 *         description: 搜尋結果
 */
router.get('/',
  [
    query('q').notEmpty().withMessage('搜尋關鍵字不能為空'),
    query('page').optional().isInt({ min: 1 }).withMessage('頁數必須大於 0'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每頁數量必須在 1-100 之間'),
    query('categorySummary').optional().isBoolean().withMessage('categorySummary 必須是 boolean')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '請求參數驗證失敗',
        errors: errors.array()
      });
    }

    const startTime = Date.now();
    const { 
      q: searchQuery, 
      category, 
      minPrice, 
      maxPrice, 
      platforms, 
      sortBy = 'relevance', 
      page = 1, 
      limit = 20,
      categorySummary = 'false'
    } = req.query;

    // 構建 filters 對象
    const filters = {};
    if (category) filters.category = category;
    if (minPrice) filters.minPrice = parseFloat(minPrice);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
    if (platforms) {
      filters.platforms = Array.isArray(platforms) ? platforms : platforms.split(',');
    }

    try {
      const result = await searchService.searchProducts({
        query: searchQuery,
        filters,
        sort: sortBy,
        page: parseInt(page),
        limit: parseInt(limit),
        useCrawler: req.query.useCrawler !== 'false',
        categorySummary: categorySummary === 'true'
      });

      const duration = Date.now() - startTime;

      // 記錄搜尋活動
      if (logger.logSearchActivity) {
        logger.logSearchActivity(searchQuery, result.total, duration, {
          ip: req.ip
        });
      }

      res.json({
        success: true,
        data: result,
        meta: {
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('搜尋失敗:', error);
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/search:
 *   post:
 *     summary: 智能商品搜尋 (POST 方法)
 *     tags: [Search]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: 搜尋關鍵字
 *                 example: "iPhone 15"
 *               filters:
 *                 type: object
 *                 properties:
 *                   priceRange:
 *                     type: array
 *                     items:
 *                       type: number
 *                     example: [10000, 50000]
 *                   platforms:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["pchome", "momo"]
 *                   category:
 *                     type: string
 *                     example: "手機"
 *               sort:
 *                 type: string
 *                 enum: [price_asc, price_desc, relevance, rating]
 *                 example: "price_asc"
 *               page:
 *                 type: integer
 *                 minimum: 1
 *                 example: 1
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 example: 20
 *     responses:
 *       200:
 *         description: 搜尋結果
 */
router.post('/',
  [
    body('query').notEmpty().withMessage('搜尋關鍵字不能為空'),
    body('page').optional().isInt({ min: 1 }).withMessage('頁數必須大於 0'),
    body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每頁數量必須在 1-100 之間')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '請求參數驗證失敗',
        errors: errors.array()
      });
    }

    const startTime = Date.now();
    const { query: searchQuery, filters = {}, sort = 'relevance', page = 1, limit = 20 } = req.body;

    try {
      const result = await searchService.searchProducts({
        query: searchQuery,
        filters,
        sort,
        page,
        limit,
        useCrawler: req.body.useCrawler !== false
      });

      const duration = Date.now() - startTime;

      // 記錄搜尋活動
      if (logger.logSearchActivity) {
        logger.logSearchActivity(searchQuery, result.total, duration, {
          ip: req.ip
        });
      }

      res.json({
        success: true,
        data: result,
        meta: {
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('搜尋失敗:', error);
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/search/suggestions:
 *   get:
 *     summary: 取得搜尋建議
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: 搜尋前綴
 *     responses:
 *       200:
 *         description: 搜尋建議列表
 */
router.get('/suggestions',
  [
    query('q').notEmpty().withMessage('搜尋前綴不能為空')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '請求參數驗證失敗',
        errors: errors.array()
      });
    }

    const { q } = req.query;

    const suggestions = await searchService.getSuggestions(q);

    res.json({
      success: true,
      data: suggestions
    });
  })
);

/**
 * @swagger
 * /api/search/trending:
 *   get:
 *     summary: 取得熱門搜尋關鍵字
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: 返回數量限制
 *     responses:
 *       200:
 *         description: 熱門搜尋關鍵字列表
 */
router.get('/trending',
  catchAsync(async (req, res) => {
    const { limit = 10 } = req.query;

    const trending = await searchService.getTrending(parseInt(limit));

    res.json({
      success: true,
      data: trending
    });
  })
);

/**
 * @swagger
 * /api/search/categories:
 *   get:
 *     summary: 取得商品分類
 *     tags: [Search]
 *     responses:
 *       200:
 *         description: 商品分類列表
 */
router.get('/categories',
  catchAsync(async (req, res) => {
    const categories = await searchService.getCategories();

    res.json({
      success: true,
      data: categories
    });
  })
);

// 搜尋歷史端點已移除 - 不再支援用戶相關功能

/**
 * @swagger
 * /api/search/crawler/health:
 *   get:
 *     summary: 檢查爬蟲平台健康狀態
 *     tags: [Search]
 *     responses:
 *       200:
 *         description: 平台健康狀態
 */
router.get('/crawler/health',
  catchAsync(async (req, res) => {
    const healthStatus = await searchService.checkCrawlerHealth();

    res.json({
      success: true,
      data: healthStatus,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @swagger
 * /api/search/platforms:
 *   get:
 *     summary: 獲取支援的平台列表
 *     tags: [Search]
 *     responses:
 *       200:
 *         description: 支援的平台列表
 */
router.get('/platforms',
  catchAsync(async (req, res) => {
    const platforms = searchService.getSupportedPlatforms();

    res.json({
      success: true,
      data: platforms
    });
  })
);

/**
 * @swagger
 * /api/search/advanced:
 *   post:
 *     summary: 進階搜尋 (強制使用爬蟲)
 *     tags: [Search]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: 搜尋關鍵字
 *                 example: "iPhone 15"
 *               platforms:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["pchome", "momo"]
 *               maxResults:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 50
 *                 example: 20
 *               enableNLP:
 *                 type: boolean
 *                 example: true
 *               enableGrouping:
 *                 type: boolean
 *                 example: true
 *               sortBy:
 *                 type: string
 *                 enum: [price_asc, price_desc, relevance, rating]
 *                 example: "price_asc"
 *     responses:
 *       200:
 *         description: 進階搜尋結果
 */
router.post('/advanced',
  [
    body('query').notEmpty().withMessage('搜尋關鍵字不能為空'),
    body('maxResults').optional().isInt({ min: 1, max: 50 }).withMessage('結果數量必須在 1-50 之間')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '請求參數驗證失敗',
        errors: errors.array()
      });
    }

    const startTime = Date.now();
    const { 
      query: searchQuery,
      platforms = ['pchome', 'momo'],
      maxResults = 20,
      enableNLP = true,
      enableGrouping = true,
      sortBy = 'price_asc'
    } = req.body;

    try {
      // 強制使用爬蟲進行搜尋
      const result = await searchService.searchProducts({
        query: searchQuery,
        filters: { platforms },
        sort: sortBy,
        page: 1,
        limit: maxResults,
        useCrawler: true
      });

      const duration = Date.now() - startTime;

      res.json({
        success: true,
        data: result,
        meta: {
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
          crawlerUsed: true
        }
      });
    } catch (error) {
      logger.error('進階搜尋失敗:', error);
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/search/category/{categoryName}:
 *   get:
 *     summary: 獲取特定分類的商品詳情
 *     tags: [Search]
 *     parameters:
 *       - in: path
 *         name: categoryName
 *         required: true
 *         schema:
 *           type: string
 *         description: 分類名稱
 *         example: "手機"
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: 原始搜尋關鍵字
 *         example: "iPhone"
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [price_asc, price_desc, relevance, rating]
 *         description: 排序方式
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 頁數
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: 每頁數量
 *     responses:
 *       200:
 *         description: 分類商品詳情
 */
router.get('/category/:categoryName',
  [
    query('q').optional(),
    query('page').optional().isInt({ min: 1 }).withMessage('頁數必須大於 0'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每頁數量必須在 1-100 之間')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '請求參數驗證失敗',
        errors: errors.array()
      });
    }

    const startTime = Date.now();
    const { categoryName } = req.params;
    const { 
      q: originalQuery,
      sortBy = 'price_asc',
      page = 1,
      limit = 50
    } = req.query;

    try {
      const result = await searchService.getCategoryProducts({
        originalQuery: originalQuery || categoryName,
        categoryName: decodeURIComponent(categoryName),
        sortBy,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      const duration = Date.now() - startTime;

      res.json({
        success: true,
        data: result,
        meta: {
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('獲取分類商品失敗:', error);
      throw error;
    }
  })
);

module.exports = router; 