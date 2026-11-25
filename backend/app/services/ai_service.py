"""
AI Chat and Insights service for DataFlow AI.
Supports OpenAI API when configured, falls back to rule-based analytics.
"""
import json
import re
import pandas as pd
import numpy as np
from typing import Any, Dict, List, Optional
from ..core.config import settings
from .data_analyzer import (
    _find_col, _safe_val, _build_grouped_bar_data, _build_pie_data,
    _build_time_series_chart_data, _build_scatter_data
)


class AIService:
    def __init__(self):
        self.openai_available = bool(settings.OPENAI_API_KEY)
        self._client = None

    def _get_client(self):
        if self._client is None and self.openai_available:
            try:
                from openai import AsyncOpenAI
                self._client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            except ImportError:
                self.openai_available = False
        return self._client

    async def chat(
        self,
        question: str,
        df: pd.DataFrame,
        column_info: Dict,
        analysis: Dict,
        conversation_history: List[Dict] = None,
    ) -> Dict:
        """
        Answer a natural language question about the dataset.
        Returns {answer, chart_data (optional), sql (optional)}.
        """
        if self.openai_available:
            try:
                return await self._openai_chat(question, df, column_info, analysis, conversation_history)
            except Exception as e:
                # Fall back to rule-based
                pass

        return self._rule_based_chat(question, df, column_info, analysis)

    async def _openai_chat(self, question, df, column_info, analysis, history):
        client = self._get_client()
        if not client:
            return self._rule_based_chat(question, df, column_info, analysis)

        # Build a compact data context for the prompt
        schema_summary = []
        for col, info in list(column_info.items())[:30]:
            schema_summary.append(f"{col} ({info.get('semantic_type', 'unknown')})")

        stats_summary = {}
        for col, info in list(column_info.items())[:15]:
            if info.get("semantic_type") == "numeric":
                stats_summary[col] = {
                    "sum": info.get("sum"), "mean": info.get("mean"),
                    "min": info.get("min"), "max": info.get("max"),
                }

        system_prompt = f"""You are DataFlow AI, an expert data analyst assistant.
The user has uploaded a dataset with {len(df)} rows and {len(df.columns)} columns.
Columns: {', '.join(schema_summary)}.
Key statistics: {json.dumps(stats_summary, default=str)[:1500]}
Dataset type: {analysis.get('dataset_context', {}).get('dataset_type', 'general')}

Answer the user's question using ONLY data from this dataset.
Be specific, use actual numbers from the statistics provided.
If asked to create a chart, respond with a JSON object in this format:
{{"answer": "...", "chart": {{"type": "bar|line|pie|scatter", "title": "...", "data": [...]}}}}
Otherwise respond with: {{"answer": "..."}}
Never invent statistics. If you cannot calculate something from provided stats, say so clearly."""

        messages = [{"role": "system", "content": system_prompt}]
        if history:
            messages.extend(history[-6:])  # Last 3 turns
        messages.append({"role": "user", "content": question})

        response = await client.chat.completions.create(
            model=settings.AI_MODEL,
            messages=messages,
            max_tokens=settings.AI_MAX_TOKENS,
            temperature=0.3,
        )

        raw = response.choices[0].message.content.strip()
        try:
            parsed = json.loads(raw)
            return parsed
        except Exception:
            return {"answer": raw}

    def _rule_based_chat(self, question: str, df: pd.DataFrame, column_info: Dict, analysis: Dict) -> Dict:
        """
        Answer questions using rule-based pattern matching and actual data calculations.
        """
        q = question.lower().strip()
        numeric_cols = [c for c, v in column_info.items() if v.get("semantic_type") == "numeric"]
        categorical_cols = [c for c, v in column_info.items() if v.get("semantic_type") == "categorical"]
        datetime_cols = [c for c, v in column_info.items() if v.get("semantic_type") == "datetime"]

        # Total / Sum queries
        sum_match = re.search(r"total\s+(.+?)(?:\?|$)", q)
        if sum_match or re.search(r"\b(sum|total)\b", q):
            target = sum_match.group(1).strip() if sum_match else ""
            col = self._find_column_in_question(q, numeric_cols)
            if col:
                val = pd.to_numeric(df[col], errors="coerce").sum()
                return {"answer": f"The total {col} is **{self._format_number(val)}**."}

        # Average / Mean
        if re.search(r"\b(average|avg|mean)\b", q):
            col = self._find_column_in_question(q, numeric_cols)
            if col:
                val = pd.to_numeric(df[col], errors="coerce").mean()
                return {"answer": f"The average {col} is **{self._format_number(val)}**."}

        # Maximum
        if re.search(r"\b(max|maximum|highest|top|largest|best)\b", q):
            col = self._find_column_in_question(q, numeric_cols)
            if col:
                max_val = pd.to_numeric(df[col], errors="coerce").max()
                max_row = df.loc[pd.to_numeric(df[col], errors="coerce").idxmax()]
                answer = f"The highest {col} is **{self._format_number(max_val)}**."
                # Try to add context
                if categorical_cols:
                    cat_val = max_row[categorical_cols[0]]
                    answer += f" This corresponds to **{cat_val}**."
                return {"answer": answer}

        # Minimum
        if re.search(r"\b(min|minimum|lowest|bottom|smallest|worst)\b", q):
            col = self._find_column_in_question(q, numeric_cols)
            if col:
                min_val = pd.to_numeric(df[col], errors="coerce").min()
                return {"answer": f"The minimum {col} is **{self._format_number(min_val)}**."}

        # Count / How many
        if re.search(r"\b(count|how many|number of|total records)\b", q):
            if re.search(r"\b(rows|records|entries|data)\b", q):
                return {"answer": f"The dataset contains **{len(df):,}** records."}
            col = self._find_column_in_question(q, categorical_cols)
            if col:
                count = df[col].nunique()
                top = df[col].value_counts().head(3)
                answer = f"There are **{count}** unique {col} values. "
                answer += f"Top 3: {', '.join(f'{k} ({v})' for k, v in top.items())}."
                return {"answer": answer}

        # Top N
        top_match = re.search(r"top\s+(\d+)\s+(.+?)(?:\s+by\s+(.+?))?(?:\?|$)", q)
        if top_match:
            n = int(top_match.group(2)) if top_match.group(2).isdigit() else 10
            subject = top_match.group(2) if not top_match.group(2).isdigit() else top_match.group(3) or ""
            cat_col = self._find_column_in_question(subject, categorical_cols)
            num_col = self._find_column_in_question(q, numeric_cols)
            if cat_col and num_col:
                grouped = df.groupby(cat_col)[num_col].apply(
                    lambda x: pd.to_numeric(x, errors="coerce").sum()
                ).nlargest(n)
                rows = "\n".join([f"**{k}**: {self._format_number(v)}" for k, v in grouped.items()])
                return {
                    "answer": f"Top {n} {cat_col} by {num_col}:\n{rows}",
                    "chart": {
                        "type": "bar",
                        "title": f"Top {n} {cat_col} by {num_col}",
                        "data": [{"name": str(k), "value": _safe_val(v)} for k, v in grouped.items()],
                    }
                }

        # Distribution / breakdown
        if re.search(r"\b(distribution|breakdown|split|by)\b", q):
            cat_col = self._find_column_in_question(q, categorical_cols)
            if cat_col:
                vc = df[cat_col].value_counts().head(10)
                rows = "\n".join([f"**{k}**: {v:,} ({v/len(df)*100:.1f}%)" for k, v in vc.items()])
                return {
                    "answer": f"Distribution of {cat_col}:\n{rows}",
                    "chart": {
                        "type": "pie",
                        "title": f"Distribution by {cat_col}",
                        "data": [{"name": str(k), "value": int(v)} for k, v in vc.items()],
                    }
                }

        # Trend over time
        if re.search(r"\b(trend|over time|monthly|yearly|growth)\b", q) and datetime_cols:
            ts_data = analysis.get("time_series", {})
            if ts_data:
                col = list(ts_data.keys())[0]
                data = _build_time_series_chart_data(ts_data[col])
                return {
                    "answer": f"Here is the trend of {col} over time.",
                    "chart": {
                        "type": "line",
                        "title": f"{col} Over Time",
                        "data": data,
                    }
                }

        # Columns / schema
        if re.search(r"\b(columns|fields|schema|structure)\b", q):
            col_list = []
            for col, info in list(column_info.items())[:20]:
                col_list.append(f"**{col}** ({info.get('semantic_type', 'unknown')})")
            answer = f"Dataset has {len(df.columns)} columns:\n" + "\n".join(col_list)
            return {"answer": answer}

        # Summary / overview
        if re.search(r"\b(summary|overview|describe|statistics)\b", q):
            overview = analysis.get("overview", {})
            quality = analysis.get("data_quality", {})
            answer = (
                f"**Dataset Summary**\n"
                f"- Total records: **{overview.get('total_rows', 0):,}**\n"
                f"- Columns: **{overview.get('total_columns', 0)}**\n"
                f"- Missing values: **{overview.get('missing_pct', 0)}%**\n"
                f"- Duplicate rows: **{quality.get('duplicate_count', 0):,}**\n"
                f"- Data quality score: **{quality.get('quality_score', 0)}%**"
            )
            return {"answer": answer}

        # Correlation
        if re.search(r"\b(correlat|relationship|related)\b", q):
            correlations = analysis.get("correlations", [])
            if correlations:
                top_corr = correlations[0]
                return {
                    "answer": f"The strongest correlation is between **{top_corr['col1']}** and **{top_corr['col2']}** "
                              f"(r = {top_corr['correlation']:.3f}, {top_corr['strength']} {'' if top_corr['correlation'] > 0 else 'negative'} correlation).",
                }

        # Missing values
        if re.search(r"\b(missing|null|empty|blank)\b", q):
            quality = analysis.get("data_quality", {})
            missing = quality.get("missing_by_column", {})
            if missing:
                items = "\n".join([f"**{k}**: {v['count']:,} ({v['pct']}%)" for k, v in list(missing.items())[:10]])
                return {"answer": f"Missing values by column:\n{items}"}
            else:
                return {"answer": "Great news! No missing values found in the dataset."}

        # Default: return a helpful overview
        overview = analysis.get("overview", {})
        dataset_type = analysis.get("dataset_context", {}).get("dataset_type", "general")
        return {
            "answer": (
                f"I'm analyzing your {dataset_type} dataset with **{overview.get('total_rows', 0):,}** records "
                f"and **{overview.get('total_columns', 0)}** columns. "
                f"I can answer questions like: total revenue, average salary, top 10 products, "
                f"monthly trends, distribution by category, correlations, and more. "
                f"What would you like to know?"
            )
        }

    def _find_column_in_question(self, question: str, columns: List[str]) -> Optional[str]:
        """Find the most relevant column mentioned in the question."""
        q_lower = question.lower()
        # Exact match first
        for col in columns:
            if col.lower() in q_lower:
                return col
        # Partial match
        for col in columns:
            words = col.lower().replace("_", " ").split()
            if any(w in q_lower for w in words if len(w) > 2):
                return col
        # Return first if question mentions any numeric concept
        if re.search(r"\b(total|sum|average|max|min|count)\b", q_lower) and columns:
            return columns[0]
        return None

    def _format_number(self, val) -> str:
        if val is None:
            return "N/A"
        try:
            if abs(val) >= 1_000_000:
                return f"{val/1_000_000:.2f}M"
            elif abs(val) >= 1_000:
                return f"{val:,.2f}"
            else:
                return f"{val:.4g}"
        except Exception:
            return str(val)


ai_service = AIService()
