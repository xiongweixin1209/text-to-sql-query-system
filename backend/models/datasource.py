"""
数据源配置模型
存储用户添加的数据库连接信息
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base


class DataSource(Base):
    """数据源配置表"""

    __tablename__ = "datasources"

    id = Column(Integer, primary_key=True, index=True, comment="数据源ID")
    name = Column(String(100), nullable=False, comment="数据源名称")
    type = Column(String(20), nullable=False, default="sqlite", comment="数据库类型")
    file_path = Column(String(500), comment="SQLite文件路径")
    host = Column(String(100), comment="MySQL/PostgreSQL主机")
    port = Column(Integer, comment="端口")
    database = Column(String(100), comment="数据库名")
    username = Column(String(100), comment="用户名")
    password = Column(String(200), comment="密码")
    is_default = Column(Boolean, default=False, comment="是否默认数据源")
    is_active = Column(Boolean, default=True, comment="是否启用")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间")

    def __repr__(self):
        return f"<DataSource(id={self.id}, name='{self.name}', type='{self.type}')>"