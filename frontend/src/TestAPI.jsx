import React, { useState } from 'react';

function TestAPI() {
    const [result, setResult] = useState('');

    const testDirect = async () => {
        try {
            setResult('测试中...');

            const response = await fetch('http://localhost:8000/api/text2sql/health', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();
            setResult('✅ 成功: ' + JSON.stringify(data, null, 2));
        } catch (error) {
            setResult('❌ 失败: ' + error.message);
        }
    };

    const testGenerate = async () => {
        try {
            setResult('测试中...');

            const response = await fetch('http://localhost:8000/api/text2sql/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: '查询所有订单',
                    schema: [
                        {
                            table_name: 'orders',
                            columns: [
                                { name: 'invoice_no', type: 'TEXT' }
                            ]
                        }
                    ]
                }),
            });

            const data = await response.json();
            setResult('✅ 成功: ' + JSON.stringify(data, null, 2));
        } catch (error) {
            setResult('❌ 失败: ' + error.message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
                <h1 className="text-2xl font-bold mb-6">API 测试工具</h1>

                <div className="space-y-4">
                    <button
                        onClick={testDirect}
                        className="w-full bg-blue-500 text-white px-4 py-3 rounded hover:bg-blue-600"
                    >
                        测试健康检查 (GET /api/text2sql/health)
                    </button>

                    <button
                        onClick={testGenerate}
                        className="w-full bg-green-500 text-white px-4 py-3 rounded hover:bg-green-600"
                    >
                        测试生成SQL (POST /api/text2sql/generate)
                    </button>
                </div>

                {result && (
                    <div className="mt-6 p-4 bg-gray-50 rounded border">
                        <pre className="text-sm whitespace-pre-wrap">{result}</pre>
                    </div>
                )}

                <div className="mt-6 text-sm text-gray-600">
                    <p className="font-semibold mb-2">调试步骤：</p>
                    <ol className="list-decimal list-inside space-y-1">
                        <li>打开浏览器开发者工具 (F12)</li>
                        <li>切换到 Network 标签</li>
                        <li>点击上面的测试按钮</li>
                        <li>查看请求是否发出</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}

export default TestAPI;