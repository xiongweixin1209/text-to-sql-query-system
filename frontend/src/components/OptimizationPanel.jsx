/**
 * OptimizationPanel Component - 优化建议面板
 * 显示SQL优化建议
 */

import React from 'react';
import { Sparkles, AlertTriangle, Info, CheckCircle2, Lightbulb } from 'lucide-react';

const OptimizationPanel = ({ optimization }) => {
  if (!optimization) return null;

  const { optimizable, suggestions, severity, estimated_improvement } = optimization;

  // 严重程度颜色映射
  const severityConfig = {
    low: {
      bg: 'from-blue-50/80 to-cyan-50/80',
      border: 'border-blue-200/50',
      text: 'text-blue-800',
      badge: 'bg-blue-100 text-blue-700',
      icon: Info,
      iconBg: 'from-blue-500 to-cyan-600',
      shadow: 'shadow-blue-100/50',
    },
    medium: {
      bg: 'from-orange-50/80 to-yellow-50/80',
      border: 'border-orange-200/50',
      text: 'text-orange-800',
      badge: 'bg-orange-100 text-orange-700',
      icon: AlertTriangle,
      iconBg: 'from-orange-500 to-yellow-600',
      shadow: 'shadow-orange-100/50',
    },
    high: {
      bg: 'from-red-50/80 to-pink-50/80',
      border: 'border-red-200/50',
      text: 'text-red-800',
      badge: 'bg-red-100 text-red-700',
      icon: AlertTriangle,
      iconBg: 'from-red-500 to-pink-600',
      shadow: 'shadow-red-100/50',
    },
  };

  const severityLabels = {
    low: '低',
    medium: '中',
    high: '高',
  };

  const getConfig = (sev) => severityConfig[sev] || severityConfig.low;
  const config = getConfig(severity);
  const SeverityIcon = config.icon;

  return (
      <div className="space-y-5">
        {/* 概览卡片 */}
        <div className={`backdrop-blur-sm bg-gradient-to-br ${config.bg} border ${config.border} rounded-xl p-6 shadow-lg ${config.shadow} transform hover:scale-[1.01] transition-all duration-300`}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 bg-gradient-to-br ${config.iconBg} rounded-xl flex items-center justify-center shadow-lg`}>
                {optimizable ? (
                    <SeverityIcon className="w-6 h-6 text-white" />
                ) : (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h3 className={`font-bold text-lg ${config.text}`}>
                  {optimizable ? '发现优化空间' : 'SQL已优化'}
                </h3>
                <p className={`text-sm ${config.text} opacity-80 mt-1`}>
                  预期改善: <span className="font-semibold">{estimated_improvement}</span>
                </p>
              </div>
            </div>
            <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${config.badge} shadow-sm`}>
            严重程度: {severityLabels[severity]}
          </span>
          </div>
        </div>

        {/* 优化建议列表 */}
        {optimizable && suggestions && suggestions.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                <h4 className="font-bold text-gray-800 text-lg">
                  优化建议 <span className="text-orange-600">({suggestions.length}条)</span>
                </h4>
              </div>

              {suggestions.map((suggestion, index) => {
                const itemConfig = getConfig(suggestion.severity);
                const ItemIcon = itemConfig.icon;

                return (
                    <div
                        key={index}
                        className="backdrop-blur-sm bg-white/80 border border-gray-200/50 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                    >
                      {/* 建议头部 */}
                      <div className={`backdrop-blur-sm bg-gradient-to-r ${itemConfig.bg} ${itemConfig.border} border-b px-5 py-4`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`w-10 h-10 bg-gradient-to-br ${itemConfig.iconBg} rounded-lg flex items-center justify-center shadow-lg flex-shrink-0`}>
                              <ItemIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${itemConfig.badge} shadow-sm`}>
                            {severityLabels[suggestion.severity]}
                          </span>
                                <span className="text-xs text-gray-600 font-medium px-2 py-1 bg-white/50 rounded-md">
                            {suggestion.type}
                          </span>
                              </div>
                              <h5 className={`font-bold ${itemConfig.text} text-base`}>
                                {suggestion.message}
                              </h5>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 建议详情 */}
                      <div className="p-5 space-y-4">
                        {/* 具体建议 */}
                        <div className="backdrop-blur-sm bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-lg p-4 border border-blue-200/30">
                          <div className="flex items-start gap-2 mb-2">
                            <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">具体建议</p>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{suggestion.suggestion}</p>
                        </div>

                        {/* 原因说明 */}
                        <div className="backdrop-blur-sm bg-gradient-to-br from-gray-50/50 to-slate-50/50 rounded-lg p-4 border border-gray-200/30">
                          <div className="flex items-start gap-2 mb-2">
                            <Info className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">原因说明</p>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">{suggestion.reason}</p>
                        </div>

                        {/* 示例SQL */}
                        {suggestion.example && (
                            <div className="backdrop-blur-sm bg-gradient-to-br from-green-50/50 to-emerald-50/50 rounded-lg p-4 border border-green-200/30">
                              <div className="flex items-start gap-2 mb-2">
                                <Sparkles className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs font-bold text-green-700 uppercase tracking-wide">优化示例</p>
                              </div>
                              <pre className="bg-white/70 border border-green-200/50 rounded-lg p-3 text-xs overflow-x-auto text-gray-800 font-mono">
                        {suggestion.example}
                      </pre>
                            </div>
                        )}
                      </div>
                    </div>
                );
              })}
            </div>
        ) : (
            <div className="backdrop-blur-sm bg-gradient-to-br from-green-50/80 to-emerald-50/80 rounded-xl border border-green-200/50 shadow-lg p-10 text-center">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full blur-xl opacity-30 animate-pulse-soft"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-xl">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
              </div>
              <p className="text-green-800 font-bold text-xl mb-2">SQL已优化，无需改进</p>
              <p className="text-green-600 text-sm">当前SQL遵循了最佳实践</p>
            </div>
        )}

        {/* 优化提示 */}
        <div className="backdrop-blur-sm bg-gradient-to-br from-blue-50/80 to-indigo-50/80 border border-blue-200/50 rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-white" />
            </div>
            <h4 className="font-bold text-blue-900">优化小贴士</h4>
          </div>
          <ul className="text-sm text-blue-800 space-y-2">
            {[
              '总是为查询添加LIMIT限制返回行数',
              '避免在WHERE条件中使用函数',
              '指定具体字段代替SELECT *',
              '使用索引提升查询性能'
            ].map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </li>
            ))}
          </ul>
        </div>
      </div>
  );
};

export default OptimizationPanel;