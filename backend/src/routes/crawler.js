const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { catchAsync } = require('../middleware/errorHandler');
const crawlerService = require('../services/crawlerService');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/crawler/trigger:
 *   post:
 *     summary: 觸發爬蟲任務
 *     tags: [Crawler]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *               - platforms
 *             properties:
 *               query:
 *                 type: string
 *                 description: 搜尋關鍵字
 *                 example: "iPhone 15"
 *               platforms:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 平台列表
 *                 example: ["pchome", "momo", "shopee", "yahoo"]
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high]
 *                 description: 任務優先級
 *                 example: "normal"
 *               maxPages:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *                 description: 最大爬取頁數
 *                 example: 3
 *     responses:
 *       202:
 *         description: 爬蟲任務已建立
 */
router.post('/trigger',
  [
    body('query').notEmpty().withMessage('搜尋關鍵字不能為空'),
    body('platforms').isArray({ min: 1 }).withMessage('至少選擇一個平台'),
    body('platforms.*').isIn(['pchome', 'momo', 'shopee', 'yahoo', 'books']).withMessage('無效的平台'),
    body('priority').optional().isIn(['low', 'normal', 'high']).withMessage('無效的優先級'),
    body('maxPages').optional().isInt({ min: 1, max: 10 }).withMessage('最大頁數必須在 1-10 之間')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '請求資料驗證失敗',
        errors: errors.array()
      });
    }

    const { query, platforms, priority = 'normal', maxPages = 3 } = req.body;

    const task = await crawlerService.createCrawlerTask({
      query,
      platforms,
      priority,
      maxPages
    });

    logger.info(`爬蟲任務建立: ${task.id}`, {
      query,
      platforms
    });

    res.status(202).json({
      success: true,
      message: '爬蟲任務已建立',
      data: {
        taskId: task.id,
        status: task.status,
        estimatedTime: task.estimatedTime
      }
    });
  })
);

/**
 * @swagger
 * /api/crawler/status/{taskId}:
 *   get:
 *     summary: 取得爬蟲任務狀態
 *     tags: [Crawler]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: 任務 ID
 *     responses:
 *       200:
 *         description: 任務狀態資訊
 */
router.get('/status/:taskId',
  [
    param('taskId').notEmpty().withMessage('任務 ID 不能為空')
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

    const { taskId } = req.params;

    const taskStatus = await crawlerService.getTaskStatus(taskId);

    if (!taskStatus) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的任務'
      });
    }

    res.json({
      success: true,
      data: taskStatus
    });
  })
);

/**
 * @swagger
 * /api/crawler/tasks:
 *   get:
 *     summary: 取得爬蟲任務列表
 *     tags: [Crawler]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, running, completed, failed]
 *         description: 篩選任務狀態
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *         description: 篩選平台
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
 *         description: 任務列表
 */
router.get('/tasks',
  [
    query('status').optional().isIn(['pending', 'running', 'completed', 'failed']).withMessage('無效的狀態'),
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

    const { status, platform, page = 1, limit = 20 } = req.query;

    const tasks = await crawlerService.getTasks({
      status,
      platform,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: tasks
    });
  })
);

/**
 * @swagger
 * /api/crawler/logs:
 *   get:
 *     summary: 取得爬蟲執行記錄
 *     tags: [Crawler]
 *     parameters:
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *         description: 篩選平台
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [success, failed, partial]
 *         description: 篩選執行狀態
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 開始日期
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 結束日期
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
 *         description: 執行記錄列表
 */
router.get('/logs',
  [
    query('status').optional().isIn(['success', 'failed', 'partial']).withMessage('無效的狀態'),
    query('fromDate').optional().isISO8601().withMessage('開始日期格式不正確'),
    query('toDate').optional().isISO8601().withMessage('結束日期格式不正確'),
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

    const { platform, status, fromDate, toDate, page = 1, limit = 20 } = req.query;

    const logs = await crawlerService.getCrawlerLogs({
      platform,
      status,
      fromDate,
      toDate,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: logs
    });
  })
);

/**
 * @swagger
 * /api/crawler/stats:
 *   get:
 *     summary: 取得爬蟲統計資訊
 *     tags: [Crawler]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d]
 *         description: 統計時間範圍
 *     responses:
 *       200:
 *         description: 統計資訊
 */
router.get('/stats',
  [
    query('period').optional().isIn(['24h', '7d', '30d']).withMessage('無效的時間範圍')
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

    const stats = await crawlerService.getCrawlerStats(period);

    res.json({
      success: true,
      data: stats
    });
  })
);

/**
 * @swagger
 * /api/crawler/health:
 *   get:
 *     summary: 檢查爬蟲服務健康狀態
 *     tags: [Crawler]
 *     responses:
 *       200:
 *         description: 服務狀態
 */
router.get('/health',
  catchAsync(async (req, res) => {
    const health = await crawlerService.getHealthStatus();

    res.json({
      success: true,
      data: health
    });
  })
);

/**
 * @swagger
 * /api/crawler/platforms/{platform}/test:
 *   post:
 *     summary: 測試特定平台爬蟲
 *     tags: [Crawler]
 *     parameters:
 *       - in: path
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *         description: 平台名稱
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
 *                 description: 測試搜尋關鍵字
 *     responses:
 *       200:
 *         description: 測試結果
 */
router.post('/platforms/:platform/test',
  [
    param('platform').isIn(['pchome', 'momo', 'shopee', 'yahoo', 'books']).withMessage('無效的平台'),
    body('query').notEmpty().withMessage('搜尋關鍵字不能為空')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '請求資料驗證失敗',
        errors: errors.array()
      });
    }

    const { platform } = req.params;
    const { query } = req.body;

    const testResult = await crawlerService.testPlatformCrawler(platform, query);

    res.json({
      success: true,
      data: testResult
    });
  })
);

module.exports = router; 