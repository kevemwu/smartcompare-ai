import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 處理圖片 URL，將外部圖片轉換為代理 URL
 */
export const getProxiedImageUrl = (url: string): string => {
  if (!url) return '/placeholder.svg';
  
  // 如果是相對路徑或本地圖片，直接返回
  if (url.startsWith('/') || url.startsWith('data:')) {
    return url;
  }

  // 將 a.ecimg.tw 的圖片轉換為代理 URL
  if (url.includes('a.ecimg.tw')) {
    const path = url.split('a.ecimg.tw/')[1];
    return `/proxy/image/${path}`;
  }

  return url;
};
