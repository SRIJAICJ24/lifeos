import { SlotKind } from "../domain/types";
/**
 * Verified academic source data — see docs/ACADEMIC.md for how each value was checked
 * and which cells remain unconfirmed. Everything here is a starting point the app can edit.
 */
export const periodTimes: [number, number, number][] = [
  [1, 480, 530],
  [2, 530, 580],
  [3, 585, 635],
  [4, 640, 690],
  [5, 695, 745],
  [6, 750, 800],
  [7, 805, 855],
  [8, 860, 910],
  [9, 910, 960],
  [10, 960, 1010],
  [11, 1010, 1050],
  [12, 1050, 1090],
];
export interface SeedCourse {
  id: string;
  code: string;
  title: string;
  shortName: string;
  credits: number;
  category: string;
  courseType: string;
  facultyName: string;
  colour: string;
  slots: [string, SlotKind, string][];
}
export const courses: SeedCourse[] = [
  {
    id: "cn",
    code: "21CSC302J",
    title: "Computer Networks",
    shortName: "CN",
    credits: 4,
    category: "Professional Core",
    courseType: "Lab Based Theory",
    facultyName: "Dr. R. Brindha",
    colour: "#80B7FF",
    slots: [
      ["A", "Theory", "LH819"],
      ["P1", "Lab", "TP013"],
      ["P2", "Lab", "TP013"],
    ],
  },
  {
    id: "gpu",
    code: "21CSE214T",
    title: "GPU Computing",
    shortName: "GPU",
    credits: 3,
    category: "Professional Elective",
    courseType: "Theory",
    facultyName: "P. Renuka Devi",
    colour: "#BCA3FF",
    slots: [["B", "Theory", "CLS523"]],
  },
  {
    id: "dm",
    code: "21MAB302T",
    title: "Discrete Mathematics",
    shortName: "DM",
    credits: 4,
    category: "Basic Science",
    courseType: "Theory",
    facultyName: "Dr. Dhanalakshmi R",
    colour: "#A7D794",
    slots: [["C", "Theory", "LH819"]],
  },
  {
    id: "flat",
    code: "21CSC301T",
    title: "Formal Language and Automata",
    shortName: "FLAT",
    credits: 3,
    category: "Professional Core",
    courseType: "Theory",
    facultyName: "Dr. Anitha K",
    colour: "#F1A079",
    slots: [["D", "Theory", "LH819"]],
  },
  {
    id: "ml",
    code: "21CSC305P",
    title: "Machine Learning",
    shortName: "ML",
    credits: 3,
    category: "Professional Core",
    courseType: "Project Based Theory",
    facultyName: "Dr. V. Kavitha",
    colour: "#EDA7C9",
    slots: [["F", "Project", "LH819"]],
  },
  {
    id: "ef",
    code: "21MGO111T",
    title: "Entrepreneurial Finance",
    shortName: "EF",
    credits: 3,
    category: "Open Elective",
    courseType: "Theory",
    facultyName: "Yasmin Khatun",
    colour: "#8DCEC6",
    slots: [["G", "Theory", "LH1105"]],
  },
  {
    id: "cc",
    code: "21GNP301L",
    title: "Community Connect",
    shortName: "CC",
    credits: 1,
    category: "Project Course",
    courseType: "Practical",
    facultyName: "Dr. R. Brindha",
    colour: "#D09AE8",
    slots: [
      ["L51", "Practical", ""],
      ["L52", "Practical", ""],
    ],
  },
  {
    id: "iaf",
    code: "21LEM301T",
    title: "Indian Art Form",
    shortName: "IAF",
    credits: 0,
    category: "Mandatory",
    courseType: "Theory",
    facultyName: "Dr. R. Brindha",
    colour: "#C8B98A",
    slots: [
      ["L11", "Theory", ""],
      ["L12", "Theory", ""],
    ],
  },
];
/**
 * The college-wide grid: [dayOrder, period, slotCode, verified].
 * A blank or unregistered code resolves to a free period — the grid is not a personal timetable.
 */
export const grid: [number, number, string, 0 | 1][] = [
  [1, 1, "P1", 0],
  [1, 2, "P2", 0],
  [1, 6, "A", 1],
  [1, 7, "A", 1],
  [1, 8, "F", 1],
  [1, 9, "F", 1],
  [1, 10, "G", 1],
  [1, 11, "L11", 1],
  [1, 12, "L12", 1],
  [2, 1, "B", 1],
  [2, 2, "B", 1],
  [2, 3, "G", 1],
  [2, 4, "G", 1],
  [2, 5, "A", 1],
  [3, 6, "C", 1],
  [3, 7, "C", 1],
  [3, 8, "A", 1],
  [3, 9, "D", 1],
  [3, 10, "B", 1],
  [4, 1, "D", 1],
  [4, 2, "D", 1],
  [4, 3, "B", 1],
  [4, 4, "E", 0],
  [4, 5, "C", 1],
  [4, 6, "P36", 0],
  [4, 7, "P37", 0],
  [4, 8, "P38", 0],
  [4, 9, "P39", 0],
  [4, 10, "P40", 0],
  [4, 11, "L41", 0],
  [4, 12, "L42", 0],
  [5, 1, "P41", 0],
  [5, 2, "P42", 0],
  [5, 3, "P43", 0],
  [5, 4, "P44", 0],
  [5, 5, "P45", 0],
  [5, 6, "E", 0],
  [5, 7, "E", 0],
  [5, 8, "C", 1],
  [5, 9, "F", 1],
  [5, 10, "D", 1],
  [5, 11, "L51", 1],
  [5, 12, "L52", 1],
];
export const student = {
  studentName: "K Srijai",
  programme: "B.Tech",
  department: "Computer Science and Engineering",
  institution: "SRM Institute of Science and Technology, Kattankulathur",
  semester: 5,
  section: "L2",
  batch: 2,
  academicYear: "2026-27 ODD",
  /** From the worked example in the build request; confirm against the Academic Planner. */
  anchorDate: "2026-09-22",
  anchorOrder: 2,
};
