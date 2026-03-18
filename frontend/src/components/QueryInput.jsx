/**
 * QueryInput Component - 查询输入组件
 * 自然语言查询输入和操作按钮
 */

import React from 'react';
import { Search, Trash2, Zap, Play } from 'lucide-react';

const QueryInput = ({ value, onChange, onGenerate, onExecute, onClear, loading }) => {
    return (
        <div className="backdrop-blur-sm bg-white/80 rounded-2xl shadow-lg shadow-blue-100/50 border border-gray-200/50 p-6 transform hover:shadow-xl hover:shadow-blue-200/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <Search className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-lg font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                        自然语言查询
                    </h2>
                </div>
                <button
                    onClick={onClear}
                    className="group flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-300"
                    disabled={loading}
                >
                    <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                    <span className="font-medium">清空</span>
                </button>
            </div>

            <div className="relative">
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="输入你的查询，例如：查询销售额最高的前10个商品"
            className="w-full h-36 px-5 py-4 border-2 border-gray-200/50 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 resize-none text-gray-700 placeholder-gray-400 transition-all duration-300 backdrop-blur-sm bg-white/50"
            disabled={loading}
        />
                {value && (
                    <div className="absolute top-3 right-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse-soft"></div>
                    </div>
                )}
            </div>

            <div className="flex gap-3 mt-5">
                <button
                    onClick={onGenerate}
                    disabled={loading || !value.trim()}
                    className="group relative flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-600/40 transform hover:-translate-y-0.5 active:scale-95 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    {loading ? (
                        <span className="relative flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              生成中...
            </span>
                    ) : (
                        <span className="relative flex items-center justify-center gap-2">
              <Zap className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              生成SQL
            </span>
                    )}
                </button>

                <button
                    onClick={onExecute}
                    disabled={loading || !value.trim()}
                    className="group relative flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-300 shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-600/40 transform hover:-translate-y-0.5 active:scale-95 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    {loading ? (
                        <span className="relative">执行中...</span>
                    ) : (
                        <span className="relative flex items-center justify-center gap-2">
              <Play className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              生成并执行
            </span>
                    )}
                </button>
            </div>

            <div className="flex items-start gap-2 mt-4 px-1">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                    点击<span className="font-semibold text-blue-600">「生成SQL」</span>只生成SQL语句；
                    点击<span className="font-semibold text-green-600">「生成并执行」</span>会生成SQL并立即执行查询
                </p>
            </div>
        </div>
    );
};

export default QueryInput;