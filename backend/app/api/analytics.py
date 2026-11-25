"""
Analytics API - AI chat, insights, chart data, and query endpoints.
"""
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import pandas as pd

from ..core.database import get_db
from ..core.security import get_current_user
from ..models.user import User
from ..models.dataset import Dataset, Dashboard
from ..services.ai_service import ai_service
from ..services.file_parser import parse_file, infer_column_types
from ..services.data_analyzer import (
    analyze_dataset, generate_insights, build_dashboard_config,
    _build_grouped_bar_data, _build_pie_data, _build_scatter_data
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    dataset_id: int
    question: str
    history: Optional[List[ChatMessage]] = None


class FilteredChartRequest(BaseModel):
    dataset_id: int
    chart_id: str
    chart_type: str
    x_axis: Optional[str] = None
    y_axis: Optional[str] = None
    category_col: Optional[str] = None
    filters: Optional[dict] = None
    top_n: Optional[int] = None


def _load_dataset_df(dataset: Dataset) -> pd.DataFrame:
    ext = f".{dataset.file_type}"
    df, _, error = parse_file(dataset.file_path, ext, dataset.selected_sheet)
    if error:
        raise HTTPException(status_code=500, detail=f"Could not load dataset: {error}")
    return df


def _apply_filters(df: pd.DataFrame, filters: dict, column_info: dict) -> pd.DataFrame:
    """Apply dashboard filters to dataframe."""
    if not filters:
        return df

    for col, filter_val in filters.items():
        if col not in df.columns:
            continue
        col_type = column_info.get(col, {}).get("semantic_type", "text")

        if isinstance(filter_val, dict):
            # Range filter: {"min": x, "max": y}
            if "min" in filter_val and filter_val["min"] is not None:
                df = df[pd.to_numeric(df[col], errors="coerce") >= float(filter_val["min"])]
            if "max" in filter_val and filter_val["max"] is not None:
                df = df[pd.to_numeric(df[col], errors="coerce") <= float(filter_val["max"])]
            # Date range: {"start": "...", "end": "..."}
            if "start" in filter_val and filter_val["start"]:
                dates = pd.to_datetime(df[col], errors="coerce")
                df = df[dates >= pd.to_datetime(filter_val["start"])]
            if "end" in filter_val and filter_val["end"]:
                dates = pd.to_datetime(df[col], errors="coerce")
                df = df[dates <= pd.to_datetime(filter_val["end"])]
        elif isinstance(filter_val, list):
            # Multi-select filter
            df = df[df[col].astype(str).isin([str(v) for v in filter_val])]
        elif isinstance(filter_val, str) and filter_val:
            # Single value or search
            df = df[df[col].astype(str).str.contains(filter_val, case=False, na=False)]

    return df


@router.post("/chat")
async def chat_with_data(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dataset = db.query(Dataset).filter(
        Dataset.id == request.dataset_id, Dataset.user_id == current_user.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if dataset.status != "ready":
        raise HTTPException(status_code=400, detail="Dataset is still processing")

    df = _load_dataset_df(dataset)
    column_info = dataset.column_info or infer_column_types(df)
    summary = dataset.summary_stats or {}
    analysis = summary.get("analysis", {})

    history = [{"role": m.role, "content": m.content} for m in (request.history or [])]

    result = await ai_service.chat(
        question=request.question,
        df=df,
        column_info=column_info,
        analysis=analysis,
        conversation_history=history,
    )

    return result


@router.get("/insights/{dataset_id}")
async def get_insights(
    dataset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id, Dataset.user_id == current_user.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    summary = dataset.summary_stats or {}
    insights = summary.get("insights", [])

    if not insights and dataset.status == "ready":
        # Regenerate
        df = _load_dataset_df(dataset)
        column_info = dataset.column_info or infer_column_types(df)
        analysis = summary.get("analysis") or analyze_dataset(df, column_info)
        insights = generate_insights(df, column_info, analysis)

    return {"insights": insights}


@router.post("/chart-data")
async def get_filtered_chart_data(
    request: FilteredChartRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return chart data with filters applied."""
    dataset = db.query(Dataset).filter(
        Dataset.id == request.dataset_id, Dataset.user_id == current_user.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = _load_dataset_df(dataset)
    column_info = dataset.column_info or infer_column_types(df)

    # Apply filters
    df = _apply_filters(df, request.filters or {}, column_info)

    chart_type = request.chart_type
    data = []

    try:
        if chart_type in ("bar", "horizontal_bar") and request.x_axis and request.y_axis:
            data = _build_grouped_bar_data(df, request.x_axis, request.y_axis, request.top_n or 10)
        elif chart_type in ("pie", "donut") and request.category_col:
            data = _build_pie_data(df, request.category_col)
        elif chart_type == "scatter" and request.x_axis and request.y_axis:
            data = _build_scatter_data(df, request.x_axis, request.y_axis)
        elif chart_type in ("line", "area") and request.x_axis and request.y_axis:
            # Time series with grouping
            dates = pd.to_datetime(df[request.x_axis], errors="coerce")
            df["__date__"] = dates
            df_ts = df.dropna(subset=["__date__"]).set_index("__date__")
            date_range = (df_ts.index.max() - df_ts.index.min()).days
            freq = "ME" if date_range > 365 else ("W" if date_range > 60 else "D")
            numeric = pd.to_numeric(df_ts[request.y_axis], errors="coerce")
            ts = numeric.resample(freq).sum()
            data = [{"date": str(d.date()), "value": float(v) if not pd.isna(v) else 0}
                    for d, v in zip(ts.index, ts)]
        elif chart_type == "histogram" and request.x_axis:
            import numpy as np
            series = pd.to_numeric(df[request.x_axis], errors="coerce").dropna()
            counts, edges = np.histogram(series, bins=20)
            data = {
                "bins": [round(float(e), 4) for e in edges.tolist()],
                "counts": [int(c) for c in counts.tolist()],
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"data": data, "filtered_rows": len(df)}


@router.get("/summary/{dataset_id}")
async def get_analysis_summary(
    dataset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id, Dataset.user_id == current_user.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    summary = dataset.summary_stats or {}
    return {
        "analysis": summary.get("analysis", {}),
        "dashboard_config": summary.get("dashboard_config", {}),
        "insights": summary.get("insights", []),
        "column_info": dataset.column_info or {},
    }


@router.get("/correlations/{dataset_id}")
async def get_correlations(
    dataset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id, Dataset.user_id == current_user.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    summary = dataset.summary_stats or {}
    analysis = summary.get("analysis", {})
    return {"correlations": analysis.get("correlations", [])}
