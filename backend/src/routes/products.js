const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { catchAsync } = require('../middleware/errorHandler');
const productService = require('../services/productService');

const router = express.Router();

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: 獲取商品詳情
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 商品 ID
 *     responses:
 *       200:
 *         description: 商品詳情
 *       404:
 *         description: 商品不存在
 */
router.get('/:id',
  [
    param('id').notEmpty().withMessage('商品 ID 不能為空')
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

    const { id } = req.params;
    const product = await productService.getProduct(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的商品'
      });
    }

    res.json({
      success: true,
      data: product
    });
  })
);

/**
 * @swagger
 * /api/products/group/{groupId}:
 *   get:
 *     summary: 獲取商品組詳情
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: 商品組 ID
 *     responses:
 *       200:
 *         description: 商品組詳情
 *       404:
 *         description: 商品組不存在
 */
router.get('/group/:groupId',
  [
    param('groupId').notEmpty().withMessage('商品組 ID 不能為空')
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

    const { groupId } = req.params;
    const productGroup = await productService.getProductGroupDetail(groupId);

    if (!productGroup) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的商品組'
      });
    }

    res.json({
      success: true,
      data: productGroup
    });
  })
);

/**
 * @swagger
 * /api/products/group/{groupId}/price-history:
 *   get:
 *     summary: 獲取商品價格歷史
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: 商品組 ID
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *         description: 查詢天數
 *     responses:
 *       200:
 *         description: 價格歷史資料
 */
router.get('/group/:groupId/price-history',
  [
    param('groupId').notEmpty().withMessage('商品組 ID 不能為空'),
    query('days').optional().isInt({ min: 1, max: 365 }).withMessage('天數必須在 1-365 之間')
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

    const { groupId } = req.params;
    const { days = 30 } = req.query;

    const history = await productService.getProductPriceHistory(groupId, parseInt(days));

    res.json({
      success: true,
      data: history
    });
  })
);

/**
 * @swagger
 * /api/products/group/{groupId}/similar:
 *   get:
 *     summary: 獲取相似商品推薦
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: 商品組 ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: 推薦數量
 *     responses:
 *       200:
 *         description: 相似商品列表
 */
router.get('/group/:groupId/similar',
  [
    param('groupId').notEmpty().withMessage('商品組 ID 不能為空'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('推薦數量必須在 1-50 之間')
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

    const { groupId } = req.params;
    const { limit = 10 } = req.query;

    const similarProducts = await productService.getSimilarProducts(groupId, parseInt(limit));

    res.json({
      success: true,
      data: similarProducts
    });
  })
);

/**
 * @swagger
 * /api/products/group/{groupId}/specifications:
 *   get:
 *     summary: 獲取商品規格分析
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: 商品組 ID
 *     responses:
 *       200:
 *         description: 商品規格資料
 */
router.get('/group/:groupId/specifications',
  [
    param('groupId').notEmpty().withMessage('商品組 ID 不能為空')
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

    const { groupId } = req.params;
    const specs = await productService.getProductSpecs(groupId);

    res.json({
      success: true,
      data: specs
    });
  })
);

module.exports = router; 