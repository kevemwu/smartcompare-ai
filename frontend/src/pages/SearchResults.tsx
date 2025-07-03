import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { SearchBox } from '@/components/SearchBox';
import { Header } from '@/components/Header';
import { ProductCard, ProductData } from '@/components/ProductCard';
import { CategoryCard, CategoryData } from '@/components/CategoryCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

// Mock data for demonstration
const mockProducts: ProductData[] = [
  {
    id: '1',
    name: 'iPhone 15 Pro 128GB 天然鈦金屬',
    image: '/placeholder.svg',
    lowestPrice: 33900,
    platforms: [
      { name: 'PChome', logo: '', price: 33900, url: '' },
      { name: 'momo', logo: '', price: 34500, url: '' },
      { name: '蝦皮', logo: '', price: 35200, url: '' },
      { name: 'Yahoo購物中心', logo: '', price: 35200, url: '#' }
    ],
    trend: 'down',
    trendPercentage: 8,
    isFavorite: false
  },
  {
    id: '2',
    name: 'MacBook Air M2 13吋 午夜色 256GB',
    image: '/placeholder.svg',
    lowestPrice: 32900,
    platforms: [
      { name: 'Apple', logo: '', price: 35900, url: '' },
      { name: 'PChome', logo: '', price: 32900, url: '' },
      { name: 'momo', logo: '', price: 33500, url: '' },
    ],
    trend: 'down',
    trendPercentage: 5,
    isFavorite: true
  },
  {
    id: '3',
    name: 'AirPods Pro (第 3 代) USB-C',
    image: '/placeholder.svg',
    lowestPrice: 6990,
    platforms: [
      { name: 'Apple', logo: '', price: 7490, url: '' },
      { name: 'PChome', logo: '', price: 6990, url: '' },
      { name: 'momo', logo: '', price: 7200, url: '' },
      { name: '蝦皮', logo: '', price: 7100, url: '' },
    ],
    trend: 'stable',
    isFavorite: false
  },
];

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState<ProductData[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [viewMode, setViewMode] = useState<'products' | 'categories'>('products');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  
  const { toast } = useToast();

  useEffect(() => {
    if (query || category) {
      performSearch();
    }
  }, [query, category]);

  const performSearch = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const filters = {
        category: category || undefined,
        categorySummary: true // 預設啟用 LLM 分類，可以改為 false 來測試關鍵字匹配
      };

      // 執行搜尋（會自動分類並快取）
      const response = await api.search.search(query || category, filters);
      
      if (response.success) {
        // 檢查是否有分類資訊
        if (response.data.categories && response.data.categories.length > 0) {
          // 有分類資訊，顯示分類卡片
          const transformedCategories: CategoryData[] = response.data.categories.map((cat: any) => ({
            name: cat.name,
            totalProducts: cat.totalProducts,
            priceRange: cat.priceRange,
            platforms: cat.platforms,
            products: cat.products || []
          }));
          
          setCategories(transformedCategories);
          setViewMode('categories');
          setProducts([]);
          
          toast({
            title: "搜尋完成",
            description: `找到 ${transformedCategories.length} 個商品分類，共 ${response.data.total} 個商品`,
          });
          
          return;
        }
        
        // 沒有分類資訊，顯示商品列表
        if (response.data.products && Array.isArray(response.data.products) && response.data.products.length > 0) {
          const transformedProducts = response.data.products.map((item: any) => ({
            id: item.id || `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: item.name,
            image: item.image || '/placeholder.svg',
            lowestPrice: Math.floor(item.price || 0),
            platforms: [{
              name: item.platform === 'pchome' ? 'PChome 24h' : 'momo購物網',
              logo: '',
              price: Math.floor(item.price || 0),
              url: item.url || '',
            }],
            trend: 'stable' as const,
            trendPercentage: 0,
            isFavorite: false,
          }));
          
          setProducts(transformedProducts);
          setViewMode('products');
          setCategories([]);
          
          toast({
            title: "搜尋完成",
            description: `找到 ${transformedProducts.length} 個商品`,
          });
        } else {
          setProducts(mockProducts);
          setViewMode('products');
          setCategories([]);
        }
      } else {
        throw new Error(response.message || '搜尋失敗');
      }
    } catch (error: any) {
      console.error('搜尋錯誤:', error);
      setError(error.message || '搜尋時發生錯誤');
      // 使用 mock 數據作為後備
      setProducts(mockProducts);
      setViewMode('products');
      setCategories([]);
      
      toast({
        title: "搜尋失敗",
        description: "使用範例資料顯示",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (newQuery: string) => {
    navigate(`/search?q=${encodeURIComponent(newQuery)}`);
  };

  const handleViewDetail = (productId: string) => {
    // 找到對應的商品資料
    const product = products.find(p => p.id === productId);
    if (product) {
      // 暫存商品資料到 sessionStorage
      sessionStorage.setItem(`product_${productId}`, JSON.stringify(product));
    }
    navigate(`/product/${productId}`);
  };

  const handleToggleFavorite = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    try {
      // 樂觀更新 UI
      setProducts(prev => 
        prev.map(p => 
          p.id === productId 
            ? { ...p, isFavorite: !p.isFavorite }
            : p
        )
      );

      if (product.isFavorite) {
        toast({
          title: '已移除收藏',
          description: `${product.name} 已從收藏清單移除`,
        });
      } else {
        toast({
          title: '已加入收藏',
          description: `${product.name} 已加入收藏清單`,
        });
      }
    } catch (error: any) {
      console.error('Toggle favorite error:', error);
      
      // 回滾 UI 變更
      setProducts(prev => 
        prev.map(p => 
          p.id === productId 
            ? { ...p, isFavorite: !p.isFavorite }
            : p
        )
      );
      
      toast({
        title: '操作失敗',
        description: error.message || '收藏操作失敗，請稍後再試',
        variant: 'destructive',
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(price / 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {/* 搜尋區域 */}
        <div className="mb-8 max-w-2xl mx-auto">
          <SearchBox onSearch={handleSearch} />
        </div>

        {/* 搜尋結果標題 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">
            {query ? `"${query}" 的搜尋結果` : '搜尋結果'}
          </h1>
          <p className="text-muted-foreground">
            {loading ? '正在搜尋並分析中...' : 
             viewMode === 'categories' 
               ? `找到 ${categories.length} 個商品分類，共 ${categories.reduce((total, cat) => total + cat.totalProducts, 0)} 個商品`
               : `找到 ${products.length} 個商品`}
          </p>
        </div>

        {/* 結果統計和篩選 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            {viewMode === 'categories' ? (
              <h2 className="text-lg font-semibold">
                找到 {categories.length} 個商品分類，共 {categories.reduce((total, cat) => total + cat.totalProducts, 0)} 個商品
              </h2>
            ) : (
              <h2 className="text-lg font-semibold">
                找到 {products.length} 個商品
              </h2>
            )}
            
            {error && (
              <Badge variant="destructive">使用備用數據</Badge>
            )}
          </div>
        </div>

        {/* 載入狀態 */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">搜尋中...</p>
          </div>
        )}

        {/* 分類結果或商品結果 */}
        {!loading && viewMode === 'categories' && categories.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <CategoryCard
                key={`${category.name}-${index}`}
                category={category}
                originalQuery={query}
              />
            ))}
          </div>
        )}

        {!loading && viewMode === 'products' && products.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onViewDetail={handleViewDetail}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}

        {/* 無結果 */}
        {!loading && ((viewMode === 'categories' && categories.length === 0) || (viewMode === 'products' && products.length === 0)) && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">未找到相關商品</h3>
            <p className="text-gray-500 mb-4">請嘗試使用其他關鍵字搜尋</p>
          </div>
        )}
      </main>
    </div>
  );
}