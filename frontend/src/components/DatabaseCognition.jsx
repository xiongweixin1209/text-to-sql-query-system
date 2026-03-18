/**
 * DatabaseCognition.jsx - 数据库认知模块（支持跳转到查询）
 * 展示数据库的DWD/DWS分层结构和表详情 + AI推荐功能 + 跨Tab跳转
 */

import React, { useState, useEffect } from 'react';
import {
    Database,
    Layers,
    Table2,
    Activity,
    ChevronRight,
    ChevronDown,
    Info,
    Zap,
    AlertCircle,
    Sparkles,
    Lightbulb,
    ArrowRight
} from 'lucide-react';
import { datasourceAPI } from '../services/api';

const DatabaseCognition = ({ onJumpToQuery }) => {
    // 状态管理
    const [datasources, setDatasources] = useState([]);
    const [selectedDatasource, setSelectedDatasource] = useState(null);
    const [metadata, setMetadata] = useState(null);
    const [schemaData, setSchemaData] = useState(null);
    const [selectedTable, setSelectedTable] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedSections, setExpandedSections] = useState({
        dwd: true,
        dws: true
    });

    // AI推荐相关状态
    const [recommendQuery, setRecommendQuery] = useState('');
    const [recommendations, setRecommendations] = useState(null);
    const [recommendLoading, setRecommendLoading] = useState(false);
    const [recommendError, setRecommendError] = useState(null);

    // 加载数据源列表
    useEffect(() => {
        loadDatasources();
    }, []);

    const loadDatasources = async () => {
        try {
            const response = await datasourceAPI.list();
            setDatasources(response.items || []);
            if (response.items && response.items.length > 0) {
                setSelectedDatasource(response.items[0].id);
            }
        } catch (err) {
            setError('加载数据源失败: ' + err.message);
        }
    };

    useEffect(() => {
        if (selectedDatasource) {
            loadDatabaseInfo();
            setRecommendations(null);
            setRecommendQuery('');
        }
    }, [selectedDatasource]);

    const loadDatabaseInfo = async () => {
        setLoading(true);
        setError(null);
        try {
            const [metadataRes, schemaRes] = await Promise.all([
                datasourceAPI.getMetadata(selectedDatasource),
                datasourceAPI.getEnhancedSchema(selectedDatasource)
            ]);
            setMetadata(metadataRes);
            setSchemaData(schemaRes);
        } catch (err) {
            setError('加载数据库信息失败: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // AI推荐功能
    const handleRecommend = async () => {
        if (!recommendQuery.trim()) {
            setRecommendError('请输入查询需求');
            return;
        }

        setRecommendLoading(true);
        setRecommendError(null);
        setRecommendations(null);

        try {
            const result = await datasourceAPI.recommendTables(
                selectedDatasource,
                recommendQuery
            );

            if (result.success) {
                setRecommendations(result);
                setRecommendError(null);
            } else {
                setRecommendError(result.error || 'AI推荐失败');
                setRecommendations(null);
            }
        } catch (err) {
            setRecommendError('AI推荐失败: ' + err.message);
            setRecommendations(null);
        } finally {
            setRecommendLoading(false);
        }
    };

    // 跳转到查询页面（新增）
    const handleUseTable = (tableName) => {
        if (onJumpToQuery) {
            onJumpToQuery(selectedDatasource, [tableName]);
        }
    };

    // 使用推荐的表查询（新增）
    const handleUseRecommendedTables = () => {
        if (onJumpToQuery && recommendations && recommendations.recommendations) {
            const tableNames = recommendations.recommendations.map(r => r.table_name);
            onJumpToQuery(selectedDatasource, tableNames);
        }
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const handleTableClick = (table) => {
        setSelectedTable(selectedTable?.table_name === table.table_name ? null : table);
    };

    const getConfidenceBadge = (confidence) => {
        const badges = {
            high: { text: '高', color: 'bg-green-100 text-green-700 border-green-300' },
            medium: { text: '中', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
            low: { text: '低', color: 'bg-orange-100 text-orange-700 border-orange-300' }
        };
        const badge = badges[confidence] || badges.medium;
        return (
            <span className={`px-2 py-1 rounded-md text-xs font-medium border ${badge.color}`}>
        置信度: {badge.text}
      </span>
        );
    };

    const getPerformanceBadge = (level) => {
        const badges = {
            fast: { text: '快速', color: 'bg-green-100 text-green-700 border-green-300' },
            medium: { text: '中等', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
            slow: { text: '较慢', color: 'bg-red-100 text-red-700 border-red-300' }
        };
        const badge = badges[level] || badges.medium;
        return (
            <span className={`px-2 py-1 rounded-md text-xs font-medium border ${badge.color}`}>
        {badge.text}
      </span>
        );
    };

    const getLayerBadge = (layer) => {
        if (layer === 'DWD') {
            return (
                <span className="px-2 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-700 border border-blue-300">
          📘 DWD明细层
        </span>
            );
        } else if (layer === 'DWS') {
            return (
                <span className="px-2 py-1 rounded-md text-xs font-bold bg-green-100 text-green-700 border border-green-300">
          📗 DWS汇总层
        </span>
            );
        }
        return null;
    };

    if (loading && !schemaData) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Activity className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">正在加载数据库信息...</p>
                </div>
            </div>
        );
    }

    if (error && !schemaData) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600">{error}</p>
                    <button
                        onClick={loadDatabaseInfo}
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        重试
                    </button>
                </div>
            </div>
        );
    }

    const dwdTables = schemaData?.table_details?.filter(t => t.layer === 'DWD') || [];
    const dwsTables = schemaData?.table_details?.filter(t => t.layer === 'DWS') || [];

    return (
        <div className="space-y-6">
            {/* 顶部：数据源选择和统计信息 */}
            <div className="backdrop-blur-sm bg-white/80 rounded-xl shadow-lg border border-gray-200/50 p-6">
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        选择数据源
                    </label>
                    <select
                        value={selectedDatasource || ''}
                        onChange={(e) => setSelectedDatasource(Number(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        {datasources.map(ds => (
                            <option key={ds.id} value={ds.id}>
                                {ds.name} ({ds.type})
                            </option>
                        ))}
                    </select>
                </div>

                {metadata && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                                <Database className="w-5 h-5 text-blue-600" />
                                <span className="text-sm font-medium text-gray-600">总表数</span>
                            </div>
                            <p className="text-3xl font-bold text-blue-600">{metadata.total_tables}</p>
                        </div>

                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                                <Table2 className="w-5 h-5 text-blue-700" />
                                <span className="text-sm font-medium text-gray-600">DWD明细层</span>
                            </div>
                            <p className="text-3xl font-bold text-blue-700">{metadata.dwd_table_count}</p>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                                <Layers className="w-5 h-5 text-green-600" />
                                <span className="text-sm font-medium text-gray-600">DWS汇总层</span>
                            </div>
                            <p className="text-3xl font-bold text-green-600">{metadata.dws_table_count}</p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                            <div className="flex items-center gap-2 mb-2">
                                <Info className="w-5 h-5 text-purple-600" />
                                <span className="text-sm font-medium text-gray-600">业务域</span>
                            </div>
                            <p className="text-3xl font-bold text-purple-600">{metadata.domains?.length || 0}</p>
                        </div>
                    </div>
                )}

                {metadata?.domains && metadata.domains.length > 0 && (
                    <div className="mb-6">
                        <p className="text-sm font-medium text-gray-600 mb-2">业务域分布：</p>
                        <div className="flex flex-wrap gap-2">
                            {metadata.domains.map(domain => (
                                <span
                                    key={domain}
                                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium border border-gray-300"
                                >
                  {domain}
                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* AI推荐区域 */}
            <div className="backdrop-blur-sm bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-lg border border-purple-200/50 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">AI智能推荐</h3>
                        <p className="text-sm text-gray-600">描述你的查询需求，AI将推荐最合适的表</p>
                    </div>
                </div>

                <div className="flex gap-3 mb-4">
                    <input
                        type="text"
                        value={recommendQuery}
                        onChange={(e) => setRecommendQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRecommend()}
                        placeholder="例如：查询昨天的订单统计、分析客户购买行为..."
                        className="flex-1 px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        disabled={recommendLoading}
                    />
                    <button
                        onClick={handleRecommend}
                        disabled={recommendLoading || !recommendQuery.trim()}
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
                    >
                        {recommendLoading ? (
                            <>
                                <Activity className="w-5 h-5 animate-spin" />
                                分析中...
                            </>
                        ) : (
                            <>
                                <Lightbulb className="w-5 h-5" />
                                获取推荐
                            </>
                        )}
                    </button>
                </div>

                <div className="flex items-start gap-2 mb-4 text-sm text-purple-700 bg-purple-100/50 rounded-lg p-3 border border-purple-200">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>
                        <span className="font-semibold">AI推荐，仅供参考。</span>
                        推荐结果由本地AI模型生成，可能存在偏差。你可以随时手动选择任意表进行查询。
                    </p>
                </div>

                {/* 推荐结果 */}
                {recommendations && recommendations.recommendations && recommendations.recommendations.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="font-semibold text-gray-800 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-purple-600" />
                                推荐结果：
                            </p>
                            {/* 使用推荐的表查询按钮（新增） */}
                            <button
                                onClick={handleUseRecommendedTables}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                            >
                                <ArrowRight className="w-4 h-4" />
                                使用推荐的表查询
                            </button>
                        </div>
                        {recommendations.recommendations.map((rec, index) => (
                            <div
                                key={index}
                                className="bg-white rounded-lg border border-purple-300 p-4 hover:border-purple-500 cursor-pointer transition-all duration-200 hover:shadow-md"
                                onClick={() => {
                                    const table = schemaData?.table_details?.find(t => t.table_name === rec.table_name);
                                    if (table) {
                                        handleTableClick(table);
                                        setTimeout(() => {
                                            const element = document.getElementById(`table-${rec.table_name}`);
                                            if (element) {
                                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            }
                                        }, 100);
                                    }
                                }}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Database className="w-5 h-5 text-purple-600" />
                                        <span className="font-bold text-gray-800">{rec.table_name}</span>
                                    </div>
                                    {getConfidenceBadge(rec.confidence)}
                                </div>
                                <p className="text-sm text-gray-700 mb-2">{rec.reason}</p>
                                {rec.match_keywords && rec.match_keywords.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {rec.match_keywords.map((keyword, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-medium"
                                            >
                        {keyword}
                      </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {recommendations.alternatives && recommendations.alternatives.length > 0 && (
                            <div className="mt-4">
                                <p className="text-sm font-medium text-gray-600 mb-2">其他可选表：</p>
                                <div className="flex flex-wrap gap-2">
                                    {recommendations.alternatives.map((tableName, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                const table = schemaData?.table_details?.find(t => t.table_name === tableName);
                                                if (table) {
                                                    handleTableClick(table);
                                                    setTimeout(() => {
                                                        const element = document.getElementById(`table-${tableName}`);
                                                        if (element) {
                                                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                        }
                                                    }, 100);
                                                }
                                            }}
                                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium border border-gray-300 hover:bg-purple-50 hover:border-purple-300 transition-colors"
                                        >
                                            {tableName}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {recommendError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-red-800">推荐失败</p>
                            <p className="text-sm text-red-600 mt-1">{recommendError}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* DWD明细层 */}
            {dwdTables.length > 0 && (
                <div className="backdrop-blur-sm bg-white/80 rounded-xl shadow-lg border border-gray-200/50 overflow-hidden">
                    <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 cursor-pointer flex items-center justify-between"
                        onClick={() => toggleSection('dwd')}
                    >
                        <div className="flex items-center gap-3">
                            {expandedSections.dwd ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                            <Table2 className="w-6 h-6" />
                            <span className="text-lg font-bold">DWD 明细层</span>
                            <span className="text-sm bg-white/20 px-2 py-1 rounded-md">{dwdTables.length} 张表</span>
                        </div>
                    </div>

                    {expandedSections.dwd && (
                        <div className="p-4 space-y-2">
                            {dwdTables.map(table => (
                                <div key={table.table_name} id={`table-${table.table_name}`}>
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 hover:border-blue-400 transition-all duration-200 hover:shadow-md">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => handleTableClick(table)}>
                                                <Database className="w-5 h-5 text-blue-600" />
                                                <div>
                                                    <p className="font-bold text-gray-800">{table.table_name}</p>
                                                    <p className="text-sm text-gray-600">
                                                        {table.row_count.toLocaleString()} 条记录 · {table.column_count} 个字段 · {table.domain}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getPerformanceBadge(table.performance_level)}
                                                {/* 使用此表查询按钮（新增） */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleUseTable(table.table_name);
                                                    }}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm hover:shadow-md"
                                                >
                                                    <ArrowRight className="w-4 h-4" />
                                                    使用此表查询
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedTable?.table_name === table.table_name && (
                                        <div className="ml-8 mt-2 bg-white rounded-lg border border-gray-200 p-4">
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-600 mb-1">数据层级</p>
                                                        {getLayerBadge(table.layer)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-600 mb-1">业务域</p>
                                                        <p className="font-medium text-gray-800">{table.domain}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-600 mb-1">查询性能</p>
                                                        {getPerformanceBadge(table.performance_level)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-600 mb-1">关联表</p>
                                                        <p className="font-medium text-gray-800">
                                                            {table.related_tables.length > 0 ? table.related_tables.join(', ') : '无'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {table.use_cases && table.use_cases.length > 0 && (
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-600 mb-2">💡 适用场景</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {table.use_cases.map(useCase => (
                                                                <span
                                                                    key={useCase}
                                                                    className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-sm border border-blue-200"
                                                                >
                                  {useCase}
                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div>
                                                    <p className="text-sm font-medium text-gray-600 mb-2">📋 字段列表</p>
                                                    <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                                                        <table className="w-full text-sm">
                                                            <thead className="border-b border-gray-200">
                                                            <tr>
                                                                <th className="text-left py-2 px-2 font-medium text-gray-600">字段名</th>
                                                                <th className="text-left py-2 px-2 font-medium text-gray-600">类型</th>
                                                                <th className="text-left py-2 px-2 font-medium text-gray-600">可空</th>
                                                            </tr>
                                                            </thead>
                                                            <tbody>
                                                            {table.columns.map(col => (
                                                                <tr key={col.name} className="border-b border-gray-100">
                                                                    <td className="py-2 px-2 font-mono text-gray-800">{col.name}</td>
                                                                    <td className="py-2 px-2 text-gray-600">{col.type}</td>
                                                                    <td className="py-2 px-2 text-gray-600">{col.nullable ? '✓' : '✗'}</td>
                                                                </tr>
                                                            ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* DWS汇总层 */}
            {dwsTables.length > 0 && (
                <div className="backdrop-blur-sm bg-white/80 rounded-xl shadow-lg border border-gray-200/50 overflow-hidden">
                    <div
                        className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 cursor-pointer flex items-center justify-between"
                        onClick={() => toggleSection('dws')}
                    >
                        <div className="flex items-center gap-3">
                            {expandedSections.dws ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                            <Layers className="w-6 h-6" />
                            <span className="text-lg font-bold">DWS 汇总层</span>
                            <span className="text-sm bg-white/20 px-2 py-1 rounded-md">{dwsTables.length} 张表</span>
                        </div>
                    </div>

                    {expandedSections.dws && (
                        <div className="p-4 space-y-2">
                            {dwsTables.map(table => (
                                <div key={table.table_name} id={`table-${table.table_name}`}>
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200 hover:border-green-400 transition-all duration-200 hover:shadow-md">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => handleTableClick(table)}>
                                                <Zap className="w-5 h-5 text-green-600" />
                                                <div>
                                                    <p className="font-bold text-gray-800">{table.table_name}</p>
                                                    <p className="text-sm text-gray-600">
                                                        {table.row_count.toLocaleString()} 条记录 · {table.column_count} 个字段 · {table.domain}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getPerformanceBadge(table.performance_level)}
                                                {/* 使用此表查询按钮（新增） */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleUseTable(table.table_name);
                                                    }}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors shadow-sm hover:shadow-md"
                                                >
                                                    <ArrowRight className="w-4 h-4" />
                                                    使用此表查询
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedTable?.table_name === table.table_name && (
                                        <div className="ml-8 mt-2 bg-white rounded-lg border border-gray-200 p-4">
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-600 mb-1">数据层级</p>
                                                        {getLayerBadge(table.layer)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-600 mb-1">业务域</p>
                                                        <p className="font-medium text-gray-800">{table.domain}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-600 mb-1">查询性能</p>
                                                        {getPerformanceBadge(table.performance_level)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-600 mb-1">关联表</p>
                                                        <p className="font-medium text-gray-800">
                                                            {table.related_tables.length > 0 ? table.related_tables.join(', ') : '无'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {table.use_cases && table.use_cases.length > 0 && (
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-600 mb-2">💡 适用场景</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {table.use_cases.map(useCase => (
                                                                <span
                                                                    key={useCase}
                                                                    className="px-2 py-1 bg-green-50 text-green-700 rounded-md text-sm border border-green-200"
                                                                >
                                  {useCase}
                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div>
                                                    <p className="text-sm font-medium text-gray-600 mb-2">📋 字段列表</p>
                                                    <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                                                        <table className="w-full text-sm">
                                                            <thead className="border-b border-gray-200">
                                                            <tr>
                                                                <th className="text-left py-2 px-2 font-medium text-gray-600">字段名</th>
                                                                <th className="text-left py-2 px-2 font-medium text-gray-600">类型</th>
                                                                <th className="text-left py-2 px-2 font-medium text-gray-600">可空</th>
                                                            </tr>
                                                            </thead>
                                                            <tbody>
                                                            {table.columns.map(col => (
                                                                <tr key={col.name} className="border-b border-gray-100">
                                                                    <td className="py-2 px-2 font-mono text-gray-800">{col.name}</td>
                                                                    <td className="py-2 px-2 text-gray-600">{col.type}</td>
                                                                    <td className="py-2 px-2 text-gray-600">{col.nullable ? '✓' : '✗'}</td>
                                                                </tr>
                                                            ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {metadata && !metadata.has_layer_info && (
                <div className="backdrop-blur-sm bg-yellow-50 rounded-xl border border-yellow-200 p-6">
                    <div className="flex items-start gap-3">
                        <Info className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                        <div>
                            <p className="font-bold text-yellow-800 mb-2">此数据库未包含分层信息</p>
                            <p className="text-sm text-yellow-700">
                                当前数据库没有明确的DWD/DWS分层结构。所有表将默认显示为明细层。
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatabaseCognition;