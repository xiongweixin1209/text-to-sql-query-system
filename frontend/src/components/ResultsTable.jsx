/**
 * ResultsTable - 查询结果表格（增强版 + 分页）
 * 新增功能：
 * 1. 列排序（点击列头排序）
 * 2. 列筛选（输入框筛选）
 * 3. 数据统计信息展示
 * 4. 导出功能（CSV/Excel）
 * 5. 前端分页（支持自定义每页条数）✨ 新增
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Download,
    Filter,
    BarChart3,
    Hash,
    Clock,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight
} from 'lucide-react';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ResultsTable = ({
                          data = [],
                          columns = [],
                          rowCount = 0,
                          executionTime = 0,
                          statistics = null,
                          userQuery = ''
                      }) => {
    // 排序状态
    const [sortConfig, setSortConfig] = useState({
        key: null,
        direction: null  // 'asc' | 'desc' | null
    });

    // 筛选状态
    const [filters, setFilters] = useState({});
    const [showFilters, setShowFilters] = useState(false);

    // AI解读状态
    const [interpretation, setInterpretation] = useState('');
    const [interpretLoading, setInterpretLoading] = useState(false);
    const interpretedRef = useRef(false);

    // 🆕 分页状态
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50); // 默认每页50条

    // 处理排序
    const handleSort = (columnKey) => {
        let direction = 'asc';

        if (sortConfig.key === columnKey) {
            if (sortConfig.direction === 'asc') {
                direction = 'desc';
            } else if (sortConfig.direction === 'desc') {
                // 取消排序
                setSortConfig({ key: null, direction: null });
                return;
            }
        }

        setSortConfig({ key: columnKey, direction });
    };

    // 处理筛选
    const handleFilterChange = (columnKey, value) => {
        setFilters(prev => ({
            ...prev,
            [columnKey]: value
        }));
    };

    // 🆕 当筛选或排序改变时，重置到第一页
    useEffect(() => {
        setCurrentPage(1);
    }, [filters, sortConfig]);

    // 数据加载完后自动请求AI解读
    useEffect(() => {
        if (!data || data.length === 0 || !userQuery || interpretedRef.current) return;

        const fetchInterpretation = async () => {
            setInterpretLoading(true);
            interpretedRef.current = true;
            try {
                const response = await fetch('http://localhost:8000/api/text2sql/interpret', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_query: userQuery,
                        columns: columns,
                        data: data.slice(0, 20)
                    })
                });
                const result = await response.json();
                if (result.success) {
                    setInterpretation(result.interpretation);
                }
            } catch (e) {
                console.error('解读请求失败', e);
            } finally {
                setInterpretLoading(false);
            }
        };

        fetchInterpretation();
    }, [data, userQuery]);

    // 应用排序和筛选（不包括分页）
    const filteredAndSortedData = useMemo(() => {
        let result = [...data];

        // 1. 应用筛选
        if (Object.keys(filters).length > 0) {
            result = result.filter(row => {
                return Object.entries(filters).every(([key, filterValue]) => {
                    if (!filterValue) return true;

                    const cellValue = row[key];
                    if (cellValue == null) return false;

                    // 不区分大小写的字符串匹配
                    return String(cellValue)
                        .toLowerCase()
                        .includes(filterValue.toLowerCase());
                });
            });
        }

        // 2. 应用排序
        if (sortConfig.key) {
            result.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];

                // 处理null/undefined
                if (aVal == null) return 1;
                if (bVal == null) return -1;

                // 尝试数值比较
                const aNum = Number(aVal);
                const bNum = Number(bVal);

                if (!isNaN(aNum) && !isNaN(bNum)) {
                    return sortConfig.direction === 'asc'
                        ? aNum - bNum
                        : bNum - aNum;
                }

                // 字符串比较
                const aStr = String(aVal);
                const bStr = String(bVal);

                return sortConfig.direction === 'asc'
                    ? aStr.localeCompare(bStr)
                    : bStr.localeCompare(aStr);
            });
        }

        return result;
    }, [data, sortConfig, filters]);

    // 🆕 计算分页信息
    const paginationInfo = useMemo(() => {
        const totalItems = filteredAndSortedData.length;
        const totalPages = Math.ceil(totalItems / pageSize);
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalItems);

        return {
            totalItems,
            totalPages,
            startIndex,
            endIndex,
            hasNextPage: currentPage < totalPages,
            hasPrevPage: currentPage > 1
        };
    }, [filteredAndSortedData, currentPage, pageSize]);

    // 🆕 应用分页（最终显示的数据）
    const displayData = useMemo(() => {
        const { startIndex, endIndex } = paginationInfo;
        return filteredAndSortedData.slice(startIndex, endIndex);
    }, [filteredAndSortedData, paginationInfo]);

    // 🆕 分页控制函数
    const goToPage = (page) => {
        setCurrentPage(Math.max(1, Math.min(page, paginationInfo.totalPages)));
    };

    const goToFirstPage = () => setCurrentPage(1);
    const goToLastPage = () => setCurrentPage(paginationInfo.totalPages);
    const goToPrevPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
    const goToNextPage = () => setCurrentPage(prev => Math.min(paginationInfo.totalPages, prev + 1));

    const changePageSize = (newSize) => {
        setPageSize(newSize);
        setCurrentPage(1); // 重置到第一页
    };

    // 导出为CSV（导出所有筛选后的数据，不仅仅是当前页）
    const exportToCSV = () => {
        if (!filteredAndSortedData.length) return;

        // 生成CSV内容
        const headers = columns.join(',');
        const rows = filteredAndSortedData.map(row =>
            columns.map(col => {
                const value = row[col];
                // 处理包含逗号的值（用引号包裹）
                if (String(value).includes(',')) {
                    return `"${value}"`;
                }
                return value ?? '';
            }).join(',')
        ).join('\n');

        const csv = `${headers}\n${rows}`;

        // 创建下载链接
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `query_result_${new Date().getTime()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // 复制到剪贴板（复制所有筛选后的数据）
    const copyToClipboard = () => {
        if (!filteredAndSortedData.length) return;

        const headers = columns.join('\t');
        const rows = filteredAndSortedData.map(row =>
            columns.map(col => row[col] ?? '').join('\t')
        ).join('\n');

        const text = `${headers}\n${rows}`;
        navigator.clipboard.writeText(text);

        // 简单的成功提示（你可以替换为更好的Toast组件）
        alert('✅ 数据已复制到剪贴板！');
    };

    // 获取排序图标
    const getSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) {
            return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />;
        }

        return sortConfig.direction === 'asc'
            ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
            : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />;
    };

    // 🆕 生成页码按钮数组
    const getPageNumbers = () => {
        const { totalPages } = paginationInfo;
        const maxVisible = 7; // 最多显示7个页码按钮

        if (totalPages <= maxVisible) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const pages = [];
        const leftEdge = 1;
        const rightEdge = totalPages;
        const leftRadius = 1;
        const rightRadius = 1;

        // 总是显示第一页
        pages.push(leftEdge);

        // 当前页附近的页码
        const start = Math.max(currentPage - leftRadius, leftEdge + 1);
        const end = Math.min(currentPage + rightRadius, rightEdge - 1);

        // 如果start和第一页之间有间隙，加省略号
        if (start > leftEdge + 1) {
            pages.push('...');
        }

        // 添加中间页码
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        // 如果end和最后一页之间有间隙，加省略号
        if (end < rightEdge - 1) {
            pages.push('...');
        }

        // 总是显示最后一页
        if (totalPages > 1) {
            pages.push(rightEdge);
        }

        return pages;
    };

    if (!data || data.length === 0) {
        return (
            <div className="text-center py-12 text-gray-400">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <BarChart3 className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-lg font-medium">暂无数据</p>
                <p className="text-sm mt-2">请执行查询获取结果</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* 极简图表：仅当恰好2列且第二列全为数字时显示 */}
            {columns.length === 2 && data.length > 0 && data.every(row => !isNaN(Number(row[columns[1]]))) && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
                        数据可视化
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={data.slice(0, 20)} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                                dataKey={columns[0]}
                                tick={{ fontSize: 11 }}
                                angle={-35}
                                textAnchor="end"
                                interval={0}
                            />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey={columns[1]} fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* AI解读区域 */}
            {(interpretLoading || interpretation) && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-purple-600 text-sm font-semibold">🤖 AI 数据解读</span>
                    </div>
                    {interpretLoading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                            正在分析数据...
                        </div>
                    ) : (
                        <p className="text-sm text-gray-700 leading-relaxed">{interpretation}</p>
                    )}
                </div>
            )}
            {/* 统计信息面板 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 基础统计 */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                            <Hash className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-blue-600 font-medium">返回行数</p>
                            <p className="text-2xl font-bold text-blue-900">
                                {filteredAndSortedData.length}
                                {filteredAndSortedData.length !== rowCount && (
                                    <span className="text-sm text-blue-500 ml-1">
                    / {rowCount}
                  </span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-200/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-purple-600 font-medium">列数</p>
                            <p className="text-2xl font-bold text-purple-900">
                                {statistics?.column_count || columns.length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-4 border border-green-200/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                            <Clock className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-green-600 font-medium">执行时间</p>
                            <p className="text-2xl font-bold text-green-900">
                                {executionTime}
                                <span className="text-sm text-green-600 ml-1">ms</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* 数值列统计（如果有） */}
                {statistics?.numeric_columns && Object.keys(statistics.numeric_columns).length > 0 && (
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-4 border border-orange-200/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-orange-600 font-medium">数值列</p>
                                <p className="text-2xl font-bold text-orange-900">
                                    {Object.keys(statistics.numeric_columns).length}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 数值列详细统计（如果有） */}
            {statistics?.numeric_columns && Object.keys(statistics.numeric_columns).length > 0 && (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">📊 数值列统计</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(statistics.numeric_columns).map(([colName, stats]) => (
                            <div key={colName} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <p className="text-sm font-medium text-gray-700 mb-2">{colName}</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-gray-500">总和：</span>
                                        <span className="font-semibold text-gray-900 ml-1">
                      {stats.sum.toLocaleString()}
                    </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">均值：</span>
                                        <span className="font-semibold text-gray-900 ml-1">
                      {stats.avg.toLocaleString()}
                    </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">最大：</span>
                                        <span className="font-semibold text-gray-900 ml-1">
                      {stats.max.toLocaleString()}
                    </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">最小：</span>
                                        <span className="font-semibold text-gray-900 ml-1">
                      {stats.min.toLocaleString()}
                    </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 操作按钮栏 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                            showFilters
                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <Filter className="w-4 h-4" />
                        <span className="text-sm font-medium">
              {showFilters ? '隐藏筛选' : '显示筛选'}
            </span>
                    </button>

                    {(Object.keys(filters).some(key => filters[key]) || sortConfig.key) && (
                        <button
                            onClick={() => {
                                setFilters({});
                                setSortConfig({ key: null, direction: null });
                            }}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg border border-gray-300 transition-all"
                        >
                            清除筛选/排序
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
                    >
                        <Download className="w-4 h-4" />
                        复制数据
                    </button>

                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all text-sm font-medium shadow-lg shadow-blue-500/30"
                    >
                        <Download className="w-4 h-4" />
                        导出CSV
                    </button>
                </div>
            </div>

            {/* 表格容器 */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col}
                                    className="px-4 py-3 text-left"
                                >
                                    <div className="flex flex-col gap-2">
                                        {/* 列头（可排序） */}
                                        <button
                                            onClick={() => handleSort(col)}
                                            className="flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-blue-600 transition-colors group"
                                        >
                                            <span>{col}</span>
                                            {getSortIcon(col)}
                                        </button>

                                        {/* 筛选输入框 */}
                                        {showFilters && (
                                            <input
                                                type="text"
                                                placeholder="筛选..."
                                                value={filters[col] || ''}
                                                onChange={(e) => handleFilterChange(col, e.target.value)}
                                                className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                        {displayData.map((row, rowIndex) => (
                            <tr
                                key={rowIndex}
                                className="hover:bg-blue-50/50 transition-colors"
                            >
                                {columns.map((col) => (
                                    <td
                                        key={`${rowIndex}-${col}`}
                                        className="px-4 py-3 text-sm text-gray-700"
                                    >
                                        {row[col] ?? <span className="text-gray-400">null</span>}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                {/* 🆕 分页控制栏 */}
                {paginationInfo.totalPages > 1 && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            {/* 左侧：显示信息 */}
                            <div className="flex items-center gap-4">
                                <div className="text-sm text-gray-600">
                                    显示 <span className="font-semibold text-gray-900">{paginationInfo.startIndex + 1}</span> - <span className="font-semibold text-gray-900">{paginationInfo.endIndex}</span> 条，
                                    共 <span className="font-semibold text-gray-900">{paginationInfo.totalItems}</span> 条
                                    {Object.keys(filters).some(key => filters[key]) && (
                                        <span className="text-blue-600 ml-2">（已筛选）</span>
                                    )}
                                </div>

                                {/* 每页条数选择 */}
                                <select
                                    value={pageSize}
                                    onChange={(e) => changePageSize(Number(e.target.value))}
                                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                >
                                    <option value={10}>10 条/页</option>
                                    <option value={25}>25 条/页</option>
                                    <option value={50}>50 条/页</option>
                                    <option value={100}>100 条/页</option>
                                    <option value={200}>200 条/页</option>
                                </select>
                            </div>

                            {/* 右侧：分页按钮 */}
                            <div className="flex items-center gap-1">
                                {/* 首页 */}
                                <button
                                    onClick={goToFirstPage}
                                    disabled={!paginationInfo.hasPrevPage}
                                    className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    title="首页"
                                >
                                    <ChevronsLeft className="w-4 h-4 text-gray-600" />
                                </button>

                                {/* 上一页 */}
                                <button
                                    onClick={goToPrevPage}
                                    disabled={!paginationInfo.hasPrevPage}
                                    className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    title="上一页"
                                >
                                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                                </button>

                                {/* 页码按钮 */}
                                {getPageNumbers().map((pageNum, index) => (
                                    pageNum === '...' ? (
                                        <span key={`ellipsis-${index}`} className="px-3 py-1 text-gray-500">
                      ...
                    </span>
                                    ) : (
                                        <button
                                            key={pageNum}
                                            onClick={() => goToPage(pageNum)}
                                            className={`min-w-[36px] px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                                currentPage === pageNum
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    )
                                ))}

                                {/* 下一页 */}
                                <button
                                    onClick={goToNextPage}
                                    disabled={!paginationInfo.hasNextPage}
                                    className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    title="下一页"
                                >
                                    <ChevronRight className="w-4 h-4 text-gray-600" />
                                </button>

                                {/* 末页 */}
                                <button
                                    onClick={goToLastPage}
                                    disabled={!paginationInfo.hasNextPage}
                                    className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    title="末页"
                                >
                                    <ChevronsRight className="w-4 h-4 text-gray-600" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResultsTable;