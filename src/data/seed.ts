import { Repository } from "./repository";
import { Task, defaultSettings } from "../domain/types";
import { addDays, dateKey } from "../domain/time";
export const newTask = (
  title: string,
  lifeArea: Task["lifeArea"] = "personal",
  id = String(Date.now()),
): Task => ({
  id,
  title,
  lifeArea,
  description: "",
  subcategory: "Task",
  subjectId: null,
  skillId: null,
  projectId: null,
  habitId: null,
  deadline: null,
  estimatedDuration: 30,
  actualDuration: 0,
  priority: 2,
  importance: 3,
  difficulty: 2,
  energyRequired: 2,
  splittable: 1,
  minimumSessionLength: 15,
  fixed: 0,
  status: "Not Started",
  progress: 0,
  createdAt: new Date().toISOString(),
  scheduledAt: null,
  completedAt: null,
  notes: "",
  recurrence: "",
  parentId: null,
});
export async function seed(repo: Repository) {
  const flag = await repo.db.getAllAsync(
    "SELECT key FROM settings WHERE key=?",
    "demo",
  );
  if (flag.length) return;
  const today = dateKey();
  await repo.db.withTransactionAsync(async () => {
    await repo.settings({ ...defaultSettings, anchorDate: today });
    for (const [i, title] of [
      "Computer Networks",
      "Discrete Mathematics",
      "Machine Learning",
      "Entrepreneurial Finance",
      "FLAT",
    ].entries()) {
      await repo.upsert("subjects", {
        id: `subject-${i}`,
        title,
        code: ["CN", "DM", "ML", "EF", "FLAT"][i],
        attended: 0,
        total: 0,
        marks: "",
        notes: "",
      });
      for (const [j, topic] of (i === 0
        ? ["Network models", "IPv4 addressing", "Subnetting", "Routing"]
        : ["Foundations", "Core concepts", "Practice problems"]
      ).entries())
        await repo.upsert("topics", {
          id: `topic-${i}-${j}`,
          ownerId: `subject-${i}`,
          ownerType: "subject",
          title: topic,
          done: j === 0 ? 1 : 0,
        });
    }
    for (let dayOrder = 1; dayOrder <= 5; dayOrder++)
      for (let i = 0; i < 5; i++)
        await repo.upsert("classes", {
          id: `class-${dayOrder}-${i}`,
          dayOrder,
          subjectId: `subject-${(i + dayOrder - 1) % 5}`,
          start: 460 + i * 60,
          end: 510 + i * 60,
          room: `B-${201 + i}`,
        });
    for (const [i, title] of ["DSA", "Python", "Java", "AI"].entries()) {
      await repo.upsert("skills", {
        id: `skill-${i}`,
        title,
        notes: "",
        resource: "",
        questions: 0,
        nextRevision: addDays(today, 3),
      });
      for (const [j, t] of [
        "Foundations",
        "Practice",
        "Build something",
      ].entries())
        await repo.upsert("topics", {
          id: `skill-topic-${i}-${j}`,
          ownerId: `skill-${i}`,
          ownerType: "skill",
          title: t,
          done: j === 0 ? 1 : 0,
        });
    }
    for (const [i, title] of ["VoxCode", "AgentGuard", "LifeOS"].entries()) {
      await repo.upsert("projects", {
        id: `project-${i}`,
        title,
        description: [
          "A workspace for ideas and voice.",
          "Safer tools for autonomous agents.",
          "Make room for what matters.",
        ][i],
        status: i === 1 ? "Research" : "Building",
        targetDate: addDays(today, 30 + i * 10),
        link: "",
        notes: "",
      });
      for (const [j, t] of [
        "Research",
        "Design",
        "Development",
        "Testing",
        "Launch",
      ].entries())
        await repo.upsert("topics", {
          id: `project-topic-${i}-${j}`,
          ownerId: `project-${i}`,
          ownerType: "project",
          title: t,
          done: j < 2 ? 1 : 0,
        });
    }
    const habits = [
      {
        title: "DSA practice",
        type: "duration",
        target: 30,
        unit: "min",
        duration: 30,
      },
      {
        title: "Move your body",
        type: "boolean",
        target: 1,
        unit: "done",
        duration: 40,
      },
      {
        title: "Read a little",
        type: "quantity",
        target: 20,
        unit: "pages",
        duration: 20,
      },
      {
        title: "Stay hydrated",
        type: "counter",
        target: 8,
        unit: "glasses",
        duration: 0,
      },
    ];
    for (const [i, h] of habits.entries())
      await repo.upsert("habits", { id: `habit-${i}`, ...h, startDate: today });
    const tasks: Task[] = [
      {
        ...newTask("Discrete Maths assignment", "academic", "task-assignment"),
        subjectId: "subject-1",
        subcategory: "Assignment",
        deadline: addDays(today, 1),
        estimatedDuration: 90,
        priority: 3,
        minimumSessionLength: 30,
        description: "Complete questions 1–6 on relations and partial orders.",
      },
      {
        ...newTask("Practice sliding window", "skills", "task-dsa"),
        skillId: "skill-0",
        estimatedDuration: 30,
        habitId: "habit-0",
      },
      {
        ...newTask("Build the capture flow", "projects", "task-project"),
        projectId: "project-0",
        estimatedDuration: 45,
        priority: 1,
      },
      {
        ...newTask("Push day workout", "fitness", "task-workout"),
        estimatedDuration: 40,
        splittable: 0,
        habitId: "habit-1",
      },
      {
        ...newTask("Revise Computer Networks", "academic", "task-revise"),
        subjectId: "subject-0",
        estimatedDuration: 60,
        deadline: addDays(today, 4),
      },
      {
        ...newTask("Computer Networks exam", "academic", "task-exam"),
        subjectId: "subject-0",
        subcategory: "Exam",
        deadline: addDays(today, 4),
        estimatedDuration: 120,
        fixed: 1,
      },
    ];
    for (const task of tasks) await repo.upsert("tasks", task);
    await repo.upsert("blocks", {
      id: "exam-event",
      date: addDays(today, 4),
      start: 600,
      end: 720,
      title: "Computer Networks exam",
      kind: "exam",
      taskId: "task-exam",
      status: "Scheduled",
    });
    await repo.upsert("workouts", {
      id: "workout-push",
      title: "Push day",
      duration: 40,
      weekday: new Date().getDay(),
    });
    for (const [i, title] of [
      "Dumbbell bench press",
      "Shoulder press",
      "Triceps extension",
    ].entries())
      await repo.upsert("exercises", {
        id: `exercise-${i}`,
        workoutId: "workout-push",
        title,
        sets: 3,
        reps: 12,
        weight: 10 - i * 2,
        rest: 90,
      });
  });
}
