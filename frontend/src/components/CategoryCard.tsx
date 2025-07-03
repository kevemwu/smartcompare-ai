import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, TrendingUp, Package, Star } from 'lucide-react';

export interface CategoryData {
  name: string;
  totalProducts: number;
  priceRange: {
    min: number;
    max: number;
  };
  platforms: string[];
  products: Array<{
    name: string;
    price: number;
    platform: string;
    url: string;
    image?: string;
  }>;
}

interface CategoryCardProps {
  category: CategoryData;
  originalQuery: string;
  className?: string;
}

export function CategoryCard({ category, originalQuery, className }: CategoryCardProps) {
  const navigate = useNavigate();

  const handleViewCategory = () => {
    // 導航到分類詳細頁面
    navigate(`/category/${encodeURIComponent(category.name)}?q=${encodeURIComponent(originalQuery)}`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price / 100);
  };

  const formatPriceRange = (min: number, max: number) => {
    if (min === max) {
      return formatPrice(min);
    }
    
    // 如果價格範圍很大，顯示為「起」
    if (max > min * 3) {
      return `${formatPrice(min)} 起`;
    }
    
    // 一般情況顯示範圍
    return `${formatPrice(min)} ~ ${formatPrice(max)}`;
  };

  const getPlatformName = (platform: string) => {
    const platformMap: { [key: string]: string } = {
      'pchome': 'PChome',
      'momo': 'momo',
      'PChome': 'PChome',
      'momo購物網': 'momo'
    };
    return platformMap[platform] || platform;
  };

  const getCategoryIcon = (categoryName: string) => {
    // 根據分類名稱返回對應圖標
    if (categoryName.includes('手機') || categoryName.includes('電腦') || categoryName.includes('3C')) {
      return '📱';
    } else if (categoryName.includes('服飾') || categoryName.includes('鞋') || categoryName.includes('包')) {
      return '👕';
    } else if (categoryName.includes('食品') || categoryName.includes('飲料')) {
      return '🍎';
    } else if (categoryName.includes('家電')) {
      return '🏠';
    } else if (categoryName.includes('老鼠') || categoryName.includes('捕鼠') || categoryName.includes('蟑螂')) {
      return '🪤';
    } else if (categoryName.includes('清潔')) {
      return '🧽';
    } else if (categoryName.includes('美妝') || categoryName.includes('保養')) {
      return '💄';
    } else if (categoryName.includes('運動')) {
      return '⚽';
    } else if (categoryName.includes('書籍') || categoryName.includes('文具')) {
      return '📚';
    }
    return '📦'; // 預設圖標
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // 圖片載入失敗時使用預設圖片
    e.currentTarget.src = '/placeholder.svg';
  };

  return (
    <Card className={`hover:shadow-lg transition-shadow cursor-pointer ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <span className="text-2xl">{getCategoryIcon(category.name)}</span>
            {category.name}
          </CardTitle>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            {category.totalProducts}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 價格範圍 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">價格範圍</span>
          <div className="text-right">
            <div className="text-lg font-bold text-green-600">
              {formatPriceRange(category.priceRange.min, category.priceRange.max)}
            </div>
            {category.priceRange.min !== category.priceRange.max && (
              <div className="text-xs text-gray-500">
                {category.priceRange.max > category.priceRange.min * 3 ? '價格範圍較大' : '價格區間'}
              </div>
            )}
          </div>
        </div>

        {/* 平台 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">販售平台</span>
          <div className="flex gap-1">
            {category.platforms.map((platform) => (
              <Badge key={platform} variant="outline" className="text-xs">
                {getPlatformName(platform)}
              </Badge>
            ))}
          </div>
        </div>

        {/* 商品數量 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">商品數量</span>
          <span className="text-sm font-medium">{category.totalProducts} 件</span>
        </div>

        {/* 商品預覽 */}
        <div className="space-y-2">
          <span className="text-sm text-gray-600">商品預覽</span>
          <div className="space-y-2">
            {category.products.slice(0, 2).map((product, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                {/* 商品圖片 */}
                <div className="w-8 h-8 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={handleImageError}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                      📦
                    </div>
                  )}
                </div>
                
                {/* 商品資訊 */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{product.name}</div>
                  <div className="text-xs text-gray-500">{getPlatformName(product.platform)}</div>
                </div>
                
                {/* 價格 */}
                <div className="text-xs font-bold text-green-600 whitespace-nowrap">
                  {formatPrice(product.price)}
                </div>
              </div>
            ))}
            {category.products.length > 2 && (
              <div className="text-xs text-gray-500 text-center py-1">
                +{category.products.length - 2} 更多商品
              </div>
            )}
          </div>
        </div>

        {/* 查看按鈕 */}
        <Button 
          onClick={handleViewCategory} 
          className="w-full"
          variant="default"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          查看 {category.name} 商品
        </Button>
      </CardContent>
    </Card>
  );
} 