import { Repository } from "./repository";
import { Task, defaultSettings } from "../domain/types";
import { courses, grid, periodTimes, student } from "./academicData";
import { clock } from "../domain/time";
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
/**
 * Writes the verified semester setup: period times, the college slot grid, registered courses
 * and their slots, and an empty five-unit syllabus skeleton. Keyed by stable ids, so running it
 * again repairs the setup rather than duplicating it. Personal records are never touched.
 */
export async function seedAcademic(repo: Repository) {
  await repo.db.withTransactionAsync(async () => {
    for (const [position, start, end] of periodTimes)
      await repo.upsert("periods", {
        id: `period-${position}`,
        position,
        label: `${clock(start)}–${clock(end)}`,
        start,
        end,
      });
    for (const [dayOrder, position, slotCode, verified] of grid)
      await repo.upsert("dayOrderSlots", {
        id: `grid-${dayOrder}-${position}`,
        dayOrder,
        position,
        slotCode,
        verified,
      });
    for (const course of courses) {
      await repo.upsert("subjects", {
        id: course.id,
        title: course.title,
        code: course.code,
        shortName: course.shortName,
        credits: course.credits,
        category: course.category,
        courseType: course.courseType,
        facultyName: course.facultyName,
        facultyContact: "",
        colour: course.colour,
        semester: student.semester,
        academicYear: student.academicYear,
        active: 1,
        notes: "",
      });
      for (const [slotCode, kind, room] of course.slots)
        await repo.upsert("courseSlots", {
          id: `slot-${course.id}-${slotCode}`,
          subjectId: course.id,
          slotCode,
          kind,
          room,
        });
      for (let unit = 1; unit <= 5; unit++)
        await repo.upsert("syllabusUnits", {
          id: `unit-${course.id}-${unit}`,
          subjectId: course.id,
          position: unit,
          title: `Unit ${unit}`,
          description: "",
          covered: 0,
        });
    }
  });
}
export async function seed(repo: Repository) {
  const flag = await repo.db.getAllAsync(
    "SELECT key FROM settings WHERE key=?",
    "seeded",
  );
  if (flag.length) return;
  await repo.settings({
    ...defaultSettings,
    studentName: student.studentName,
    programme: student.programme,
    department: student.department,
    institution: student.institution,
    semester: student.semester,
    section: student.section,
    batch: student.batch,
    academicYear: student.academicYear,
    anchorDate: student.anchorDate,
    anchorOrder: student.anchorOrder,
  });
  await seedAcademic(repo);
  await repo.db.runAsync("INSERT INTO settings VALUES (?,?)", "seeded", "1");
}
