import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Filter, ArrowUpDown, Package, Star, ExternalLink } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ProductItem {
  id: string;
  name: string;
  description?: string;
  image: string;
  price: number;
  platform: string;
  url: string;
  rating?: number;
  reviewCount: number;
  inStock: boolean;
  category: string;
}

// 商品圖片組件
const ProductImage: React.FC<{ 
  src: string; 
  alt: string; 
  className?: string;
}> = ({ src, alt, className = "" }) => {
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [imageSrc, setImageSrc] = useState('');

  useEffect(() => {
    setImageStatus('loading');
    setImageSrc(getProxiedImageSrc(src));
  }, [src]);

  const handleImageLoad = () => {
    setImageStatus('loaded');
  };

  const handleImageError = () => {
    console.log('圖片載入失敗:', src);
    console.log('代理後的 URL:', imageSrc);
    setImageStatus('error');
  };

  // 修正 PChome 圖片 URL 格式
  const fixPChomeImageUrl = (originalSrc: string): string => {
    if (!originalSrc) return '';
    
    // 如果已經是正確的 cs-a.ecimg.tw 格式，直接返回
    if (originalSrc.includes('cs-a.ecimg.tw') || originalSrc.includes('cs-b.ecimg.tw') || 
        originalSrc.includes('cs-c.ecimg.tw') || originalSrc.includes('cs-d.ecimg.tw') ||
        originalSrc.includes('cs-e.ecimg.tw') || originalSrc.includes('cs-f.ecimg.tw')) {
      return originalSrc;
    }
    
    // 修正舊格式的 a.ecimg.tw 為新格式 cs-a.ecimg.tw
    if (originalSrc.includes('a.ecimg.tw/items/')) {
      return originalSrc.replace('a.ecimg.tw', 'cs-a.ecimg.tw');
    }
    if (originalSrc.includes('b.ecimg.tw/items/')) {
      return originalSrc.replace('b.ecimg.tw', 'cs-b.ecimg.tw');
    }
    if (originalSrc.includes('c.ecimg.tw/items/')) {
      return originalSrc.replace('c.ecimg.tw', 'cs-c.ecimg.tw');
    }
    if (originalSrc.includes('d.ecimg.tw/items/')) {
      return originalSrc.replace('d.ecimg.tw', 'cs-d.ecimg.tw');
    }
    if (originalSrc.includes('e.ecimg.tw/items/')) {
      return originalSrc.replace('e.ecimg.tw', 'cs-e.ecimg.tw');
    }
    if (originalSrc.includes('f.ecimg.tw/items/')) {
      return originalSrc.replace('f.ecimg.tw', 'cs-f.ecimg.tw');
    }
    
    // 處理 ecshweb.pchome.com.tw/items/ 格式
    if (originalSrc.includes('ecshweb.pchome.com.tw/items/')) {
      const match = originalSrc.match(/ecshweb\.pchome\.com\.tw\/items\/([^\/]+)\/(.+)/);
      if (match) {
        const [, itemId, filename] = match;
        return `https://cs-a.ecimg.tw/items/${itemId}/${filename}`;
      }
    }
    
    // 處理其他可能的 PChome 圖片格式
    if (originalSrc.includes('pchome.com.tw') && !originalSrc.includes('cs-a.ecimg.tw')) {
      // 嘗試提取圖片路徑
      const pathMatch = originalSrc.match(/\/items\/([^\/]+)\/(.+)$/);
      if (pathMatch) {
        const [, itemId, filename] = pathMatch;
        return `https://cs-a.ecimg.tw/items/${itemId}/${filename}`;
      }
    }
    
    return originalSrc;
  };

  // 檢查是否需要使用代理服務
  const getProxiedImageSrc = (originalSrc: string) => {
    if (!originalSrc) return '';
    
    // 首先修正 PChome 圖片 URL
    let fixedSrc = fixPChomeImageUrl(originalSrc);
    
    // 對於 PChome 圖片，將 https 改為 http
    if (fixedSrc.includes('ecimg.tw')) {
      fixedSrc = fixedSrc.replace('https://', 'http://');
    }
    
    // 直接返回修正後的圖片 URL，不使用代理
    return fixedSrc;
  };

  return (
    <div className={`relative w-full aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden ${className}`}>
      {imageStatus === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}
      
      {imageStatus === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-3xl mb-2">📦</div>
            <p className="text-xs">圖片載入失敗</p>
            <p className="text-xs opacity-70">請檢查網路連線</p>
          </div>
        </div>
      )}

      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`w-full h-full object-contain transition-opacity duration-200 ${
            imageStatus === 'loaded' ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />
      )}
    </div>
  );
};

const sortOptions = [
  { value: 'price_asc', label: '價格：低到高' },
  { value: 'price_desc', label: '價格：高到低' },
];

export default function CategoryDetails() {
  const { categoryName } = useParams<{ categoryName: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('price_asc');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  
  const originalQuery = searchParams.get('q') || '';

  useEffect(() => {
    if (categoryName) {
      loadProducts();
    }
  }, [categoryName, sortBy, page]);

  const loadProducts = async () => {
    if (!categoryName) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // 保存當前滾動位置
      const currentScrollPosition = window.scrollY;
      
      const response = await api.search.getCategoryProducts(categoryName, {
        q: originalQuery || categoryName,
        sortBy: sortBy,
        page: page,
        limit: 20
      });
      
      if (response.success) {
        if (page > 1) {
          setProducts(prevProducts => [...prevProducts, ...response.data.products]);
          // 在下一個渲染週期恢復滾動位置
          setTimeout(() => {
            window.scrollTo(0, currentScrollPosition);
          }, 0);
        } else {
          setProducts(response.data.products);
        }
        setTotal(response.data.total);
        setHasMore(response.data.hasMore);
      } else {
        throw new Error(response.message || '載入商品失敗');
      }
    } catch (error) {
      console.error('載入商品錯誤:', error);
      setError(error instanceof Error ? error.message : '載入商品失敗');
      toast({
        variant: 'destructive',
        title: '載入失敗',
        description: error instanceof Error ? error.message : '載入商品時發生錯誤'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSearch = () => {
    navigate(`/search?q=${encodeURIComponent(originalQuery)}`);
  };

  const handleViewProduct = (url: string) => {
    window.open(url, '_blank');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price / 100);
  };

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'pchome':
      case 'pchome 24h':
        return 'bg-orange-100 text-orange-800';
      case 'momo':
      case 'momo購物網':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (categoryName: string) => {
    if (categoryName.includes('手機') || categoryName.includes('電腦')) return '📱';
    if (categoryName.includes('老鼠') || categoryName.includes('捕鼠')) return '🪤';
    if (categoryName.includes('清潔')) return '🧽';
    return '📦';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        {/* 返回按鈕和分類標題 */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleBackToSearch}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回搜尋結果
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{getCategoryIcon(categoryName || '')}</span>
            <h1 className="text-2xl font-bold">{categoryName}</h1>
          </div>
          
          <p className="text-gray-600">
            來源搜尋：「{originalQuery}」• 找到 {total} 個商品
          </p>
        </div>

        {/* 排序和統計 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              {products.length} 個商品
            </Badge>
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 載入狀態 */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">載入中...</p>
          </div>
        )}

        {/* 錯誤狀態 */}
        {error && !loading && (
          <div className="text-center py-12">
            <div className="text-red-400 text-6xl mb-4">❌</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">載入失敗</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button onClick={loadProducts}>
              重新載入
            </Button>
          </div>
        )}

        {/* 商品列表 */}
        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow flex flex-col">
                <CardHeader className="pb-3 flex-shrink-0">
                  <ProductImage
                    src={product.image}
                    alt={product.name}
                    className="mb-3"
                  />
                  
                  <div className="space-y-1.5 flex-grow">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <CardTitle className="text-base font-semibold line-clamp-2 min-h-[3rem] hover:text-blue-600 cursor-pointer transition-colors">
                            {product.name}
                          </CardTitle>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px] break-words">
                          <p>{product.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {product.description && (
                      <p className="text-sm text-gray-500 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3 flex-shrink-0 mt-auto">
                  {/* 價格 */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold text-green-600">
                        {formatPrice(product.price)}
                      </div>
                    </div>
                  </div>

                  {/* 平台 */}
                  <Badge 
                    variant="secondary" 
                    className={getPlatformColor(product.platform)}
                  >
                    {product.platform}
                  </Badge>

                  {/* 評分 */}
                  {product.rating && product.rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{product.rating}</span>
                      <span className="text-xs text-gray-500">
                        ({product.reviewCount})
                      </span>
                    </div>
                  )}

                  {/* 查看商品按鈕 */}
                  <Button 
                    onClick={() => handleViewProduct(product.url)}
                    className="w-full"
                    size="sm"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    查看商品
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 載入更多 */}
        {!loading && !error && hasMore && (
          <div className="text-center mt-8">
            <Button
              onClick={() => setPage(page + 1)}
              variant="outline"
            >
              載入更多商品
            </Button>
          </div>
        )}

        {/* 無商品 */}
        {!loading && !error && products.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">此分類暫無商品</h3>
            <p className="text-gray-500 mb-4">請嘗試其他分類或搜尋關鍵字</p>
            <Button onClick={handleBackToSearch}>
              返回搜尋結果
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}