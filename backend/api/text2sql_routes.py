"""
Text-to-SQL API Routes (完整修复版)
包含生成、执行、优化、性能分析的完整功能
修复了Pydantic模型转换问题
"""

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pathlib import Path

# 兼容两种导入方式
try:
    from ..services.text2sql_service import Text2SQLService
    from ..services.sql_executor import get_executor
    from ..services.datasource_manager import get_datasource_manager
    from ..services.sql_optimizer import get_optimizer
    from ..services.query_performance_analyzer import get_analyzer
    from .models import (
        Text2SQLRequest, Text2SQLResponse,
        BatchText2SQLRequest, BatchText2SQLResponse,
        ExampleStats, ExecuteSQLRequest, ExecuteSQLResponse,
        OptimizeSQLRequest, OptimizeSQLResponse,
        AnalyzeQueryRequest, AnalyzeQueryResponse
    )
except ImportError:
    from services.text2sql_service import Text2SQLService
    from services.sql_executor import get_executor
    from services.datasource_manager import get_datasource_manager
    from services.sql_optimizer import get_optimizer
    from services.query_performance_analyzer import get_analyzer
    from api.models import (
        Text2SQLRequest, Text2SQLResponse,
        BatchText2SQLRequest, BatchText2SQLResponse,
        ExampleStats, ExecuteSQLRequest, ExecuteSQLResponse,
        OptimizeSQLRequest, OptimizeSQLResponse,
        AnalyzeQueryRequest, AnalyzeQueryResponse
    )

# 创建路由
router = APIRouter(
    prefix="/api/text2sql",
    tags=["Text-to-SQL"]
)

# 创建服务实例
text2sql_service = Text2SQLService()
datasource_manager = get_datasource_manager()
sql_optimizer = get_optimizer()


def convert_schema_to_dict(schema_list):
    """
    将Pydantic模型列表转换为字典列表
    解决Pydantic v2不支持字典方法的问题
    """
    if not schema_list:
        return None

    return [
        {
            "table_name": table.table_name,
            "columns": [
                {"name": col.name, "type": col.type}
                for col in table.columns
            ]
        }
        for table in schema_list
    ]


@router.post("/generate", response_model=Text2SQLResponse)
async def generate_sql(request: Text2SQLRequest):
    """
    生成SQL查询

    Args:
        request: Text2SQL请求

    Returns:
        Text2SQLResponse: SQL生成结果
    """
    try:
        # 【关键修复】将Pydantic模型转换为字典
        schema_dicts = convert_schema_to_dict(request.table_schema)

        result = text2sql_service.generate_sql(
            query=request.query,
            schema=schema_dicts,
            force_strategy=request.force_strategy
        )

        return Text2SQLResponse(**result)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"SQL生成失败: {str(e)}"
        )


@router.post("/execute", response_model=ExecuteSQLResponse)
async def execute_sql(request: ExecuteSQLRequest):
    """
    执行SQL查询（生成 + 验证 + 执行）

    完整流程：
    1. 生成SQL（如果未提供）
    2. 验证SQL安全性
    3. 执行SQL
    4. 返回结果 + 优化建议（可选）

    Args:
        request: 执行SQL请求

    Returns:
        ExecuteSQLResponse: 执行结果
    """
    try:
        # Step 1: 生成SQL
        if request.sql:
            sql = request.sql
            generation_result = {
                "success": True,
                "sql": sql,
                "strategy": "provided",
                "examples_used": 0,
                "stats": {
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0,
                    "duration_ms": 0
                }
            }
        else:
            if not request.query:
                raise HTTPException(
                    status_code=400,
                    detail="必须提供 query 或 sql 参数"
                )

            # 【关键修复】将Pydantic模型转换为字典
            schema_dicts = convert_schema_to_dict(request.table_schema)

            generation_result = text2sql_service.generate_sql(
                query=request.query,
                schema=schema_dicts,
                force_strategy=request.force_strategy
            )

            if not generation_result["success"]:
                return ExecuteSQLResponse(
                    success=False,
                    sql=generation_result.get("sql", ""),
                    data=[],
                    columns=[],
                    row_count=0,
                    execution_time=0,
                    error=generation_result.get("error", "SQL生成失败"),
                    generation_stats=generation_result.get("stats", {}),
                    strategy=generation_result.get("strategy", "unknown")
                )

            sql = generation_result["sql"]

        # Step 2: 获取执行器
        if request.datasource_id:
            executor = datasource_manager.get_executor(request.datasource_id)
            if not executor:
                raise HTTPException(
                    status_code=404,
                    detail=f"数据源不存在: {request.datasource_id}"
                )
        else:
            # 使用默认数据库
            db_path = request.db_path or "D:/IndividualProject/text-to-sql/data/demo_ecommerce.db"
            executor = get_executor(db_path)

        # Step 3: 执行查询
        execution_result = executor.execute(sql, timeout=request.timeout)

        # Step 4: 优化建议（如果请求）
        optimization = None
        if request.include_optimization:
            # 【关键修复】转换schema
            schema_dicts = convert_schema_to_dict(request.table_schema)
            optimization = sql_optimizer.analyze(sql, schema_dicts)

        # Step 5: 返回结果
        return ExecuteSQLResponse(
            success=execution_result["success"],
            sql=sql,
            data=execution_result["data"],
            columns=execution_result["columns"],
            row_count=execution_result["row_count"],
            execution_time=execution_result["execution_time"],
            error=execution_result.get("error"),
            warnings=execution_result.get("warnings", []),
            generation_stats=generation_result.get("stats", {}),
            strategy=generation_result.get("strategy", "unknown"),
            examples_used=generation_result.get("examples_used", 0),
            optimization=optimization
        )

    except FileNotFoundError as e:
        raise HTTPException(
            status_code=404,
            detail=f"数据库文件不存在: {str(e)}"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"执行失败: {str(e)}"
        )


@router.post("/optimize", response_model=OptimizeSQLResponse)
async def optimize_sql(request: OptimizeSQLRequest):
    """
    SQL优化建议

    分析SQL并提供优化建议

    Args:
        request: 优化请求

    Returns:
        OptimizeSQLResponse: 优化建议
    """
    try:
        # 【关键修复】转换schema
        schema_dicts = convert_schema_to_dict(request.table_schema)

        result = sql_optimizer.analyze(
            sql=request.sql,
            schema=schema_dicts
        )

        return OptimizeSQLResponse(
            sql=request.sql,
            optimizable=result["optimizable"],
            suggestions=result["suggestions"],
            severity=result["severity"],
            estimated_improvement=result["estimated_improvement"]
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"优化分析失败: {str(e)}"
        )


@router.post("/analyze", response_model=AnalyzeQueryResponse)
async def analyze_query(request: AnalyzeQueryRequest):
    """
    查询性能分析

    执行EXPLAIN分析并提供性能报告

    Args:
        request: 分析请求

    Returns:
        AnalyzeQueryResponse: 分析结果
    """
    try:
        # 获取数据库路径
        if request.datasource_id:
            datasource_info = datasource_manager.get_datasource_info(request.datasource_id)
            if not datasource_info:
                raise HTTPException(
                    status_code=404,
                    detail=f"数据源不存在: {request.datasource_id}"
                )
            db_path = datasource_info["db_path"]
        else:
            db_path = request.db_path or "D:/IndividualProject/text-to-sql/data/demo_ecommerce.db"

        # 创建分析器
        analyzer = get_analyzer(db_path)

        # 执行分析
        result = analyzer.analyze(request.sql)

        return AnalyzeQueryResponse(
            sql=request.sql,
            explain_plan=result["explain_plan"],
            performance_metrics=result["performance_metrics"],
            index_suggestions=result["index_suggestions"],
            warnings=result["warnings"]
        )

    except FileNotFoundError as e:
        raise HTTPException(
            status_code=404,
            detail=f"数据库文件不存在: {str(e)}"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"性能分析失败: {str(e)}"
        )


@router.post("/batch", response_model=BatchText2SQLResponse)
async def batch_generate_sql(request: BatchText2SQLRequest):
    """
    批量生成SQL查询

    Args:
        request: 批量Text2SQL请求

    Returns:
        BatchText2SQLResponse: 批量生成结果
    """
    try:
        results = []

        # 【关键修复】转换schema
        schema_dicts = convert_schema_to_dict(request.table_schema)

        for query in request.queries:
            result = text2sql_service.generate_sql(
                query=query,
                schema=schema_dicts,
                force_strategy=request.force_strategy
            )
            results.append(Text2SQLResponse(**result))

        return BatchText2SQLResponse(results=results)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"批量生成失败: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """
    健康检查

    检查Text-to-SQL服务状态
    """
    try:
        # 检查LLM服务
        llm_available = text2sql_service.llm is not None

        # 检查示例加载
        stats = text2sql_service.retriever.get_statistics()
        examples_loaded = stats.get("total_examples", 0)

        # 检查数据源
        datasources = datasource_manager.list_datasources()

        return {
            "status": "healthy",
            "llm_available": llm_available,
            "examples_loaded": examples_loaded,
            "datasources_count": len(datasources),
            "features": {
                "text2sql": True,
                "execution": True,
                "optimization": True,
                "performance_analysis": True
            },
            "message": "所有服务正常运行"
        }

    except Exception as e:
        return {
            "status": "unhealthy",
            "llm_available": False,
            "examples_loaded": 0,
            "datasources_count": 0,
            "message": f"服务异常: {str(e)}"
        }


@router.get("/examples/stats", response_model=ExampleStats)
async def get_example_stats():
    """
    获取示例库统计信息

    Returns:
        ExampleStats: 示例统计
    """
    try:
        stats = text2sql_service.retriever.get_statistics()

        return ExampleStats(
            total_examples=stats.get("total_examples", 0),
            categories=stats.get("by_category", {}),
            difficulties=stats.get("by_difficulty", {})
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取统计信息失败: {str(e)}"
        )


@router.get("/datasources")
async def list_datasources():
    """
    列出所有数据源

    Returns:
        List[Dict]: 数据源列表
    """
    try:
        datasources = datasource_manager.list_datasources()
        return {
            "success": True,
            "datasources": datasources,
            "count": len(datasources)
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取数据源列表失败: {str(e)}"
        )


@router.get("/datasources/{datasource_id}/schema")
async def get_datasource_schema(datasource_id: str):
    """
    获取数据源的Schema

    Args:
        datasource_id: 数据源ID

    Returns:
        Dict: Schema信息
    """
    try:
        schema = datasource_manager.get_schema(datasource_id)

        if not schema["success"]:
            raise HTTPException(
                status_code=404,
                detail=schema["error"]
            )

        return schema

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取Schema失败: {str(e)}"
        )