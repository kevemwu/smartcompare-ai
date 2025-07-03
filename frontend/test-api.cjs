// 簡單的 API 連接測試腳本
const API_BASE_URL = 'http://localhost:3001';

async function testApiConnection() {
  console.log('🔍 測試 SmartCompare AI 後端 API 連接...\n');

  try {
    // 測試健康檢查端點
    console.log('1. 測試健康檢查端點...');
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ 健康檢查通過:', healthData.status);
      console.log('   版本:', healthData.version);
      console.log('   環境:', healthData.environment);
    } else {
      console.log('❌ 健康檢查失敗:', healthResponse.status);
    }

    console.log('\n2. 測試搜尋 API...');
    // 測試搜尋端點
    const searchResponse = await fetch(`${API_BASE_URL}/api/search?q=iPhone`);
    
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      console.log('✅ 搜尋 API 響應:', searchData.success ? '成功' : '失敗');
      console.log('   找到結果數量:', searchData.data?.total || 0);
    } else {
      console.log('❌ 搜尋 API 失敗:', searchResponse.status);
    }

    console.log('\n3. 測試平台 API...');
    // 測試平台端點
    const platformsResponse = await fetch(`${API_BASE_URL}/api/platforms`);
    
    if (platformsResponse.ok) {
      const platformsData = await platformsResponse.json();
      console.log('✅ 平台 API 響應:', platformsData.success ? '成功' : '失敗');
      console.log('   平台數量:', platformsData.data?.length || 0);
    } else {
      console.log('❌ 平台 API 失敗:', platformsResponse.status);
    }

    console.log('\n🎉 API 連接測試完成！');

  } catch (error) {
    console.error('\n❌ API 連接測試失敗:', error.message);
    console.log('\n💡 請確保後端服務正在運行:');
    console.log('   cd backend && npm start');
  }
}

// 如果直接運行此腳本
if (typeof window === 'undefined') {
  // Node.js 環境 - 使用動態導入
  (async () => {
    const { default: fetch } = await import('node-fetch');
    global.fetch = fetch;
    await testApiConnection();
  })();
} else {
  // 瀏覽器環境
  window.testApiConnection = testApiConnection;
} 