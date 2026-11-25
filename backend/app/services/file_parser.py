"""
Universal file parser for DataFlow AI.
Supports: CSV, Excel, JSON, XML, HTML, TXT, SQL exports, Parquet, ZIP.
"""
import os
import io
import json
import zipfile
import tempfile
import chardet
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Tuple, Optional, List, Dict, Any


SUPPORTED_EXTENSIONS = {
    ".csv", ".xlsx", ".xls", ".json", ".xml", ".html", ".htm",
    ".txt", ".parquet", ".zip", ".sql"
}

MAX_DISPLAY_ROWS = 1000  # Cap for preview/analysis in-memory
SAMPLE_ROWS = 50000       # Rows to sample from very large files


def detect_encoding(file_bytes: bytes) -> str:
    result = chardet.detect(file_bytes[:50000])
    encoding = result.get("encoding") or "utf-8"
    # Normalize
    if encoding.lower() in ("ascii", "iso-8859-1", "windows-1252"):
        return encoding
    return "utf-8"


def parse_file(
    file_path: str,
    file_ext: str,
    sheet_name: Optional[str] = None,
) -> Tuple[pd.DataFrame, List[str], Optional[str]]:
    """
    Parse a file and return (dataframe, sheet_names, error_message).
    sheet_names is populated only for Excel files.
    """
    file_ext = file_ext.lower()

    try:
        if file_ext in (".xlsx", ".xls"):
            return _parse_excel(file_path, sheet_name)
        elif file_ext == ".csv":
            return _parse_csv(file_path), [], None
        elif file_ext == ".json":
            return _parse_json(file_path), [], None
        elif file_ext in (".xml",):
            return _parse_xml(file_path), [], None
        elif file_ext in (".html", ".htm"):
            return _parse_html(file_path), [], None
        elif file_ext == ".txt":
            return _parse_txt(file_path), [], None
        elif file_ext == ".parquet":
            return _parse_parquet(file_path), [], None
        elif file_ext == ".sql":
            return _parse_sql_export(file_path), [], None
        elif file_ext == ".zip":
            return _parse_zip(file_path)
        else:
            return pd.DataFrame(), [], f"Unsupported file format: {file_ext}"
    except Exception as e:
        return pd.DataFrame(), [], f"Failed to parse file: {str(e)}"


def _parse_excel(file_path: str, sheet_name: Optional[str] = None):
    xl = pd.ExcelFile(file_path, engine="openpyxl")
    sheet_names = xl.sheet_names
    target = sheet_name if sheet_name and sheet_name in sheet_names else sheet_names[0]
    df = pd.read_excel(file_path, sheet_name=target, engine="openpyxl")
    df = _clean_dataframe(df)
    return df, sheet_names, None


def _parse_csv(file_path: str) -> pd.DataFrame:
    with open(file_path, "rb") as f:
        raw = f.read(100000)
    encoding = detect_encoding(raw)

    # Try multiple separators
    for sep in [",", ";", "\t", "|"]:
        try:
            df = pd.read_csv(file_path, sep=sep, encoding=encoding, low_memory=False, nrows=SAMPLE_ROWS)
            if len(df.columns) > 1:
                return _clean_dataframe(df)
        except Exception:
            continue
    df = pd.read_csv(file_path, encoding=encoding, low_memory=False, nrows=SAMPLE_ROWS)
    return _clean_dataframe(df)


def _parse_json(file_path: str) -> pd.DataFrame:
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        data = json.load(f)

    if isinstance(data, list):
        df = pd.json_normalize(data)
    elif isinstance(data, dict):
        # Try common patterns
        for key in ["data", "records", "results", "items", "rows", "values"]:
            if key in data and isinstance(data[key], list):
                df = pd.json_normalize(data[key])
                return _clean_dataframe(df)
        df = pd.json_normalize([data])
    else:
        raise ValueError("JSON must contain an array or object")

    return _clean_dataframe(df)


def _parse_xml(file_path: str) -> pd.DataFrame:
    try:
        df = pd.read_xml(file_path)
        return _clean_dataframe(df)
    except Exception:
        # Fallback: try lxml
        from lxml import etree
        tree = etree.parse(file_path)
        root = tree.getroot()
        rows = []
        children = list(root)
        if children:
            for child in children:
                row = {c.tag: c.text for c in child}
                rows.append(row)
        if rows:
            return _clean_dataframe(pd.DataFrame(rows))
        raise ValueError("Could not extract tabular data from XML")


def _parse_html(file_path: str) -> pd.DataFrame:
    tables = pd.read_html(file_path)
    if not tables:
        raise ValueError("No HTML tables found in file")
    # Pick the largest table
    df = max(tables, key=lambda t: t.shape[0] * t.shape[1])
    return _clean_dataframe(df)


def _parse_txt(file_path: str) -> pd.DataFrame:
    with open(file_path, "rb") as f:
        raw = f.read(100000)
    encoding = detect_encoding(raw)

    # Detect delimiter
    sample = raw.decode(encoding, errors="replace")[:5000]
    delimiter = ","
    for sep in ["\t", "|", ";", ","]:
        if sample.count(sep) > sample.count(delimiter):
            delimiter = sep

    try:
        df = pd.read_csv(file_path, sep=delimiter, encoding=encoding, low_memory=False, nrows=SAMPLE_ROWS)
        if len(df.columns) > 1:
            return _clean_dataframe(df)
    except Exception:
        pass

    # Fixed-width fallback
    df = pd.read_fwf(file_path, encoding=encoding, nrows=SAMPLE_ROWS)
    return _clean_dataframe(df)


def _parse_parquet(file_path: str) -> pd.DataFrame:
    df = pd.read_parquet(file_path)
    if len(df) > SAMPLE_ROWS:
        df = df.sample(SAMPLE_ROWS, random_state=42)
    return _clean_dataframe(df)


def _parse_sql_export(file_path: str) -> pd.DataFrame:
    """Parse SQL INSERT statements into a dataframe."""
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    import re
    # Find INSERT INTO table (cols) VALUES ...
    insert_pattern = re.compile(
        r"INSERT\s+INTO\s+[`'\"]?(\w+)[`'\"]?\s*\(([^)]+)\)\s*VALUES\s*(.+?)(?:;|$)",
        re.IGNORECASE | re.DOTALL
    )
    matches = insert_pattern.findall(content)
    if not matches:
        raise ValueError("No INSERT statements found in SQL file")

    table_name, cols_str, vals_str = matches[0]
    columns = [c.strip().strip("`'\"") for c in cols_str.split(",")]

    # Parse VALUES
    value_rows = re.findall(r"\(([^)]+)\)", vals_str)
    rows = []
    for vr in value_rows[:SAMPLE_ROWS]:
        vals = [v.strip().strip("'\"") for v in vr.split(",")]
        if len(vals) == len(columns):
            rows.append(dict(zip(columns, vals)))

    if not rows:
        raise ValueError("Could not parse VALUES from SQL INSERT statements")

    return _clean_dataframe(pd.DataFrame(rows))


def _parse_zip(file_path: str):
    """Extract zip and parse first supported file found."""
    with zipfile.ZipFile(file_path, "r") as zf:
        names = zf.namelist()
        # Filter to supported types
        supported = [n for n in names if Path(n).suffix.lower() in SUPPORTED_EXTENSIONS and not n.startswith("__")]
        if not supported:
            raise ValueError("ZIP contains no supported data files")

        target = supported[0]
        with tempfile.TemporaryDirectory() as tmpdir:
            zf.extract(target, tmpdir)
            extracted_path = os.path.join(tmpdir, target)
            ext = Path(target).suffix.lower()
            if ext in (".xlsx", ".xls"):
                return _parse_excel(extracted_path, None)
            df, _, err = parse_file(extracted_path, ext)
            return df, [], err


def _clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Basic cleanup: strip column names, drop fully empty rows/cols."""
    # Strip whitespace from column names
    df.columns = [str(c).strip() for c in df.columns]
    # Drop fully null rows and columns
    df = df.dropna(how="all").dropna(axis=1, how="all")
    # Reset index
    df = df.reset_index(drop=True)
    return df


def infer_column_types(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Infer semantic column types: numeric, categorical, datetime, boolean, text.
    Returns dict of {col_name: {type, pandas_dtype, sample_values, ...}}
    """
    result = {}
    for col in df.columns:
        series = df[col]
        pandas_dtype = str(series.dtype)
        col_info: Dict[str, Any] = {
            "name": col,
            "pandas_dtype": pandas_dtype,
            "null_count": int(series.isna().sum()),
            "null_pct": round(series.isna().mean() * 100, 2),
            "unique_count": int(series.nunique()),
        }

        # Sample non-null values
        sample = series.dropna().head(5).tolist()
        col_info["sample_values"] = [str(v) for v in sample]

        # Determine semantic type
        if pd.api.types.is_bool_dtype(series):
            col_info["semantic_type"] = "boolean"
        elif pd.api.types.is_numeric_dtype(series):
            col_info["semantic_type"] = "numeric"
            col_info["min"] = _safe_val(series.min())
            col_info["max"] = _safe_val(series.max())
            col_info["mean"] = _safe_val(series.mean())
            col_info["median"] = _safe_val(series.median())
            col_info["std"] = _safe_val(series.std())
            col_info["sum"] = _safe_val(series.sum())
        elif pd.api.types.is_datetime64_any_dtype(series):
            col_info["semantic_type"] = "datetime"
            col_info["min"] = str(series.min())
            col_info["max"] = str(series.max())
        else:
            # Try to parse as datetime
            if _looks_like_datetime(series):
                try:
                    parsed = pd.to_datetime(series, errors="coerce")
                    if parsed.notna().mean() > 0.7:
                        col_info["semantic_type"] = "datetime"
                        col_info["min"] = str(parsed.min())
                        col_info["max"] = str(parsed.max())
                        col_info["pandas_dtype"] = "datetime64"
                        result[col] = col_info
                        continue
                except Exception:
                    pass
            # Try numeric
            try:
                numeric_series = pd.to_numeric(series, errors="coerce")
                if numeric_series.notna().mean() > 0.8:
                    col_info["semantic_type"] = "numeric"
                    col_info["min"] = _safe_val(numeric_series.min())
                    col_info["max"] = _safe_val(numeric_series.max())
                    col_info["mean"] = _safe_val(numeric_series.mean())
                    col_info["sum"] = _safe_val(numeric_series.sum())
                    result[col] = col_info
                    continue
            except Exception:
                pass

            # Categorical vs text
            cardinality_ratio = series.nunique() / max(len(series), 1)
            if cardinality_ratio < 0.5 and series.nunique() <= 100:
                col_info["semantic_type"] = "categorical"
                top = series.value_counts().head(10)
                col_info["top_values"] = {str(k): int(v) for k, v in top.items()}
            else:
                col_info["semantic_type"] = "text"

        result[col] = col_info

    return result


def _looks_like_datetime(series: pd.Series) -> bool:
    sample = series.dropna().head(20).astype(str)
    patterns = [
        r"\d{4}-\d{2}-\d{2}",
        r"\d{2}/\d{2}/\d{4}",
        r"\d{2}-\d{2}-\d{4}",
        r"\d{4}/\d{2}/\d{2}",
    ]
    import re
    for val in sample:
        for p in patterns:
            if re.search(p, val):
                return True
    return False


def _safe_val(val):
    """Convert numpy types to Python native for JSON serialization."""
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return None
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
        return float(val)
    return val
