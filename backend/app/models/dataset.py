from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..core.database import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    original_filename = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size = Column(BigInteger, default=0)
    row_count = Column(Integer, default=0)
    column_count = Column(Integer, default=0)
    status = Column(String(50), default="processing")  # processing, ready, error
    error_message = Column(Text)
    sheet_names = Column(JSON)        # For Excel files
    selected_sheet = Column(String(255))
    column_info = Column(JSON)        # Column names, types, stats
    summary_stats = Column(JSON)      # Pre-computed summary statistics
    data_quality = Column(JSON)       # Missing values, duplicates, etc.
    description = Column(Text)
    tags = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="datasets")
    dashboards = relationship("Dashboard", back_populates="dataset")


class Dashboard(Base):
    __tablename__ = "dashboards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    layout = Column(JSON)             # Dashboard layout configuration
    charts = Column(JSON)             # Chart configurations
    kpis = Column(JSON)               # KPI card configurations
    filters = Column(JSON)            # Active filter state
    theme = Column(String(50), default="light")
    is_public = Column(Boolean, default=False)
    public_token = Column(String(255), unique=True)
    version = Column(Integer, default=1)
    thumbnail_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="dashboards")
    dataset = relationship("Dataset", back_populates="dashboards")
