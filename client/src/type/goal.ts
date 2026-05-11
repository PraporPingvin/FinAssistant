export interface Goal {
  goal_id: number;
  user_id: number;
  title: string;
  target_amount: number;
  current_amount: number;
  initial_amount: number;
  monthly_contribution: number;
  start_date: string;
  deadline_date?: string;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
  updated_at: string;
}

export interface CreateGoalData {
  user_id: number;
  title: string;
  target_amount: number;
  monthly_contribution: number;
  initial_amount?: number;
  start_date: string;
  deadline_date?: string;
  status?: 'active' | 'completed' | 'paused';
}

export interface CreateGoalFormData {
  title: string;
  target_amount: string;
  monthly_contribution: string;
  initial_amount: string;
  start_date: string;
  deadline_date: string;
  description: string;
}