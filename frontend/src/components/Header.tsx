import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  showBackButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  showBackButton = false
}) => {
  const navigate = useNavigate();

  return (
    <header className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-40">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left side - Logo and optional back button */}
        <div className="flex items-center gap-4">
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Search className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              SmartCompare AI
            </span>
          </div>
          
          {showBackButton && (
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              size="sm"
            >
              返回
            </Button>
          )}
        </div>
        
        {/* Right side - simplified */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">搜尋商品</span>
          </Button>
        </div>
      </div>
    </header>
  );
};