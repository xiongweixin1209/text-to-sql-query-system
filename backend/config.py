"""
应用配置管理
"""

from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    """应用配置"""

    # 应用配置
    APP_NAME: str = "Text-to-SQL API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    API_PORT: int = 8000

    # 数据库配置
    DATABASE_URL: str = "sqlite:///./data/app.db"

    # Ollama配置
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5-coder:7b"
    OLLAMA_TIMEOUT: int = 60  # 超时时间（秒）

    # Demo数据库路径
    DEMO_DB_PATH: str = str(Path(__file__).parent.parent / "data" / "demo_ecommerce.db")

    # Few-shot示例路径
    FEW_SHOT_PATH: str = str(Path(__file__).parent.parent / "data" / "few_shot_examples.json")

    # SQL配置
    SQL_TIMEOUT: int = 30  # SQL执行超时（秒）
    MAX_RESULT_ROWS: int = 1000  # 最大返回行数

    # 查询模式判断阈值
    AUTO_MODE_MAX_TABLES: int = 10  # 自动全量模式的表数量上限
    AUTO_MODE_MAX_COLUMNS: int = 100  # 自动全量模式的字段数量上限

    class Config:
        env_file = ".env"
        case_sensitive = True

# 创建全局配置实例
settings = Settings()