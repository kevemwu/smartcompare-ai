// 臨時的內存數據服務，用於演示和測試
class MockDataService {
  constructor() {
    this.platforms = [
      { id: 1, name: 'pchome', displayName: 'PChome', baseUrl: 'https://shopping.pchome.com.tw' },
      { id: 2, name: 'momo', displayName: 'momo購物網', baseUrl: 'https://www.momoshop.com.tw' },
      { id: 3, name: 'yahoo', displayName: 'Yahoo購物中心', baseUrl: 'https://tw.buy.yahoo.com' },
      { id: 4, name: 'books', displayName: '博客來', baseUrl: 'https://www.books.com.tw' }
    ];

    this.categories = [
      { id: 1, name: '手機', description: '智慧型手機及相關配件' },
      { id: 2, name: '筆電', description: '筆記型電腦' },
      { id: 3, name: '電腦', description: '桌上型電腦及零組件' },
      { id: 4, name: '家電', description: '家用電器' },
      { id: 5, name: '3C', description: '3C電子產品' }
    ];

    this.brands = [
      { id: 1, name: 'Apple', normalized_name: 'apple' },
      { id: 2, name: 'Samsung', normalized_name: 'samsung' },
      { id: 3, name: 'Google', normalized_name: 'google' },
      { id: 4, name: 'Sony', normalized_name: 'sony' },
      { id: 5, name: 'LG', normalized_name: 'lg' }
    ];

    this.products = [
      {
        id: 1,
        platform_id: 1,
        platform_name: 'pchome',
        category_id: 1,
        category_name: '手機',
        brand_id: 1,
        brand_name: 'Apple',
        name: 'iPhone 15 Pro 128GB',
        normalized_name: 'iphone 15 pro 128gb',
        description: 'Apple iPhone 15 Pro 128GB 鈦原色 - 全新設計、強大效能',
        current_price: 3599000, // 35,990 元
        image_url: '/placeholder.svg',
        product_url: 'https://shopping.pchome.com.tw/iphone15pro',
        in_stock: true,
        rating: 4.5,
        review_count: 1250,
        specifications: {
          '螢幕尺寸': '6.1吋',
          '儲存容量': '128GB',
          '顏色': '鈦原色',
          '處理器': 'A17 Pro'
        }
      },
      {
        id: 2,
        platform_id: 2,
        platform_name: 'momo',
        category_id: 1,
        category_name: '手機',
        brand_id: 1,
        brand_name: 'Apple',
        name: 'iPhone 15 Pro 128GB',
        normalized_name: 'iphone 15 pro 128gb',
        description: 'Apple iPhone 15 Pro 128GB 鈦原色 智慧型手機',
        current_price: 3549000, // 35,490 元
        image_url: '/placeholder.svg',
        product_url: 'https://www.momoshop.com.tw/iphone15pro',
        in_stock: true,
        rating: 4.4,
        review_count: 890,
        specifications: {
          '螢幕尺寸': '6.1吋',
          '儲存容量': '128GB',
          '顏色': '鈦原色',
          '處理器': 'A17 Pro'
        }
      },
      {
        id: 3,
        platform_id: 1,
        platform_name: 'pchome',
        category_id: 1,
        category_name: '手機',
        brand_id: 2,
        brand_name: 'Samsung',
        name: 'Samsung Galaxy S24 256GB',
        normalized_name: 'samsung galaxy s24 256gb',
        description: 'Samsung Galaxy S24 256GB 幻影黑 5G智慧型手機',
        current_price: 2899000, // 28,990 元
        image_url: '/placeholder.svg',
        product_url: 'https://shopping.pchome.com.tw/galaxys24',
        in_stock: true,
        rating: 4.3,
        review_count: 756,
        specifications: {
          '螢幕尺寸': '6.2吋',
          '儲存容量': '256GB',
          '顏色': '幻影黑',
          '處理器': 'Snapdragon 8 Gen 3'
        }
      },
      {
        id: 4,
        platform_id: 3,
        platform_name: 'yahoo',
        category_id: 1,
        category_name: '手機',
        brand_id: 3,
        brand_name: 'Google',
        name: 'Google Pixel 8 Pro 128GB',
        normalized_name: 'google pixel 8 pro 128gb',
        description: 'Google Pixel 8 Pro 128GB 黑曜石 5G智慧型手機',
        current_price: 3199000, // 31,990 元
        image_url: '/placeholder.svg',
        product_url: 'https://tw.buy.yahoo.com/pixel8pro',
        in_stock: true,
        rating: 4.2,
        review_count: 432,
        specifications: {
          '螢幕尺寸': '6.7吋',
          '儲存容量': '128GB',
          '顏色': '黑曜石',
          '處理器': 'Google Tensor G3'
        }
      },
      {
        id: 5,
        platform_id: 2,
        platform_name: 'momo',
        category_id: 2,
        category_name: '筆電',
        brand_id: 1,
        brand_name: 'Apple',
        name: 'MacBook Air M2 13吋 256GB',
        normalized_name: 'macbook air m2 13 256gb',
        description: 'Apple MacBook Air M2 13吋 256GB 午夜色 筆記型電腦',
        current_price: 3699000, // 36,990 元
        image_url: '/placeholder.svg',
        product_url: 'https://www.momoshop.com.tw/macbookair',
        in_stock: true,
        rating: 4.6,
        review_count: 324,
        specifications: {
          '螢幕尺寸': '13.6吋',
          '處理器': 'Apple M2',
          '記憶體': '8GB',
          '儲存空間': '256GB SSD'
        }
      }
    ];

    // 分類數據
    this.categories = [
      { id: 1, name: '手機', description: '智慧型手機及相關配件' },
      { id: 2, name: '筆電', description: '筆記型電腦' },
      { id: 3, name: '電腦', description: '桌上型電腦及零組件' },
      { id: 4, name: '家電', description: '家用電器' },
      { id: 5, name: '3C', description: '3C電子產品' }
    ];

    // 品牌數據
    this.brands = [
      { id: 1, name: 'Apple', normalized_name: 'apple' },
      { id: 2, name: 'Samsung', normalized_name: 'samsung' },
      { id: 3, name: 'Google', normalized_name: 'google' },
      { id: 4, name: 'Sony', normalized_name: 'sony' },
      { id: 5, name: 'LG', normalized_name: 'lg' }
    ];

    // 熱門產品數據
    this.trendingProducts = [
      {
        id: 1,
        name: 'iPhone 15 Pro',
        lowest_price: 35490,
        image_url: '/placeholder.svg',
        category_name: '手機',
        brand_name: 'Apple'
      },
      {
        id: 2,
        name: 'Samsung Galaxy S24',
        lowest_price: 28990,
        image_url: '/placeholder.svg',
        category_name: '手機',
        brand_name: 'Samsung'
      },
      {
        id: 3,
        name: 'MacBook Air M2',
        lowest_price: 36990,
        image_url: '/placeholder.svg',
        category_name: '筆電',
        brand_name: 'Apple'
      }
    ];
  }

  // 搜尋商品
  searchProducts({ query, filters = {}, sort = 'relevance', page = 1, limit = 20 }) {
    let results = [...this.products];

    // 搜尋過濾
    if (query) {
      const searchTerm = query.toLowerCase();
      results = results.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm) ||
        product.brand_name.toLowerCase().includes(searchTerm)
      );
    }

    // 分類過濾
    if (filters.category) {
      results = results.filter(product => 
        product.category_name === filters.category
      );
    }

    // 價格範圍過濾
    if (filters.minPrice) {
      results = results.filter(product => 
        product.current_price >= filters.minPrice * 100
      );
    }
    if (filters.maxPrice) {
      results = results.filter(product => 
        product.current_price <= filters.maxPrice * 100
      );
    }

    // 平台過濾
    if (filters.platforms && filters.platforms.length > 0) {
      results = results.filter(product => 
        filters.platforms.includes(product.platform_name)
      );
    }

    // 排序
    switch (sort) {
      case 'price_asc':
        results.sort((a, b) => a.current_price - b.current_price);
        break;
      case 'price_desc':
        results.sort((a, b) => b.current_price - a.current_price);
        break;
      case 'rating':
        results.sort((a, b) => b.rating - a.rating);
        break;
      default: // relevance
        results.sort((a, b) => b.rating - a.rating);
    }

    // 分頁
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = results.slice(startIndex, endIndex);

    // 轉換為群組化格式
    const groups = this.groupSimilarProducts(paginatedResults);

    return {
      products: groups,
      pagination: {
        page,
        limit,
        total: results.length,
        pages: Math.ceil(results.length / limit)
      },
      meta: {
        searchQuery: query,
        appliedFilters: filters
      }
    };
  }

  // 群組化相似商品
  groupSimilarProducts(products) {
    const groups = [];
    const used = new Set();

    for (let i = 0; i < products.length; i++) {
      if (used.has(i)) continue;

      const group = {
        groupId: `group_${groups.length + 1}`,
        groupName: products[i].name,
        lowestPrice: products[i].current_price,
        platforms: []
      };

      // 找出相似的商品
      for (let j = i; j < products.length; j++) {
        if (used.has(j)) continue;

        const similarity = this.calculateNameSimilarity(products[i].name, products[j].name);
        
        if (similarity > 0.7) {
          used.add(j);
          
          group.platforms.push({
            platformId: products[j].platform_name,
            platformName: products[j].platform_name,
            price: products[j].current_price,
            url: products[j].product_url,
            stock: products[j].in_stock ? '有庫存' : '缺貨',
            rating: products[j].rating,
            reviewCount: products[j].review_count
          });

          if (products[j].current_price < group.lowestPrice) {
            group.lowestPrice = products[j].current_price;
          }
        }
      }

      groups.push(group);
    }

    return groups;
  }

  // 計算名稱相似度
  calculateNameSimilarity(name1, name2) {
    const set1 = new Set(name1.toLowerCase().split(/\s+/));
    const set2 = new Set(name2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  // 獲取所有平台
  getAllPlatforms() {
    return this.platforms;
  }

  // 獲取商品詳情
  getProduct(productId) {
    const product = this.products.find(p => p.id == productId);
    if (!product) return null;
    
    // 轉換為 ProductDetail 期望的格式
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      images: [product.image_url, '/placeholder.svg'], // 提供 images 數組
      lowestPrice: Math.floor(product.current_price / 100), // 轉換為元
      platforms: [{
        name: product.platform_name,
        price: Math.floor(product.current_price / 100),
        stock: product.in_stock ? '有庫存' : '缺貨',
        shipping: '免運費',
        url: product.product_url
      }],
      specifications: {
        '品牌': product.brand_name,
        '型號': product.name,
        '庫存狀態': product.in_stock ? '有庫存' : '缺貨'
      },
      trend: 'stable',
      trendPercentage: 0,
      isFavorite: false
    };
  }

  // 獲取搜尋建議
  getSuggestions(prefix) {
    const suggestions = new Set();
    
    this.products.forEach(product => {
      const words = product.name.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.startsWith(prefix.toLowerCase()) && word.length > prefix.length) {
          suggestions.add(word);
        }
      });
      
      if (product.name.toLowerCase().includes(prefix.toLowerCase())) {
        suggestions.add(product.name);
      }
    });

    return Array.from(suggestions).slice(0, 10);
  }

  // 獲取分類
  getCategories() {
    return this.categories;
  }

  // 獲取熱門搜尋
  getTrending() {
    return ['iPhone 15', 'MacBook', 'Samsung Galaxy', 'AirPods', 'iPad'];
  }
}

module.exports = new MockDataService(); 