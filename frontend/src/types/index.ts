export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  company?: string;
  avatar_url?: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface Dataset {
  id: number;
  name: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  row_count: number;
  column_count: number;
  status: 'processing' | 'ready' | 'error';
  error_message?: string;
  sheet_names?: string[];
  selected_sheet?: string;
  column_info?: Record<string, ColumnInfo>;
  summary_stats?: {
    analysis?: DataAnalysis;
    dashboard_config?: DashboardConfig;
    insights?: Insight[];
  };
  data_quality?: DataQuality;
  description?: string;
  created_at: string;
  updated_at?: string;
}

export interface ColumnInfo {
  name: string;
  pandas_dtype: string;
  semantic_type: 'numeric' | 'categorical' | 'datetime' | 'boolean' | 'text';
  null_count: number;
  null_pct: number;
  unique_count: number;
  sample_values: string[];
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  sum?: number;
  top_values?: Record<string, number>;
}

export interface DataQuality {
  missing_by_column: Record<string, { count: number; pct: number }>;
  duplicate_count: number;
  quality_score: number;
}

export interface DataAnalysis {
  overview: {
    total_rows: number;
    total_columns: number;
    total_cells: number;
    missing_cells: number;
    missing_pct: number;
    duplicate_rows: number;
    memory_mb: number;
  };
  data_quality: DataQuality;
  column_stats: ColumnStat[];
  correlations: Correlation[];
  outliers: Record<string, OutlierInfo>;
  distribution: {
    numeric: Record<string, { histogram: { bins: number[]; counts: number[] } }>;
    categorical: Record<string, { value_counts: Record<string, number> }>;
  };
  time_series: Record<string, { dates: string[]; values: number[]; frequency: string }>;
  dataset_context: {
    dataset_type: string;
    kpi_hints: string[];
    column_count: number;
    row_count: number;
  };
}

export interface ColumnStat {
  name: string;
  type: string;
  dtype: string;
  null_count: number;
  null_pct: number;
  unique_count: number;
  unique_pct: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  sum?: number;
  q25?: number;
  q75?: number;
  skewness?: number;
  kurtosis?: number;
  top_value?: string;
  top_value_count?: number;
  top_values?: Record<string, number>;
  min_date?: string;
  max_date?: string;
}

export interface Correlation {
  col1: string;
  col2: string;
  correlation: number;
  strength: string;
}

export interface OutlierInfo {
  count: number;
  pct: number;
  lower_fence: number;
  upper_fence: number;
  examples: number[];
}

export interface KPI {
  id: string;
  title: string;
  value: number | string;
  format: 'number' | 'currency' | 'percent';
  column?: string;
  icon?: string;
  change?: number;
  change_label?: string;
}

export interface Chart {
  id: string;
  type: 'bar' | 'horizontal_bar' | 'line' | 'area' | 'pie' | 'donut' | 'scatter' | 'histogram' | 'data_table';
  title: string;
  x_axis?: string;
  y_axis?: string;
  category_col?: string;
  column?: string;
  data: any;
  size: 'small' | 'medium' | 'large';
  grid?: { w: number; h: number; x: number; y: number };
  correlation?: number;
}

export interface DashboardConfig {
  kpis: KPI[];
  charts: Chart[];
  dataset_type: string;
  auto_generated: boolean;
}

export interface Dashboard {
  id: number;
  name: string;
  description?: string;
  dataset_id: number;
  dataset_name?: string;
  dataset_row_count?: number;
  dataset_column_count?: number;
  kpis: KPI[];
  charts: Chart[];
  filters: Record<string, any>;
  theme: string;
  is_public: boolean;
  public_token?: string;
  insights?: Insight[];
  column_info?: Record<string, ColumnInfo>;
  analysis?: DataAnalysis;
  created_at: string;
  updated_at?: string;
}

export interface Insight {
  type: string;
  severity: 'info' | 'warning' | 'success' | 'danger';
  title: string;
  description: string;
  metric?: number | string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  chart?: {
    type: string;
    title: string;
    data: any[];
  };
  timestamp: string;
}

export interface ApiError {
  detail: string;
}
