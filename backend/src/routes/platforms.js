const express = require('express');
const router = express.Router();
const { catchAsync } = require('../middleware/errorHandler');
const { query, validationResult } = require('express-validator');
const platformService = require('../services/platformService');

/**
 * @swagger
 * /api/platforms:
 *   get:
 *     summary: 取得所有平台列表
 *     tags: [Platforms]
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: 篩選啟用狀態
 *     responses:
 *       200:
 *         description: 平台列表
 */
router.get('/',
  [
    query('active').optional().isBoolean().withMessage('啟用狀態必須是布林值')
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

    const { active } = req.query;

    const platforms = await platformService.getAllPlatforms({ 
      active: active !== undefined ? active : undefined 
    });

    res.json({
      success: true,
      data: platforms
    });
  })
);

/**
 * @swagger
 * /api/platforms/stats:
 *   get:
 *     summary: 取得平台統計資訊
 *     tags: [Platforms]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *         description: 統計時間範圍
 *     responses:
 *       200:
 *         description: 平台統計資訊
 */
router.get('/stats',
  [
    query('period').optional().isIn(['7d', '30d', '90d']).withMessage('無效的時間範圍')
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

    const { period = '30d' } = req.query;

    const stats = await platformService.getPlatformStats(period);

    res.json({
      success: true,
      data: stats
    });
  })
);

/**
 * @swagger
 * /api/platforms/health:
 *   get:
 *     summary: 檢查各平台健康狀態
 *     tags: [Platforms]
 *     responses:
 *       200:
 *         description: 平台健康狀態
 */
router.get('/health',
  catchAsync(async (req, res) => {
    const health = await platformService.checkPlatformsHealth();

    res.json({
      success: true,
      data: health
    });
  })
);

/**
 * @swagger
 * /api/platforms/categories:
 *   get:
 *     summary: 取得支援的商品分類
 *     tags: [Platforms]
 *     responses:
 *       200:
 *         description: 商品分類列表
 */
router.get('/categories',
  catchAsync(async (req, res) => {
    const categories = await platformService.getSupportedCategories();

    res.json({
      success: true,
      data: categories
    });
  })
);

/**
 * @swagger
 * /api/platforms/brands:
 *   get:
 *     summary: 取得支援的品牌列表
 *     tags: [Platforms]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 篩選特定分類的品牌
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: 返回數量限制
 *     responses:
 *       200:
 *         description: 品牌列表
 */
router.get('/brands',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('限制數量必須在 1-100 之間')
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

    const { category, limit = 50 } = req.query;

    const brands = await platformService.getSupportedBrands({
      category,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: brands
    });
  })
);

/**
 * @swagger
 * /api/platforms/sync-status:
 *   get:
 *     summary: 取得平台同步狀態（管理員）
 *     tags: [Platforms]

 *     responses:
 *       200:
 *         description: 同步狀態資訊
 */
router.get('/sync-status',
  catchAsync(async (req, res) => {
    const syncStatus = await platformService.getSyncStatus();

    res.json({
      success: true,
      data: syncStatus
    });
  })
);

/**
 * @swagger
 * /api/platforms/performance:
 *   get:
 *     summary: 取得平台效能統計（管理員）
 *     tags: [Platforms]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [1h, 24h, 7d, 30d]
 *         description: 統計時間範圍
 *     responses:
 *       200:
 *         description: 效能統計資訊
 */
router.get('/performance',
  [
    query('period').optional().isIn(['1h', '24h', '7d', '30d']).withMessage('無效的時間範圍')
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

    const { period = '24h' } = req.query;

    const performance = await platformService.getPerformanceStats(period);

    res.json({
      success: true,
      data: performance
    });
  })
);

module.exports = router; 