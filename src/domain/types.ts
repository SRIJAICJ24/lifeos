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
export const dayTypes = [
  "Academic Day",
  "Holiday",
  "Weekend",
  "No Class",
  "Exam Day",
  "Special Working Day",
  "Special Timetable",
  "College Event",
  "Manual Override",
] as const;
export type DayType = (typeof dayTypes)[number];
export interface CalendarDate {
  date: string;
  type: DayType;
  dayOrder: number | null;
  note: string;
  eventTitle: string;
  working: number;
  source: string;
}
export interface Subject {
  id: string;
  title: string;
  code: string;
  shortName: string;
  credits: number;
  category: string;
  courseType: string;
  facultyName: string;
  facultyContact: string;
  colour: string;
  semester: number;
  academicYear: string;
  active: number;
  notes: string;
}
export type SlotKind = "Theory" | "Lab" | "Practical" | "Project";
export interface CourseSlot {
  id: string;
  subjectId: string;
  slotCode: string;
  kind: SlotKind;
  room: string;
}
export interface Period {
  id: string;
  position: number;
  label: string;
  start: number;
  end: number;
}
export interface DayOrderSlot {
  id: string;
  dayOrder: number;
  position: number;
  slotCode: string;
  verified: number;
}
export type ClassChangeStatus =
  | "Cancelled"
  | "Room changed"
  | "Time changed"
  | "Faculty changed"
  | "Extra class"
  | "Replacement";
export interface ClassChange {
  id: string;
  date: string;
  position: number;
  subjectId: string | null;
  slotCode: string;
  status: ClassChangeStatus;
  start: number;
  end: number;
  room: string;
  faculty: string;
  note: string;
}
/** A resolved class on a real date: grid cell ∩ registration, with changes applied. */
export interface ClassInstance {
  key: string;
  date: string;
  dayOrder: number;
  positions: number[];
  subjectId: string | null;
  slotCode: string;
  kind: SlotKind;
  start: number;
  end: number;
  room: string;
  faculty: string;
  title: string;
  status: "Scheduled" | ClassChangeStatus;
  note: string;
}
export const assignmentStatuses = [
  "Not started",
  "Planning",
  "In progress",
  "Ready to submit",
  "Submitted",
  "Graded",
  "Late",
  "Missed",
] as const;
export type AssignmentStatus = (typeof assignmentStatuses)[number];
export interface Assignment {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  assignedDate: string;
  dueDate: string;
  dueTime: string;
  estimatedDuration: number;
  priority: number;
  maximumMarks: number;
  awardedMarks: number;
  submissionType: string;
  submissionLocation: string;
  status: AssignmentStatus;
  progress: number;
  attachments: string;
  notes: string;
  facultyInstructions: string;
  submittedAt: string;
  submissionConfirmed: number;
  taskId: string | null;
}
export const assessmentTypes = [
  "Cycle test",
  "FT",
  "Internal",
  "Quiz",
  "Practical",
  "Lab exam",
  "Viva",
  "Presentation",
  "Project review",
  "Model exam",
  "Semester exam",
  "Other",
] as const;
export type AssessmentType = (typeof assessmentTypes)[number];
export interface Assessment {
  id: string;
  subjectId: string;
  assessmentType: AssessmentType;
  title: string;
  date: string;
  startTime: number;
  duration: number;
  room: string;
  maximumMarks: number;
  weightage: number;
  syllabus: string;
  targetMark: number;
  actualMark: number;
  notes: string;
  status: string;
  taskId: string | null;
}
export interface AssessmentTopic {
  id: string;
  assessmentId: string;
  topicId: string;
}
export interface SyllabusUnit {
  id: string;
  subjectId: string;
  position: number;
  title: string;
  description: string;
  covered: number;
}
export const topicStates = [
  "Not started",
  "Learning",
  "Understood",
  "Practised",
  "Revised",
  "Mastered",
] as const;
export type TopicState = (typeof topicStates)[number];
export interface SyllabusTopic {
  id: string;
  unitId: string;
  subjectId: string;
  parentId: string | null;
  position: number;
  title: string;
  state: TopicState;
  classCovered: number;
  notesCompleted: number;
  conceptUnderstood: number;
  practiceCompleted: number;
  revisionCount: number;
  confidence: number;
  lastRevised: string;
  nextRevision: string;
  importance: number;
  teacherImportant: number;
  weak: number;
  pyqCount: number;
  pyqYears: string;
  pyqMarks: string;
  pyqDifficulty: string;
  pyqSolved: number;
  estimatedMinutes: number;
  resourceLinks: string;
  personalNotes: string;
}
export interface SubjectTodo {
  id: string;
  subjectId: string;
  title: string;
  done: number;
  taskId: string | null;
  createdAt: string;
  notes: string;
}
export const announcementScopes = [
  "College",
  "Department",
  "Semester",
  "Subject",
  "Faculty",
  "Exam",
  "Assignment",
  "Timetable",
  "Holiday",
  "Event",
  "Other",
] as const;
export type AnnouncementScope = (typeof announcementScopes)[number];
export interface Announcement {
  id: string;
  date: string;
  scope: AnnouncementScope;
  subjectId: string | null;
  title: string;
  body: string;
  actionType: string;
  actionValue: string;
  actionStatus: string;
  pinned: number;
  read: number;
  archived: number;
  remindAt: string;
  createdAt: string;
}
export const attendanceStates = [
  "Present",
  "Absent",
  "OD",
  "Cancelled",
  "Holiday",
  "Not recorded",
] as const;
export type AttendanceState = (typeof attendanceStates)[number];
export interface AttendanceRecord {
  id: string;
  subjectId: string;
  date: string;
  position: number;
  state: AttendanceState;
  note: string;
}
export const sessionTypes = [
  "Learn",
  "Practice",
  "Assignment",
  "Revision",
  "PYQ",
  "Lab",
  "Project",
  "Reading",
] as const;
export type StudySessionType = (typeof sessionTypes)[number];
export interface StudySession {
  id: string;
  subjectId: string;
  topicId: string | null;
  date: string;
  startTime: number;
  plannedDuration: number;
  actualDuration: number;
  sessionType: StudySessionType;
  status: string;
  focusScore: number;
  notes: string;
  taskId: string | null;
}
export interface Mark {
  id: string;
  subjectId: string;
  component: string;
  obtained: number;
  maximum: number;
  weightage: number;
  date: string;
  notes: string;
}
export const materialKinds = [
  "Lecture notes",
  "PPT",
  "PDF",
  "Lab manual",
  "Assignment",
  "PYQ",
  "Question bank",
  "Reference",
  "Link",
  "Personal notes",
] as const;
export interface Material {
  id: string;
  subjectId: string;
  title: string;
  kind: string;
  link: string;
  notes: string;
  addedAt: string;
}
export interface InboxItem {
  id: string;
  text: string;
  createdAt: string;
  status: string;
  note: string;
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
  studentName: string;
  programme: string;
  department: string;
  institution: string;
  semester: number;
  section: string;
  batch: number;
  academicYear: string;
  attendanceThreshold: number;
  freePeriods: string;
  notifyClassLead: number;
  notifyDayOrder: number;
  notifyClasses: number;
  notifyExams: number;
  notifyTasks: number;
  notifyWeekly: number;
}
export interface Data {
  tasks: Task[];
  blocks: Block[];
  calendar: CalendarDate[];
  subjects: Subject[];
  periods: Period[];
  dayOrderSlots: DayOrderSlot[];
  courseSlots: CourseSlot[];
  classChanges: ClassChange[];
  assignments: Assignment[];
  assessments: Assessment[];
  assessmentTopics: AssessmentTopic[];
  syllabusUnits: SyllabusUnit[];
  syllabusTopics: SyllabusTopic[];
  subjectTodos: SubjectTodo[];
  announcements: Announcement[];
  attendance: AttendanceRecord[];
  studySessions: StudySession[];
  marks: Mark[];
  materials: Material[];
  inbox: InboxItem[];
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
  wake: 380,
  sleep: 1410,
  commute: 25,
  lunch: 810,
  dinner: 1200,
  mealDuration: 30,
  buffer: 10,
  intensity: "Balanced",
  anchorDate: "2026-09-22",
  anchorOrder: 2,
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
  demo: 0,
  studentName: "",
  programme: "",
  department: "",
  institution: "",
  semester: 5,
  section: "",
  batch: 0,
  academicYear: "",
  attendanceThreshold: 75,
  freePeriods: "Study only",
  notifyClassLead: 15,
  notifyDayOrder: 1,
  notifyClasses: 1,
  notifyExams: 1,
  notifyTasks: 1,
  notifyWeekly: 1,
};
export const emptyData = (): Data => ({
  tasks: [],
  blocks: [],
  calendar: [],
  subjects: [],
  periods: [],
  dayOrderSlots: [],
  courseSlots: [],
  classChanges: [],
  assignments: [],
  assessments: [],
  assessmentTopics: [],
  syllabusUnits: [],
  syllabusTopics: [],
  subjectTodos: [],
  announcements: [],
  attendance: [],
  studySessions: [],
  marks: [],
  materials: [],
  inbox: [],
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
