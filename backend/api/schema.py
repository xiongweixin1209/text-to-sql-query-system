"""
Schema读取API路由
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.datasource import DataSource
from schemas.schema import (
    SchemaResponse,
    TableListResponse,
    TableColumnsResponse
)
from services.schema_service import get_schema_service

# 创建路由器
router = APIRouter(
    prefix="/api/schema",
    tags=["Schema读取"]
)


@router.get("/{datasource_id}", response_model=SchemaResponse, summary="获取数据库Schema")
async def get_schema(
        datasource_id: int,
        db: Session = Depends(get_db)
):
    """
    获取指定数据源的完整Schema信息

    - **datasource_id**: 数据源ID

    返回：
    - 所有表名和字段信息
    - 统计信息（表数量、字段数量、记录数）
    - 推荐的查询模式
    """

    # 查找数据源
    datasource = db.query(DataSource).filter(DataSource.id == datasource_id).first()

    if not datasource:
        raise HTTPException(status_code=404, detail="数据源不存在")

    if not datasource.is_active:
        raise HTTPException(status_code=400, detail="数据源未启用")

    try:
        # 创建Schema服务
        schema_service = get_schema_service(datasource)

        # 获取统计信息
        stats = schema_service.get_statistics()

        # 关闭连接
        schema_service.close()

        return {
            "datasource_id": datasource.id,
            "datasource_name": datasource.name,
            **stats
        }

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取Schema失败: {str(e)}")


@router.get("/{datasource_id}/tables", response_model=TableListResponse, summary="获取表列表")
async def get_tables(
        datasource_id: int,
        db: Session = Depends(get_db)
):
    """
    获取指定数据源的所有表名
    """

    datasource = db.query(DataSource).filter(DataSource.id == datasource_id).first()

    if not datasource:
        raise HTTPException(status_code=404, detail="数据源不存在")

    try:
        schema_service = get_schema_service(datasource)
        tables = schema_service.get_tables()
        schema_service.close()

        return {
            "datasource_id": datasource.id,
            "tables": tables
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取表列表失败: {str(e)}")


@router.get("/{datasource_id}/tables/{table_name}", response_model=TableColumnsResponse, summary="获取表字段")
async def get_table_columns(
        datasource_id: int,
        table_name: str,
        db: Session = Depends(get_db)
):
    """
    获取指定表的所有字段信息
    """

    datasource = db.query(DataSource).filter(DataSource.id == datasource_id).first()

    if not datasource:
        raise HTTPException(status_code=404, detail="数据源不存在")

    try:
        schema_service = get_schema_service(datasource)
        columns = schema_service.get_columns(table_name)
        schema_service.close()

        return {
            "datasource_id": datasource.id,
            "table_name": table_name,
            "columns": columns
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取字段信息失败: {str(e)}")