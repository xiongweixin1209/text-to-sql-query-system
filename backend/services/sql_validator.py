"""
SQL Validator - SQL验证器
功能：SQL语法验证 + 安全检查
"""

import sqlparse
from sqlparse import tokens as T
from typing import Dict, List, Tuple, Optional


class SQLValidator:
    """SQL验证器"""

    # 仅作为 DML/DDL 关键词 token 出现时才禁止（避免误伤含 CREATED_AT 等的列名）
    FORBIDDEN_DML_DDL = {
        'INSERT', 'UPDATE', 'DELETE',
        'DROP', 'ALTER', 'CREATE', 'TRUNCATE',
        'GRANT', 'REVOKE', 'REPLACE',
    }

    # 文件/进程类危险函数名 —— 即便作为标识符也禁止
    FORBIDDEN_NAMES = {
        'OUTFILE', 'DUMPFILE', 'LOAD_FILE',
        'BENCHMARK', 'SLEEP',
    }

    def __init__(self):
        pass

    def validate(self, sql: str) -> Dict:
        """完整验证 SQL,返回 {valid, error, warnings}"""
        if not sql or not sql.strip():
            return {"valid": False, "error": "SQL语句不能为空", "warnings": []}

        sql = sql.strip()
        warnings: List[str] = []

        # 1. 解析(单条语句)
        parsed = self._parse_single(sql)
        if isinstance(parsed, dict):  # 解析失败返回 dict
            return parsed

        # 2. SELECT / WITH 入口检查
        select_check = self._check_select_or_with(parsed, sql)
        if not select_check["valid"]:
            return select_check
        warnings.extend(select_check.get("warnings", []))

        # 3. token 级安全检查
        security_check = self._check_security(parsed, sql)
        if not security_check["valid"]:
            return security_check
        warnings.extend(security_check.get("warnings", []))

        return {"valid": True, "error": None, "warnings": warnings}

    def _parse_single(self, sql: str):
        """解析 SQL,返回 sqlparse Statement 或错误 dict"""
        try:
            statements = sqlparse.parse(sql)
        except Exception as e:
            return {"valid": False, "error": f"SQL语法错误: {str(e)}", "warnings": []}

        if not statements:
            return {"valid": False, "error": "SQL语法错误：无法解析", "warnings": []}

        # 末尾分号会被 sqlparse 拆成空 statement,过滤掉
        non_empty = [s for s in statements if str(s).strip().rstrip(";").strip()]
        if len(non_empty) > 1:
            return {"valid": False, "error": "不支持多条SQL语句", "warnings": []}

        return non_empty[0]

    def _check_select_or_with(self, parsed, sql: str) -> Dict:
        """允许 SELECT 或 WITH(CTE) 起始"""
        warnings: List[str] = []

        first_token = next(
            (t for t in parsed.tokens if not t.is_whitespace), None
        )
        if first_token is None:
            return {"valid": False, "error": "无法识别SQL语句类型", "warnings": []}

        first_kw = str(first_token).strip().upper()
        if not (first_kw.startswith("SELECT") or first_kw.startswith("WITH")):
            return {
                "valid": False,
                "error": f"只允许 SELECT / WITH 查询，当前是: {first_kw.split()[0] if first_kw else '?'}",
                "warnings": [],
            }

        if "LIMIT" not in sql.upper():
            warnings.append("建议添加LIMIT限制返回行数，避免查询过大结果集")

        return {"valid": True, "error": None, "warnings": warnings}

    def _check_security(self, parsed, sql: str) -> Dict:
        """基于 token 类型的检查,避免子串误伤(如列名 CREATED_AT)"""
        warnings: List[str] = []

        for token in parsed.flatten():
            # DML/DDL 关键词 token —— 不会匹配普通标识符
            if token.ttype in (T.Keyword.DML, T.Keyword.DDL):
                kw = token.normalized.upper().strip()
                if kw in self.FORBIDDEN_DML_DDL:
                    return {
                        "valid": False,
                        "error": f"不允许使用 {kw} 操作",
                        "warnings": [],
                    }
            # 文件/进程类函数 —— 作为标识符出现也要拦
            if token.ttype in (T.Name, T.Keyword) and token.value.upper() in self.FORBIDDEN_NAMES:
                return {
                    "valid": False,
                    "error": f"不允许使用 {token.value} 函数",
                    "warnings": [],
                }

        # 多语句已在 _parse_single 拦截,这里只补一条软提示
        if ";" in sql.rstrip(";").rstrip():
            warnings.append("SQL中包含分号，请确认是否为单条语句")

        return {"valid": True, "error": None, "warnings": warnings}


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
            "name": "含 SQL 行注释（合法）",
            "sql": "SELECT * FROM orders -- 取最近订单\nLIMIT 10;",
            "expected": "valid"
        },
        {
            "name": "CTE 查询（WITH）",
            "sql": "WITH t AS (SELECT id FROM orders) SELECT * FROM t LIMIT 5;",
            "expected": "valid"
        },
        {
            "name": "列名含 CREATED_AT（合法）",
            "sql": "SELECT id, created_at FROM events WHERE created_at > '2024-01-01' LIMIT 10;",
            "expected": "valid"
        },
        {
            "name": "UNION ALL（合法）",
            "sql": "SELECT id FROM a UNION ALL SELECT id FROM b LIMIT 10;",
            "expected": "valid"
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
