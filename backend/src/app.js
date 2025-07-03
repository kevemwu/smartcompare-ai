const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

// 路由導入
const searchRoutes = require('./routes/search');
const productRoutes = require('./routes/products');
const crawlerRoutes = require('./routes/crawler');
const platformRoutes = require('./routes/platforms');
const imageRoutes = require('./routes/images');

const app = express();

// CORS 配置
const corsOptions = {
  origin: [
    'https://smartcompare.juan2ndstreet.com',  // Production
    'http://localhost:4000',  // Local frontend
    'http://localhost:5173',  // Vite dev
    'http://localhost:4173',  // Vite preview
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

// 基本中介軟體
app.use(helmet());
app.use(compression());
app.use(cors(corsOptions));

// 請求記錄
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// 解析 JSON 請求
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 速率限制
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 分鐘
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 限制每個 IP 100 個請求
  message: {
    error: '請求過於頻繁，請稍後再試',
    retryAfter: '15 分鐘'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 健康檢查端點
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API 路由
app.use('/api/search', searchRoutes);
app.use('/api/products', productRoutes);
app.use('/api/crawler', crawlerRoutes);
app.use('/api/platforms', platformRoutes);
app.use('/api/images', imageRoutes);

// Swagger API 文件 (開發環境)
if (process.env.NODE_ENV === 'development') {
  const swaggerJsdoc = require('swagger-jsdoc');
  const swaggerUi = require('swagger-ui-express');
  
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'SmartCompare API',
        version: '1.0.0',
        description: '智慧比價系統 API 文件'
      },
      servers: [
        {
          url: process.env.API_BASE_URL || 'http://localhost:4001',
          description: 'API Server'
        }
      ]
    },
    apis: ['./src/routes/*.js']
  };
  
  const specs = swaggerJsdoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
  
  logger.info('API 文件可在 /api-docs 查看');
}

// 404 處理
app.use(notFound);

// 錯誤處理中介軟體
app.use(errorHandler);

const PORT = process.env.PORT || 4001;

const server = app.listen(PORT, () => {
  logger.info(`📡 伺服器運行在 https://api.smartcompare.juan2ndstreet.com (本機: http://localhost:${PORT})`);
  logger.info(`📖 API 文件: https://api.smartcompare.juan2ndstreet.com/api-docs (本機: http://localhost:${PORT}/api-docs)`);
  
  if (process.env.NODE_ENV === 'development') {
    logger.info(`📖 API 文件: http://localhost:${PORT}/api-docs`);
  }
});

// 優雅關閉
process.on('SIGTERM', () => {
  logger.info('收到 SIGTERM 信號，開始優雅關閉...');
  server.close(() => {
    logger.info('HTTP 伺服器已關閉');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('收到 SIGINT 信號，開始優雅關閉...');
  server.close(() => {
    logger.info('HTTP 伺服器已關閉');
    process.exit(0);
  });
});

module.exports = app; 