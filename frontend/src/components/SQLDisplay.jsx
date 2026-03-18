/**
 * SQLDisplay Component - SQL显示组件
 * 显示和编辑生成的SQL，提供优化和分析按钮
 */

import React, { useState } from 'react';
import { FileCode, Edit3, Check, Copy, Sparkles, BarChart3, CheckCircle2 } from 'lucide-react';

const SQLDisplay = ({ sql, onChange, onOptimize, onAnalyze, loading }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
      <div className="backdrop-blur-sm bg-white/80 rounded-2xl shadow-lg shadow-indigo-100/50 border border-gray-200/50 p-6 transform hover:shadow-xl hover:shadow-indigo-200/50 transition-all duration-300">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <FileCode className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
              生成的SQL
            </h2>
          </div>
          <div className="flex gap-2">
            {sql && (
                <>
                  <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="group flex items-center gap-2 px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all duration-300"
                  >
                    {isEditing ? (
                        <>
                          <Check className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                          <span className="font-medium">完成</span>
                        </>
                    ) : (
                        <>
                          <Edit3 className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                          <span className="font-medium">编辑</span>
                        </>
                    )}
                  </button>
                  <button
                      onClick={handleCopy}
                      className="group flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-300"
                  >
                    {copied ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-600 group-hover:scale-110 transition-transform duration-300" />
                          <span className="font-medium text-green-600">已复制</span>
                        </>
                    ) : (
                        <>
                          <Copy className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                          <span className="font-medium">复制</span>
                        </>
                    )}
                  </button>
                </>
            )}
          </div>
        </div>

        {sql ? (
            <>
              {isEditing ? (
                  <div className="relative">
              <textarea
                  value={sql}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-full h-52 px-5 py-4 border-2 border-indigo-200/50 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 font-mono text-sm text-gray-800 backdrop-blur-sm bg-gradient-to-br from-gray-50/80 to-white/80 transition-all duration-300"
              />
                    <div className="absolute bottom-3 right-3">
                      <div className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                        编辑模式
                      </div>
                    </div>
                  </div>
              ) : (
                  <div className="relative group">
              <pre className="w-full h-52 px-5 py-4 border-2 border-gray-200/50 rounded-xl overflow-auto font-mono text-sm text-gray-800 backdrop-blur-sm bg-gradient-to-br from-gray-50/80 to-white/80 hover:border-gray-300/50 transition-all duration-300">
                {sql}
              </pre>
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full shadow-lg">
                        ✓ 已生成
                      </div>
                    </div>
                  </div>
              )}

              <div className="flex gap-3 mt-5">
                <button
                    onClick={onOptimize}
                    disabled={loading}
                    className="group relative flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-5 rounded-xl transition-all duration-300 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-600/40 transform hover:-translate-y-0.5 active:scale-95 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  <span className="relative flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                优化分析
              </span>
                </button>
                <button
                    onClick={onAnalyze}
                    disabled={loading}
                    className="group relative flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-5 rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-600/40 transform hover:-translate-y-0.5 active:scale-95 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  <span className="relative flex items-center justify-center gap-2">
                <BarChart3 className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                性能分析
              </span>
                </button>
              </div>
            </>
        ) : (
            <div className="flex items-center justify-center h-52 backdrop-blur-sm bg-gradient-to-br from-gray-50/80 to-white/80 rounded-xl border-2 border-dashed border-gray-300/50">
              <div className="text-center text-gray-400">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full blur-xl opacity-30 animate-pulse-soft"></div>
                  <div className="relative w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                    <FileCode className="w-8 h-8 text-blue-400" />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600">等待SQL生成...</p>
                <p className="text-xs text-gray-500 mt-1">输入查询后点击生成按钮</p>
              </div>
            </div>
        )}
      </div>
  );
};

export default SQLDisplay;