"""
AI-powered data analysis engine for DataFlow AI.
Performs statistical analysis, pattern detection, and generates insights.
Works entirely offline (no external API required).
"""
import re
import math
import numpy as np
import pandas as pd
from typing import Any, Dict, List, Optional, Tuple
from .file_parser import infer_column_types, _safe_val


def analyze_dataset(df: pd.DataFrame, column_info: Dict) -> Dict[str, Any]:
    """
    Comprehensive dataset analysis.
    Returns structured analysis report.
    """
    if df.empty:
        return {"error": "Empty dataset"}

    numeric_cols = [c for c, v in column_info.items() if v.get("semantic_type") == "numeric"]
    categorical_cols = [c for c, v in column_info.items() if v.get("semantic_type") == "categorical"]
    datetime_cols = [c for c, v in column_info.items() if v.get("semantic_type") == "datetime"]
    boolean_cols = [c for c, v in column_info.items() if v.get("semantic_type") == "boolean"]

    analysis = {
        "overview": _compute_overview(df),
        "data_quality": _compute_data_quality(df),
        "column_stats": _compute_column_stats(df, column_info),
        "correlations": _compute_correlations(df, numeric_cols),
        "outliers": _detect_outliers(df, numeric_cols),
        "distribution": _compute_distributions(df, numeric_cols, categorical_cols),
        "time_series": _compute_time_series(df, datetime_cols, numeric_cols),
        "dataset_context": _infer_dataset_context(df, column_info),
    }

    return analysis


def _compute_overview(df: pd.DataFrame) -> Dict:
    total_cells = df.shape[0] * df.shape[1]
    missing_cells = df.isna().sum().sum()
    return {
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "total_cells": int(total_cells),
        "missing_cells": int(missing_cells),
        "missing_pct": round(missing_cells / max(total_cells, 1) * 100, 2),
        "duplicate_rows": int(df.duplicated().sum()),
        "memory_mb": round(df.memory_usage(deep=True).sum() / 1024 / 1024, 2),
    }


def _compute_data_quality(df: pd.DataFrame) -> Dict:
    quality = {
        "missing_by_column": {},
        "duplicate_count": int(df.duplicated().sum()),
        "quality_score": 0,
    }
    for col in df.columns:
        null_count = int(df[col].isna().sum())
        if null_count > 0:
            quality["missing_by_column"][col] = {
                "count": null_count,
                "pct": round(null_count / len(df) * 100, 2),
            }

    # Quality score: 100 - weighted penalty for missing & duplicates
    missing_pct = df.isna().mean().mean() * 100
    dup_pct = df.duplicated().mean() * 100
    quality["quality_score"] = max(0, round(100 - missing_pct * 0.5 - dup_pct * 0.5, 1))
    return quality


def _compute_column_stats(df: pd.DataFrame, column_info: Dict) -> List[Dict]:
    stats = []
    for col, info in column_info.items():
        if col not in df.columns:
            continue
        series = df[col]
        stat = {
            "name": col,
            "type": info.get("semantic_type", "unknown"),
            "dtype": info.get("pandas_dtype", ""),
            "null_count": int(series.isna().sum()),
            "null_pct": round(series.isna().mean() * 100, 2),
            "unique_count": int(series.nunique()),
            "unique_pct": round(series.nunique() / max(len(series), 1) * 100, 2),
        }

        if info.get("semantic_type") == "numeric":
            numeric = pd.to_numeric(series, errors="coerce").dropna()
            if not numeric.empty:
                stat.update({
                    "min": _safe_val(numeric.min()),
                    "max": _safe_val(numeric.max()),
                    "mean": _safe_val(numeric.mean()),
                    "median": _safe_val(numeric.median()),
                    "std": _safe_val(numeric.std()),
                    "sum": _safe_val(numeric.sum()),
                    "q25": _safe_val(numeric.quantile(0.25)),
                    "q75": _safe_val(numeric.quantile(0.75)),
                    "skewness": _safe_val(numeric.skew()),
                    "kurtosis": _safe_val(numeric.kurt()),
                })
        elif info.get("semantic_type") == "categorical":
            vc = series.value_counts()
            stat.update({
                "top_value": str(vc.index[0]) if not vc.empty else None,
                "top_value_count": int(vc.iloc[0]) if not vc.empty else 0,
                "top_values": {str(k): int(v) for k, v in vc.head(10).items()},
            })
        elif info.get("semantic_type") == "datetime":
            parsed = pd.to_datetime(series, errors="coerce")
            stat.update({
                "min_date": str(parsed.min()),
                "max_date": str(parsed.max()),
                "date_range_days": int((parsed.max() - parsed.min()).days) if parsed.notna().any() else 0,
            })

        stats.append(stat)
    return stats


def _compute_correlations(df: pd.DataFrame, numeric_cols: List[str]) -> List[Dict]:
    if len(numeric_cols) < 2:
        return []
    numeric_df = df[numeric_cols].apply(pd.to_numeric, errors="coerce")
    corr_matrix = numeric_df.corr()
    pairs = []
    for i, col1 in enumerate(numeric_cols):
        for j, col2 in enumerate(numeric_cols):
            if j <= i:
                continue
            if col1 in corr_matrix.index and col2 in corr_matrix.columns:
                corr_val = corr_matrix.loc[col1, col2]
                if not math.isnan(corr_val):
                    pairs.append({
                        "col1": col1,
                        "col2": col2,
                        "correlation": round(corr_val, 4),
                        "strength": _corr_strength(abs(corr_val)),
                    })
    # Sort by absolute correlation descending
    pairs.sort(key=lambda x: abs(x["correlation"]), reverse=True)
    return pairs[:20]


def _corr_strength(abs_corr: float) -> str:
    if abs_corr >= 0.9:
        return "very_strong"
    elif abs_corr >= 0.7:
        return "strong"
    elif abs_corr >= 0.5:
        return "moderate"
    elif abs_corr >= 0.3:
        return "weak"
    return "negligible"


def _detect_outliers(df: pd.DataFrame, numeric_cols: List[str]) -> Dict[str, Any]:
    outliers = {}
    for col in numeric_cols:
        series = pd.to_numeric(df[col], errors="coerce").dropna()
        if len(series) < 4:
            continue
        q1, q3 = series.quantile(0.25), series.quantile(0.75)
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        outlier_mask = (series < lower) | (series > upper)
        count = int(outlier_mask.sum())
        if count > 0:
            outliers[col] = {
                "count": count,
                "pct": round(count / len(series) * 100, 2),
                "lower_fence": _safe_val(lower),
                "upper_fence": _safe_val(upper),
                "examples": [_safe_val(v) for v in series[outlier_mask].head(5).tolist()],
            }
    return outliers


def _compute_distributions(
    df: pd.DataFrame, numeric_cols: List[str], categorical_cols: List[str]
) -> Dict:
    dist = {"numeric": {}, "categorical": {}}

    for col in numeric_cols[:10]:  # Limit to 10 numeric cols
        series = pd.to_numeric(df[col], errors="coerce").dropna()
        if len(series) < 2:
            continue
        try:
            counts, edges = np.histogram(series, bins=min(20, int(series.nunique())))
            dist["numeric"][col] = {
                "histogram": {
                    "bins": [round(_safe_val(e), 4) for e in edges.tolist()],
                    "counts": [int(c) for c in counts.tolist()],
                }
            }
        except Exception:
            pass

    for col in categorical_cols[:10]:
        vc = df[col].value_counts()
        dist["categorical"][col] = {
            "value_counts": {str(k): int(v) for k, v in vc.head(20).items()}
        }

    return dist


def _compute_time_series(
    df: pd.DataFrame, datetime_cols: List[str], numeric_cols: List[str]
) -> Dict:
    if not datetime_cols or not numeric_cols:
        return {}

    date_col = datetime_cols[0]
    try:
        dates = pd.to_datetime(df[date_col], errors="coerce")
        df_ts = df.copy()
        df_ts["__date__"] = dates
        df_ts = df_ts.dropna(subset=["__date__"])

        # Determine grouping frequency
        date_range = (df_ts["__date__"].max() - df_ts["__date__"].min()).days
        if date_range > 365 * 2:
            freq = "ME"
        elif date_range > 60:
            freq = "W"
        else:
            freq = "D"

        df_ts = df_ts.set_index("__date__")
        result = {}
        for num_col in numeric_cols[:3]:
            try:
                numeric_series = pd.to_numeric(df_ts[num_col], errors="coerce")
                ts = numeric_series.resample(freq).sum()
                result[num_col] = {
                    "dates": [str(d.date()) for d in ts.index.tolist()],
                    "values": [_safe_val(v) for v in ts.tolist()],
                    "frequency": freq,
                }
            except Exception:
                pass
        return result
    except Exception:
        return {}


def _infer_dataset_context(df: pd.DataFrame, column_info: Dict) -> Dict:
    """
    Heuristically detect what kind of dataset this is
    (sales, HR, finance, student, etc.) and suggest KPIs.
    """
    col_names_lower = [c.lower() for c in df.columns]

    dataset_type = "general"
    kpi_hints = []

    # Sales / Revenue dataset
    sales_keywords = ["revenue", "sales", "order", "product", "customer", "quantity", "profit", "price", "discount"]
    if _keyword_match(col_names_lower, sales_keywords, threshold=2):
        dataset_type = "sales"
        kpi_hints = ["total_revenue", "total_orders", "avg_order_value", "total_customers", "total_profit"]

    # HR dataset
    hr_keywords = ["employee", "salary", "department", "hire", "attrition", "gender", "age", "position", "manager"]
    if _keyword_match(col_names_lower, hr_keywords, threshold=2):
        dataset_type = "hr"
        kpi_hints = ["total_employees", "avg_salary", "attrition_rate", "gender_distribution", "dept_distribution"]

    # Finance dataset
    finance_keywords = ["income", "expense", "profit", "loss", "budget", "cost", "investment", "asset", "liability", "tax"]
    if _keyword_match(col_names_lower, finance_keywords, threshold=2):
        dataset_type = "finance"
        kpi_hints = ["total_income", "total_expenses", "net_profit", "profit_margin"]

    # Student / Academic dataset
    student_keywords = ["student", "grade", "marks", "score", "subject", "class", "exam", "pass", "fail", "gpa"]
    if _keyword_match(col_names_lower, student_keywords, threshold=2):
        dataset_type = "academic"
        kpi_hints = ["total_students", "avg_score", "pass_rate", "top_performer"]

    # E-commerce
    ecom_keywords = ["cart", "checkout", "shipping", "return", "rating", "review", "category", "brand", "sku"]
    if _keyword_match(col_names_lower, ecom_keywords, threshold=2):
        dataset_type = "ecommerce"

    # Healthcare
    health_keywords = ["patient", "diagnosis", "treatment", "hospital", "doctor", "disease", "medication", "age", "gender"]
    if _keyword_match(col_names_lower, health_keywords, threshold=3):
        dataset_type = "healthcare"

    return {
        "dataset_type": dataset_type,
        "kpi_hints": kpi_hints,
        "column_count": len(df.columns),
        "row_count": len(df),
    }


def _keyword_match(col_names: List[str], keywords: List[str], threshold: int) -> bool:
    matches = sum(1 for kw in keywords if any(kw in col for col in col_names))
    return matches >= threshold


def generate_insights(df: pd.DataFrame, column_info: Dict, analysis: Dict) -> List[Dict]:
    """
    Generate human-readable insights from the data analysis.
    Every insight is backed by an actual calculation.
    """
    insights = []
    dataset_type = analysis.get("dataset_context", {}).get("dataset_type", "general")
    numeric_cols = [c for c, v in column_info.items() if v.get("semantic_type") == "numeric"]
    categorical_cols = [c for c, v in column_info.items() if v.get("semantic_type") == "categorical"]
    datetime_cols = [c for c, v in column_info.items() if v.get("semantic_type") == "datetime"]

    overview = analysis.get("overview", {})
    quality = analysis.get("data_quality", {})

    # Dataset size insight
    insights.append({
        "type": "overview",
        "severity": "info",
        "title": "Dataset Overview",
        "description": f"Your dataset contains {overview.get('total_rows', 0):,} records across {overview.get('total_columns', 0)} columns.",
        "metric": overview.get("total_rows"),
    })

    # Data quality
    if quality.get("quality_score", 100) < 90:
        insights.append({
            "type": "quality",
            "severity": "warning",
            "title": "Data Quality Alert",
            "description": f"Data quality score is {quality.get('quality_score')}%. "
                           f"{overview.get('missing_pct', 0)}% of values are missing.",
            "metric": quality.get("quality_score"),
        })

    # Duplicate rows
    dup_count = quality.get("duplicate_count", 0)
    if dup_count > 0:
        insights.append({
            "type": "quality",
            "severity": "warning",
            "title": "Duplicate Records Detected",
            "description": f"{dup_count:,} duplicate rows found ({round(dup_count / max(overview.get('total_rows', 1), 1) * 100, 1)}% of total). Consider removing them.",
            "metric": dup_count,
        })

    # Numeric column insights
    for col in numeric_cols[:5]:
        series = pd.to_numeric(df[col], errors="coerce").dropna()
        if len(series) < 2:
            continue
        mean_val = series.mean()
        std_val = series.std()
        cv = std_val / abs(mean_val) * 100 if mean_val != 0 else 0

        if cv > 100:
            insights.append({
                "type": "distribution",
                "severity": "info",
                "title": f"High Variability in {col}",
                "description": f"{col} shows high variability (CV = {cv:.1f}%). Range: {_safe_val(series.min())} to {_safe_val(series.max())}.",
                "metric": round(cv, 1),
            })

    # Outlier insights
    outliers = analysis.get("outliers", {})
    for col, out_info in list(outliers.items())[:3]:
        insights.append({
            "type": "outlier",
            "severity": "warning",
            "title": f"Outliers in {col}",
            "description": f"{out_info['count']} outlier values detected in {col} ({out_info['pct']}% of data). These may require investigation.",
            "metric": out_info["count"],
        })

    # Categorical insights
    for col in categorical_cols[:3]:
        vc = df[col].value_counts()
        if len(vc) > 0:
            top_val = str(vc.index[0])
            top_pct = round(vc.iloc[0] / len(df) * 100, 1)
            insights.append({
                "type": "category",
                "severity": "info",
                "title": f"Top {col}",
                "description": f'"{top_val}" is the most frequent {col}, accounting for {top_pct}% of all records.',
                "metric": top_pct,
            })

    # Correlation insights
    correlations = analysis.get("correlations", [])
    for corr in correlations[:2]:
        if abs(corr["correlation"]) >= 0.7:
            direction = "positive" if corr["correlation"] > 0 else "negative"
            insights.append({
                "type": "correlation",
                "severity": "info",
                "title": f"Strong {direction.title()} Correlation Found",
                "description": f"{corr['col1']} and {corr['col2']} have a {direction} correlation of {corr['correlation']:.2f}.",
                "metric": corr["correlation"],
            })

    # Time series insights
    time_series = analysis.get("time_series", {})
    for col, ts_data in list(time_series.items())[:1]:
        values = [v for v in ts_data.get("values", []) if v is not None]
        if len(values) >= 2:
            first_val = values[0]
            last_val = values[-1]
            if first_val and first_val != 0:
                change_pct = (last_val - first_val) / abs(first_val) * 100
                direction = "increased" if change_pct > 0 else "decreased"
                insights.append({
                    "type": "trend",
                    "severity": "info" if change_pct > 0 else "warning",
                    "title": f"{col} Trend",
                    "description": f"{col} has {direction} by {abs(change_pct):.1f}% over the observed period.",
                    "metric": round(change_pct, 1),
                })

    return insights


def build_dashboard_config(df: pd.DataFrame, column_info: Dict, analysis: Dict) -> Dict:
    """
    Automatically generate a complete dashboard configuration
    based on the actual data characteristics.
    """
    dataset_context = analysis.get("dataset_context", {})
    dataset_type = dataset_context.get("dataset_type", "general")
    numeric_cols = [c for c, v in column_info.items() if v.get("semantic_type") == "numeric"]
    categorical_cols = [c for c, v in column_info.items() if v.get("semantic_type") == "categorical"]
    datetime_cols = [c for c, v in column_info.items() if v.get("semantic_type") == "datetime"]

    charts = []
    kpis = []
    chart_id = 1

    # --- KPI Cards ---
    kpis = _build_kpis(df, column_info, dataset_type, numeric_cols, categorical_cols)

    # --- Charts ---
    # 1. Time series line chart (if we have dates + numerics)
    if datetime_cols and numeric_cols:
        date_col = datetime_cols[0]
        for num_col in numeric_cols[:2]:
            ts_data = analysis.get("time_series", {}).get(num_col, {})
            if ts_data:
                charts.append({
                    "id": f"chart_{chart_id}",
                    "type": "line",
                    "title": f"{num_col} Over Time",
                    "x_axis": date_col,
                    "y_axis": num_col,
                    "data": _build_time_series_chart_data(ts_data),
                    "size": "large",
                    "grid": {"w": 12, "h": 4, "x": 0, "y": len(kpis) // 4 + 1},
                })
                chart_id += 1

    # 2. Bar chart for top categorical values vs numeric
    if categorical_cols and numeric_cols:
        cat_col = categorical_cols[0]
        num_col = _pick_best_metric_col(numeric_cols, dataset_type)
        bar_data = _build_grouped_bar_data(df, cat_col, num_col, top_n=10)
        if bar_data:
            charts.append({
                "id": f"chart_{chart_id}",
                "type": "bar",
                "title": f"{num_col} by {cat_col}",
                "x_axis": cat_col,
                "y_axis": num_col,
                "data": bar_data,
                "size": "medium",
                "grid": {"w": 8, "h": 4, "x": 0, "y": len(kpis) // 4 + 5},
            })
            chart_id += 1

    # 3. Pie/Donut chart for categorical distribution
    if categorical_cols:
        for cat_col in categorical_cols[:2]:
            if 2 <= df[cat_col].nunique() <= 15:
                pie_data = _build_pie_data(df, cat_col)
                charts.append({
                    "id": f"chart_{chart_id}",
                    "type": "donut",
                    "title": f"Distribution by {cat_col}",
                    "category_col": cat_col,
                    "data": pie_data,
                    "size": "small",
                    "grid": {"w": 4, "h": 4, "x": 8, "y": len(kpis) // 4 + 5},
                })
                chart_id += 1
                break

    # 4. Histogram for numeric distribution
    for num_col in numeric_cols[:2]:
        hist_data = analysis.get("distribution", {}).get("numeric", {}).get(num_col, {})
        if hist_data:
            charts.append({
                "id": f"chart_{chart_id}",
                "type": "histogram",
                "title": f"Distribution of {num_col}",
                "column": num_col,
                "data": hist_data.get("histogram", {}),
                "size": "medium",
                "grid": {"w": 6, "h": 3, "x": 0, "y": len(kpis) // 4 + 9},
            })
            chart_id += 1

    # 5. Scatter plot for correlated columns
    correlations = analysis.get("correlations", [])
    if correlations and abs(correlations[0]["correlation"]) >= 0.4:
        c = correlations[0]
        scatter_data = _build_scatter_data(df, c["col1"], c["col2"])
        charts.append({
            "id": f"chart_{chart_id}",
            "type": "scatter",
            "title": f"{c['col1']} vs {c['col2']}",
            "x_axis": c["col1"],
            "y_axis": c["col2"],
            "data": scatter_data,
            "correlation": c["correlation"],
            "size": "medium",
            "grid": {"w": 6, "h": 3, "x": 6, "y": len(kpis) // 4 + 9},
        })
        chart_id += 1

    # 6. Additional categorical bar charts
    for cat_col in categorical_cols[1:3]:
        if numeric_cols:
            num_col = numeric_cols[0]
            bar_data = _build_grouped_bar_data(df, cat_col, num_col, top_n=8)
            if bar_data:
                charts.append({
                    "id": f"chart_{chart_id}",
                    "type": "horizontal_bar",
                    "title": f"{num_col} by {cat_col}",
                    "x_axis": num_col,
                    "y_axis": cat_col,
                    "data": bar_data,
                    "size": "medium",
                    "grid": {"w": 6, "h": 4, "x": 0, "y": len(kpis) // 4 + 13},
                })
                chart_id += 1

    # 7. Area chart for second numeric time series
    if datetime_cols and len(numeric_cols) > 1:
        num_col = numeric_cols[1]
        ts_data = analysis.get("time_series", {}).get(num_col, {})
        if ts_data:
            charts.append({
                "id": f"chart_{chart_id}",
                "type": "area",
                "title": f"{num_col} Trend",
                "x_axis": datetime_cols[0],
                "y_axis": num_col,
                "data": _build_time_series_chart_data(ts_data),
                "size": "medium",
                "grid": {"w": 6, "h": 4, "x": 6, "y": len(kpis) // 4 + 13},
            })
            chart_id += 1

    # 8. Data summary table (always include)
    charts.append({
        "id": f"chart_{chart_id}",
        "type": "data_table",
        "title": "Data Preview",
        "data": _build_table_data(df, max_rows=100),
        "size": "large",
        "grid": {"w": 12, "h": 5, "x": 0, "y": 50},
    })

    return {
        "kpis": kpis,
        "charts": charts,
        "dataset_type": dataset_type,
        "auto_generated": True,
    }


def _build_kpis(df, column_info, dataset_type, numeric_cols, categorical_cols):
    kpis = []
    added = 0
    max_kpis = 8

    # Domain-specific KPIs first
    if dataset_type == "sales":
        kpis += _sales_kpis(df, column_info)
    elif dataset_type == "hr":
        kpis += _hr_kpis(df, column_info)
    elif dataset_type == "finance":
        kpis += _finance_kpis(df, column_info)
    elif dataset_type == "academic":
        kpis += _academic_kpis(df, column_info)

    # Generic KPIs from numeric columns
    for col in numeric_cols:
        if added >= max_kpis - len(kpis):
            break
        series = pd.to_numeric(df[col], errors="coerce").dropna()
        if series.empty:
            continue
        col_already = any(k.get("column") == col for k in kpis)
        if not col_already:
            kpis.append({
                "id": f"kpi_{col}",
                "title": f"Total {col}",
                "value": _safe_val(series.sum()),
                "format": "number",
                "column": col,
                "icon": "hash",
            })
            added += 1

    # Total records KPI
    kpis.insert(0, {
        "id": "kpi_total_records",
        "title": "Total Records",
        "value": len(df),
        "format": "number",
        "icon": "database",
    })

    return kpis[:max_kpis]


def _sales_kpis(df, column_info):
    kpis = []
    # Find revenue column
    rev_col = _find_col(df, ["revenue", "sales", "total_sales", "amount", "total_amount", "total_revenue"])
    if rev_col:
        series = pd.to_numeric(df[rev_col], errors="coerce").dropna()
        kpis.append({"id": "kpi_revenue", "title": "Total Revenue", "value": _safe_val(series.sum()),
                     "format": "currency", "column": rev_col, "icon": "dollar-sign"})
        kpis.append({"id": "kpi_avg_revenue", "title": "Avg Order Value", "value": _safe_val(series.mean()),
                     "format": "currency", "column": rev_col, "icon": "trending-up"})

    profit_col = _find_col(df, ["profit", "net_profit", "margin"])
    if profit_col:
        series = pd.to_numeric(df[profit_col], errors="coerce").dropna()
        kpis.append({"id": "kpi_profit", "title": "Total Profit", "value": _safe_val(series.sum()),
                     "format": "currency", "column": profit_col, "icon": "trending-up"})

    cust_col = _find_col(df, ["customer", "customer_id", "client"])
    if cust_col:
        kpis.append({"id": "kpi_customers", "title": "Total Customers", "value": int(df[cust_col].nunique()),
                     "format": "number", "column": cust_col, "icon": "users"})

    return kpis


def _hr_kpis(df, column_info):
    kpis = []
    emp_col = _find_col(df, ["employee", "employee_id", "emp_id", "id"])
    if emp_col:
        kpis.append({"id": "kpi_employees", "title": "Total Employees", "value": len(df),
                     "format": "number", "icon": "users"})

    sal_col = _find_col(df, ["salary", "annual_salary", "wage", "compensation"])
    if sal_col:
        series = pd.to_numeric(df[sal_col], errors="coerce").dropna()
        kpis.append({"id": "kpi_avg_salary", "title": "Avg Salary", "value": _safe_val(series.mean()),
                     "format": "currency", "column": sal_col, "icon": "dollar-sign"})
        kpis.append({"id": "kpi_total_payroll", "title": "Total Payroll", "value": _safe_val(series.sum()),
                     "format": "currency", "column": sal_col, "icon": "credit-card"})

    att_col = _find_col(df, ["attrition", "left", "turnover", "resigned"])
    if att_col:
        if str(df[att_col].dtype) == "object":
            attrition_rate = df[att_col].str.lower().isin(["yes", "1", "true", "left"]).mean() * 100
        else:
            attrition_rate = pd.to_numeric(df[att_col], errors="coerce").mean() * 100
        kpis.append({"id": "kpi_attrition", "title": "Attrition Rate", "value": round(attrition_rate, 1),
                     "format": "percent", "column": att_col, "icon": "user-minus"})

    return kpis


def _finance_kpis(df, column_info):
    kpis = []
    income_col = _find_col(df, ["income", "revenue", "total_income", "earnings"])
    expense_col = _find_col(df, ["expense", "expenses", "cost", "total_expenses"])

    if income_col:
        series = pd.to_numeric(df[income_col], errors="coerce").dropna()
        kpis.append({"id": "kpi_income", "title": "Total Income", "value": _safe_val(series.sum()),
                     "format": "currency", "column": income_col, "icon": "trending-up"})

    if expense_col:
        series = pd.to_numeric(df[expense_col], errors="coerce").dropna()
        kpis.append({"id": "kpi_expenses", "title": "Total Expenses", "value": _safe_val(series.sum()),
                     "format": "currency", "column": expense_col, "icon": "trending-down"})

    if income_col and expense_col:
        inc = pd.to_numeric(df[income_col], errors="coerce").fillna(0).sum()
        exp = pd.to_numeric(df[expense_col], errors="coerce").fillna(0).sum()
        net = inc - exp
        kpis.append({"id": "kpi_net_profit", "title": "Net Profit", "value": _safe_val(net),
                     "format": "currency", "icon": "dollar-sign"})
        if inc != 0:
            margin = net / abs(inc) * 100
            kpis.append({"id": "kpi_margin", "title": "Profit Margin", "value": _safe_val(margin),
                         "format": "percent", "icon": "percent"})

    return kpis


def _academic_kpis(df, column_info):
    kpis = []
    kpis.append({"id": "kpi_students", "title": "Total Students", "value": len(df),
                 "format": "number", "icon": "users"})

    score_col = _find_col(df, ["marks", "score", "grade", "gpa", "percentage", "total_marks"])
    if score_col:
        series = pd.to_numeric(df[score_col], errors="coerce").dropna()
        kpis.append({"id": "kpi_avg_score", "title": "Average Score", "value": _safe_val(series.mean()),
                     "format": "number", "column": score_col, "icon": "bar-chart"})
        kpis.append({"id": "kpi_max_score", "title": "Highest Score", "value": _safe_val(series.max()),
                     "format": "number", "column": score_col, "icon": "award"})

    pass_col = _find_col(df, ["pass", "result", "status", "passed"])
    if pass_col:
        pass_rate = df[pass_col].str.lower().isin(["pass", "passed", "yes", "p"]).mean() * 100
        kpis.append({"id": "kpi_pass_rate", "title": "Pass Rate", "value": round(pass_rate, 1),
                     "format": "percent", "icon": "check-circle"})

    return kpis


def _find_col(df: pd.DataFrame, candidates: List[str]) -> Optional[str]:
    """Find first matching column by lowercase partial match."""
    cols_lower = {c.lower(): c for c in df.columns}
    for cand in candidates:
        for col_lower, col_orig in cols_lower.items():
            if cand in col_lower or col_lower in cand:
                return col_orig
    return None


def _pick_best_metric_col(numeric_cols: List[str], dataset_type: str) -> str:
    if dataset_type == "sales":
        for kw in ["revenue", "sales", "amount", "profit"]:
            for c in numeric_cols:
                if kw in c.lower():
                    return c
    return numeric_cols[0]


def _build_time_series_chart_data(ts_data: Dict) -> List[Dict]:
    dates = ts_data.get("dates", [])
    values = ts_data.get("values", [])
    return [{"date": d, "value": v} for d, v in zip(dates, values)]


def _build_grouped_bar_data(df: pd.DataFrame, cat_col: str, num_col: str, top_n: int = 10) -> List[Dict]:
    try:
        numeric = pd.to_numeric(df[num_col], errors="coerce")
        grouped = df.groupby(cat_col)[num_col].apply(
            lambda x: pd.to_numeric(x, errors="coerce").sum()
        ).nlargest(top_n)
        return [{"name": str(k), "value": _safe_val(v)} for k, v in grouped.items()]
    except Exception:
        return []


def _build_pie_data(df: pd.DataFrame, col: str, top_n: int = 10) -> List[Dict]:
    vc = df[col].value_counts().head(top_n)
    return [{"name": str(k), "value": int(v)} for k, v in vc.items()]


def _build_scatter_data(df: pd.DataFrame, col1: str, col2: str, max_points: int = 500) -> List[Dict]:
    try:
        sub = df[[col1, col2]].dropna()
        if len(sub) > max_points:
            sub = sub.sample(max_points, random_state=42)
        x = pd.to_numeric(sub[col1], errors="coerce")
        y = pd.to_numeric(sub[col2], errors="coerce")
        valid = x.notna() & y.notna()
        return [{"x": _safe_val(xi), "y": _safe_val(yi)} for xi, yi in zip(x[valid], y[valid])]
    except Exception:
        return []


def _build_table_data(df: pd.DataFrame, max_rows: int = 100) -> Dict:
    sample = df.head(max_rows).replace({np.nan: None})
    return {
        "columns": list(df.columns),
        "rows": sample.values.tolist(),
        "total_rows": len(df),
    }
