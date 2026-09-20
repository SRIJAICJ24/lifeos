import React from "react";
import { useLocalSearchParams } from "expo-router";
import { Shell } from "../../src/ui/Shell";
import { Heading, Empty } from "../../src/ui/components";
import { Timetable } from "../../src/screens/academic/Timetable";
import { Subjects } from "../../src/screens/academic/Subjects";
import { Assignments } from "../../src/screens/academic/Assignments";
import { Assessments } from "../../src/screens/academic/Assessments";
import { Syllabus } from "../../src/screens/academic/Syllabus";
import { Attendance } from "../../src/screens/academic/Attendance";
import { Announcements } from "../../src/screens/academic/Announcements";
import { Marks } from "../../src/screens/academic/Marks";
import { StudyPlan } from "../../src/screens/academic/StudyPlan";
import { Materials } from "../../src/screens/academic/Materials";
import { AcademicCalendar } from "../../src/screens/academic/AcademicCalendar";
import { AcademicAnalytics } from "../../src/screens/academic/Analytics";
import { Inbox } from "../../src/screens/academic/Inbox";
import { AcademicSearch } from "../../src/screens/academic/Search";
const titles: Record<string, [string, string]> = {
  timetable: ["Timetable", "Your Day Orders, resolved from the college grid."],
  subjects: ["Subjects", "Courses, slots, faculty and rooms."],
  assignments: ["Assignments", "From given out to genuinely submitted."],
  assessments: ["Tests & exams", "Countdowns, syllabus and preparation."],
  syllabus: ["Syllabus", "What class covered, and what you actually know."],
  attendance: ["Attendance", "Hour by hour, with an honest forecast."],
  announcements: ["Announcements", "What changed, and what to do about it."],
  marks: ["Marks", "Components, weightage and where you stand."],
  study: ["Study plan", "What to study next, and why."],
  materials: ["Materials", "Notes, manuals, question banks and links."],
  calendar: ["Academic calendar", "Day Orders, holidays and exam dates."],
  analytics: ["Analytics", "Where your study time actually went."],
  inbox: ["Academic inbox", "Capture now, sort later."],
  search: ["Academic search", "One box across everything academic."],
};
export default function AcademicSection() {
  const { section, add } = useLocalSearchParams<{
    section: string;
    add?: string;
  }>();
  const title = titles[section];
  const startNew = add === "1";
  return (
    <Shell>
      <Heading title={title?.[0] ?? "Academic"} subtitle={title?.[1]} />
      {section === "timetable" ? (
        <Timetable />
      ) : section === "subjects" ? (
        <Subjects />
      ) : section === "assignments" ? (
        <Assignments startNew={startNew} />
      ) : section === "assessments" ? (
        <Assessments startNew={startNew} />
      ) : section === "syllabus" ? (
        <Syllabus />
      ) : section === "attendance" ? (
        <Attendance />
      ) : section === "announcements" ? (
        <Announcements startNew={startNew} />
      ) : section === "marks" ? (
        <Marks />
      ) : section === "study" ? (
        <StudyPlan />
      ) : section === "materials" ? (
        <Materials />
      ) : section === "calendar" ? (
        <AcademicCalendar />
      ) : section === "analytics" ? (
        <AcademicAnalytics />
      ) : section === "inbox" ? (
        <Inbox />
      ) : section === "search" ? (
        <AcademicSearch />
      ) : (
        <Empty text="This academic section was not found." />
      )}
    </Shell>
  );
}
