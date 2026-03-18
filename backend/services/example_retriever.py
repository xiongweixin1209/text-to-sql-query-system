"""
Example Retriever - Few-shot示例检索服务
功能：基于关键词相似度检索最相关的SQL示例
"""

import json
from typing import List, Dict, Optional
from pathlib import Path


class ExampleRetriever:
    """Few-shot示例检索器"""

    def __init__(self, examples_path: str = None):
        """
        初始化示例检索器

        Args:
            examples_path: few_shot_examples.json的路径
        """
        if examples_path is None:
            # 默认路径：项目根目录下的data文件夹
            current_dir = Path(__file__).parent
            project_root = current_dir.parent.parent
            examples_path = project_root / "data" / "few_shot_examples.json"

        self.examples_path = Path(examples_path)
        self.examples = self._load_examples()

    def _load_examples(self) -> List[Dict]:
        """
        加载Few-shot示例

        Returns:
            List[Dict]: 示例列表
        """
        try:
            if not self.examples_path.exists():
                print(f"警告：示例文件不存在: {self.examples_path}")
                return []

            with open(self.examples_path, 'r', encoding='utf-8') as f:
                examples = json.load(f)

            print(f"✅ 成功加载 {len(examples)} 个示例")
            return examples

        except Exception as e:
            print(f"❌ 加载示例失败: {str(e)}")
            return []

    def _calculate_similarity(self, query: str, example: Dict) -> float:
        """
        计算查询与示例的相似度

        策略：
        1. 提取查询中的关键词
        2. 与示例的keywords字段匹配
        3. 计算匹配得分

        Args:
            query: 用户查询
            example: 示例字典

        Returns:
            float: 相似度分数（0-1）
        """
        # 提取查询关键词（简单分词）
        query_lower = query.lower()
        query_keywords = set(query_lower.split())

        # 获取示例关键词
        example_keywords = set(example.get("keywords", []))
        example_query_lower = example.get("query", "").lower()
        example_query_keywords = set(example_query_lower.split())

        # 计算关键词匹配数
        keyword_matches = len(query_keywords & example_keywords)
        query_matches = len(query_keywords & example_query_keywords)

        # 计算得分
        total_keywords = len(query_keywords)
        if total_keywords == 0:
            return 0.0

        # 关键词匹配权重：70%
        keyword_score = (keyword_matches / total_keywords) * 0.7

        # 查询文本匹配权重：30%
        query_score = (query_matches / total_keywords) * 0.3

        return keyword_score + query_score

    def retrieve(
            self,
            query: str,
            top_k: int = 3,
            category: Optional[str] = None,
            difficulty: Optional[str] = None
    ) -> List[Dict]:
        """
        检索最相关的示例

        Args:
            query: 用户查询
            top_k: 返回top-k个最相关示例
            category: 过滤类别（可选）
            difficulty: 过滤难度（可选）

        Returns:
            List[Dict]: 最相关的k个示例
        """
        if not self.examples:
            print("警告：没有可用的示例")
            return []

        # 过滤示例
        filtered_examples = self.examples

        if category:
            filtered_examples = [
                ex for ex in filtered_examples
                if ex.get("category") == category
            ]

        if difficulty:
            filtered_examples = [
                ex for ex in filtered_examples
                if ex.get("difficulty") == difficulty
            ]

        # 计算相似度
        scored_examples = []
        for example in filtered_examples:
            score = self._calculate_similarity(query, example)
            scored_examples.append({
                "example": example,
                "score": score
            })

        # 排序并返回top-k
        scored_examples.sort(key=lambda x: x["score"], reverse=True)
        top_examples = [item["example"] for item in scored_examples[:top_k]]

        return top_examples

    def retrieve_by_category(
            self,
            category: str,
            limit: int = 5
    ) -> List[Dict]:
        """
        按类别检索示例

        Args:
            category: 类别名称（simple_filter, aggregation等）
            limit: 最多返回数量

        Returns:
            List[Dict]: 该类别的示例
        """
        category_examples = [
            ex for ex in self.examples
            if ex.get("category") == category
        ]
        return category_examples[:limit]

    def get_categories(self) -> List[str]:
        """
        获取所有可用的类别

        Returns:
            List[str]: 类别列表
        """
        categories = set()
        for example in self.examples:
            cat = example.get("category")
            if cat:
                categories.add(cat)
        return sorted(list(categories))

    def get_statistics(self) -> Dict:
        """
        获取示例库统计信息

        Returns:
            Dict: 统计信息
        """
        stats = {
            "total_examples": len(self.examples),
            "categories": {},
            "difficulties": {}
        }

        # 统计类别分布
        for example in self.examples:
            category = example.get("category", "unknown")
            difficulty = example.get("difficulty", "unknown")

            stats["categories"][category] = stats["categories"].get(category, 0) + 1
            stats["difficulties"][difficulty] = stats["difficulties"].get(difficulty, 0) + 1

        return stats


# 全局检索器实例
_retriever = None


def get_retriever(examples_path: str = None) -> ExampleRetriever:
    """
    获取示例检索器单例

    Args:
        examples_path: 示例文件路径（可选）

    Returns:
        ExampleRetriever: 检索器实例
    """
    global _retriever
    if _retriever is None:
        _retriever = ExampleRetriever(examples_path)
    return _retriever


# 测试函数
def test_example_retriever():
    """测试示例检索功能"""
    print("=" * 60)
    print("测试示例检索器")
    print("=" * 60)

    # 初始化检索器
    retriever = ExampleRetriever()

    # 测试1: 获取统计信息
    print("\n【测试1：统计信息】")
    print("-" * 60)
    stats = retriever.get_statistics()
    print(f"总示例数: {stats['total_examples']}")
    print(f"\n类别分布:")
    for cat, count in stats['categories'].items():
        print(f"  - {cat}: {count}个")
    print(f"\n难度分布:")
    for diff, count in stats['difficulties'].items():
        print(f"  - {diff}: {count}个")

    # 测试2: 检索相关示例
    print("\n\n【测试2：检索相关示例】")
    print("-" * 60)

    test_queries = [
        "查询所有订单",
        "统计每个国家的订单数量",
        "查询销售额最高的商品",
        "查询2024年的数据"
    ]

    for query in test_queries:
        print(f"\n查询: {query}")
        examples = retriever.retrieve(query, top_k=2)

        if examples:
            print(f"找到 {len(examples)} 个相关示例:")
            for i, ex in enumerate(examples, 1):
                print(f"\n  示例 {i}:")
                print(f"    查询: {ex['query']}")
                print(f"    SQL: {ex['sql']}")
                print(f"    类别: {ex.get('category', 'N/A')}")
        else:
            print("  未找到相关示例")

    # 测试3: 按类别检索
    print("\n\n【测试3：按类别检索】")
    print("-" * 60)
    categories = retriever.get_categories()
    print(f"可用类别: {', '.join(categories)}")

    if categories:
        test_category = categories[0]
        print(f"\n检索类别 '{test_category}' 的示例:")
        cat_examples = retriever.retrieve_by_category(test_category, limit=2)

        for i, ex in enumerate(cat_examples, 1):
            print(f"\n  示例 {i}:")
            print(f"    查询: {ex['query']}")
            print(f"    SQL: {ex['sql'][:50]}...")  # 只显示前50个字符

    print("\n" + "=" * 60)
    print("测试完成！")
    print("=" * 60)


if __name__ == "__main__":
    test_example_retriever()