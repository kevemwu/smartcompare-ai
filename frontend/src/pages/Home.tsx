import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Smartphone, Laptop, Headphones, Camera, Watch, Gamepad2 } from 'lucide-react';
import { SearchBox } from '@/components/SearchBox';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import heroImage from '@/assets/hero-image.jpg';

const categories = [
  { name: '手機', icon: Smartphone, gradient: 'from-blue-500 to-purple-600' },
  { name: '筆電', icon: Laptop, gradient: 'from-green-500 to-teal-600' },
  { name: '耳機', icon: Headphones, gradient: 'from-orange-500 to-red-600' },
  { name: '相機', icon: Camera, gradient: 'from-pink-500 to-rose-600' },
  { name: '手錶', icon: Watch, gradient: 'from-indigo-500 to-blue-600' },
  { name: '遊戲', icon: Gamepad2, gradient: 'from-purple-500 to-indigo-600' },
];

const popularSearches = [
  'iPhone 15 Pro', 'MacBook Air M2', 'AirPods Pro', 'PlayStation 5',
  'Nintendo Switch', 'iPad Air', 'Apple Watch', 'Samsung Galaxy S24'
];

const features = [
  {
    title: '智能AI搜尋',
    description: '使用先進AI技術，理解您的需求並找到最符合的商品',
    icon: '🤖'
  },
  {
    title: '即時價格比較',
    description: '同步各大電商平台價格，確保您獲得最優惠的價格',
    icon: '💰'
  }
];

export default function Home() {
  const navigate = useNavigate();

  const handleSearch = async (query: string) => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleCategoryClick = (category: string) => {
    navigate(`/search?category=${encodeURIComponent(category)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8 text-center lg:text-left">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                  <span className="bg-gradient-primary bg-clip-text text-transparent">
                    智能比價
                  </span>
                  <br />
                  聰明購物
                </h1>
                <p className="text-xl text-muted-foreground max-w-xl lg:max-w-none">
                  使用AI技術比較各大電商平台價格，幫您找到最優惠的商品價格，省錢購物更輕鬆
                </p>
              </div>

              {/* Main Search Box */}
              <div className="max-w-2xl mx-auto lg:mx-0">
                <SearchBox
                  size="large"
                  onSearch={handleSearch}
                  placeholder="搜尋您想要的商品..."
                  autoFocus={true}
                  showHistory={true}
                />
              </div>

              {/* Popular Searches */}
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">熱門搜尋</p>
                <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                  {popularSearches.slice(0, 4).map((search, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => handleSearch(search)}
                    >
                      {search}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Image */}
            <div className="relative">
              <div className="relative z-10">
                <img
                  src={heroImage}
                  alt="SmartCompare AI 智能比價平台"
                  className="w-full max-w-lg mx-auto rounded-2xl shadow-elevated"
                />
              </div>
              {/* Background decoration */}
              <div className="absolute inset-0 bg-gradient-primary opacity-10 rounded-2xl transform rotate-3 scale-105"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">商品分類</h2>
          <p className="text-muted-foreground">快速瀏覽各類別商品</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <Card
                key={index}
                className="group cursor-pointer transition-all duration-300 hover:shadow-elevated hover:-translate-y-1"
                onClick={() => handleCategoryClick(category.name)}
              >
                <CardContent className="p-6 text-center space-y-3">
                  <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-r ${category.gradient} flex items-center justify-center`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="font-medium group-hover:text-primary transition-colors">
                    {category.name}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">為什麼選擇 SmartCompare AI</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              結合人工智慧與大數據分析，為您提供最準確、最即時的價格比較服務
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center p-8 hover:shadow-card transition-shadow">
                <CardContent className="space-y-4">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="bg-background border-t py-12">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Search className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">SmartCompare AI</span>
            </div>
            <p className="text-muted-foreground">
              © 2024 SmartCompare AI. 智能比價，讓購物更聰明。
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}