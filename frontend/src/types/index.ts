// Global Type Definitions for LIFORA
// Tagline: Your Life. Your Space. Your Rules.

export interface UserProfile {
  id: string;
  user_id: string;
  display_name?: string | null;
  age: number;
  height_cm: number;
  current_weight_kg: number;
  timezone: string;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

export interface UserGoal {
  id: string;
  user_id: string;
  target_weight_kg: number;
  daily_protein_target_g: number;
  running_target_km: number;
  daily_calorie_target?: number | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  is_active: boolean;
  is_verified?: boolean;
  profile?: UserProfile | null;
  goals?: UserGoal | null;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

// Nutrition
export interface Food {
  id: string;
  name: string;
  brand?: string | null;
  category: string;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  is_custom: boolean;
  created_by_id?: string | null;
  created_at: string;
}

export interface FoodEntryItem {
  id: string;
  entry_id: string;
  food_id?: string | null;
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  created_at: string;
}

export interface FoodEntry {
  id: string;
  user_id: string;
  date: string;
  meal_type: string;
  notes?: string | null;
  items: FoodEntryItem[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_fiber_g: number;
  created_at: string;
}

export interface DailyMealSummary {
  meal_type: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  entries_count: number;
}

export interface DailyNutritionSummary {
  date: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_fiber_g: number;
  protein_target_g: number;
  calorie_target?: number | null;
  protein_progress_percentage: number;
  calorie_progress_percentage?: number | null;
  meals: DailyMealSummary[];
}

export interface DetectedFoodItem {
  name: string;
  estimated_quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  confidence: number;
  category: string;
}

export interface FoodAiAnalysisResponse {
  id: string;
  status: string;
  image_url: string;
  detected_items: DetectedFoodItem[];
  is_mock: boolean;
  message?: string | null;
  created_at: string;
}

// Workouts
export interface Exercise {
  id: string;
  name: string;
  category: string;
  target_muscle: string;
  description?: string | null;
  is_custom: boolean;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  session_id: string;
  exercise_id?: string | null;
  exercise_name: string;
  sets: number;
  reps: number;
  weight_kg: number;
  duration_minutes?: number | null;
  notes?: string | null;
  order_index: number;
  created_at: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  name: string;
  date: string;
  duration_minutes: number;
  notes?: string | null;
  exercises: WorkoutExercise[];
  total_sets: number;
  total_volume_kg: number;
  created_at: string;
}

export interface WorkoutTemplateItem {
  id: string;
  template_id: string;
  exercise_id: string;
  exercise_name?: string | null;
  target_muscle?: string | null;
  sets: number;
  reps: number;
  target_weight_kg?: number | null;
  order_index: number;
}

export interface WorkoutTemplate {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  items: WorkoutTemplateItem[];
  created_at: string;
}

// Activities
export interface ActivitySession {
  id: string;
  user_id: string;
  activity_type: 'running' | 'football';
  date: string;
  duration_minutes: number;
  distance_km?: number | null;
  calculated_pace?: string | null;
  effort_level?: string | null;
  intensity?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface RunningSummary {
  total_distance_km: number;
  total_sessions: number;
  average_pace: string;
  average_distance_km: number;
  weekly_distance_km: number;
}

export interface FootballSummary {
  total_sessions: number;
  total_duration_minutes: number;
  weekly_duration_minutes: number;
  weekly_sessions: number;
}

// Weight
export interface WeightEntry {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number;
  notes?: string | null;
  created_at: string;
}

export interface WeightSummary {
  current_weight_kg: number;
  target_weight_kg: number;
  weight_difference_kg: number;
  weekly_average_kg?: number | null;
  monthly_change_kg?: number | null;
  total_entries_count: number;
  history: WeightEntry[];
}

// Planner
export interface WeeklyPlanItem {
  id: string;
  plan_id: string;
  planned_date: string;
  activity_type: 'running' | 'strength' | 'football' | 'rest';
  duration_minutes?: number | null;
  notes?: string | null;
  is_completed: boolean;
  replaced_by_football: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeeklyPlan {
  id: string;
  user_id: string;
  week_start_date: string;
  notes?: string | null;
  items: WeeklyPlanItem[];
  created_at: string;
  updated_at: string;
}

// Analytics
export interface NutritionDataPoint {
  date: string;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  has_data: boolean;
}

export interface ActivityDataPoint {
  date: string;
  running_distance_km?: number | null;
  running_duration_min?: number | null;
  football_duration_min?: number | null;
  workout_duration_min?: number | null;
  workout_sessions_count: number;
  has_activity: boolean;
}

export interface WeightDataPoint {
  date: string;
  weight_kg?: number | null;
  has_data: boolean;
}

export interface AnalyticsOverview {
  period: string;
  start_date: string;
  end_date: string;
  total_days_in_period: number;
  nutrition_days_recorded: number;
  average_calories?: number | null;
  average_protein_g?: number | null;
  average_carbs_g?: number | null;
  average_fat_g?: number | null;
  protein_target_g: number;
  protein_goal_met_days: number;
  protein_goal_completion_rate: number;
  total_running_distance_km: number;
  total_running_sessions: number;
  average_running_pace?: string | null;
  total_football_duration_min: number;
  total_football_sessions: number;
  total_workout_sessions: number;
  total_workout_duration_min: number;
  weight_days_recorded: number;
  start_weight_kg?: number | null;
  latest_weight_kg?: number | null;
  weight_change_kg?: number | null;
  target_weight_kg: number;
  nutrition_trend: NutritionDataPoint[];
  activity_trend: ActivityDataPoint[];
  weight_trend: WeightDataPoint[];
}

// Reports
export interface ReportData {
  report_type: string;
  start_date: string;
  end_date: string;
  generated_at: string;
  user_info: Record<string, any>;
  nutrition_summary: Record<string, any>;
  workout_summary: Record<string, any>;
  running_summary: Record<string, any>;
  football_summary: Record<string, any>;
  weight_summary: Record<string, any>;
  data_completeness: Record<string, any>;
  goal_completion: Record<string, any>;
}

// AI Assistant
export interface AiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata_json?: Record<string, any> | null;
  created_at: string;
}

export interface AiConversation {
  id: string;
  title: string;
  messages: AiMessage[];
  created_at: string;
  updated_at: string;
}

export interface AiStatus {
  is_configured: boolean;
  provider: string;
  model: string;
  message: string;
}

// ==========================================
// V2 Life Management Types
// ==========================================

// Screen Time
export interface ScreenTimeGoal {
  id: string;
  user_id: string;
  daily_target_minutes: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScreenTimeSession {
  id: string;
  user_id: string;
  date: string;
  app_name: string;
  package_name?: string | null;
  category: string;
  duration_minutes: number;
  notes?: string | null;
  source?: string | null;
  import_id?: string | null;
  is_synced: boolean;
  created_at: string;
  updated_at: string;
}

export interface MostUsedApp {
  app_name: string;
  category: string;
  duration_minutes: number;
  percentage_of_total: number;
}

export interface DailyScreenTimeSummary {
  date: string;
  total_duration_minutes: number;
  daily_target_minutes: number;
  remaining_allowed_minutes: number;
  is_over_limit: boolean;
  most_used_app?: MostUsedApp | null;
  category_breakdown: Record<string, number>;
  sessions: ScreenTimeSession[];
}

export interface WeeklyScreenTimeSummary {
  start_date: string;
  end_date: string;
  daily_average_minutes: number;
  total_minutes: number;
  daily_target_minutes: number;
  top_apps: MostUsedApp[];
  category_breakdown: Record<string, number>;
}

export interface ExtractedScreenTimeItem {
  app_name: string;
  category: string;
  duration_minutes: number;
  duration_formatted: string;
  confidence: number;
}

export interface ScreenTimeImportReviewResponse {
  id: string;
  image_url: string;
  detected_date: string;
  total_detected_minutes: number;
  total_formatted: string;
  status: string;
  items: ExtractedScreenTimeItem[];
  raw_text?: string | null;
  message?: string | null;
}

export interface ScreenTimeImportHistoryItem {
  id: string;
  import_date: string;
  target_date: string;
  image_url: string;
  status: string;
  app_count: number;
  total_duration_minutes: number;
  created_at: string;
}

// Finance & Salary
export interface SalaryRecord {
  id: string;
  user_id: string;
  salary_date: string;
  employer: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: string;
  user_id?: string | null;
  name: string;
  icon?: string | null;
  color?: string | null;
  is_default: boolean;
  created_at: string;
}

export interface IncomeEntry {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  payment_method: string;
  notes?: string | null;
  recurring_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseEntry {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  payment_method: string;
  notes?: string | null;
  recurring_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: string | null;
  notes?: string | null;
  is_achieved: boolean;
  progress_percentage: number;
  remaining_amount: number;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  month: number;
  year: number;
  category: string;
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  spent_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface RecurringTransaction {
  id: string;
  user_id: string;
  transaction_type: 'income' | 'expense';
  title: string;
  amount: number;
  category: string;
  payment_method: string;
  frequency: string;
  day_of_month: number;
  is_active: boolean;
  last_processed_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
}

export interface FinanceOverviewResponse {
  month: number;
  year: number;
  currency: string;
  total_income: number;
  total_expenses: number;
  net_savings: number;
  latest_salary?: SalaryRecord | null;
  savings_goals: SavingsGoal[];
  category_breakdown: CategorySpending[];
  recent_transactions: Array<{
    id: string;
    type: 'income' | 'expense';
    title: string;
    amount: number;
    category: string;
    date: string;
    payment_method: string;
  }>;
  budget_overview: Budget[];
}

// Custom Modules & Builder
export interface CustomModuleField {
  id: string;
  module_id: string;
  field_label: string;
  field_key: string;
  field_type: string;
  placeholder?: string | null;
  is_required: boolean;
  default_value?: string | null;
  help_text?: string | null;
  options?: string[] | null;
  validation_rules?: Record<string, any> | null;
  display_order: number;
  is_visible_in_table: boolean;
  is_editable: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomModule {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon: string;
  color: string;
  show_in_sidebar: boolean;
  show_in_dashboard: boolean;
  is_active: boolean;
  display_order: number;
  records_count: number;
  fields?: CustomModuleField[];
  created_at: string;
  updated_at: string;
}

export interface CustomModuleRecord {
  id: string;
  module_id: string;
  user_id: string;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PaginatedRecordsResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  records: CustomModuleRecord[];
}

// Redesigned Mobile Dashboard
export interface PrimaryCardStat {
  label: string;
  value: string;
  subtext?: string | null;
  progress?: number | null;
}

export interface PrimaryCard {
  id: 'fitness' | 'screentime' | 'money' | 'planner' | string;
  title: string;
  icon: string;
  stats: PrimaryCardStat[];
  link: string;
  badge?: string | null;
}

export interface CustomWidget {
  id: string;
  module_id: string;
  module_name: string;
  icon: string;
  color: string;
  records_count: number;
  recent_entry?: Record<string, any> | null;
  link: string;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action_type: 'modal' | 'navigate';
  target: string;
}

export interface DashboardOverviewResponse {
  primary_cards: PrimaryCard[];
  quick_actions: QuickAction[];
  custom_widgets: CustomWidget[];
  recent_activities: any[];
  all_cards?: PrimaryCard[];
  layout_config: {
    visible_cards?: string[];
    card_order?: string[];
    custom_widgets?: string[];
  };
}

export interface DashboardConfig {
  id: string;
  user_id: string;
  layout_config: Record<string, any>;
}

// ==========================================
// Water Tracker Types
// ==========================================
export interface WaterGoal {
  id: string;
  user_id: string;
  daily_target_ml: number;
  reminder_enabled: boolean;
  reminder_interval_hours: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaterEntry {
  id: string;
  user_id: string;
  date: string;
  time: string;
  amount_ml: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyWaterSummary {
  date: string;
  total_consumed_ml: number;
  daily_target_ml: number;
  remaining_ml: number;
  progress_percentage: number;
  entries_count: number;
  entries: WaterEntry[];
}

export interface WeeklyWaterDayPoint {
  date: string;
  day_name: string;
  consumed_ml: number;
  target_ml: number;
  is_goal_met: boolean;
}

export interface WeeklyWaterSummary {
  start_date: string;
  end_date: string;
  daily_average_ml: number;
  total_consumed_ml: number;
  daily_target_ml: number;
  days_goal_met: number;
  daily_breakdown: WeeklyWaterDayPoint[];
}

export interface MonthlyWaterSummary {
  month: number;
  year: number;
  total_consumed_ml: number;
  daily_average_ml: number;
  daily_target_ml: number;
  goal_completion_rate: number;
  days_recorded: number;
}

