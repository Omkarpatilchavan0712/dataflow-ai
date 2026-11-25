import io
import json
import secrets
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
import pandas as pd

from ..core.database import get_db
from ..core.security import get_current_user
from ..models.user import User
from ..models.dataset import Dashboard, Dataset

router = APIRouter(prefix="/dashboards", tags=["Dashboards"])


class SaveDashboardRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    kpis: Optional[list] = None
    charts: Optional[list] = None
    filters: Optional[dict] = None
    theme: Optional[str] = None
    layout: Optional[dict] = None


class CreateDashboardRequest(BaseModel):
    dataset_id: int
    name: str
    description: Optional[str] = None
    theme: str = "light"


@router.get("/")
async def list_dashboards(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
):
    dashboards = (
        db.query(Dashboard)
        .filter(Dashboard.user_id == current_user.id)
        .order_by(Dashboard.updated_at.desc(), Dashboard.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    result = []
    for d in dashboards:
        dataset = db.query(Dataset).filter(Dataset.id == d.dataset_id).first()
        result.append({
            "id": d.id,
            "name": d.name,
            "description": d.description,
            "dataset_id": d.dataset_id,
            "dataset_name": dataset.name if dataset else "Unknown",
            "theme": d.theme,
            "is_public": d.is_public,
            "kpi_count": len(d.kpis or []),
            "chart_count": len(d.charts or []),
            "created_at": str(d.created_at),
            "updated_at": str(d.updated_at) if d.updated_at else str(d.created_at),
        })
    return result


@router.post("/", status_code=201)
async def create_dashboard(
    request: CreateDashboardRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Verify dataset ownership
    dataset = db.query(Dataset).filter(
        Dataset.id == request.dataset_id, Dataset.user_id == current_user.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if dataset.status != "ready":
        raise HTTPException(status_code=400, detail="Dataset is not ready yet")

    # Get generated config
    summary = dataset.summary_stats or {}
    dashboard_config = summary.get("dashboard_config", {})

    dashboard = Dashboard(
        user_id=current_user.id,
        dataset_id=request.dataset_id,
        name=request.name,
        description=request.description,
        kpis=dashboard_config.get("kpis", []),
        charts=dashboard_config.get("charts", []),
        filters={},
        theme=request.theme,
        public_token=secrets.token_urlsafe(16),
    )
    db.add(dashboard)
    db.commit()
    db.refresh(dashboard)

    return {"id": dashboard.id, "message": "Dashboard created successfully"}


@router.get("/{dashboard_id}")
async def get_dashboard(
    dashboard_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == dashboard_id, Dashboard.user_id == current_user.id
    ).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    dataset = db.query(Dataset).filter(Dataset.id == dashboard.dataset_id).first()
    summary = dataset.summary_stats if dataset else {}
    insights = summary.get("insights", []) if summary else []

    return {
        "id": dashboard.id,
        "name": dashboard.name,
        "description": dashboard.description,
        "dataset_id": dashboard.dataset_id,
        "dataset_name": dataset.name if dataset else None,
        "dataset_row_count": dataset.row_count if dataset else 0,
        "dataset_column_count": dataset.column_count if dataset else 0,
        "kpis": dashboard.kpis or [],
        "charts": dashboard.charts or [],
        "filters": dashboard.filters or {},
        "theme": dashboard.theme,
        "is_public": dashboard.is_public,
        "public_token": dashboard.public_token if dashboard.is_public else None,
        "insights": insights[:10],
        "column_info": dataset.column_info if dataset else {},
        "analysis": summary.get("analysis", {}) if summary else {},
        "created_at": str(dashboard.created_at),
        "updated_at": str(dashboard.updated_at) if dashboard.updated_at else None,
    }


@router.put("/{dashboard_id}")
async def update_dashboard(
    dashboard_id: int,
    request: SaveDashboardRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == dashboard_id, Dashboard.user_id == current_user.id
    ).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    if request.name is not None:
        dashboard.name = request.name
    if request.description is not None:
        dashboard.description = request.description
    if request.kpis is not None:
        dashboard.kpis = request.kpis
    if request.charts is not None:
        dashboard.charts = request.charts
    if request.filters is not None:
        dashboard.filters = request.filters
    if request.theme is not None:
        dashboard.theme = request.theme
    if request.layout is not None:
        dashboard.layout = request.layout

    dashboard.version = (dashboard.version or 1) + 1
    db.commit()
    db.refresh(dashboard)

    return {"message": "Dashboard saved", "version": dashboard.version}


@router.delete("/{dashboard_id}")
async def delete_dashboard(
    dashboard_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == dashboard_id, Dashboard.user_id == current_user.id
    ).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    db.delete(dashboard)
    db.commit()
    return {"message": "Dashboard deleted"}


@router.post("/{dashboard_id}/toggle-public")
async def toggle_public(
    dashboard_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == dashboard_id, Dashboard.user_id == current_user.id
    ).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    dashboard.is_public = not dashboard.is_public
    if dashboard.is_public and not dashboard.public_token:
        dashboard.public_token = secrets.token_urlsafe(16)
    db.commit()

    return {
        "is_public": dashboard.is_public,
        "public_token": dashboard.public_token if dashboard.is_public else None,
    }


@router.get("/{dashboard_id}/export/pdf")
async def export_pdf(
    dashboard_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == dashboard_id, Dashboard.user_id == current_user.id
    ).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    dataset = db.query(Dataset).filter(Dataset.id == dashboard.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    summary = dataset.summary_stats or {}
    analysis = summary.get("analysis", {})
    insights = summary.get("insights", [])

    from ..services.export_service import generate_pdf_report
    from ..services.file_parser import parse_file

    df = None
    try:
        ext = f".{dataset.file_type}"
        df, _, _ = parse_file(dataset.file_path, ext, dataset.selected_sheet)
    except Exception:
        pass

    dataset_info = {
        "name": dataset.name,
        "row_count": dataset.row_count,
        "column_count": dataset.column_count,
        "file_type": dataset.file_type,
        "file_size": dataset.file_size,
    }

    pdf_bytes = generate_pdf_report(
        dataset_name=dashboard.name,
        dataset_info=dataset_info,
        kpis=dashboard.kpis or [],
        insights=insights,
        analysis=analysis,
        df=df,
    )

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={dashboard.name}.pdf"},
    )


@router.get("/public/{token}")
async def get_public_dashboard(token: str, db: Session = Depends(get_db)):
    dashboard = db.query(Dashboard).filter(
        Dashboard.public_token == token, Dashboard.is_public == True
    ).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Public dashboard not found")

    dataset = db.query(Dataset).filter(Dataset.id == dashboard.dataset_id).first()

    return {
        "id": dashboard.id,
        "name": dashboard.name,
        "description": dashboard.description,
        "kpis": dashboard.kpis or [],
        "charts": dashboard.charts or [],
        "theme": dashboard.theme,
        "dataset_name": dataset.name if dataset else None,
        "created_at": str(dashboard.created_at),
    }
