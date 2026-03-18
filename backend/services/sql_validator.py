"""
SQL Validator - SQL验证器
功能：SQL语法验证 + 安全检查
"""

import sqlparse
from typing import Dict, List, Tuple
import re


class SQLValidator:
    """SQL验证器"""
    
    # 危险的SQL关键词（禁止使用）
    DANGEROUS_KEYWORDS = {
        'DROP', 'DELETE', 'UPDATE', 'INSERT', 'TRUNCATE',
        'ALTER', 'CREATE', 'GRANT', 'REVOKE', 'EXEC',
        'EXECUTE', 'UNION', 'INTO', 'OUTFILE', 'DUMPFILE',
        'LOAD_FILE', 'BENCHMARK'
    }
    
    # 危险的SQL模式
    DANGEROUS_PATTERNS = [
        r';\s*(DROP|DELETE|UPDATE|INSERT)',  # 多语句攻击
        r'--',  # SQL注释
        r'/\*.*\*/',  # 多行注释
        r'xp_',  # SQL Server扩展存储过程
        r'sp_',  # SQL Server系统存储过程
    ]
    
    def __init__(self):
        """初始化验证器"""
        pass
    
    def validate(self, sql: str) -> Dict:
        """
        完整验证SQL
        
        Args:
            sql: SQL语句
        
        Returns:
            Dict: {
                "valid": bool,
                "error": str,
                "warnings": List[str]
            }
        """
        warnings = []
        
        # 1. 基础检查
        if not sql or not sql.strip():
            return {
                "valid": False,
                "error": "SQL语句不能为空",
                "warnings": []
            }
        
        sql = sql.strip()
        
        # 2. 语法验证
        syntax_check = self._check_syntax(sql)
        if not syntax_check["valid"]:
            return syntax_check
        
        # 3. 安全检查
        security_check = self._check_security(sql)
        if not security_check["valid"]:
            return security_check
        
        warnings.extend(security_check.get("warnings", []))
        
        # 4. SELECT检查
        select_check = self._check_select_only(sql)
        if not select_check["valid"]:
            return select_check
        
        warnings.extend(select_check.get("warnings", []))
        
        return {
            "valid": True,
            "error": None,
            "warnings": warnings
        }
    
    def _check_syntax(self, sql: str) -> Dict:
        """
        检查SQL语法
        
        Args:
            sql: SQL语句
        
        Returns:
            Dict: 验证结果
        """
        try:
            # 使用sqlparse解析SQL
            parsed = sqlparse.parse(sql)
            
            if not parsed:
                return {
                    "valid": False,
                    "error": "SQL语法错误：无法解析",
                    "warnings": []
                }
            
            # 检查是否有多条语句
            if len(parsed) > 1:
                return {
                    "valid": False,
                    "error": "不支持多条SQL语句",
                    "warnings": []
                }
            
            return {
                "valid": True,
                "error": None,
                "warnings": []
            }
            
        except Exception as e:
            return {
                "valid": False,
                "error": f"SQL语法错误: {str(e)}",
                "warnings": []
            }
    
    def _check_security(self, sql: str) -> Dict:
        """
        安全检查
        
        Args:
            sql: SQL语句
        
        Returns:
            Dict: 验证结果
        """
        sql_upper = sql.upper()
        warnings = []
        
        # 1. 检查危险关键词
        for keyword in self.DANGEROUS_KEYWORDS:
            if keyword in sql_upper:
                return {
                    "valid": False,
                    "error": f"不允许使用 {keyword} 操作",
                    "warnings": []
                }
        
        # 2. 检查危险模式
        for pattern in self.DANGEROUS_PATTERNS:
            if re.search(pattern, sql, re.IGNORECASE):
                return {
                    "valid": False,
                    "error": f"检测到不安全的SQL模式",
                    "warnings": []
                }
        
        # 3. 检查分号（可能的SQL注入）
        if ';' in sql and not sql.strip().endswith(';'):
            warnings.append("SQL中包含分号，请确认是否为单条语句")
        
        return {
            "valid": True,
            "error": None,
            "warnings": warnings
        }
    
    def _check_select_only(self, sql: str) -> Dict:
        """
        检查是否只包含SELECT语句
        
        Args:
            sql: SQL语句
        
        Returns:
            Dict: 验证结果
        """
        warnings = []
        
        # 解析SQL
        parsed = sqlparse.parse(sql)[0]
        
        # 获取第一个token（应该是SELECT）
        first_token = None
        for token in parsed.tokens:
            if not token.is_whitespace:
                first_token = token
                break
        
        if not first_token:
            return {
                "valid": False,
                "error": "无法识别SQL语句类型",
                "warnings": []
            }
        
        # 检查是否是SELECT
        first_keyword = str(first_token).strip().upper()
        if not first_keyword.startswith('SELECT'):
            return {
                "valid": False,
                "error": f"只允许SELECT查询，当前是: {first_keyword}",
                "warnings": []
            }
        
        # 检查是否有LIMIT（建议添加）
        if 'LIMIT' not in sql.upper():
            warnings.append("建议添加LIMIT限制返回行数，避免查询过大结果集")
        
        return {
            "valid": True,
            "error": None,
            "warnings": warnings
        }


def get_validator() -> SQLValidator:
    """获取验证器单例"""
    return SQLValidator()


# ============================================================
# 测试代码
# ============================================================
if __name__ == "__main__":
    print("=" * 60)
    print("测试SQL验证器")
    print("=" * 60)
    
    validator = get_validator()
    
    # 测试用例
    test_cases = [
        {
            "name": "正常SELECT查询",
            "sql": "SELECT * FROM orders WHERE quantity > 10 LIMIT 100;",
            "expected": "valid"
        },
        {
            "name": "聚合查询",
            "sql": "SELECT country, COUNT(*) FROM orders GROUP BY country;",
            "expected": "valid"
        },
        {
            "name": "危险操作 - DROP",
            "sql": "DROP TABLE orders;",
            "expected": "invalid"
        },
        {
            "name": "危险操作 - DELETE",
            "sql": "DELETE FROM orders WHERE id = 1;",
            "expected": "invalid"
        },
        {
            "name": "危险操作 - UPDATE",
            "sql": "UPDATE orders SET quantity = 0;",
            "expected": "invalid"
        },
        {
            "name": "SQL注入尝试",
            "sql": "SELECT * FROM orders; DROP TABLE users;",
            "expected": "invalid"
        },
        {
            "name": "注释攻击",
            "sql": "SELECT * FROM orders -- WHERE id = 1",
            "expected": "invalid"
        },
        {
            "name": "空SQL",
            "sql": "",
            "expected": "invalid"
        },
        {
            "name": "复杂JOIN查询",
            "sql": """
                SELECT o.*, u.name 
                FROM orders o 
                JOIN users u ON o.user_id = u.id 
                WHERE o.quantity > 10 
                LIMIT 50;
            """,
            "expected": "valid"
        },
        {
            "name": "没有LIMIT的查询",
            "sql": "SELECT * FROM orders;",
            "expected": "valid_with_warning"
        }
    ]
    
    # 运行测试
    passed = 0
    failed = 0
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n【测试 {i}】{test['name']}")
        print("-" * 60)
        print(f"SQL: {test['sql'][:80]}...")
        
        result = validator.validate(test['sql'])
        
        print(f"验证结果:")
        print(f"  有效: {result['valid']}")
        if result['error']:
            print(f"  错误: {result['error']}")
        if result['warnings']:
            print(f"  警告: {', '.join(result['warnings'])}")
        
        # 检查预期
        if test['expected'] == 'valid':
            expected_valid = True
        elif test['expected'] == 'invalid':
            expected_valid = False
        else:  # valid_with_warning
            expected_valid = True
        
        if result['valid'] == expected_valid:
            print(f"  ✅ 测试通过")
            passed += 1
        else:
            print(f"  ❌ 测试失败")
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"测试完成！")
    print(f"通过: {passed}/{len(test_cases)}")
    print(f"失败: {failed}/{len(test_cases)}")
    print("=" * 60)
