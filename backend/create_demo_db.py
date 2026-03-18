"""
将CSV数据转换为SQLite数据库
用于Text-to-SQL项目的Demo数据
支持多种编码格式
"""

import sqlite3
import pandas as pd
from pathlib import Path

def create_ecommerce_db():
    """创建电商Demo数据库"""

    # 配置路径
    csv_path = input("请输入CSV文件的完整路径: ").strip()
    db_path = Path(__file__).parent.parent / "data" / "demo_ecommerce.db"

    print(f"\n正在读取CSV文件...")

    # 读取CSV - 尝试多种编码
    encodings = ['utf-8', 'gbk', 'latin-1', 'iso-8859-1', 'cp1252', 'utf-16']
    df = None

    for encoding in encodings:
        try:
            print(f"尝试编码: {encoding}...", end=" ")
            df = pd.read_csv(csv_path, encoding=encoding, on_bad_lines='skip')
            print(f"✅ 成功！")
            break
        except Exception as e:
            print(f"❌ 失败")
            continue

    # 如果所有编码都失败，尝试使用errors='ignore'
    if df is None:
        try:
            print(f"尝试使用UTF-8（忽略错误）...", end=" ")
            df = pd.read_csv(csv_path, encoding='utf-8', errors='ignore', on_bad_lines='skip')
            print(f"✅ 成功！")
        except Exception as e:
            print(f"❌ 读取CSV失败: {e}")
            return

    print(f"\n✅ 成功读取 {len(df)} 行数据")
    print(f"✅ 列名: {list(df.columns)}")

    # 数据清洗
    print(f"\n正在清洗数据...")

    # 1. 删除完全空的行
    df = df.dropna(how='all')

    # 2. 处理缺失值
    # 数值列填充0，字符串列填充空字符串
    for col in df.columns:
        if df[col].dtype in ['float64', 'int64']:
            df[col] = df[col].fillna(0)
        else:
            df[col] = df[col].fillna('')

    # 3. 清理列名（去除空格和特殊字符）
    df.columns = df.columns.str.strip()

    print(f"✅ 清洗后剩余 {len(df)} 行数据")

    # 创建SQLite数据库
    print(f"\n正在创建数据库...")
    conn = sqlite3.connect(db_path)

    try:
        # 将DataFrame写入数据库
        df.to_sql('orders', conn, if_exists='replace', index=False)

        print(f"✅ 数据已写入表: orders")

        # 创建索引以提升查询性能
        cursor = conn.cursor()

        # 获取实际的列名
        actual_columns = list(df.columns)
        print(f"\n📋 实际列名: {actual_columns}")

        # 智能创建索引
        index_mappings = {
            'InvoiceNo': 'idx_invoice',
            'CustomerID': 'idx_customer',
            'Country': 'idx_country',
            'InvoiceDate': 'idx_date',
        }

        for col_name, idx_name in index_mappings.items():
            if col_name in actual_columns:
                try:
                    cursor.execute(f"CREATE INDEX IF NOT EXISTS {idx_name} ON orders({col_name})")
                    print(f"✅ 创建索引: {idx_name} on {col_name}")
                except Exception as e:
                    print(f"⚠️  索引创建跳过: {col_name}")

        conn.commit()

        # 显示数据库统计
        cursor.execute("SELECT COUNT(*) FROM orders")
        count = cursor.fetchone()[0]
        print(f"\n📊 数据库统计:")
        print(f"   - 表名: orders")
        print(f"   - 记录数: {count:,}")
        print(f"   - 文件位置: {db_path}")

        # 显示表结构
        cursor.execute("PRAGMA table_info(orders)")
        columns = cursor.fetchall()
        print(f"\n📋 表结构 ({len(columns)} 列):")
        for col in columns:
            print(f"   - {col[1]:<20} ({col[2]})")

        # 显示示例数据
        print(f"\n🔍 前3条数据预览:")
        cursor.execute("SELECT * FROM orders LIMIT 3")
        rows = cursor.fetchall()

        if rows:
            for i, row in enumerate(rows, 1):
                print(f"\n   === 记录 {i} ===")
                for col, val in zip([c[1] for c in columns], row):
                    # 只显示前50个字符
                    val_str = str(val)[:50]
                    print(f"   {col:<20}: {val_str}")

    except Exception as e:
        print(f"❌ 创建数据库失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

    print(f"\n" + "="*60)
    print(f"✅ 数据库创建完成!")
    print(f"="*60)
    print(f"\n💡 测试命令:")
    print(f"   1. 在IDEA中使用Database工具连接:")
    print(f"      {db_path}")
    print(f"\n   2. 或使用命令行:")
    print(f"      sqlite3 {db_path}")
    print(f"      SELECT COUNT(*) FROM orders;")
    print(f"      SELECT * FROM orders LIMIT 5;")

if __name__ == "__main__":
    print("=" * 60)
    print("电商数据CSV → SQLite转换工具 v2.0")
    print("=" * 60)
    create_ecommerce_db()