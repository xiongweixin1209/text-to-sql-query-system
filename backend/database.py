"""
数据库配置和连接管理
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pathlib import Path

# 应用数据库路径（用于存储数据源配置、查询历史等）
DATABASE_DIR = Path(__file__).parent / "data"
DATABASE_DIR.mkdir(exist_ok=True)
DATABASE_URL = f"sqlite:///{DATABASE_DIR}/app.db"

# 创建数据库引擎
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite特定配置
    echo=False  # 设为True可以看到SQL语句日志
)

# 创建Session工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建Base类（所有模型的基类）
Base = declarative_base()

# 依赖注入：获取数据库会话
def get_db():
    """
    FastAPI依赖项：提供数据库会话
    使用方式：
        @app.get("/example")
        def example(db: Session = Depends(get_db)):
            # 使用db进行数据库操作
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 初始化数据库（创建所有表）
def init_db():
    """创建所有数据表"""
    Base.metadata.create_all(bind=engine)
    print("✅ 数据库表创建完成")