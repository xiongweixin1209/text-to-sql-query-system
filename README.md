# Text-to-SQL Assistant

> 基于本地 LLM 的 AI 数据分析助手 · 自然语言查询 · 智能 SQL 生成 · 业务结果解读

---

## 项目简介

Text-to-SQL Assistant 是一个面向复杂业务数据仓库环境的 AI 数据分析工具。用户只需用自然语言描述分析需求，系统即可自动理解语义、推荐相关数据表、生成并执行 SQL 查询，最终以可视化图表和 AI 业务解读的形式呈现结果。

项目完整覆盖从"业务问题"到"数据洞察"的全链路，是面向 **AI Data Analyst Agent** 方向的工程实践。

---

## 核心功能展示

### 自然语言查询 · 图表可视化 · AI 业务解读

用户输入"查询销售额最高的前13个商品"，系统自动生成 SQL、执行查询、渲染柱状图，并由 AI 给出业务层面的解读结论。

> 📷 *[截图：查询结果 + 柱状图 + AI数据解读]*
> `docs/images/01_query_result_with_chart.png`

---

### 数据仓库结构感知 · DWD/DWS 分层识别

系统自动分析数据库结构，识别 DWD 明细层与 DWS 汇总层，并按业务域（订单域、客户域、产品域等）归类展示，帮助用户快速理解数仓架构。

> 📷 *[截图：数据库结构页面，展示分层与业务域]*
> `docs/images/02_database_structure.png`

---

### AI 智能表推荐

用户描述分析目标后，系统调用本地 LLM 智能推荐最相关的数据表，标注置信度与推荐理由，支持一键跳转至查询界面并自动勾选推荐表。

> 📷 *[截图：AI智能表推荐结果]*
> `docs/images/03_ai_table_recommendation.png`

---

### SQL 优化建议 · 查询性能分析

每次查询后自动提供 SQL 优化建议，并可执行 EXPLAIN 分析，展示查询计划、执行步骤、索引使用情况与性能等级评定。

> 📷 *[截图：性能分析面板]*
> `docs/images/04_performance_analysis.png`

---

## 技术架构

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│                                                      │
│  Text2SQLPage  ─── QueryInput / SQLDisplay           │
│       │                                              │
│       ├── ResultsTable (图表 + AI解读 + 分页)         │
│       ├── OptimizationPanel (SQL优化建议)             │
│       ├── PerformancePanel (EXPLAIN分析)              │
│       └── DatabaseCognition (数仓结构 + 表推荐)       │
└──────────────────────┬──────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────┐
│                   Backend (FastAPI)                  │
│                                                      │
│  API Layer:  text2sql_routes / datasource / schema   │
│                                                      │
│  Service Layer:                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │Text2SQLSvc  │  │ SchemaService│  │ LLMService │  │
│  │(三层查询策略)│  │(分层检测/推荐)│  │(Ollama调用)│  │
│  └─────────────┘  └──────────────┘  └────────────┘  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ExampleRetrvr│  │ SQLExecutor  │  │SQLOptimizer│  │
│  │(120条Few-shot│  │(多数据源执行)│  │(优化分析)  │  │
│  └─────────────┘  └──────────────┘  └────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                    Data Layer                        │
│                                                      │
│  Ollama (Qwen2.5-Coder 7B) · SQLite                  │
│  Demo电商数据库 · Northwind数仓(ODS/DWD/DWS)          │
└─────────────────────────────────────────────────────┘
```

---

## 功能清单

| 功能模块 | 说明 | 状态 |
|---|---|---|
| 自然语言转SQL | 三层策略：Rule / Few-shot / Zero-shot，自动选择 | ✅ |
| 120条Few-shot示例库 | 覆盖聚合、筛选、JOIN、窗口函数、RFM分析等场景 | ✅ |
| AI智能表推荐 | LLM根据查询语义推荐最相关数据表，含置信度和理由 | ✅ |
| 数仓分层识别 | 自动检测DWD/DWS层级，识别7个业务域 | ✅ |
| SQL执行与结果展示 | 支持分页、排序、列筛选、导出CSV | ✅ |
| 数据可视化 | 自动判断条件，渲染柱状图（Recharts） | ✅ |
| AI业务解读 | LLM对查询结果进行业务层面的1-3句总结 | ✅ |
| SQL优化建议 | 静态分析SQL，给出优化方向与严重程度 | ✅ |
| 查询性能分析 | EXPLAIN执行计划，展示索引使用与执行步骤 | ✅ |
| 多数据源管理 | 支持SQLite / MySQL / PostgreSQL，动态增删 | ✅ |

---

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端框架 | React 18 + Vite + Tailwind CSS |
| 数据可视化 | Recharts |
| 后端框架 | FastAPI + SQLAlchemy |
| 本地 LLM | Ollama · Qwen2.5-Coder 7B |
| 数据库 | SQLite（支持 MySQL / PostgreSQL 扩展） |
| Few-shot 检索 | 关键词相似度匹配（自研，无需向量库） |

---

## 快速启动

### 环境准备

- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.ai/) 已安装并运行

### 拉取本地模型

```bash
ollama pull qwen2.5-coder:7b
```

### 启动后端

```bash
cd backend
pip install -r requirements.txt
python main.py
```

后端启动后访问 `http://localhost:8000/docs` 查看 API 文档。

### 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端默认运行在 `http://localhost:5173`。

---

## 项目规划（V2.0 方向）

本项目当前为 V1.0，核心链路已完整可运行。面向 **AI Data Analyst Agent** 的下一阶段规划如下：

**接入飞书多维表格**
将飞书多维表格作为数据源，通过飞书开放平台 API 实时读取表格数据，直接在飞书生态内完成数据分析闭环。

**升级云端模型，实现智能图表**
接入火山方舟云端模型后，由 LLM 根据查询语义自动判断最适合的图表类型（柱状图 / 折线图 / 散点图），实现真正的智能可视化输出。

**多轮对话式分析**
支持基于上一次查询结果的追问与深入分析，例如"刚才的结果中，DOT 的月度趋势是什么？"，构建有记忆的分析会话。

**主动数据洞察**
Agent 在完成查询后，主动检测数据中的异常值、趋势拐点或业务风险，不等用户追问，直接输出洞察建议。

---

## 作者

wxio827 · Master of Data Science, University of Auckland  
