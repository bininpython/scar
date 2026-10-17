export type Role = 'admin' | 'reception' | 'trainer';
export type Exercise = { name: string; sets: number; reps: string; load: string; rest: string };
export type Member = {
  id: number;
  name: string;
  email: string;
  phone: string;
  birth_date: string;
  plan_id: number;
  status: 'active' | 'paused' | 'cancelled';
  due_day: number;
  joined_at: string;
  notes: string;
};
export type Plan = { id: number; name: string; price: number; description: string };
export type Invoice = {
  id: number;
  member_id: number;
  period: string;
  due_date: string;
  amount: number;
  status: 'open' | 'paid' | 'cancelled';
  paid_at: string | null;
  method: string | null;
};
export type Workout = {
  id: number;
  member_id: number;
  title: string;
  goal: string;
  valid_until: string;
  exercises: Exercise[];
  notes: string;
};
export type Assessment = {
  id: number;
  member_id: number;
  date: string;
  weight: number;
  height: number;
  waist: number | null;
  body_fat: number | null;
  notes: string;
};
export type Class = {
  id: number;
  title: string;
  instructor: string;
  date: string;
  time: string;
  capacity: number;
  duration: number;
};
export type User = { id: number; name: string; email: string; role: Role; active?: number };
export type State = {
  user: User;
  csrf: string;
  today: string;
  demo: boolean;
  settings: { name: string; phone: string; email: string };
  members: Member[];
  plans: Plan[];
  invoices?: Invoice[];
  workouts?: Workout[];
  assessments?: Assessment[];
  checkins: { id: number; member_id: number; date: string; time: string }[];
  classes: Class[];
  bookings: { id: number; class_id: number; member_id: number }[];
  users?: User[];
};
export type Entity =
  | 'members'
  | 'plans'
  | 'workouts'
  | 'assessments'
  | 'classes'
  | 'users'
  | 'payment'
  | 'booking'
  | 'checkin'
  | 'password';
export type FormValues = Record<string, string | number | Exercise[] | null>;
