// 404 Not Found 中介軟體
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `找不到請求的資源: ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  });
};

module.exports = notFound; 