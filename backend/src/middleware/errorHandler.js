const logger = require('../utils/logger');

// 全域錯誤處理中介軟體
const errorHandler = (error, req, res, next) => {
  let statusCode = 500;
  let message = '伺服器內部錯誤';
  let details = null;

  // 記錄錯誤
  logger.error('API 錯誤:', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // 根據錯誤類型設定適當的回應
  if (error.name === 'ValidationError') {
    // Joi 驗證錯誤
    statusCode = 400;
    message = '請求資料驗證失敗';
    details = error.details?.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
  } else if (error.name === 'CastError') {
    // 資料類型轉換錯誤
    statusCode = 400;
    message = '無效的資料格式';
  } else if (error.code === '23505') {
    // PostgreSQL 唯一約束違反
    statusCode = 409;
    message = '資料已存在';
    if (error.constraint) {
      if (error.constraint.includes('email')) {
        details = { field: 'email', message: '此電子郵件地址已被註冊' };
      }
    }
  } else if (error.code === '23503') {
    // PostgreSQL 外鍵約束違反
    statusCode = 400;
    message = '參考的資料不存在';
  } else if (error.code === '23502') {
    // PostgreSQL NOT NULL 約束違反
    statusCode = 400;
    message = '必填欄位不能為空';
  } else if (error.name === 'JsonWebTokenError') {
    // JWT 錯誤
    statusCode = 401;
    message = '無效的授權令牌';
  } else if (error.name === 'TokenExpiredError') {
    // JWT 過期
    statusCode = 401;
    message = '授權令牌已過期';
  } else if (error.status) {
    // 自定義 HTTP 錯誤
    statusCode = error.status;
    message = error.message;
  }

  // 在開發環境中提供更詳細的錯誤資訊
  const response = {
    success: false,
    message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && {
      debug: {
        stack: error.stack,
        originalError: error.message
      }
    })
  };

  res.status(statusCode).json(response);
};

// 自定義錯誤類別
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 404 錯誤處理
const notFound = (req, res, next) => {
  const error = new AppError(`找不到路由 ${req.originalUrl}`, 404);
  next(error);
};

// 非同步錯誤捕捉包裝器
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  AppError,
  notFound,
  catchAsync,
}; 