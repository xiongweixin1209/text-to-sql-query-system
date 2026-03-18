/**
 * LoadingSpinner Component - 加载动画组件
 * 显示加载状态
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ size = 'medium', text = '加载中...' }) => {
  const sizeConfig = {
    small: {
      spinner: 'w-8 h-8',
      text: 'text-sm',
      icon: 'w-8 h-8',
    },
    medium: {
      spinner: 'w-16 h-16',
      text: 'text-base',
      icon: 'w-16 h-16',
    },
    large: {
      spinner: 'w-24 h-24',
      text: 'text-lg',
      icon: 'w-24 h-24',
    },
  };

  const config = sizeConfig[size] || sizeConfig.medium;

  return (
      <div className="flex flex-col items-center justify-center animate-fadeIn">
        {/* 加载动画 */}
        <div className="relative">
          {/* 背景光晕 */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full blur-2xl opacity-20 animate-pulse-soft"></div>

          {/* 旋转圆环 */}
          <div className={`relative ${config.spinner}`}>
            <Loader2 className={`${config.icon} text-blue-600 animate-spin`} />
          </div>
        </div>

        {/* 加载文字 */}
        {text && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <p className={`${config.text} font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent`}>
                {text}
              </p>
              {/* 加载点动画 */}
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
        )}
      </div>
  );
};

export default LoadingSpinner;