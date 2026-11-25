"""
Export service: PDF reports, Excel, CSV, PNG chart exports.
"""
import io
import os
import json
import tempfile
from datetime import datetime
from typing import Any, Dict, List, Optional
import pandas as pd
import numpy as np
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, Image, PageBreak
)
from reportlab.platypus.flowables import KeepTogether
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


BRAND_BLUE = colors.HexColor("#2563EB")
BRAND_DARK = colors.HexColor("#0F172A")
BRAND_LIGHT = colors.HexColor("#F8FAFC")
ACCENT_GREEN = colors.HexColor("#10B981")
ACCENT_ORANGE = colors.HexColor("#F59E0B")
ACCENT_RED = colors.HexColor("#EF4444")


def generate_pdf_report(
    dataset_name: str,
    dataset_info: Dict,
    kpis: List[Dict],
    insights: List[Dict],
    analysis: Dict,
    df: Optional[pd.DataFrame] = None,
) -> bytes:
    """Generate a professional PDF analytics report."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=50,
        bottomMargin=40,
    )

    styles = _build_styles()
    story = []

    # Cover
    story += _build_cover(dataset_name, dataset_info, styles)
    story.append(PageBreak())

    # Executive Summary
    story += _build_executive_summary(dataset_info, kpis, analysis, styles)
    story.append(Spacer(1, 20))

    # KPI Section
    if kpis:
        story += _build_kpi_section(kpis, styles)
        story.append(Spacer(1, 20))

    # Data Quality
    story += _build_data_quality_section(analysis, styles)
    story.append(Spacer(1, 20))

    # Statistical Summary
    story += _build_stats_section(analysis, styles)
    story.append(PageBreak())

    # Insights
    if insights:
        story += _build_insights_section(insights, styles)
        story.append(Spacer(1, 20))

    # Data Preview (if df provided)
    if df is not None and not df.empty:
        story += _build_data_preview(df, styles)

    # Footer
    story += _build_footer(styles)

    doc.build(story)
    buffer.seek(0)
    return buffer.read()


def _build_styles():
    base_styles = getSampleStyleSheet()
    custom = {
        "title": ParagraphStyle(
            "CustomTitle",
            parent=base_styles["Title"],
            fontSize=28,
            textColor=BRAND_DARK,
            spaceAfter=10,
            fontName="Helvetica-Bold",
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            fontSize=14,
            textColor=colors.HexColor("#64748B"),
            spaceAfter=6,
            fontName="Helvetica",
        ),
        "section_header": ParagraphStyle(
            "SectionHeader",
            fontSize=16,
            textColor=BRAND_BLUE,
            spaceBefore=15,
            spaceAfter=8,
            fontName="Helvetica-Bold",
        ),
        "body": ParagraphStyle(
            "Body",
            fontSize=10,
            textColor=BRAND_DARK,
            spaceAfter=4,
            fontName="Helvetica",
            leading=14,
        ),
        "kpi_title": ParagraphStyle(
            "KpiTitle",
            fontSize=9,
            textColor=colors.HexColor("#64748B"),
            fontName="Helvetica",
        ),
        "kpi_value": ParagraphStyle(
            "KpiValue",
            fontSize=18,
            textColor=BRAND_DARK,
            fontName="Helvetica-Bold",
        ),
        "insight": ParagraphStyle(
            "Insight",
            fontSize=10,
            textColor=BRAND_DARK,
            leftIndent=12,
            spaceAfter=6,
            fontName="Helvetica",
            leading=14,
        ),
        "table_header": ParagraphStyle(
            "TableHeader",
            fontSize=9,
            textColor=colors.white,
            fontName="Helvetica-Bold",
            alignment=TA_CENTER,
        ),
        "table_cell": ParagraphStyle(
            "TableCell",
            fontSize=8,
            textColor=BRAND_DARK,
            fontName="Helvetica",
        ),
    }
    return custom


def _build_cover(dataset_name, dataset_info, styles):
    elements = []
    elements.append(Spacer(1, 60))

    # Logo / Brand
    elements.append(Paragraph("DATAFLOW AI", ParagraphStyle(
        "Brand", fontSize=36, textColor=BRAND_BLUE, fontName="Helvetica-Bold", alignment=TA_CENTER
    )))
    elements.append(Paragraph("Analytics Report", ParagraphStyle(
        "BrandSub", fontSize=18, textColor=colors.HexColor("#64748B"),
        fontName="Helvetica", alignment=TA_CENTER, spaceAfter=4
    )))
    elements.append(Spacer(1, 30))

    # Horizontal rule
    elements.append(HRFlowable(width="100%", thickness=2, color=BRAND_BLUE, spaceAfter=20))

    elements.append(Paragraph(dataset_name, ParagraphStyle(
        "ReportTitle", fontSize=22, textColor=BRAND_DARK, fontName="Helvetica-Bold",
        alignment=TA_CENTER, spaceAfter=10
    )))

    elements.append(Spacer(1, 20))

    # Metadata table
    meta = [
        ["Report Generated:", datetime.now().strftime("%B %d, %Y %H:%M")],
        ["Total Records:", f"{dataset_info.get('row_count', 0):,}"],
        ["Total Columns:", str(dataset_info.get('column_count', 0))],
        ["File Type:", dataset_info.get('file_type', 'N/A').upper()],
        ["Dataset Size:", f"{dataset_info.get('file_size', 0) / 1024:.1f} KB"],
    ]
    t = Table(meta, colWidths=[2.5 * inch, 3.5 * inch])
    t.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#64748B")),
        ("TEXTCOLOR", (1, 0), (1, -1), BRAND_DARK),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 20))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0")))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph("Powered by DataFlow AI · Turn Your Data Into Decisions", ParagraphStyle(
        "Powered", fontSize=9, textColor=colors.HexColor("#94A3B8"),
        fontName="Helvetica", alignment=TA_CENTER
    )))
    return elements


def _build_executive_summary(dataset_info, kpis, analysis, styles):
    elements = []
    elements.append(Paragraph("Executive Summary", styles["section_header"]))
    elements.append(HRFlowable(width="100%", thickness=1, color=BRAND_BLUE, spaceAfter=10))

    overview = analysis.get("overview", {})
    dataset_type = analysis.get("dataset_context", {}).get("dataset_type", "general").title()
    quality = analysis.get("data_quality", {})

    summary_text = (
        f"This report presents an automated analysis of the <b>{dataset_info.get('name', 'dataset')}</b> "
        f"dataset classified as a <b>{dataset_type}</b> dataset. "
        f"The dataset contains <b>{overview.get('total_rows', 0):,}</b> records across "
        f"<b>{overview.get('total_columns', 0)}</b> columns. "
        f"The overall data quality score is <b>{quality.get('quality_score', 0)}%</b>, with "
        f"<b>{overview.get('missing_pct', 0)}%</b> missing values and "
        f"<b>{quality.get('duplicate_count', 0):,}</b> duplicate records identified."
    )
    elements.append(Paragraph(summary_text, styles["body"]))
    return elements


def _build_kpi_section(kpis, styles):
    elements = []
    elements.append(Paragraph("Key Performance Indicators", styles["section_header"]))
    elements.append(HRFlowable(width="100%", thickness=1, color=BRAND_BLUE, spaceAfter=10))

    # Build KPI table (2 per row)
    kpi_data = []
    for i in range(0, len(kpis), 2):
        row = []
        for j in range(2):
            if i + j < len(kpis):
                kpi = kpis[i + j]
                val = _format_kpi_value(kpi.get("value"), kpi.get("format", "number"))
                cell = f"<b><font size=8 color='#64748B'>{kpi.get('title', '')}</font></b><br/>"
                cell += f"<font size=16 color='#0F172A'><b>{val}</b></font>"
                row.append(Paragraph(cell, ParagraphStyle("KpiCell", fontName="Helvetica", leading=20)))
            else:
                row.append("")
        kpi_data.append(row)

    if kpi_data:
        t = Table(kpi_data, colWidths=[3.5 * inch, 3.5 * inch])
        t.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ("TOPPADDING", (0, 0), (-1, -1), 12),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ("LEFTPADDING", (0, 0), (-1, -1), 15),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor("#F1F5F9")]),
        ]))
        elements.append(t)

    return elements


def _build_data_quality_section(analysis, styles):
    elements = []
    elements.append(Paragraph("Data Quality Analysis", styles["section_header"]))
    elements.append(HRFlowable(width="100%", thickness=1, color=BRAND_BLUE, spaceAfter=10))

    quality = analysis.get("data_quality", {})
    overview = analysis.get("overview", {})

    data = [
        ["Metric", "Value", "Status"],
        ["Total Records", f"{overview.get('total_rows', 0):,}", "✓"],
        ["Total Columns", str(overview.get("total_columns", 0)), "✓"],
        ["Missing Values", f"{overview.get('missing_pct', 0)}%",
         "✓" if overview.get("missing_pct", 0) < 5 else "⚠"],
        ["Duplicate Rows", f"{quality.get('duplicate_count', 0):,}",
         "✓" if quality.get("duplicate_count", 0) == 0 else "⚠"],
        ["Quality Score", f"{quality.get('quality_score', 0)}%",
         "✓" if quality.get("quality_score", 100) >= 90 else "⚠"],
    ]

    t = Table(data, colWidths=[3 * inch, 2.5 * inch, 1.5 * inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(t)
    return elements


def _build_stats_section(analysis, styles):
    elements = []
    elements.append(Paragraph("Statistical Summary", styles["section_header"]))
    elements.append(HRFlowable(width="100%", thickness=1, color=BRAND_BLUE, spaceAfter=10))

    col_stats = analysis.get("column_stats", [])
    numeric_stats = [s for s in col_stats if s.get("type") == "numeric" and "mean" in s][:8]

    if not numeric_stats:
        elements.append(Paragraph("No numeric columns found for statistical summary.", styles["body"]))
        return elements

    headers = ["Column", "Min", "Max", "Mean", "Median", "Std Dev"]
    rows = [headers]
    for s in numeric_stats:
        rows.append([
            s["name"][:20],
            _format_kpi_value(s.get("min"), "number"),
            _format_kpi_value(s.get("max"), "number"),
            _format_kpi_value(s.get("mean"), "number"),
            _format_kpi_value(s.get("median"), "number"),
            _format_kpi_value(s.get("std"), "number"),
        ])

    col_widths = [2.0 * inch, 1.0 * inch, 1.0 * inch, 1.0 * inch, 1.0 * inch, 1.0 * inch]
    t = Table(rows, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#E2E8F0")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(t)
    return elements


def _build_insights_section(insights, styles):
    elements = []
    elements.append(Paragraph("AI-Generated Insights", styles["section_header"]))
    elements.append(HRFlowable(width="100%", thickness=1, color=BRAND_BLUE, spaceAfter=10))

    for insight in insights[:10]:
        severity = insight.get("severity", "info")
        icon = {"info": "ℹ", "warning": "⚠", "success": "✓", "danger": "✗"}.get(severity, "•")
        color = {"info": "#2563EB", "warning": "#F59E0B", "success": "#10B981", "danger": "#EF4444"}.get(severity, "#2563EB")

        title_text = f'<font color="{color}"><b>{icon} {insight.get("title", "")}</b></font>'
        elements.append(Paragraph(title_text, styles["body"]))
        elements.append(Paragraph(insight.get("description", ""), styles["insight"]))
        elements.append(Spacer(1, 4))

    return elements


def _build_data_preview(df, styles):
    elements = []
    elements.append(Paragraph("Data Preview (First 20 Rows)", styles["section_header"]))
    elements.append(HRFlowable(width="100%", thickness=1, color=BRAND_BLUE, spaceAfter=10))

    preview_df = df.head(20).replace({np.nan: ""})
    cols = list(preview_df.columns)[:8]  # Limit to 8 columns for PDF width

    headers = [[Paragraph(str(c)[:15], styles["table_header"]) for c in cols]]
    data_rows = []
    for _, row in preview_df[cols].iterrows():
        data_rows.append([Paragraph(str(v)[:20], styles["table_cell"]) for v in row.values])

    all_rows = headers + data_rows
    col_widths = [7.0 * inch / len(cols)] * len(cols)

    t = Table(all_rows, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#E2E8F0")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elements.append(t)
    return elements


def _build_footer(styles):
    elements = []
    elements.append(Spacer(1, 20))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0")))
    elements.append(Spacer(1, 6))
    footer_text = (
        f"Generated by DataFlow AI on {datetime.now().strftime('%B %d, %Y')} · "
        "Turn Your Data Into Decisions · dataflowai.com"
    )
    elements.append(Paragraph(footer_text, ParagraphStyle(
        "Footer", fontSize=8, textColor=colors.HexColor("#94A3B8"),
        fontName="Helvetica", alignment=TA_CENTER
    )))
    return elements


def _format_kpi_value(value, format_type: str) -> str:
    if value is None:
        return "N/A"
    try:
        v = float(value)
        if format_type == "currency":
            if abs(v) >= 1_000_000:
                return f"${v/1_000_000:.2f}M"
            elif abs(v) >= 1_000:
                return f"${v:,.0f}"
            return f"${v:.2f}"
        elif format_type == "percent":
            return f"{v:.1f}%"
        else:
            if abs(v) >= 1_000_000:
                return f"{v/1_000_000:.2f}M"
            elif abs(v) >= 1_000:
                return f"{v:,.0f}"
            elif v == int(v):
                return f"{int(v):,}"
            return f"{v:.4g}"
    except Exception:
        return str(value)


def export_to_csv(df: pd.DataFrame) -> bytes:
    return df.to_csv(index=False).encode("utf-8")


def export_to_excel(df: pd.DataFrame, sheet_name: str = "Data") -> bytes:
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="xlsxwriter") as writer:
        df.to_excel(writer, sheet_name=sheet_name, index=False)
        workbook = writer.book
        worksheet = writer.sheets[sheet_name]
        # Format header row
        header_fmt = workbook.add_format({
            "bold": True, "bg_color": "#2563EB", "font_color": "#FFFFFF",
            "border": 1,
        })
        for col_num, col_name in enumerate(df.columns):
            worksheet.write(0, col_num, col_name, header_fmt)
        # Auto-fit columns
        for col_num, col_name in enumerate(df.columns):
            max_len = max(df[col_name].astype(str).map(len).max(), len(col_name)) + 2
            worksheet.set_column(col_num, col_num, min(max_len, 30))
    buffer.seek(0)
    return buffer.read()
