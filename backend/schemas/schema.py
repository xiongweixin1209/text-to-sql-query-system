"""
Schema相关的响应模型
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional


class ColumnInfo(BaseModel):
    """字段信息"""
    name: str = Field(..., description="字段名")
    type: str = Field(..., description="字段类型")
    nullable: bool = Field(default=True, description="是否可为空")
    default: Optional[str] = Field(None, description="默认值")


class TableInfo(BaseModel):
    """表信息（基础版）"""
    table_name: str = Field(..., description="表名")
    column_count: int = Field(..., description="字段数量")
    row_count: int = Field(..., description="记录数量")
    columns: List[ColumnInfo] = Field(..., description="字段列表")


class EnhancedTableInfo(BaseModel):
    """表信息（增强版 - 包含DWD/DWS层级信息）"""
    table_name: str = Field(..., description="表名")
    column_count: int = Field(..., description="字段数量")
    row_count: int = Field(..., description="记录数量")
    columns: List[ColumnInfo] = Field(..., description="字段列表")

    # 新增字段
    layer: str = Field(..., description="数据层级：DWD/DWS")
    domain: str = Field(..., description="业务域：订单域、客户域等")
    performance_level: str = Field(..., description="性能等级：fast/medium/slow")
    related_tables: List[str] = Field(default=[], description="关联表列表")
    use_cases: List[str] = Field(default=[], description="适用场景")


class SchemaResponse(BaseModel):
    """Schema完整响应（基础版）"""
    datasource_id: int = Field(..., description="数据源ID")
    datasource_name: str = Field(..., description="数据源名称")
    total_tables: int = Field(..., description="表数量")
    total_columns: int = Field(..., description="总字段数")
    query_mode: str = Field(..., description="推荐的查询模式: auto/smart/manual")
    table_details: List[TableInfo] = Field(..., description="表详情列表")


class EnhancedSchemaResponse(BaseModel):
    """Schema完整响应（增强版 - 包含DWD/DWS分层信息）"""
    datasource_id: int = Field(..., description="数据源ID")
    datasource_name: str = Field(..., description="数据源名称")
    total_tables: int = Field(..., description="表数量")
    total_columns: int = Field(..., description="总字段数")
    query_mode: str = Field(..., description="推荐的查询模式: auto/smart/manual")

    # 新增字段
    dwd_table_count: int = Field(..., description="DWD明细层表数量")
    dws_table_count: int = Field(..., description="DWS汇总层表数量")
    has_layer_info: bool = Field(..., description="是否包含分层信息")
    domains: List[str] = Field(default=[], description="业务域列表")

    table_details: List[EnhancedTableInfo] = Field(..., description="表详情列表（增强版）")


class DatabaseMetadata(BaseModel):
    """数据库元信息（简化版，用于快速查看）"""
    datasource_id: int = Field(..., description="数据源ID")
    datasource_name: str = Field(..., description="数据源名称")
    datasource_type: str = Field(..., description="数据库类型：sqlite/mysql/postgresql")

    total_tables: int = Field(..., description="总表数")
    dwd_table_count: int = Field(..., description="DWD明细层表数")
    dws_table_count: int = Field(..., description="DWS汇总层表数")

    has_layer_info: bool = Field(..., description="是否有分层信息")
    domains: List[str] = Field(default=[], description="业务域列表")

    query_mode: str = Field(..., description="推荐查询模式")


class TableListResponse(BaseModel):
    """表列表响应"""
    datasource_id: int
    tables: List[str] = Field(..., description="表名列表")


class TableColumnsResponse(BaseModel):
    """表字段响应"""
    datasource_id: int
    table_name: str
    columns: List[ColumnInfo]


class TableDetailResponse(BaseModel):
    """单个表的详细信息响应"""
    datasource_id: int = Field(..., description="数据源ID")
    table_info: EnhancedTableInfo = Field(..., description="表详情")