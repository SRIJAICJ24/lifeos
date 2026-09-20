export const areas = [
  "academic",
  "skills",
  "projects",
  "fitness",
  "diet",
  "habits",
  "personal",
] as const;
export type Area = (typeof areas)[number];
export type TaskStatus =
  | "Inbox"
  | "Not Started"
  | "Scheduled"
  | "In Progress"
  | "Partially Completed"
  | "Completed"
  | "Skipped"
  | "Overdue"
  | "Cancelled";
export interface Task {
  id: string;
  title: string;
  description: string;
  lifeArea: Area;
  subcategory: string;
  subjectId: string | null;
  skillId: string | null;
  projectId: string | null;
  habitId: string | null;
  deadline: string | null;
  estimatedDuration: number;
  actualDuration: number;
  priority: number;
  importance: number;
  difficulty: number;
  energyRequired: number;
  splittable: number;
  minimumSessionLength: number;
  fixed: number;
  status: TaskStatus;
  progress: number;
  createdAt: string;
  scheduledAt: string | null;
  completedAt: string | null;
  notes: string;
  recurrence: string;
  parentId: string | null;
}
export interface Block {
  id: string;
  date: string;
  start: number;
  end: number;
  title: string;
  kind: string;
  taskId: string | null;
  status: string;
}
export interface CalendarDate {
  date: string;
  type:
    | "Academic Day"
    | "Holiday"
    | "Exam Day"
    | "Special Timetable"
    | "Non-Academic Day"
    | "Manual Override";
  dayOrder: number | null;
  note: string;
}
export interface ClassRow {
  id: string;
  dayOrder: number;
  subjectId: string;
  start: number;
  end: number;
  room: string;
}
export interface Subject {
  id: string;
  title: string;
  code: string;
  attended: number;
  total: number;
  marks: string;
  notes: string;
}
export interface Topic {
  id: string;
  ownerId: string;
  ownerType: string;
  title: string;
  done: number;
}
export interface Skill {
  id: string;
  title: string;
  notes: string;
  resource: string;
  questions: number;
  nextRevision: string | null;
}
export interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  targetDate: string | null;
  link: string;
  notes: string;
}
export interface Habit {
  id: string;
  title: string;
  type: "boolean" | "counter" | "duration" | "quantity";
  target: number;
  unit: string;
  duration: number;
  startDate: string;
}
export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  value: number;
}
export interface FocusSession {
  id: string;
  taskId: string;
  date: string;
  startedAt: string;
  planned: number;
  actual: number;
  outcome: string;
  notes: string;
}
export interface Meal {
  id: string;
  date: string;
  title: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
export interface Workout {
  id: string;
  title: string;
  duration: number;
  weekday: number;
}
export interface Exercise {
  id: string;
  workoutId: string;
  title: string;
  sets: number;
  reps: number;
  weight: number;
  rest: number;
}
export interface WorkoutLog {
  id: string;
  workoutId: string;
  date: string;
  duration: number;
  notes: string;
}
export interface BodyMetric {
  id: string;
  date: string;
  weight: number;
  waist: number;
}
export interface Settings {
  wake: number;
  sleep: number;
  collegeStart: number;
  collegeEnd: number;
  commute: number;
  lunch: number;
  dinner: number;
  mealDuration: number;
  buffer: number;
  intensity: "Relaxed" | "Balanced" | "Focused";
  anchorDate: string;
  anchorOrder: number;
  weekends: string;
  workoutTime: number;
  studyPreference: string;
  focusDuration: number;
  defaultDuration: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
  weightGoal: number;
  notifications: number;
  onboarded: number;
  demo: number;
}
export interface Data {
  tasks: Task[];
  blocks: Block[];
  calendar: CalendarDate[];
  classes: ClassRow[];
  subjects: Subject[];
  topics: Topic[];
  skills: Skill[];
  projects: Project[];
  habits: Habit[];
  habitLogs: HabitLog[];
  sessions: FocusSession[];
  meals: Meal[];
  workouts: Workout[];
  exercises: Exercise[];
  workoutLogs: WorkoutLog[];
  bodyMetrics: BodyMetric[];
  dependencies: { id: string; taskId: string; dependsOnId: string }[];
  settings: Settings;
}
export interface Slot {
  start: number;
  end: number;
}
export const defaultSettings: Settings = {
  wake: 420,
  sleep: 1410,
  collegeStart: 460,
  collegeEnd: 790,
  commute: 25,
  lunch: 810,
  dinner: 1200,
  mealDuration: 30,
  buffer: 10,
  intensity: "Balanced",
  anchorDate: "2026-09-07",
  anchorOrder: 1,
  weekends: "0,6",
  workoutTime: 1080,
  studyPreference: "Evening",
  focusDuration: 25,
  defaultDuration: 30,
  calories: 2000,
  protein: 110,
  carbs: 220,
  fat: 65,
  water: 8,
  weightGoal: 65,
  notifications: 0,
  onboarded: 0,
  demo: 1,
};
export const emptyData = (): Data => ({
  tasks: [],
  blocks: [],
  calendar: [],
  classes: [],
  subjects: [],
  topics: [],
  skills: [],
  projects: [],
  habits: [],
  habitLogs: [],
  sessions: [],
  meals: [],
  workouts: [],
  exercises: [],
  workoutLogs: [],
  bodyMetrics: [],
  dependencies: [],
  settings: { ...defaultSettings },
});
