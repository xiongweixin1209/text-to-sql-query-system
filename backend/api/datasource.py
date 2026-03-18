"""
数据源管理API路由（增强版）
新增功能：文件上传、连接测试、状态监控、刷新列表
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import shutil
import sqlite3
from pathlib import Path
from datetime import datetime

from database import get_db
from models.datasource import DataSource
from schemas.datasource import (
    DataSourceCreate,
    DataSourceUpdate,
    DataSourceResponse,
    DataSourceListResponse,
    MessageResponse
)

from schemas.schema import (
    EnhancedSchemaResponse,
    DatabaseMetadata,
    TableDetailResponse,
    EnhancedTableInfo
)
from services.schema_service import get_schema_service
from services.sql_executor import SQLExecutor

# 创建路由器
router = APIRouter(
    prefix="/api/datasource",
    tags=["数据源管理"]
)

# 配置文件保存目录
DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)


@router.post("/add", response_model=DataSourceResponse, summary="添加数据源")
async def add_datasource(
        datasource: DataSourceCreate,
        db: Session = Depends(get_db)
):
    """
    添加新的数据源

    - **name**: 数据源名称（必填）
    - **type**: 数据库类型（sqlite/mysql/postgresql）
    - **file_path**: SQLite文件路径（type=sqlite时必填）
    - **host/port/database/username/password**: MySQL/PostgreSQL连接信息
    - **is_default**: 是否设为默认数据源
    """

    # 验证：SQLite必须提供file_path
    if datasource.type == "sqlite" and not datasource.file_path:
        raise HTTPException(status_code=400, detail="SQLite数据源必须提供file_path")

    # 验证：MySQL/PostgreSQL必须提供连接信息
    if datasource.type in ["mysql", "postgresql"]:
        if not all([datasource.host, datasource.port, datasource.database]):
            raise HTTPException(
                status_code=400,
                detail="MySQL/PostgreSQL数据源必须提供host、port和database"
            )

    # 如果设置为默认数据源，先取消其他默认数据源
    if datasource.is_default:
        db.query(DataSource).update({"is_default": False})
        db.commit()

    # 创建新数据源
    db_datasource = DataSource(
        name=datasource.name,
        type=datasource.type,
        file_path=datasource.file_path,
        host=datasource.host,
        port=datasource.port,
        database=datasource.database,
        username=datasource.username,
        password=datasource.password,
        is_default=datasource.is_default
    )

    db.add(db_datasource)
    db.commit()
    db.refresh(db_datasource)

    return db_datasource


@router.get("/list", response_model=DataSourceListResponse, summary="获取数据源列表")
async def list_datasources(
        skip: int = 0,
        limit: int = 100,
        db: Session = Depends(get_db)
):
    """
    获取所有数据源列表

    - **skip**: 跳过的记录数（分页用）
    - **limit**: 返回的最大记录数
    """

    # 查询总数
    total = db.query(DataSource).count()

    # 查询数据源列表
    datasources = db.query(DataSource) \
        .offset(skip) \
        .limit(limit) \
        .all()

    return {
        "total": total,
        "items": datasources
    }


@router.get("/{datasource_id}", response_model=DataSourceResponse, summary="获取单个数据源")
async def get_datasource(
        datasource_id: int,
        db: Session = Depends(get_db)
):
    """
    根据ID获取数据源详情
    """

    datasource = db.query(DataSource).filter(DataSource.id == datasource_id).first()

    if not datasource:
        raise HTTPException(status_code=404, detail="数据源不存在")

    return datasource


@router.put("/{datasource_id}", response_model=DataSourceResponse, summary="更新数据源")
async def update_datasource(
        datasource_id: int,
        datasource_update: DataSourceUpdate,
        db: Session = Depends(get_db)
):
    """
    更新数据源信息

    - **name**: 新的数据源名称
    - **is_default**: 是否设为默认
    - **is_active**: 是否启用
    """

    # 查找数据源
    db_datasource = db.query(DataSource).filter(DataSource.id == datasource_id).first()

    if not db_datasource:
        raise HTTPException(status_code=404, detail="数据源不存在")

    # 如果设置为默认，先取消其他默认数据源
    if datasource_update.is_default:
        db.query(DataSource).update({"is_default": False})

    # 更新字段
    update_data = datasource_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_datasource, field, value)

    db.commit()
    db.refresh(db_datasource)

    return db_datasource


@router.delete("/{datasource_id}", response_model=MessageResponse, summary="删除数据源")
async def delete_datasource(
        datasource_id: int,
        db: Session = Depends(get_db)
):
    """
    删除指定的数据源
    """

    # 查找数据源
    datasource = db.query(DataSource).filter(DataSource.id == datasource_id).first()

    if not datasource:
        raise HTTPException(status_code=404, detail="数据源不存在")

    # 删除数据源
    db.delete(datasource)
    db.commit()

    return {
        "message": f"数据源 '{datasource.name}' 已删除",
        "success": True
    }


@router.get("/default/get", response_model=DataSourceResponse, summary="获取默认数据源")
async def get_default_datasource(db: Session = Depends(get_db)):
    """
    获取当前设置的默认数据源
    """

    datasource = db.query(DataSource) \
        .filter(DataSource.is_default == True) \
        .first()

    if not datasource:
        raise HTTPException(status_code=404, detail="未设置默认数据源")

    return datasource

# ========== 以下是Schema相关接口 ==========

@router.get("/{datasource_id}/metadata", response_model=DatabaseMetadata, summary="获取数据库元信息")
async def get_datasource_metadata(
        datasource_id: int,
        db: Session = Depends(get_db)
):
    """
    获取数据库的元信息（快速查看）

    返回数据库的基本统计信息，包括：
    - 总表数、DWD/DWS分层统计
    - 业务域列表
    - 推荐的查询模式

    不包含详细的表字段信息，适合快速预览
    """
    # 查找数据源
    datasource = db.query(DataSource).filter(DataSource.id == datasource_id).first()

    if not datasource:
        raise HTTPException(status_code=404, detail="数据源不存在")

    # 创建Schema服务
    schema_service = get_schema_service(datasource)

    try:
        # 获取增强统计信息
        stats = schema_service.get_enhanced_statistics()

        return {
            "datasource_id": datasource.id,
            "datasource_name": datasource.name,
            "datasource_type": datasource.type,
            "total_tables": stats["total_tables"],
            "dwd_table_count": stats["dwd_table_count"],
            "dws_table_count": stats["dws_table_count"],
            "has_layer_info": stats["has_layer_info"],
            "domains": stats["domains"],
            "query_mode": stats["query_mode"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取数据库元信息失败: {str(e)}")
    finally:
        schema_service.close()


@router.get("/{datasource_id}/schema", response_model=EnhancedSchemaResponse, summary="获取增强的Schema信息")
async def get_datasource_schema(
        datasource_id: int,
        db: Session = Depends(get_db)
):
    """
    获取数据库的完整Schema信息（增强版）

    返回所有表的详细信息，包括：
    - 表名、字段列表、记录数
    - DWD/DWS层级、业务域
    - 性能等级、关联表、适用场景

    这个接口返回完整信息，适合展示数据库结构
    """
    # 查找数据源
    datasource = db.query(DataSource).filter(DataSource.id == datasource_id).first()

    if not datasource:
        raise HTTPException(status_code=404, detail="数据源不存在")

    # 创建Schema服务
    schema_service = get_schema_service(datasource)

    try:
        # 获取增强统计信息
        stats = schema_service.get_enhanced_statistics()

        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取Schema失败: {str(e)}")
    finally:
        schema_service.close()


@router.get("/{datasource_id}/table/{table_name}", response_model=TableDetailResponse, summary="获取单个表的详细信息")
async def get_table_detail(
        datasource_id: int,
        table_name: str,
        db: Session = Depends(get_db)
):
    """
    获取指定表的详细信息

    返回单个表的完整信息：
    - 字段列表、记录数
    - 层级、业务域、性能等级
    - 关联表、适用场景
    """
    # 查找数据源
    datasource = db.query(DataSource).filter(DataSource.id == datasource_id).first()

    if not datasource:
        raise HTTPException(status_code=404, detail="数据源不存在")

    # 创建Schema服务
    schema_service = get_schema_service(datasource)

    try:
        # 检查表是否存在
        tables = schema_service.get_tables()
        if table_name not in tables:
            raise HTTPException(status_code=404, detail=f"表 '{table_name}' 不存在")

        # 获取表的字段信息
        columns = schema_service.get_columns(table_name)

        # 获取记录数
        with schema_service.engine.connect() as connection:
            from sqlalchemy import text
            count_query = text(f'SELECT COUNT(*) as count FROM "{table_name}"')
            result = connection.execute(count_query).fetchone()
            row_count = result[0] if result else 0

        # 检测层级
        layer = schema_service.detect_layer(table_name)

        # 分析业务域
        domain = schema_service.analyze_domain(table_name)

        # 性能等级
        performance_level = schema_service.get_performance_level(row_count, layer)

        # 关联表
        related_tables = schema_service.get_table_relationships(table_name)

        # 适用场景
        use_cases = schema_service.get_use_cases(table_name, layer, domain)

        table_info = {
            "table_name": table_name,
            "column_count": len(columns),
            "row_count": row_count,
            "columns": columns,
            "layer": layer,
            "domain": domain,
            "performance_level": performance_level,
            "related_tables": related_tables,
            "use_cases": use_cases
        }

        return {
            "datasource_id": datasource.id,
            "table_info": table_info
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取表信息失败: {str(e)}")
    finally:
        schema_service.close()

@router.post("/{datasource_id}/recommend-tables", summary="AI推荐合适的表")
async def recommend_tables(
        datasource_id: int,
        request_body: dict,
        db: Session = Depends(get_db)
):
    """
    基于用户查询需求，使用AI推荐最合适的表

    请求体：
    {
        "user_query": "用户的查询需求描述"
    }

    返回：
    {
        "success": true/false,
        "recommendations": [
            {
                "table_name": "表名",
                "confidence": "high/medium/low",
                "reason": "推荐理由",
                "match_keywords": ["关键词"]
            }
        ],
        "alternatives": ["备选表"],
        "error": "错误信息（如果有）"
    }
    """
    # 获取用户查询
    user_query = request_body.get("user_query", "").strip()

    if not user_query:
        raise HTTPException(status_code=400, detail="请提供查询需求描述")

    # 查找数据源
    datasource = db.query(DataSource).filter(DataSource.id == datasource_id).first()

    if not datasource:
        raise HTTPException(status_code=404, detail="数据源不存在")

    # 创建Schema服务
    schema_service = get_schema_service(datasource)

    try:
        # 调用推荐方法
        result = schema_service.recommend_tables(user_query)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"推荐失败: {str(e)}")
    finally:
        schema_service.close()


# ========== 以下是新增功能 ==========

@router.post("/upload", summary="上传数据源文件")
async def upload_datasource_file(
        file: UploadFile = File(...),
        name: str = None,
        db: Session = Depends(get_db)
):
    """
    上传数据库文件并自动配置数据源

    完整流程：
    1. 保存文件到 /data 目录
    2. 验证文件是否是有效的SQLite数据库
    3. 自动写入 app.db
    4. 自动测试连接
    5. 返回完整状态
    """
    try:
        # Step 1: 验证文件扩展名
        filename = file.filename
        if not filename.endswith(('.db', '.sqlite', '.sqlite3')):
            raise HTTPException(
                status_code=400,
                detail="只支持 SQLite 数据库文件（.db, .sqlite, .sqlite3）"
            )

        # Step 2: 生成唯一文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_name = Path(filename).stem
        file_extension = Path(filename).suffix
        unique_filename = f"{base_name}_{timestamp}{file_extension}"
        file_path = DATA_DIR / unique_filename

        # Step 3: 保存文件
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        print(f"✅ 文件已保存: {file_path}")

        # Step 4: 验证文件
        try:
            conn = sqlite3.connect(str(file_path))
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            table_count = len(tables)
            conn.close()

            if table_count == 0:
                raise HTTPException(
                    status_code=400,
                    detail="数据库文件有效，但不包含任何表"
                )

            print(f"✅ 数据库验证通过，共 {table_count} 张表")

        except sqlite3.Error as e:
            file_path.unlink()
            raise HTTPException(
                status_code=400,
                detail=f"文件不是有效的SQLite数据库: {str(e)}"
            )

        # Step 5: 写入 app.db
        datasource_name = name or base_name

        existing = db.query(DataSource).filter(DataSource.name == datasource_name).first()
        if existing:
            datasource_name = f"{datasource_name}_{timestamp}"

        db_datasource = DataSource(
            name=datasource_name,
            type="sqlite",
            file_path=str(file_path),
            is_default=False,
            is_active=True
        )

        db.add(db_datasource)
        db.commit()
        db.refresh(db_datasource)

        print(f"✅ 数据源已写入 app.db，ID: {db_datasource.id}")

        # Step 6: 测试连接
        try:
            executor = SQLExecutor(str(file_path))
            test_result = executor.test_connection()

            status = {
                "uploaded": True,
                "file_valid": True,
                "accessible": test_result["success"],
                "queryable": test_result["success"],
                "table_count": len(test_result.get("tables", [])),
                "error": None
            }

        except Exception as e:
            status = {
                "uploaded": True,
                "file_valid": True,
                "accessible": False,
                "queryable": False,
                "table_count": 0,
                "error": str(e)
            }

        return {
            "success": True,
            "datasource_id": db_datasource.id,
            "name": datasource_name,
            "file_path": str(file_path),
            "status": status,
            "message": "数据源上传成功" if status["queryable"] else "文件已上传，但连接测试失败"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"上传失败: {str(e)}"
        )


@router.post("/{datasource_id}/test", summary="测试数据源连接")
async def test_datasource_connection(
        datasource_id: int,
        db: Session = Depends(get_db)
):
    """
    测试数据源连接（双状态验证）
    """
    try:
        datasource = db.query(DataSource).filter(DataSource.id == datasource_id).first()

        if not datasource:
            raise HTTPException(status_code=404, detail="数据源不存在")

        file_path = Path(datasource.file_path)
        file_exists = file_path.exists()

        if not file_exists:
            return {
                "success": False,
                "datasource_id": datasource_id,
                "status": {
                    "uploaded": False,
                    "file_exists": False,
                    "accessible": False,
                    "queryable": False,
                    "table_count": 0,
                    "table_list": [],
                    "test_query_result": False,
                    "error": f"文件不存在: {datasource.file_path}"
                },
                "last_checked": datetime.now().isoformat()
            }

        try:
            executor = SQLExecutor(datasource.file_path)
            test_result = executor.test_connection()

            test_query_success = False
            if test_result["success"] and test_result.get("tables"):
                try:
                    first_table = test_result["tables"][0]
                    test_sql = f'SELECT COUNT(*) FROM "{first_table}" LIMIT 1'
                    query_result = executor.execute(test_sql, timeout=5)
                    test_query_success = query_result["success"]
                except Exception:
                    test_query_success = False

            return {
                "success": test_result["success"],
                "datasource_id": datasource_id,
                "status": {
                    "uploaded": True,
                    "file_exists": True,
                    "accessible": test_result["success"],
                    "queryable": test_query_success,
                    "table_count": len(test_result.get("tables", [])),
                    "table_list": test_result.get("tables", []),
                    "test_query_result": test_query_success,
                    "error": None if test_result["success"] else test_result.get("message", "连接失败")
                },
                "last_checked": datetime.now().isoformat()
            }

        except Exception as e:
            return {
                "success": False,
                "datasource_id": datasource_id,
                "status": {
                    "uploaded": True,
                    "file_exists": True,
                    "accessible": False,
                    "queryable": False,
                    "table_count": 0,
                    "table_list": [],
                    "test_query_result": False,
                    "error": f"连接失败: {str(e)}"
                },
                "last_checked": datetime.now().isoformat()
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"测试失败: {str(e)}"
        )


@router.get("/list-enhanced", response_model=DataSourceListResponse, summary="获取数据源列表（含状态）")
async def list_datasources_enhanced(
        skip: int = 0,
        limit: int = 100,
        db: Session = Depends(get_db)
):
    """
    获取所有数据源列表（增强版）
    """
    try:
        total = db.query(DataSource).count()

        datasources = db.query(DataSource) \
            .offset(skip) \
            .limit(limit) \
            .all()

        enhanced_items = []
        for ds in datasources:
            file_path = Path(ds.file_path)
            file_exists = file_path.exists()

            status = {
                "uploaded": file_exists,
                "accessible": None,
                "queryable": None,
                "table_count": None
            }

            enhanced_items.append({
                "id": ds.id,
                "name": ds.name,
                "type": ds.type,
                "file_path": ds.file_path,
                "is_default": ds.is_default,
                "is_active": ds.is_active,
                "created_at": ds.created_at,
                "updated_at": ds.updated_at,
                "status": status,
                "last_checked": None
            })

        return {
            "total": total,
            "items": enhanced_items
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取列表失败: {str(e)}"
        )


@router.post("/refresh", summary="刷新数据源列表")
async def refresh_datasources(db: Session = Depends(get_db)):
    """
    手动刷新数据源列表
    """
    try:
        from services.datasource_manager import get_datasource_manager

        manager = get_datasource_manager()
        manager._load_all_from_db()

        count = db.query(DataSource).count()

        return {
            "success": True,
            "message": f"已刷新，当前共 {count} 个数据源",
            "count": count
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"刷新失败: {str(e)}"
        )