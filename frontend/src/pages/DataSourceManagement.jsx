/**
 * DataSourceManagement.jsx - 数据源管理页面
 * 功能：上传、测试连接、状态监控、刷新列表
 * 解决"双轨制"问题：上传后自动写入app.db并验证
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    Database,
    Upload,
    CheckCircle,
    XCircle,
    AlertCircle,
    RefreshCw,
    FileCheck,
    Activity,
    Trash2,
    Settings,
    ChevronDown,
    ChevronRight,
    Loader
} from 'lucide-react';
import { datasourceAPI } from '../services/api';

const DataSourceManagement = () => {
    // ===== 状态管理 =====
    const [datasources, setDatasources] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 上传相关状态
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadResult, setUploadResult] = useState(null);
    const [dragOver, setDragOver] = useState(false);

    // 测试连接相关状态
    const [testingId, setTestingId] = useState(null);
    const [testResults, setTestResults] = useState({});
    const [showTestModal, setShowTestModal] = useState(false);
    const [currentTestResult, setCurrentTestResult] = useState(null);

    // 文件输入引用
    const fileInputRef = useRef(null);

    // ===== 生命周期 =====
    useEffect(() => {
        loadDatasources();
    }, []);

    // ===== 数据加载 =====
    const loadDatasources = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await datasourceAPI.list();
            setDatasources(response.items || []);
        } catch (err) {
            setError('加载数据源失败: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // ===== 文件上传功能 =====
    const handleFileSelect = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            uploadFile(file);
        }
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setDragOver(false);

        const file = event.dataTransfer.files?.[0];
        if (file) {
            uploadFile(file);
        }
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    const uploadFile = async (file) => {
        // 验证文件类型
        if (!file.name.match(/\.(db|sqlite|sqlite3)$/i)) {
            setError('只支持 .db, .sqlite, .sqlite3 格式的数据库文件');
            return;
        }

        setUploading(true);
        setUploadProgress(0);
        setUploadResult(null);
        setError(null);

        try {
            // Step 1: 上传文件
            const result = await datasourceAPI.upload(
                file,
                null,
                (progress) => setUploadProgress(progress)
            );

            // Step 2: 显示上传结果
            setUploadResult(result);

            // Step 3: 自动测试连接
            if (result.success && result.datasource_id) {
                setTimeout(async () => {
                    await testConnection(result.datasource_id, true);
                }, 500);
            }

            // Step 4: 刷新列表
            await loadDatasources();

        } catch (err) {
            setError('上传失败: ' + err.message);
            setUploadResult(null);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    // ===== 测试连接功能 =====
    const testConnection = async (datasourceId, autoTest = false) => {
        setTestingId(datasourceId);

        if (!autoTest) {
            setShowTestModal(true);
            setCurrentTestResult({
                datasourceId,
                status: 'testing',
                steps: [
                    { name: '检查文件是否存在', status: 'testing' },
                    { name: '尝试打开数据库', status: 'pending' },
                    { name: '执行测试查询', status: 'pending' },
                ]
            });
        }

        try {
            // 模拟步骤进度（仅在非自动测试时）
            if (!autoTest) {
                await updateTestStep(0, 'success');
                await new Promise(resolve => setTimeout(resolve, 300));
                await updateTestStep(1, 'testing');
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            // 实际测试
            const result = await datasourceAPI.testConnection(datasourceId);

            // 更新步骤状态
            if (!autoTest) {
                await updateTestStep(1, result.status.accessible ? 'success' : 'error');
                await updateTestStep(2, 'testing');
                await new Promise(resolve => setTimeout(resolve, 300));
                await updateTestStep(2, result.status.queryable ? 'success' : 'error');
            }

            // 保存测试结果
            setTestResults(prev => ({
                ...prev,
                [datasourceId]: result
            }));

            if (!autoTest) {
                setCurrentTestResult({
                    datasourceId,
                    status: result.success ? 'success' : 'error',
                    result: result,
                    steps: [
                        { name: '检查文件是否存在', status: result.status.file_exists ? 'success' : 'error' },
                        { name: '尝试打开数据库', status: result.status.accessible ? 'success' : 'error' },
                        { name: '执行测试查询', status: result.status.queryable ? 'success' : 'error' },
                    ]
                });
            }

        } catch (err) {
            setError('测试连接失败: ' + err.message);
            if (!autoTest) {
                setCurrentTestResult({
                    datasourceId,
                    status: 'error',
                    error: err.message,
                    steps: [
                        { name: '检查文件是否存在', status: 'error' },
                        { name: '尝试打开数据库', status: 'error' },
                        { name: '执行测试查询', status: 'error' },
                    ]
                });
            }
        } finally {
            setTestingId(null);
        }
    };

    const updateTestStep = async (stepIndex, status) => {
        setCurrentTestResult(prev => {
            if (!prev) return null;
            const newSteps = [...prev.steps];
            newSteps[stepIndex] = { ...newSteps[stepIndex], status };
            return { ...prev, steps: newSteps };
        });
    };

    // ===== 刷新功能 =====
    const handleRefresh = async () => {
        try {
            await datasourceAPI.refresh();
            await loadDatasources();
        } catch (err) {
            setError('刷新失败: ' + err.message);
        }
    };

    // ===== 删除功能 =====
    const handleDelete = async (datasourceId, name) => {
        if (!window.confirm(`确定要删除数据源 "${name}" 吗？`)) {
            return;
        }

        try {
            await datasourceAPI.delete(datasourceId);
            await loadDatasources();
        } catch (err) {
            setError('删除失败: ' + err.message);
        }
    };

    // ===== UI辅助函数 =====
    const getStatusBadge = (status) => {
        if (status.uploaded === false) {
            return {
                icon: <XCircle className="w-4 h-4" />,
                text: '文件缺失',
                color: 'bg-red-100 text-red-700 border-red-300'
            };
        }

        const testResult = testResults[status.datasourceId];
        if (!testResult) {
            return {
                icon: <AlertCircle className="w-4 h-4" />,
                text: '未测试',
                color: 'bg-gray-100 text-gray-700 border-gray-300'
            };
        }

        if (testResult.status?.queryable) {
            return {
                icon: <CheckCircle className="w-4 h-4" />,
                text: '可查询',
                color: 'bg-green-100 text-green-700 border-green-300'
            };
        }

        return {
            icon: <XCircle className="w-4 h-4" />,
            text: '不可用',
            color: 'bg-red-100 text-red-700 border-red-300'
        };
    };

    const getStepIcon = (status) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'error':
                return <XCircle className="w-5 h-5 text-red-600" />;
            case 'testing':
                return <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
            default:
                return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
        }
    };

    // ===== 渲染 =====
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* 标题栏 */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Database className="w-8 h-8 text-blue-600" />
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">数据源管理</h1>
                            <p className="text-gray-600 text-sm mt-1">
                                上传、测试、管理您的数据库文件
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleRefresh}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                    >
                        <RefreshCw className="w-4 h-4" />
                        刷新列表
                    </button>
                </div>

                {/* 错误提示 */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-red-800">错误</p>
                            <p className="text-red-700 text-sm mt-1">{error}</p>
                        </div>
                        <button
                            onClick={() => setError(null)}
                            className="ml-auto text-red-600 hover:text-red-800"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* 上传区域 */}
                <div className="backdrop-blur-sm bg-white/80 rounded-xl shadow-lg border border-gray-200/50 p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        上传数据库文件
                    </h2>

                    {/* 拖拽上传区 */}
                    <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
                            dragOver
                                ? 'border-blue-500 bg-blue-50'
                                : uploading
                                    ? 'border-gray-300 bg-gray-50 cursor-wait'
                                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
                        }`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => !uploading && fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".db,.sqlite,.sqlite3"
                            onChange={handleFileSelect}
                            className="hidden"
                            disabled={uploading}
                        />

                        {uploading ? (
                            <div className="space-y-4">
                                <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
                                <p className="text-gray-700 font-medium">上传中...</p>
                                <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                                <p className="text-gray-600 text-sm">{uploadProgress}%</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                                <p className="text-gray-700 font-medium">
                                    拖拽文件到此处，或点击选择文件
                                </p>
                                <p className="text-gray-500 text-sm">
                                    支持格式：.db, .sqlite, .sqlite3
                                </p>
                            </div>
                        )}
                    </div>

                    {/* 上传结果 */}
                    {uploadResult && (
                        <div className={`mt-4 p-4 rounded-lg border ${
                            uploadResult.success
                                ? 'bg-green-50 border-green-200'
                                : 'bg-red-50 border-red-200'
                        }`}>
                            <div className="flex items-start gap-3">
                                {uploadResult.success ? (
                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                ) : (
                                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1">
                                    <p className={`font-medium ${
                                        uploadResult.success ? 'text-green-800' : 'text-red-800'
                                    }`}>
                                        {uploadResult.message}
                                    </p>
                                    {uploadResult.success && (
                                        <>
                                            <p className="text-green-700 text-sm mt-1">
                                                文件名：{uploadResult.name}
                                            </p>
                                            <p className="text-green-700 text-sm">
                                                数据源ID：{uploadResult.datasource_id}
                                            </p>
                                            {uploadResult.status?.queryable && (
                                                <p className="text-green-700 text-sm font-medium mt-2">
                                                    🎉 数据源已就绪，可以开始查询！
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 数据源列表部分在第二部分继续 */}

                {/* 数据源列表 */}
                <div className="backdrop-blur-sm bg-white/80 rounded-xl shadow-lg border border-gray-200/50 p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Database className="w-5 h-5" />
                        数据源列表
                        <span className="text-sm font-normal text-gray-600">
              （共 {datasources.length} 个）
            </span>
                    </h2>

                    {loading ? (
                        <div className="text-center py-12">
                            <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                            <p className="text-gray-600">加载中...</p>
                        </div>
                    ) : datasources.length === 0 ? (
                        <div className="text-center py-12">
                            <Database className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-600 font-medium">暂无数据源</p>
                            <p className="text-gray-500 text-sm mt-1">
                                请上传数据库文件以开始使用
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {datasources.map((ds) => {
                                const testResult = testResults[ds.id];
                                const status = getStatusBadge({
                                    uploaded: true,
                                    datasourceId: ds.id
                                });
                                const isTesting = testingId === ds.id;

                                return (
                                    <div
                                        key={ds.id}
                                        className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-200"
                                    >
                                        {/* 卡片头部 */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Database className="w-5 h-5 text-blue-600" />
                                                    <h3 className="font-bold text-gray-800 truncate">
                                                        {ds.name}
                                                    </h3>
                                                </div>
                                                <p className="text-xs text-gray-500 truncate" title={ds.file_path}>
                                                    {ds.file_path}
                                                </p>
                                            </div>

                                            {/* 默认数据源标记 */}
                                            {ds.is_default && (
                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-md border border-blue-200">
                          默认
                        </span>
                                            )}
                                        </div>

                                        {/* 状态信息 */}
                                        <div className="space-y-2 mb-3">
                                            {/* 状态1：文件上传 */}
                                            <div className="flex items-center gap-2">
                                                <FileCheck className="w-4 h-4 text-gray-500" />
                                                <span className="text-sm text-gray-700">文件状态：</span>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${
                                                    ds.status?.uploaded !== false
                                                        ? 'bg-green-100 text-green-700 border-green-300'
                                                        : 'bg-red-100 text-red-700 border-red-300'
                                                }`}>
                          {ds.status?.uploaded !== false ? '✅ 已上传' : '❌ 文件缺失'}
                        </span>
                                            </div>

                                            {/* 状态2：可查询 */}
                                            <div className="flex items-center gap-2">
                                                <Activity className="w-4 h-4 text-gray-500" />
                                                <span className="text-sm text-gray-700">查询状态：</span>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${status.color}`}>
                          {status.icon}
                                                    {status.text}
                        </span>
                                            </div>

                                            {/* 测试结果详情 */}
                                            {testResult && testResult.status && (
                                                <div className="text-xs text-gray-600 mt-2 pl-6">
                                                    {testResult.status.table_count > 0 && (
                                                        <p>📊 {testResult.status.table_count} 张表</p>
                                                    )}
                                                    {testResult.last_checked && (
                                                        <p className="text-gray-500">
                                                            最后验证：{new Date(testResult.last_checked).toLocaleString('zh-CN')}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* 操作按钮 */}
                                        <div className="flex gap-2 pt-3 border-t border-gray-200">
                                            <button
                                                onClick={() => testConnection(ds.id)}
                                                disabled={isTesting}
                                                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                    isTesting
                                                        ? 'bg-gray-100 text-gray-400 cursor-wait'
                                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                                }`}
                                            >
                                                {isTesting ? (
                                                    <>
                                                        <Loader className="w-4 h-4 animate-spin" />
                                                        测试中...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Activity className="w-4 h-4" />
                                                        测试连接
                                                    </>
                                                )}
                                            </button>

                                            <button
                                                onClick={() => handleDelete(ds.id, ds.name)}
                                                className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                title="删除数据源"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 使用提示 */}
                <div className="backdrop-blur-sm bg-blue-50/80 rounded-xl border border-blue-200 p-6">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                        <div>
                            <p className="font-bold text-blue-800 mb-2">💡 使用提示</p>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li>• <strong>双状态验证</strong>：确保文件已上传 <strong>且</strong> 可以正常查询</li>
                                <li>• <strong>自动验证</strong>：上传后会自动测试连接，无需手动操作</li>
                                <li>• <strong>手动测试</strong>：点击"测试连接"按钮可随时重新验证</li>
                                <li>• <strong>刷新列表</strong>：如果数据源未显示，点击右上角"刷新列表"按钮</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* 测试连接弹窗 */}
                {showTestModal && currentTestResult && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                            {/* 弹窗标题 */}
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">测试连接</h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        数据源 ID: {currentTestResult.datasourceId}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowTestModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            {/* 测试步骤 */}
                            <div className="space-y-4 mb-6">
                                {currentTestResult.steps.map((step, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
                                    >
                                        {getStepIcon(step.status)}
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-800">
                                                {step.name}
                                            </p>
                                            {step.status === 'error' && (
                                                <p className="text-xs text-red-600 mt-1">
                                                    {currentTestResult.error || '失败'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* 测试结果摘要 */}
                            {currentTestResult.status !== 'testing' && (
                                <div className={`p-4 rounded-lg border ${
                                    currentTestResult.status === 'success'
                                        ? 'bg-green-50 border-green-200'
                                        : 'bg-red-50 border-red-200'
                                }`}>
                                    <div className="flex items-start gap-3">
                                        {currentTestResult.status === 'success' ? (
                                            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                                        ) : (
                                            <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                                        )}
                                        <div>
                                            <p className={`font-bold ${
                                                currentTestResult.status === 'success'
                                                    ? 'text-green-800'
                                                    : 'text-red-800'
                                            }`}>
                                                {currentTestResult.status === 'success'
                                                    ? '🎉 数据源完全可用！'
                                                    : '⚠️ 连接测试失败'
                                                }
                                            </p>
                                            {currentTestResult.result && currentTestResult.result.status && (
                                                <div className={`text-sm mt-2 ${
                                                    currentTestResult.status === 'success'
                                                        ? 'text-green-700'
                                                        : 'text-red-700'
                                                }`}>
                                                    {currentTestResult.result.status.table_count > 0 && (
                                                        <p>共 {currentTestResult.result.status.table_count} 张表</p>
                                                    )}
                                                    {currentTestResult.result.status.error && (
                                                        <p className="text-red-700">
                                                            错误：{currentTestResult.result.status.error}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 关闭按钮 */}
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={() => setShowTestModal(false)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    关闭
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataSourceManagement;