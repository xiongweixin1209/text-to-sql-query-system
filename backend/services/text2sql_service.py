"""
Text-to-SQL Service - 核心生成引擎
整合：LLM服务 + Prompt模板 + 示例检索
实现：三层查询策略（规则层 + Few-shot层 + Zero-shot层）
"""

from typing import Dict, List, Optional
import re

# 兼容两种运行方式的导入
try:
    # 作为模块运行时（python -m backend.services.text2sql_service）
    from .llm_service import get_llm_service
    from .prompts import PromptTemplates, CommonConstraints
    from .example_retriever import get_retriever
except ImportError:
    # 直接运行时（python text2sql_service.py）
    from llm_service import get_llm_service
    from prompts import PromptTemplates, CommonConstraints
    from example_retriever import get_retriever


class Text2SQLService:
    """Text-to-SQL核心服务"""

    def __init__(self):
        """初始化服务"""
        self.llm = get_llm_service()
        self.retriever = get_retriever()
        self.prompt_builder = PromptTemplates()

    def _classify_query(self, query: str) -> Dict:
        """
        分类用户查询，决定使用哪种策略

        Args:
            query: 用户查询

        Returns:
            Dict: {
                "strategy": "rule" | "few_shot" | "zero_shot",
                "category": str,  # 查询类别
                "complexity": "simple" | "medium" | "complex"
            }
        """
        query_lower = query.lower()

        # 简单规则判断
        simple_keywords = ["所有", "全部", "查询", "显示"]
        filter_keywords = ["大于", "小于", "等于", "包含", "是", "在"]
        agg_keywords = ["统计", "计算", "总", "平均", "最大", "最小", "求和", "count", "sum", "avg"]
        complex_keywords = ["排名", "top", "前", "最高", "最低", "占比", "百分比"]

        # 判断复杂度
        if any(kw in query_lower for kw in complex_keywords):
            return {
                "strategy": "zero_shot",  # 复杂查询直接用Zero-shot
                "category": "complex",
                "complexity": "complex"
            }
        elif any(kw in query_lower for kw in agg_keywords):
            return {
                "strategy": "few_shot",  # 聚合查询用Few-shot
                "category": "aggregation",
                "complexity": "medium"
            }
        elif any(kw in query_lower for kw in filter_keywords):
            return {
                "strategy": "few_shot",  # 筛选查询用Few-shot
                "category": "simple_filter",
                "complexity": "simple"
            }
        elif any(kw in query_lower for kw in simple_keywords) and len(query) < 15:
            return {
                "strategy": "rule",  # 超简单查询用规则
                "category": "simple_select",
                "complexity": "simple"
            }
        else:
            return {
                "strategy": "few_shot",  # 默认用Few-shot
                "category": "unknown",
                "complexity": "medium"
            }

    def _generate_by_rule(
            self,
            query: str,
            schema: List[Dict]
    ) -> Dict:
        """
        规则层：处理超简单查询

        Args:
            query: 用户查询
            schema: 数据库Schema

        Returns:
            Dict: 生成结果
        """
        # 对于"查询所有订单"这类超简单查询，直接返回
        if not schema:
            return {
                "sql": "",
                "success": False,
                "error": "Schema为空",
                "strategy": "rule"
            }

        table_name = schema[0].get("table_name", "orders")

        # 简单的SELECT *
        if re.search(r'(所有|全部|查询)', query):
            sql = f"SELECT * FROM {table_name} LIMIT 100;"
            return {
                "sql": sql,
                "raw_response": sql,
                "success": True,
                "error": None,
                "strategy": "rule",
                "stats": {
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0,
                    "duration_ms": 0
                }
            }

        # 降级到Few-shot
        return self._generate_by_few_shot(query, schema)

    def _generate_by_few_shot(
            self,
            query: str,
            schema: List[Dict],
            category: Optional[str] = None
    ) -> Dict:
        """
        Few-shot层：使用示例引导LLM

        Args:
            query: 用户查询
            schema: 数据库Schema
            category: 查询类别（可选）

        Returns:
            Dict: 生成结果
        """
        # 1. 检索相关示例
        examples = self.retriever.retrieve(
            query=query,
            top_k=3,
            category=category
        )

        if not examples:
            # 如果没找到示例，降级到Zero-shot
            print(f"警告：未找到相关示例，降级到Zero-shot")
            return self._generate_by_zero_shot(query, schema)

        # 2. 格式化Schema
        schema_text = self.prompt_builder.format_schema(schema)

        # 3. 构建Few-shot Prompt
        prompt = self.prompt_builder.build_few_shot_prompt(
            user_query=query,
            schema=schema_text,
            examples=examples,
            constraints=CommonConstraints.SECURITY
        )

        # 4. 调用LLM生成
        result = self.llm.generate(
            prompt=prompt,
            temperature=0.1,  # 低温度，更确定性
            max_tokens=500
        )

        # 5. 添加策略标识
        result["strategy"] = "few_shot"
        result["examples_used"] = len(examples)

        return result

    def _generate_by_zero_shot(
            self,
            query: str,
            schema: List[Dict]
    ) -> Dict:
        """
        Zero-shot层：无示例直接生成

        Args:
            query: 用户查询
            schema: 数据库Schema

        Returns:
            Dict: 生成结果
        """
        # 1. 格式化Schema
        schema_text = self.prompt_builder.format_schema(schema)

        # 2. 构建Zero-shot Prompt
        prompt = self.prompt_builder.build_zero_shot_prompt(
            user_query=query,
            schema=schema_text,
            constraints=CommonConstraints.SECURITY
        )

        # 3. 调用LLM生成
        result = self.llm.generate(
            prompt=prompt,
            temperature=0.2,  # 稍高温度，增加创造性
            max_tokens=800
        )

        # 4. 添加策略标识
        result["strategy"] = "zero_shot"
        result["examples_used"] = 0

        return result

    def generate_sql(
            self,
            query: str,
            schema: List[Dict],
            force_strategy: Optional[str] = None
    ) -> Dict:
        """
        生成SQL（主入口）

        Args:
            query: 用户的自然语言查询
            schema: 数据库Schema
                [
                    {
                        "table_name": "orders",
                        "columns": [
                            {"name": "order_id", "type": "INTEGER"},
                            ...
                        ]
                    }
                ]
            force_strategy: 强制使用的策略（可选）
                - "rule": 规则层
                - "few_shot": Few-shot层
                - "zero_shot": Zero-shot层

        Returns:
            Dict: {
                "sql": str,              # 生成的SQL
                "success": bool,          # 是否成功
                "error": str,            # 错误信息（如果有）
                "strategy": str,         # 使用的策略
                "examples_used": int,    # 使用的示例数
                "stats": {               # 统计信息
                    "total_tokens": int,
                    "duration_ms": float
                }
            }
        """
        # 输入验证
        if not query or not query.strip():
            return {
                "sql": "",
                "success": False,
                "error": "查询不能为空",
                "strategy": "none"
            }

        if not schema:
            return {
                "sql": "",
                "success": False,
                "error": "Schema不能为空",
                "strategy": "none"
            }

        # 决定使用哪种策略
        if force_strategy:
            strategy = force_strategy
        else:
            classification = self._classify_query(query)
            strategy = classification["strategy"]

        # 根据策略生成SQL
        if strategy == "rule":
            result = self._generate_by_rule(query, schema)
        elif strategy == "few_shot":
            result = self._generate_by_few_shot(query, schema)
        elif strategy == "zero_shot":
            result = self._generate_by_zero_shot(query, schema)
        else:
            result = {
                "sql": "",
                "success": False,
                "error": f"未知策略: {strategy}",
                "strategy": "none"
            }

        return result

    def batch_generate(
            self,
            queries: List[str],
            schema: List[Dict]
    ) -> List[Dict]:
        """
        批量生成SQL

        Args:
            queries: 查询列表
            schema: 数据库Schema

        Returns:
            List[Dict]: 生成结果列表
        """
        results = []
        for query in queries:
            result = self.generate_sql(query, schema)
            results.append(result)
        return results

    def interpret_results(
            self,
            user_query: str,
            columns: List[str],
            data: List[Dict],
            max_rows: int = 10
    ) -> Dict:
        """
        对查询结果进行业务解读

        Args:
            user_query: 用户原始查询
            columns: 列名列表
            data: 查询结果数据
            max_rows: 传给LLM的最大行数

        Returns:
            Dict: {"success": bool, "interpretation": str, "error": str}
        """
        try:
            # 只取前N行避免token过多
            sample_data = data[:max_rows]

            # 格式化数据为文本
            data_text = "，".join(columns) + "\n"
            for row in sample_data:
                data_text += "，".join([str(row.get(col, "")) for col in columns]) + "\n"

            if len(data) > max_rows:
                data_text += f"（仅展示前{max_rows}行，共{len(data)}行）\n"

            prompt = f"""你是一个数据分析助手。用户提出了一个数据查询，现在请你用1-3句简洁的中文，对查询结果进行业务层面的解读。
    
    用户的查询需求：{user_query}
    
    查询结果：
    {data_text}
    
    要求：
    1. 只输出解读文字，不要输出任何其他内容
    2. 从业务角度解读数据，而不是描述数据格式
    3. 如果数据有明显的规律或异常，请指出
    4. 控制在3句话以内，简洁明了"""

            result = self.llm.generate(
                prompt=prompt,
                temperature=0.3,
                max_tokens=200
            )

            if result["success"]:
                return {
                    "success": True,
                    "interpretation": result["sql"].strip(),
                    "error": None
                }
            else:
                return {
                    "success": False,
                    "interpretation": "",
                    "error": result.get("error", "解读失败")
                }

        except Exception as e:
            return {
                "success": False,
                "interpretation": "",
                "error": str(e)
            }


# 全局服务实例
_text2sql_service = None


def get_text2sql_service() -> Text2SQLService:
    """
    获取Text-to-SQL服务单例

    Returns:
        Text2SQLService: 服务实例
    """
    global _text2sql_service
    if _text2sql_service is None:
        _text2sql_service = Text2SQLService()
    return _text2sql_service


# 测试函数
def test_text2sql_service():
    """测试Text-to-SQL服务"""
    print("=" * 60)
    print("测试Text-to-SQL服务")
    print("=" * 60)

    # 初始化服务
    service = Text2SQLService()

    # 模拟Schema
    schema = [
        {
            "table_name": "orders",
            "columns": [
                {"name": "InvoiceNo", "type": "TEXT"},
                {"name": "StockCode", "type": "TEXT"},
                {"name": "Description", "type": "TEXT"},
                {"name": "Quantity", "type": "INTEGER"},
                {"name": "InvoiceDate", "type": "TEXT"},
                {"name": "UnitPrice", "type": "REAL"},
                {"name": "CustomerID", "type": "TEXT"},
                {"name": "Country", "type": "TEXT"}
            ]
        }
    ]

    # 测试查询
    test_queries = [
        "查询所有订单",
        "查询数量大于10的订单",
        "统计每个国家的订单数量",
        "查询销售额最高的前10个商品"
    ]

    print("\n开始生成SQL...")
    print("-" * 60)

    for i, query in enumerate(test_queries, 1):
        print(f"\n【测试 {i}】")
        print(f"查询: {query}")

        result = service.generate_sql(query, schema)

        if result["success"]:
            print(f"✅ 生成成功")
            print(f"策略: {result['strategy']}")
            print(f"示例数: {result.get('examples_used', 0)}")
            print(f"SQL: {result['sql']}")
            print(f"Token: {result['stats'].get('total_tokens', 0)}")
            print(f"耗时: {result['stats'].get('duration_ms', 0):.2f}ms")
        else:
            print(f"❌ 生成失败")
            print(f"错误: {result['error']}")

    print("\n" + "=" * 60)
    print("测试完成！")
    print("=" * 60)
    print("\n💡 提示：首次调用LLM会较慢，后续会快很多")


if __name__ == "__main__":
    test_text2sql_service()