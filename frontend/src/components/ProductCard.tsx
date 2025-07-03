import React from 'react';
import { Heart, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getProxiedImageUrl } from '../lib/utils';

export interface ProductData {
  id: string;
  name: string;
  image: string;
  lowestPrice: number;
  platforms: Array<{
    name: string;
    logo: string;
    price: number;
    url: string;
  }>;
  trend: 'up' | 'down' | 'stable';
  trendPercentage?: number;
  rating?: number;
  reviewCount?: number;
  isFavorite?: boolean;
}

interface ProductCardProps {
  product: ProductData;
  onViewDetail: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onViewDetail,
  onToggleFavorite,
  className
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getTrendIcon = () => {
    switch (product.trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-destructive" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-success" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = () => {
    switch (product.trend) {
      case 'up':
        return 'text-destructive';
      case 'down':
        return 'text-success';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 cursor-pointer",
        className
      )}
      onClick={() => onViewDetail(product.id)}
    >
      <CardHeader className="p-0">
        <div className="relative aspect-square">
          <img
            src={getProxiedImageUrl(product.image)}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.log('圖片載入失敗:', product.image);
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          {/* Price Trend Badge */}
          {product.trendPercentage && (
            <Badge
              variant={product.trend === 'down' ? 'default' : 'destructive'}
              className="absolute top-3 left-3 gap-1"
            >
              {getTrendIcon()}
              {product.trendPercentage}%
            </Badge>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4 space-y-3">
          {/* Product Name */}
          <h3 className="font-medium text-sm leading-5 line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>

          {/* Price Section */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-primary">
                {formatPrice(product.lowestPrice)}
              </span>
            </div>
            
            {/* Price Trend */}
            <div className={cn("flex items-center gap-1 text-xs", getTrendColor())}>
              {getTrendIcon()}
              <span>
                {product.trend === 'down' && '價格下降'}
                {product.trend === 'up' && '價格上升'}
                {product.trend === 'stable' && '價格持平'}
              </span>
            </div>
          </div>

          {/* Platform Count */}
          <div className="text-xs text-muted-foreground">
            在 {product.platforms.length} 個平台有售
          </div>

          {/* Platform Logos */}
          <div className="flex items-center gap-2">
            {product.platforms.slice(0, 4).map((platform, index) => (
              <div
                key={index}
                className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium"
                title={platform.name}
              >
                {platform.name.slice(0, 1).toUpperCase()}
              </div>
            ))}
            {product.platforms.length > 4 && (
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                +{product.platforms.length - 4}
              </div>
            )}
          </div>

        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;