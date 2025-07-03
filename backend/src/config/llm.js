/**
 * LLM 智能配置管理系統
 * 支持 Ollama 本地模型、Gemini API 和關鍵字匹配的三層降級策略
 */

const logger = require('../utils/logger');

/**
 * LLM 提供商配置
 */
const LLM_PROVIDERS = {
  OLLAMA: 'ollama',
  GEMINI: 'gemini',
  KEYWORD: 'keyword',
  AUTO: 'auto'
};

/**
 * 獲取 LLM 配置
 */
const getLLMConfig = () => {
  const config = {
    // 主要配置
    provider: process.env.LLM_PROVIDER || 'auto',
    fallbackEnabled: process.env.LLM_FALLBACK_ENABLED === 'true',
    fallbackOrder: (process.env.LLM_FALLBACK_ORDER || 'gemini,ollama,keyword').split(','),
    autoSwitchOnError: process.env.LLM_AUTO_SWITCH_ON_ERROR === 'true',
    fallbackThreshold: parseInt(process.env.LLM_FALLBACK_THRESHOLD || '3'),
    performanceMonitoring: process.env.LLM_PERFORMANCE_MONITORING === 'true',

    // Ollama 配置 - 優化為更強的中文模型
    ollama: {
      enabled: process.env.OLLAMA_ENABLED === 'true',
      url: process.env.OLLAMA_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'qwen2.5:14b',
      timeout: parseInt(process.env.OLLAMA_TIMEOUT || '180000'), // 增加到3分鐘，因為模型更大
      maxRetries: parseInt(process.env.OLLAMA_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.OLLAMA_RETRY_DELAY || '5000'),
      healthCheckInterval: parseInt(process.env.OLLAMA_HEALTH_CHECK_INTERVAL || '60000'),
      temperature: 0.1,
      maxTokens: 8000, // 增加輸出長度
      // 新增優化參數
      num_ctx: 32768,  // 上下文長度
      top_p: 0.8,      // 採樣參數
      top_k: 40,       // 採樣參數
      repeat_penalty: 1.1, // 重複懲罰
      seed: -1,        // 隨機種子
      num_thread: 8    // CPU 線程數
    },

    // Gemini 配置
    gemini: {
      enabled: process.env.GEMINI_ENABLED === 'true',
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest',
      timeout: parseInt(process.env.GEMINI_TIMEOUT || '30000'),
      maxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.GEMINI_RETRY_DELAY || '60000'),
      temperature: 0.1,
      maxTokens: 4000
    },

    // 降級策略配置
    fallback: {
      enabled: true,
      useKeywordMatch: true,
      maxKeywordMatchScore: 0.8,
      defaultCategory: '其他商品',
      cacheEnabled: true,
      cacheTTL: 24 * 60 * 60 * 1000 // 24小時
    }
  };

  // 驗證配置
  validateLLMConfig(config);
  
  return config;
};

/**
 * 驗證 LLM 配置
 */
const validateLLMConfig = (config) => {
  // 檢查 Ollama 配置
  if (config.ollama.enabled && !config.ollama.url) {
    logger.warn('Ollama 已啟用但未配置 URL，將禁用 Ollama');
    config.ollama.enabled = false;
  }

  // 檢查 Gemini 配置
  if (config.gemini.enabled && !config.gemini.apiKey) {
    logger.warn('Gemini 已啟用但未配置 API Key，將禁用 Gemini');
    config.gemini.enabled = false;
  }

  // 確保至少有一個可用的提供商
  const availableProviders = [];
  if (config.ollama.enabled) availableProviders.push('ollama');
  if (config.gemini.enabled) availableProviders.push('gemini');
  availableProviders.push('keyword'); // 關鍵字匹配總是可用

  if (availableProviders.length === 1 && availableProviders[0] === 'keyword') {
    logger.warn('⚠️  只有關鍵字匹配可用，建議配置 Ollama 或 Gemini');
  }

  // 調整降級順序，只包含可用的提供商
  config.fallbackOrder = config.fallbackOrder.filter(provider => 
    availableProviders.includes(provider)
  );

  if (config.fallbackOrder.length === 0) {
    config.fallbackOrder = ['keyword'];
  }

  logger.info(`🤖 LLM 配置初始化完成:`);
  logger.info(`   提供商: ${config.provider}`);
  logger.info(`   可用提供商: ${availableProviders.join(', ')}`);
  logger.info(`   降級順序: ${config.fallbackOrder.join(' → ')}`);
  
  if (config.ollama.enabled) {
    logger.info(`   🦙 Ollama: ${config.ollama.model} @ ${config.ollama.url}`);
  }
  if (config.gemini.enabled) {
    logger.info(`   🔶 Gemini: ${config.gemini.model}`);
  }
  
  // 新增：如果指定了特定提供商但該提供商不可用，記錄警告
  if (config.provider !== 'auto') {
    if (config.provider === 'gemini' && !config.gemini.enabled) {
      logger.warn(`⚠️  指定使用 Gemini 但 Gemini 未啟用或配置不完整`);
    }
    if (config.provider === 'ollama' && !config.ollama.enabled) {
      logger.warn(`⚠️  指定使用 Ollama 但 Ollama 未啟用或配置不完整`);
    }
  }
};

/**
 * 獲取當前活躍的 LLM 提供商
 */
const getActiveProvider = (config) => {
  if (config.provider === 'auto') {
    // 自動模式：按降級順序選擇第一個可用的
    return config.fallbackOrder[0] || 'keyword';
  }
  
  // 手動指定模式
  const provider = config.provider;
  
  // 檢查指定的提供商是否可用
  if (provider === 'ollama' && !config.ollama.enabled) {
    logger.warn('指定使用 Ollama 但未啟用，切換到 auto 模式');
    return getActiveProvider({ ...config, provider: 'auto' });
  }
  
  if (provider === 'gemini' && !config.gemini.enabled) {
    logger.warn('指定使用 Gemini 但未啟用，切換到 auto 模式');
    return getActiveProvider({ ...config, provider: 'auto' });
  }
  
  return provider;
};

/**
 * 性能監控配置
 */
const PERFORMANCE_CONFIG = {
  responseTimeThreshold: 10000, // 10秒
  successRateThreshold: 0.8,    // 80%
  monitoringWindow: 300000,     // 5分鐘
  degradationThreshold: 3       // 連續失敗3次後降級
};

module.exports = {
  LLM_PROVIDERS,
  getLLMConfig,
  validateLLMConfig,
  getActiveProvider,
  PERFORMANCE_CONFIG
}; 