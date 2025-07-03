const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 確保日誌目錄存在
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 自定義日誌格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// 安全的 JSON 序列化函數，處理循環引用
const safeStringify = (obj, indent = 2) => {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, val) => {
    if (val != null && typeof val === "object") {
      if (seen.has(val)) {
        return "[Circular]";
      }
      seen.add(val);
    }
    return val;
  }, indent);
};

// 控制台輸出格式
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      try {
        msg += `\n${safeStringify(meta, 2)}`;
      } catch (error) {
        msg += `\n[無法序列化的對象]`;
      }
    }
    return msg;
  })
);

// 建立 logger 實例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'smartcompare-ai' },
  transports: [
    // 錯誤日誌檔案
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // 所有日誌檔案
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// 開發環境下也輸出到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// 生產環境可以加入其他傳輸方式（如 Elasticsearch, Slack 等）
if (process.env.NODE_ENV === 'production') {
  // 可以在這裡添加生產環境的日誌傳輸
}

// 輔助函數：記錄 HTTP 請求
const logHTTPRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });
  
  next();
};

// 輔助函數：記錄爬蟲活動
const logCrawlerActivity = (platform, action, details = {}) => {
  logger.info(`爬蟲活動: ${platform} - ${action}`, {
    platform,
    action,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// 輔助函數：記錄搜尋活動
const logSearchActivity = (query, results, duration, userInfo = {}) => {
  logger.info('搜尋活動', {
    query,
    resultsCount: results,
    duration: `${duration}ms`,
    ...userInfo,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  logger,
  logHTTPRequest,
  logCrawlerActivity,
  logSearchActivity
};

// 重新匯出 winston 的方法以便直接使用
module.exports.info = logger.info.bind(logger);
module.exports.error = logger.error.bind(logger);
module.exports.warn = logger.warn.bind(logger);
module.exports.debug = logger.debug.bind(logger); 