"""
LLM Service - 管理与Ollama的交互
负责：模型调用、Token统计、错误处理
"""

import requests
import json
from typing import Dict, List, Optional
import time


class LLMService:
    """Ollama LLM服务封装"""

    def __init__(
            self,
            base_url: str = "http://localhost:11434",
            model: str = "qwen2.5-coder:7b",
            timeout: int = 60
    ):
        """
        初始化LLM服务

        Args:
            base_url: Ollama服务地址
            model: 使用的模型名称
            timeout: 请求超时时间（秒）
        """
        self.base_url = base_url
        self.model = model
        self.timeout = timeout
        self.api_url = f"{base_url}/api/generate"

    def check_connection(self) -> bool:
        """
        检查Ollama服务是否可用

        Returns:
            bool: 服务是否可用
        """
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            return response.status_code == 200
        except Exception as e:
            print(f"Ollama连接失败: {str(e)}")
            return False

    def list_models(self) -> List[str]:
        """
        列出所有可用的模型

        Returns:
            List[str]: 模型名称列表
        """
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            if response.status_code == 200:
                data = response.json()
                return [model['name'] for model in data.get('models', [])]
            return []
        except Exception as e:
            print(f"获取模型列表失败: {str(e)}")
            return []

    def generate(
            self,
            prompt: str,
            temperature: float = 0.1,
            max_tokens: int = 1000,
            stop_sequences: Optional[List[str]] = None
    ) -> Dict:
        """
        调用Ollama生成文本

        Args:
            prompt: 输入提示词
            temperature: 温度参数（0-1，越低越确定性）
            max_tokens: 最大生成token数
            stop_sequences: 停止序列

        Returns:
            Dict: 包含生成结果和元数据的字典
                {
                    "sql": str,           # 生成的SQL
                    "raw_response": str,  # 原始响应
                    "success": bool,      # 是否成功
                    "error": str,         # 错误信息（如果有）
                    "stats": {            # 统计信息
                        "prompt_tokens": int,
                        "completion_tokens": int,
                        "total_tokens": int,
                        "duration_ms": float
                    }
                }
        """
        start_time = time.time()

        # 构建请求体
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,  # 不使用流式输出
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            }
        }

        if stop_sequences:
            payload["options"]["stop"] = stop_sequences

        try:
            # 发送请求
            response = requests.post(
                self.api_url,
                json=payload,
                timeout=self.timeout
            )

            if response.status_code != 200:
                return {
                    "sql": "",
                    "raw_response": "",
                    "success": False,
                    "error": f"API请求失败: {response.status_code}",
                    "stats": {"duration_ms": (time.time() - start_time) * 1000}
                }

            # 解析响应
            result = response.json()
            generated_text = result.get("response", "").strip()

            # 提取SQL（假设SQL在```sql和```之间）
            sql = self._extract_sql(generated_text)

            # 计算用时
            duration_ms = (time.time() - start_time) * 1000

            # 构建返回结果
            return {
                "sql": sql,
                "raw_response": generated_text,
                "success": True,
                "error": None,
                "stats": {
                    "prompt_tokens": result.get("prompt_eval_count", 0),
                    "completion_tokens": result.get("eval_count", 0),
                    "total_tokens": result.get("prompt_eval_count", 0) + result.get("eval_count", 0),
                    "duration_ms": duration_ms
                }
            }

        except requests.Timeout:
            return {
                "sql": "",
                "raw_response": "",
                "success": False,
                "error": "请求超时",
                "stats": {"duration_ms": (time.time() - start_time) * 1000}
            }
        except Exception as e:
            return {
                "sql": "",
                "raw_response": "",
                "success": False,
                "error": f"生成失败: {str(e)}",
                "stats": {"duration_ms": (time.time() - start_time) * 1000}
            }

    def _extract_sql(self, text: str) -> str:
        """
        从生成的文本中提取SQL语句

        Args:
            text: 模型生成的原始文本

        Returns:
            str: 提取的SQL语句
        """
        # 方法1: 提取```sql代码块
        if "```sql" in text:
            try:
                sql_start = text.index("```sql") + 6
                sql_end = text.index("```", sql_start)
                return text[sql_start:sql_end].strip()
            except ValueError:
                pass

        # 方法2: 提取```代码块（不带语言标识）
        if "```" in text:
            try:
                sql_start = text.index("```") + 3
                sql_end = text.index("```", sql_start)
                return text[sql_start:sql_end].strip()
            except ValueError:
                pass

        # 方法3: 直接返回原文本（去除多余空白）
        # 适用于模型直接输出SQL的情况
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        sql_lines = [line for line in lines if not line.startswith('#') and not line.startswith('--')]
        return '\n'.join(sql_lines)

    def batch_generate(
            self,
            prompts: List[str],
            temperature: float = 0.1,
            max_tokens: int = 1000
    ) -> List[Dict]:
        """
        批量生成SQL

        Args:
            prompts: 提示词列表
            temperature: 温度参数
            max_tokens: 最大生成token数

        Returns:
            List[Dict]: 生成结果列表
        """
        results = []
        for prompt in prompts:
            result = self.generate(prompt, temperature, max_tokens)
            results.append(result)
        return results


# 全局LLM服务实例
_llm_service = None


def get_llm_service() -> LLMService:
    """
    获取LLM服务单例

    Returns:
        LLMService: LLM服务实例
    """
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service


# 快速测试函数
def test_llm_service():
    """测试LLM服务是否正常工作"""
    print("=" * 60)
    print("测试LLM服务")
    print("=" * 60)

    # 初始化服务
    llm = LLMService()

    # 1. 检查连接
    print("\n1. 检查Ollama连接...")
    if llm.check_connection():
        print("✅ Ollama服务连接成功")
    else:
        print("❌ Ollama服务连接失败")
        return

    # 2. 列出模型
    print("\n2. 列出可用模型...")
    models = llm.list_models()
    print(f"找到 {len(models)} 个模型:")
    for model in models:
        print(f"  - {model}")

    # 3. 测试简单生成
    print("\n3. 测试SQL生成...")
    test_prompt = """请根据以下信息生成SQL查询：

数据库表结构：
- 表名：orders
- 字段：order_id, customer_name, amount, order_date

用户查询：查询所有订单

请直接输出SQL语句，不要有多余的解释。"""

    result = llm.generate(test_prompt, temperature=0.1)

    print(f"\n生成结果:")
    print(f"  成功: {result['success']}")
    if result['success']:
        print(f"  SQL: {result['sql']}")
        print(f"  Token使用: {result['stats']['total_tokens']}")
        print(f"  耗时: {result['stats']['duration_ms']:.2f}ms")
    else:
        print(f"  错误: {result['error']}")

    print("\n" + "=" * 60)
    print("测试完成！")
    print("=" * 60)


if __name__ == "__main__":
    # 运行测试
    test_llm_service()