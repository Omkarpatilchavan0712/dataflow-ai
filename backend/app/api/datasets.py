import os
import uuid
import json
import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, Query
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
import pandas as pd
import numpy as np
import io

from ..core.database import get_db
from ..core.security import get_current_user
from ..core.config import settings
from ..models.user import User
from ..models.dataset import Dataset
from ..services.file_parser import parse_file, infer_column_types, SUPPORTED_EXTENSIONS
from ..services.data_analyzer import analyze_dataset, generate_insights, build_dashboard_config

router = APIRouter(prefix="/datasets", tags=["Datasets"])

ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls", ".json", ".xml", ".html", ".htm",
                      ".txt", ".parquet", ".zip", ".sql"}
MAX_FILE_SIZE = settings.MAX_FILE_SIZE_MB * 1024 * 1024


def _process_dataset_background(dataset_id: int, file_path: str, file_ext: str, db_url: str):
    """Background processing of uploaded dataset."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not dataset:
            return

        # Parse file
        df, sheet_names, error = parse_file(file_path, file_ext, dataset.selected_sheet)
        if error or df.empty:
            dataset.status = "error"
            dataset.error_message = error or "File produced an empty dataset"
            db.commit()
            return

        # Infer column types
        column_info = infer_column_types(df)

        # Analyze dataset
        analysis = analyze_dataset(df, column_info)

        # Build dashboard config
        dashboard_config = build_dashboard_config(df, column_info, analysis)

        # Generate insights
        insights = generate_insights(df, column_info, analysis)

        # Update dataset record
        dataset.row_count = len(df)
        dataset.column_count = len(df.columns)
        dataset.sheet_names = sheet_names
        dataset.column_info = column_info
        dataset.summary_stats = {
            "analysis": analysis,
            "dashboard_config": dashboard_config,
            "insights": insights,
        }
        dataset.data_quality = analysis.get("data_quality", {})
        dataset.status = "ready"
        db.commit()

        # Create default dashboard
        from ..models.dataset import Dashboard
        import secrets as sec
        dashboard = Dashboard(
            user_id=dataset.user_id,
            dataset_id=dataset.id,
            name=f"{dataset.name} Dashboard",
            description=f"Auto-generated dashboard for {dataset.name}",
            kpis=dashboard_config.get("kpis", []),
            charts=dashboard_config.get("charts", []),
            filters={},
            theme="light",
            public_token=sec.token_urlsafe(16),
        )
        db.add(dashboard)
        db.commit()

    except Exception as e:
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if dataset:
            dataset.status = "error"
            dataset.error_message = str(e)
            db.commit()
    finally:
        db.close()


@router.post("/upload", status_code=201)
async def upload_dataset(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    sheet_name: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Validate extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Supported: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Read file content
    content = await file.read()
    file_size = len(content)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE_MB}MB"
        )

    if file_size == 0:
        raise HTTPException(status_code=400, detail="File is empty")

    # Save file
    upload_dir = Path(settings.upload_dir_path) / str(current_user.id)
    upload_dir.mkdir(parents=True, exist_ok=True)

    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = str(upload_dir / unique_name)

    with open(file_path, "wb") as f:
        f.write(content)

    dataset_name = name or Path(file.filename).stem

    # Create dataset record
    dataset = Dataset(
        user_id=current_user.id,
        name=dataset_name,
        original_filename=file.filename,
        file_path=file_path,
        file_type=ext.lstrip("."),
        file_size=file_size,
        status="processing",
        selected_sheet=sheet_name,
        description=description,
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    # Process in background
    background_tasks.add_task(
        _process_dataset_background,
        dataset.id,
        file_path,
        ext,
        settings.DATABASE_URL,
    )

    return {
        "id": dataset.id,
        "name": dataset.name,
        "status": "processing",
        "file_type": dataset.file_type,
        "file_size": file_size,
        "message": "File uploaded successfully. Processing started.",
    }


@router.get("/")
async def list_datasets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
):
    datasets = (
        db.query(Dataset)
        .filter(Dataset.user_id == current_user.id)
        .order_by(Dataset.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": d.id,
            "name": d.name,
            "original_filename": d.original_filename,
            "file_type": d.file_type,
            "file_size": d.file_size,
            "row_count": d.row_count,
            "column_count": d.column_count,
            "status": d.status,
            "error_message": d.error_message,
            "sheet_names": d.sheet_names,
            "selected_sheet": d.selected_sheet,
            "description": d.description,
            "created_at": str(d.created_at),
        }
        for d in datasets
    ]


@router.get("/{dataset_id}")
async def get_dataset(
    dataset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id, Dataset.user_id == current_user.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    return {
        "id": dataset.id,
        "name": dataset.name,
        "original_filename": dataset.original_filename,
        "file_type": dataset.file_type,
        "file_size": dataset.file_size,
        "row_count": dataset.row_count,
        "column_count": dataset.column_count,
        "status": dataset.status,
        "error_message": dataset.error_message,
        "sheet_names": dataset.sheet_names,
        "selected_sheet": dataset.selected_sheet,
        "column_info": dataset.column_info,
        "summary_stats": dataset.summary_stats,
        "data_quality": dataset.data_quality,
        "description": dataset.description,
        "created_at": str(dataset.created_at),
        "updated_at": str(dataset.updated_at) if dataset.updated_at else None,
    }


@router.get("/{dataset_id}/preview")
async def preview_dataset(
    dataset_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id, Dataset.user_id == current_user.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if dataset.status != "ready":
        raise HTTPException(status_code=400, detail=f"Dataset is not ready. Status: {dataset.status}")

    ext = f".{dataset.file_type}"
    df, _, error = parse_file(dataset.file_path, ext, dataset.selected_sheet)
    if error:
        raise HTTPException(status_code=500, detail=error)

    total_rows = len(df)
    start = (page - 1) * page_size
    end = start + page_size
    page_df = df.iloc[start:end].replace({pd.NA: None, float("nan"): None})

    # Convert to JSON-safe format
    rows = []
    for _, row in page_df.iterrows():
        row_dict = {}
        for col, val in row.items():
            if isinstance(val, (np.integer,)):
                row_dict[col] = int(val)
            elif isinstance(val, (np.floating,)):
                row_dict[col] = None if np.isnan(val) else float(val)
            elif pd.isna(val) if not isinstance(val, (list, dict)) else False:
                row_dict[col] = None
            else:
                row_dict[col] = str(val) if not isinstance(val, (int, float, bool, type(None))) else val
        rows.append(row_dict)

    return {
        "columns": list(df.columns),
        "rows": rows,
        "total_rows": total_rows,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_rows + page_size - 1) // page_size,
    }


@router.post("/{dataset_id}/select-sheet")
async def select_sheet(
    dataset_id: int,
    sheet_name: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None,
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id, Dataset.user_id == current_user.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    dataset.selected_sheet = sheet_name
    dataset.status = "processing"
    db.commit()

    ext = f".{dataset.file_type}"
    if background_tasks:
        background_tasks.add_task(
            _process_dataset_background, dataset.id, dataset.file_path, ext, settings.DATABASE_URL
        )

    return {"message": f"Sheet '{sheet_name}' selected. Reprocessing dataset."}


@router.delete("/{dataset_id}")
async def delete_dataset(
    dataset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id, Dataset.user_id == current_user.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Delete file
    if os.path.exists(dataset.file_path):
        os.remove(dataset.file_path)

    db.delete(dataset)
    db.commit()
    return {"message": "Dataset deleted successfully"}


@router.get("/{dataset_id}/export/csv")
async def export_csv(
    dataset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id, Dataset.user_id == current_user.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    ext = f".{dataset.file_type}"
    df, _, error = parse_file(dataset.file_path, ext, dataset.selected_sheet)
    if error:
        raise HTTPException(status_code=500, detail=error)

    csv_data = df.to_csv(index=False)
    return StreamingResponse(
        io.StringIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={dataset.name}.csv"},
    )


@router.get("/{dataset_id}/export/excel")
async def export_excel(
    dataset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id, Dataset.user_id == current_user.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    from ..services.export_service import export_to_excel
    ext = f".{dataset.file_type}"
    df, _, error = parse_file(dataset.file_path, ext, dataset.selected_sheet)
    if error:
        raise HTTPException(status_code=500, detail=error)

    excel_data = export_to_excel(df, sheet_name=dataset.name[:31])
    return StreamingResponse(
        io.BytesIO(excel_data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={dataset.name}.xlsx"},
    )
