/**
 * PerformancePanel Component - 性能分析面板
 * 显示查询性能分析结果
 */

import React from 'react';
import { Activity, Clock, Database, Zap, AlertTriangle, CheckCircle2, TrendingUp, Lightbulb } from 'lucide-react';

const PerformancePanel = ({ performance }) => {
  if (!performance) return null;

  const { explain_plan, performance_metrics, index_suggestions, warnings } = performance;

  // 性能等级配置
  const performanceLevelConfig = {
    excellent: {
      bg: 'from-green-50/80 to-emerald-50/80',
      text: 'text-green-700',
      label: '优秀',
      badge: 'bg-green-100 text-green-700',
      iconBg: 'from-green-500 to-emerald-600',
    },
    good: {
      bg: 'from-blue-50/80 to-cyan-50/80',
      text: 'text-blue-700',
      label: '良好',
      badge: 'bg-blue-100 text-blue-700',
      iconBg: 'from-blue-500 to-cyan-600',
    },
    fair: {
      bg: 'from-yellow-50/80 to-orange-50/80',
      text: 'text-yellow-700',
      label: '一般',
      badge: 'bg-yellow-100 text-yellow-700',
      iconBg: 'from-yellow-500 to-orange-600',
    },
    poor: {
      bg: 'from-orange-50/80 to-red-50/80',
      text: 'text-orange-700',
      label: '较差',
      badge: 'bg-orange-100 text-orange-700',
      iconBg: 'from-orange-500 to-red-600',
    },
    very_poor: {
      bg: 'from-red-50/80 to-pink-50/80',
      text: 'text-red-700',
      label: '很差',
      badge: 'bg-red-100 text-red-700',
      iconBg: 'from-red-500 to-pink-600',
    },
  };

  const getPerformanceConfig = (level) =>
      performanceLevelConfig[level] || performanceLevelConfig.fair;

  return (
      <div className="space-y-5">
        {/* 性能指标卡片 */}
        {performance_metrics && (
            <div className="grid grid-cols-2 gap-4">
              {/* 执行时间卡片 */}
              <div className="backdrop-blur-sm bg-gradient-to-br from-blue-50/80 to-indigo-50/80 rounded-xl p-6 border border-blue-200/50 shadow-lg shadow-blue-100/50 transform hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-bold text-blue-700">平均执行时间</span>
                </div>
                <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                  {performance_metrics.average_time_ms.toFixed(2)}
                  <span className="text-xl ml-1">ms</span>
                </p>
                <div className="flex items-center gap-3 text-xs text-blue-600 font-medium">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>最小: {performance_metrics.min_time_ms.toFixed(2)}ms</span>
                  </div>
                  <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 rotate-180" />
                    <span>最大: {performance_metrics.max_time_ms.toFixed(2)}ms</span>
                  </div>
                </div>
              </div>

              {/* 返回行数卡片 */}
              <div className="backdrop-blur-sm bg-gradient-to-br from-green-50/80 to-emerald-50/80 rounded-xl p-6 border border-green-200/50 shadow-lg shadow-green-100/50 transform hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-bold text-green-700">返回行数</span>
                </div>
                <p className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-3">
                  {performance_metrics.row_count}
                  <span className="text-xl ml-1">行</span>
                </p>
                {(() => {
                  const config = getPerformanceConfig(performance_metrics.performance_level);
                  return (
                      <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold ${config.badge} shadow-sm`}>
                  <Activity className="w-3 h-3" />
                  性能等级: {config.label}
                </span>
                  );
                })()}
              </div>
            </div>
        )}

        {/* 警告信息 */}
        {warnings && warnings.length > 0 && (
            <div className="backdrop-blur-sm bg-gradient-to-br from-yellow-50/80 to-orange-50/80 border border-yellow-200/50 rounded-xl p-5 shadow-lg shadow-yellow-100/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-bold text-yellow-900 text-lg">性能警告</h4>
              </div>
              <ul className="space-y-2">
                {warnings.map((warning, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm text-yellow-800 backdrop-blur-sm bg-white/50 rounded-lg p-3 border border-yellow-200/30">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <span className="flex-1">{warning}</span>
                    </li>
                ))}
              </ul>
            </div>
        )}

        {/* 查询计划 */}
        {explain_plan && (
            <div className="backdrop-blur-sm bg-white/80 border border-gray-200/50 rounded-xl overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-gray-50/80 to-slate-50/80 px-6 py-4 border-b border-gray-200/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-slate-700 rounded-xl flex items-center justify-center shadow-lg">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="font-bold text-gray-800 text-lg">查询计划 (EXPLAIN)</h4>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {/* 计划概览 */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="backdrop-blur-sm bg-gradient-to-br from-blue-50/50 to-cyan-50/50 rounded-lg p-4 border border-blue-200/30">
                    <p className="text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">复杂度</p>
                    <p className={`text-lg font-bold ${
                        explain_plan.complexity === 'simple' ? 'text-green-600' :
                            explain_plan.complexity === 'medium' ? 'text-yellow-600' :
                                'text-red-600'
                    }`}>
                      {explain_plan.complexity === 'simple' ? '简单' :
                          explain_plan.complexity === 'medium' ? '中等' : '复杂'}
                    </p>
                  </div>
                  <div className="backdrop-blur-sm bg-gradient-to-br from-purple-50/50 to-pink-50/50 rounded-lg p-4 border border-purple-200/30">
                    <p className="text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">使用索引</p>
                    <div className="flex items-center gap-2">
                      {explain_plan.uses_index ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <p className="text-lg font-bold text-green-600">是</p>
                          </>
                      ) : (
                          <>
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                            <p className="text-lg font-bold text-orange-600">否</p>
                          </>
                      )}
                    </div>
                  </div>
                  <div className="backdrop-blur-sm bg-gradient-to-br from-orange-50/50 to-yellow-50/50 rounded-lg p-4 border border-orange-200/30">
                    <p className="text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">表扫描</p>
                    <div className="flex items-center gap-2">
                      {explain_plan.has_table_scan ? (
                          <>
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                            <p className="text-lg font-bold text-orange-600">是</p>
                          </>
                      ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <p className="text-lg font-bold text-green-600">否</p>
                          </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 执行步骤 */}
                {explain_plan.steps && explain_plan.steps.length > 0 && (
                    <div>
                      <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-600" />
                        执行步骤
                      </p>
                      <div className="space-y-2">
                        {explain_plan.steps.map((step, index) => (
                            <div
                                key={index}
                                className="backdrop-blur-sm bg-gradient-to-r from-gray-50/80 to-slate-50/80 rounded-lg p-4 border border-gray-200/50 font-mono text-sm hover:border-blue-300/50 transition-all duration-300"
                            >
                              <div className="flex items-start gap-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded-md font-bold text-xs flex-shrink-0">
                          {step.id}
                        </span>
                                <span className="text-gray-700 flex-1">{step.detail}</span>
                              </div>
                            </div>
                        ))}
                      </div>
                    </div>
                )}
              </div>
            </div>
        )}

        {/* 索引建议 */}
        {index_suggestions && index_suggestions.length > 0 && (
            <div className="backdrop-blur-sm bg-white/80 border border-gray-200/50 rounded-xl overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-purple-50/80 to-pink-50/80 px-6 py-4 border-b border-purple-200/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Lightbulb className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="font-bold text-purple-900 text-lg">
                    索引建议 <span className="text-purple-600">({index_suggestions.length}条)</span>
                  </h4>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {index_suggestions.map((suggestion, index) => (
                    <div
                        key={index}
                        className="backdrop-blur-sm bg-gradient-to-br from-purple-50/50 to-pink-50/50 border border-purple-200/30 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                          <Lightbulb className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <p className="font-bold text-purple-900 text-base">
                            {suggestion.reason}
                          </p>
                          {suggestion.field && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">字段:</span>
                                <code className="px-3 py-1 bg-purple-100 text-purple-800 rounded-lg font-mono text-sm font-bold">
                                  {suggestion.field}
                                </code>
                              </div>
                          )}
                          <p className="text-sm text-purple-700 leading-relaxed">
                            {suggestion.suggestion}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-purple-600 font-medium">
                            <TrendingUp className="w-4 h-4" />
                            <span>预期改善: {suggestion.expected_improvement}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                ))}
              </div>
            </div>
        )}

        {/* 性能优化提示 */}
        <div className="backdrop-blur-sm bg-gradient-to-br from-blue-50/80 to-indigo-50/80 border border-blue-200/50 rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <h4 className="font-bold text-blue-900">性能优化提示</h4>
          </div>
          <ul className="text-sm text-blue-800 space-y-2">
            {[
              '为常用查询字段创建索引',
              '避免全表扫描，使用WHERE条件过滤',
              '定期分析查询性能并优化',
              '监控慢查询并进行针对性优化'
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

export default PerformancePanel;