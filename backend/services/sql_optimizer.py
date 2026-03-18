"""
SQL Optimizer - SQL优化建议服务
功能：分析SQL并提供优化建议
"""

import re
import sqlparse
from typing import Dict, List, Optional
from sqlparse.sql import Token, Identifier, Where, Comparison
from sqlparse.tokens import Keyword, DML


class SQLOptimizer:
    """SQL优化器"""
    
    def __init__(self):
        """初始化优化器"""
        pass
    
    def analyze(self, sql: str, schema: Optional[List[Dict]] = None) -> Dict:
        """
        分析SQL并提供优化建议
        
        Args:
            sql: SQL语句
            schema: 数据库Schema（可选）
        
        Returns:
            Dict: {
                "optimizable": bool,  # 是否有优化空间
                "suggestions": List[Dict],  # 优化建议列表
                "severity": str,  # 整体严重程度 (low/medium/high)
                "estimated_improvement": str  # 预期改善程度
            }
        """
        suggestions = []
        
        # 1. 检查是否缺少LIMIT
        if not self._has_limit(sql):
            suggestions.append({
                "type": "missing_limit",
                "severity": "medium",
                "message": "建议添加LIMIT限制返回行数",
                "suggestion": "在查询末尾添加 LIMIT 100 或合适的数量",
                "reason": "避免返回过多数据，提升性能和减少内存占用",
                "example": f"{sql.rstrip(';')} LIMIT 100;"
            })
        
        # 2. 检查SELECT *
        if self._has_select_star(sql):
            suggestions.append({
                "type": "select_star",
                "severity": "low",
                "message": "使用了 SELECT *，建议指定具体字段",
                "suggestion": "只选择需要的字段，例如: SELECT id, name, ...",
                "reason": "减少数据传输量，提升查询效率",
                "example": "SELECT specific_column1, specific_column2 FROM table..."
            })
        
        # 3. 检查WHERE条件中的函数使用
        func_in_where = self._check_function_in_where(sql)
        if func_in_where:
            suggestions.append({
                "type": "function_in_where",
                "severity": "high",
                "message": f"WHERE条件中使用了函数: {', '.join(func_in_where)}",
                "suggestion": "避免在WHERE条件的字段上使用函数，会导致索引失效",
                "reason": "函数计算会阻止索引使用，导致全表扫描",
                "example": "改为: WHERE date_column >= '2024-01-01' 而不是 WHERE YEAR(date_column) = 2024"
            })
        
        # 4. 检查是否使用了LIKE '%pattern'
        if self._has_leading_wildcard(sql):
            suggestions.append({
                "type": "leading_wildcard",
                "severity": "high",
                "message": "LIKE使用了前导通配符 '%pattern'",
                "suggestion": "避免使用前导通配符，改用 'pattern%' 或全文搜索",
                "reason": "前导通配符无法使用索引，导致全表扫描",
                "example": "WHERE column LIKE 'prefix%' 代替 WHERE column LIKE '%suffix'"
            })
        
        # 5. 检查OR条件
        if self._has_or_conditions(sql):
            suggestions.append({
                "type": "or_conditions",
                "severity": "medium",
                "message": "查询中使用了OR条件",
                "suggestion": "考虑使用UNION或IN子句代替多个OR",
                "reason": "OR条件可能导致索引失效或效率低下",
                "example": "WHERE id IN (1, 2, 3) 代替 WHERE id = 1 OR id = 2 OR id = 3"
            })
        
        # 6. 检查JOIN但没有ON条件
        if self._has_join_without_on(sql):
            suggestions.append({
                "type": "join_without_on",
                "severity": "high",
                "message": "检测到JOIN但可能缺少ON条件",
                "suggestion": "确保所有JOIN都有明确的ON条件",
                "reason": "缺少JOIN条件可能导致笛卡尔积，严重影响性能",
                "example": "FROM table1 JOIN table2 ON table1.id = table2.id"
            })
        
        # 7. 检查COUNT(*)在大表上
        if self._has_count_star(sql) and schema:
            suggestions.append({
                "type": "count_on_large_table",
                "severity": "medium",
                "message": "在可能的大表上使用COUNT(*)",
                "suggestion": "考虑使用近似计数或缓存结果",
                "reason": "在大表上COUNT(*)可能很慢",
                "example": "使用 SELECT COUNT(*) FROM (SELECT 1 FROM table LIMIT 10000) 获取近似值"
            })
        
        # 8. 检查子查询
        if self._has_subquery(sql):
            suggestions.append({
                "type": "subquery",
                "severity": "low",
                "message": "查询中包含子查询",
                "suggestion": "考虑是否可以改写为JOIN",
                "reason": "某些情况下JOIN比子查询更高效",
                "example": "将 WHERE id IN (SELECT ...) 改为 JOIN"
            })
        
        # 9. 检查DISTINCT使用
        if self._has_distinct(sql):
            suggestions.append({
                "type": "distinct_usage",
                "severity": "low",
                "message": "使用了DISTINCT去重",
                "suggestion": "确认是否必须去重，考虑在数据源层面保证唯一性",
                "reason": "DISTINCT需要额外的排序和比较操作",
                "example": "如果数据本身唯一，可以移除DISTINCT"
            })
        
        # 计算整体严重程度
        severity = self._calculate_overall_severity(suggestions)
        
        # 估算改善程度
        improvement = self._estimate_improvement(suggestions)
        
        return {
            "optimizable": len(suggestions) > 0,
            "suggestions": suggestions,
            "severity": severity,
            "estimated_improvement": improvement,
            "suggestion_count": len(suggestions)
        }
    
    def _has_limit(self, sql: str) -> bool:
        """检查是否有LIMIT"""
        return bool(re.search(r'\bLIMIT\b', sql, re.IGNORECASE))
    
    def _has_select_star(self, sql: str) -> bool:
        """检查是否使用SELECT *"""
        return bool(re.search(r'SELECT\s+\*', sql, re.IGNORECASE))
    
    def _check_function_in_where(self, sql: str) -> List[str]:
        """检查WHERE条件中的函数"""
        functions = []
        
        # 常见的日期/字符串函数
        common_functions = [
            r'YEAR\s*\(',
            r'MONTH\s*\(',
            r'DAY\s*\(',
            r'UPPER\s*\(',
            r'LOWER\s*\(',
            r'SUBSTRING\s*\(',
            r'CONCAT\s*\(',
            r'STRFTIME\s*\('
        ]
        
        # 检查WHERE子句
        where_match = re.search(r'\bWHERE\b(.*?)(?:\bGROUP BY\b|\bORDER BY\b|\bLIMIT\b|$)', 
                                sql, re.IGNORECASE | re.DOTALL)
        
        if where_match:
            where_clause = where_match.group(1)
            
            for func_pattern in common_functions:
                if re.search(func_pattern, where_clause, re.IGNORECASE):
                    func_name = re.match(r'(\w+)', func_pattern).group(1)
                    functions.append(func_name)
        
        return functions
    
    def _has_leading_wildcard(self, sql: str) -> bool:
        """检查LIKE是否有前导通配符"""
        return bool(re.search(r"LIKE\s+['\"]%", sql, re.IGNORECASE))
    
    def _has_or_conditions(self, sql: str) -> bool:
        """检查是否有OR条件"""
        where_match = re.search(r'\bWHERE\b(.*?)(?:\bGROUP BY\b|\bORDER BY\b|\bLIMIT\b|$)', 
                                sql, re.IGNORECASE | re.DOTALL)
        
        if where_match:
            where_clause = where_match.group(1)
            # 检查是否有OR（但不在括号内，因为那可能是IN子句）
            return bool(re.search(r'\bOR\b', where_clause, re.IGNORECASE))
        
        return False
    
    def _has_join_without_on(self, sql: str) -> bool:
        """检查JOIN是否缺少ON条件"""
        # 检查是否有JOIN关键词
        has_join = bool(re.search(r'\bJOIN\b', sql, re.IGNORECASE))
        
        if has_join:
            # 检查是否有对应的ON
            has_on = bool(re.search(r'\bON\b', sql, re.IGNORECASE))
            return not has_on
        
        return False
    
    def _has_count_star(self, sql: str) -> bool:
        """检查是否使用COUNT(*)"""
        return bool(re.search(r'COUNT\s*\(\s*\*\s*\)', sql, re.IGNORECASE))
    
    def _has_subquery(self, sql: str) -> bool:
        """检查是否有子查询"""
        # 简单检查：是否有SELECT在括号内
        return bool(re.search(r'\(\s*SELECT\b', sql, re.IGNORECASE))
    
    def _has_distinct(self, sql: str) -> bool:
        """检查是否使用DISTINCT"""
        return bool(re.search(r'\bDISTINCT\b', sql, re.IGNORECASE))
    
    def _calculate_overall_severity(self, suggestions: List[Dict]) -> str:
        """计算整体严重程度"""
        if not suggestions:
            return "none"
        
        severity_scores = {
            "low": 1,
            "medium": 2,
            "high": 3
        }
        
        max_severity = max(severity_scores.get(s["severity"], 0) for s in suggestions)
        
        if max_severity >= 3:
            return "high"
        elif max_severity >= 2:
            return "medium"
        else:
            return "low"
    
    def _estimate_improvement(self, suggestions: List[Dict]) -> str:
        """估算改善程度"""
        if not suggestions:
            return "无需优化"
        
        high_count = sum(1 for s in suggestions if s["severity"] == "high")
        medium_count = sum(1 for s in suggestions if s["severity"] == "medium")
        
        if high_count >= 2:
            return "显著改善（50%+）"
        elif high_count == 1:
            return "较大改善（20-50%）"
        elif medium_count >= 2:
            return "中等改善（10-20%）"
        else:
            return "轻微改善（<10%）"


def get_optimizer() -> SQLOptimizer:
    """获取优化器单例"""
    return SQLOptimizer()


# ============================================================
# 测试代码
# ============================================================
if __name__ == "__main__":
    print("=" * 60)
    print("测试SQL优化器")
    print("=" * 60)
    
    optimizer = get_optimizer()
    
    # 测试用例
    test_cases = [
        {
            "name": "需要多项优化的查询",
            "sql": """
                SELECT * 
                FROM orders 
                WHERE YEAR(order_date) = 2024 
                   OR country LIKE '%United%'
            """
        },
        {
            "name": "优化良好的查询",
            "sql": "SELECT id, name FROM users WHERE id = 123 LIMIT 100;"
        },
        {
            "name": "缺少LIMIT的聚合",
            "sql": "SELECT COUNT(*) FROM orders WHERE country = 'UK';"
        },
        {
            "name": "使用前导通配符",
            "sql": "SELECT * FROM products WHERE name LIKE '%phone%' LIMIT 10;"
        },
        {
            "name": "子查询",
            "sql": """
                SELECT * FROM orders 
                WHERE user_id IN (SELECT id FROM users WHERE country = 'US')
                LIMIT 50;
            """
        },
        {
            "name": "JOIN without ON",
            "sql": "SELECT * FROM table1 JOIN table2 LIMIT 10;"
        }
    ]
    
    # 运行测试
    for i, test in enumerate(test_cases, 1):
        print(f"\n【测试 {i}】{test['name']}")
        print("-" * 60)
        print(f"SQL: {test['sql'].strip()[:80]}...")
        
        result = optimizer.analyze(test['sql'])
        
        print(f"\n可优化: {'是' if result['optimizable'] else '否'}")
        print(f"严重程度: {result['severity']}")
        print(f"预期改善: {result['estimated_improvement']}")
        
        if result['suggestions']:
            print(f"\n优化建议 ({len(result['suggestions'])}条):")
            for j, suggestion in enumerate(result['suggestions'], 1):
                print(f"\n  {j}. [{suggestion['severity'].upper()}] {suggestion['message']}")
                print(f"     建议: {suggestion['suggestion']}")
                print(f"     原因: {suggestion['reason']}")
        else:
            print("\n✅ 查询已优化，无需改进")
    
    print("\n" + "=" * 60)
    print("✅ 测试完成！")
    print("=" * 60)
