-- Optional normalized backup storage. Apply to your own Supabase project.
-- No service-role key is needed in the app. Every row is scoped to auth.uid().
CREATE TABLE public.lifeos_backups (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), status text NOT NULL CHECK(status IN ('uploading','complete')), version integer NOT NULL,
 UNIQUE(owner_id,id)
);
ALTER TABLE public.lifeos_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_backups ON public.lifeos_backups FOR ALL TO authenticated USING ((SELECT auth.uid())=owner_id) WITH CHECK ((SELECT auth.uid())=owner_id);

CREATE TABLE public.lifeos_subjects (
 owner_id uuid NOT NULL, backup_id uuid NOT NULL,
 id text NOT NULL,
 title text NOT NULL,
 code text NOT NULL,
 attended integer NOT NULL,
 total integer NOT NULL,
 marks text NOT NULL,
 notes text NOT NULL,
 PRIMARY KEY(owner_id,backup_id,id),
 FOREIGN KEY(owner_id,backup_id) REFERENCES public.lifeos_backups(owner_id,id) ON DELETE CASCADE
);
ALTER TABLE public.lifeos_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rows ON public.lifeos_subjects FOR ALL TO authenticated USING ((SELECT auth.uid())=owner_id) WITH CHECK ((SELECT auth.uid())=owner_id);

CREATE TABLE public.lifeos_skills (
 owner_id uuid NOT NULL, backup_id uuid NOT NULL,
 id text NOT NULL,
 title text NOT NULL,
 notes text NOT NULL,
 resource text NOT NULL,
 questions integer NOT NULL,
 next_revision text,
 PRIMARY KEY(owner_id,backup_id,id),
 FOREIGN KEY(owner_id,backup_id) REFERENCES public.lifeos_backups(owner_id,id) ON DELETE CASCADE
);
ALTER TABLE public.lifeos_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rows ON public.lifeos_skills FOR ALL TO authenticated USING ((SELECT auth.uid())=owner_id) WITH CHECK ((SELECT auth.uid())=owner_id);

CREATE TABLE public.lifeos_projects (
 owner_id uuid NOT NULL, backup_id uuid NOT NULL,
 id text NOT NULL,
 title text NOT NULL,
 description text NOT NULL,
 status text NOT NULL,
 target_date text,
 link text NOT NULL,
 notes text NOT NULL,
 PRIMARY KEY(owner_id,backup_id,id),
 FOREIGN KEY(owner_id,backup_id) REFERENCES public.lifeos_backups(owner_id,id) ON DELETE CASCADE
);
ALTER TABLE public.lifeos_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rows ON public.lifeos_projects FOR ALL TO authenticated USING ((SELECT auth.uid())=owner_id) WITH CHECK ((SELECT auth.uid())=owner_id);

CREATE TABLE public.lifeos_habits (
 owner_id uuid NOT NULL, backup_id uuid NOT NULL,
 id text NOT NULL,
 title text NOT NULL,
 type text NOT NULL,
 target double precision NOT NULL,
 unit text NOT NULL,
 duration integer NOT NULL,
 start_date text NOT NULL,
 PRIMARY KEY(owner_id,backup_id,id),
 FOREIGN KEY(owner_id,backup_id) REFERENCES public.lifeos_backups(owner_id,id) ON DELETE CASCADE
);
ALTER TABLE public.lifeos_habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rows ON public.lifeos_habits FOR ALL TO authenticated USING ((SELECT auth.uid())=owner_id) WITH CHECK ((SELECT auth.uid())=owner_id);

CREATE TABLE public.lifeos_tasks (
 owner_id uuid NOT NULL, backup_id uuid NOT NULL,
 id text NOT NULL,
 title text NOT NULL,
 description text NOT NULL,
 life_area text NOT NULL,
 subcategory text NOT NULL,
 subject_id text,
 skill_id text,
 project_id text,
 habit_id text,
 deadline text,
 estimated_duration integer NOT NULL,
 actual_duration double precision NOT NULL,
 priority integer NOT NULL,
 importance integer NOT NULL,
 difficulty integer NOT NULL,
 energy_required integer NOT NULL,
 splittable integer NOT NULL,
 minimum_session_length integer NOT NULL,
 fixed integer NOT NULL,
 status text NOT NULL,
 progress double precision NOT NULL,
 created_at text NOT NULL,
 scheduled_at text,
 completed_at text,
 notes text NOT NULL,
 recurrence text NOT NULL,
 parent_id text,
 PRIMARY KEY(owner_id,backup_id,id),
 FOREIGN KEY(owner_id,backup_id) REFERENCES public.lifeos_backups(owner_id,id) ON DELETE CASCADE
);
ALTER TABLE public.lifeos_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rows ON public.lifeos_tasks FOR ALL TO authenticated USING ((SELECT auth.uid())=owner_id) WITH CHECK ((SELECT auth.uid())=owner_id);

CREATE TABLE public.lifeos_blocks (
 owner_id uuid NOT NULL, backup_id uuid NOT NULL,
 id text NOT NULL,
 date text NOT NULL,
 start integer NOT NULL,
 end integer NOT NULL,
 title text NOT NULL,
 kind text NOT NULL,
 task_id text,
 status text NOT NULL,
 PRIMARY KEY(owner_id,backup_id,id),
 FOREIGN KEY(owner_id,backup_id) REFERENCES public.lifeos_backups(owner_id,id) ON DELETE CASCADE
);
ALTER TABLE public.lifeos_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rows ON public.lifeos_blocks FOR ALL TO authenticated USING ((SELECT auth.uid())=owner_id) WITH CHECK ((SELECT auth.uid())=owner_id);

CREATE TABLE public.lifeos_calendar (
 owner_id uuid NOT NULL, backup_id uuid NOT NULL,
 date text NOT NULL,
 type text NOT NULL,
 day_order integer,
 note text NOT NULL,
 PRIMARY KEY(owner_id,backup_id,date),
 FOREIGN KEY(owner_id,backup_id) REFERENCES public.lifeos_backups(owner_id,id) ON DELETE CASCADE
);
ALTER TABLE public.lifeos_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rows ON public.lifeos_calendar FOR ALL TO authenticated USING ((SELECT auth.uid())=owner_id) WITH CHECK ((SELECT auth.uid())=owner_id);

CREATE TABLE public.lifeos_classes (
 owner_id uuid NOT NULL, backup_id uuid NOT NULL,
 id text NOT NULL,
 day_order integer NOT NULL,
 subject_id text NOT NULL,
 start integer NOT NULL,
 end integer NOT NULL,
 room text NOT NULL,
 PRIMARY KEY(owner_id,backup_id,id),
 FOREIGN KEY(owner_id,backup_id) REFERENCES public.lifeos_backups(owner_id,id) ON DELETE CASCADE
);
ALTER TABLE public.lifeos_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rows ON public.lifeos_classes FOR ALL TO authenticated USING ((SELECT auth.uid())=owner_id) WITH CHECK ((SELECT auth.uid())=owner_id);

CREATE TABLE public.lifeos_topics (
 owner_id uuid NOT NULL, backup_id uuid NOT NULL,
 id text NOT NULL,
 owner_id text NOT NULL,
 owner_type text NOT NULL,
 title text NOT NULL,
 done integer NOT NULL,
 PRIMARY KEY(owner_id,backup_id,id),
 FOREIGN KEY(owner_id,backup_id) REFERENCES public.lifeos_backups(owner_id,id) ON DELETE CASCADE
);
ALTER TABLE public.lifeos_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rows ON public.lifeos_topics FOR ALL TO authenticated USING ((SELECT auth.uid())=owner_id) WITH CHECK ((SELECT auth.uid())=owner_id);

CREATE TABLE public.lifeos_habit_logs (
 owner_id uuid NOT NULL, backup_id uuid NOT NULL,
 id text NOT NULL,
 habit_id text NOT NULL,
 date text NOT NULL,
 value double precision NOT NULL,
 PRIMARY KEY(owner_id,backup_id,id),
 FOREIGN KEY(owner_id,backup_id) REFERENCES public.lifeos_backups(owner_id,id) ON DELETE CASCADE
);
ALTER TABLE public.lifeos_habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rows ON public.lifeos_habit_logs FOR ALL TO authenticated USING ((SELECT auth.uid())=owner_id) WITH CHECK ((SELECT auth.uid())=owner_id);

CREATE TABLE public.lifeos_sessions (
 owner_id uuid NOT NULL, backup_id uuid NOT NULL,
 id text NOT NULL,
 task_id text NOT NULL,
 date text NOT NULL,
 started_at text NOT NULL,
 planned integer NOT NULL,
 actual double precision NOT NULL,
 outcome text NOT NULL,
 notes text NOT NULL,
 PRIMARY KEY(owner_id,backup_id,id),
 FOREIGN KEY(owner_id,backup_id) REFERENCES public.lifeos_backups(owner_id,id) ON DELETE CASCADE
);
ALTER TABLE public.lifeos_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rows ON public.lifeos_sessions FOR ALL TO authenticated USING ((SELECT auth.uid())=owner_id) WITH CHECK ((SELECT auth.uid())=owner_id);

CREATE TABLE public.lifeos_meals (
 owner_id uuid NOT NULL, backup_id uuid NOT NULL,
 id text NOT NULL,
 date text NOT NULL,
 title text NOT NULL,
 meal_type text NOT NULL,
 calories double precision NOT NULL,
 protein double precision NOT NULL,
 carbs double precision NOT NULL,
 fat double precision NOT NULL,
 PRIMARY KEY(owner_id,backup_id,id),
 FOREIGN KEY(owner_id,backup_id) REFERENCES public.lifeos_backups(owner_id,id) ON DELETE CASCADE
);
ALTER TABLE public.lifeos_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rows ON public.lifeos_meals FOR ALL TO authenticated USING ((SELECT auth.uid())=owner_id) WITH CHECK ((SELECT auth.uid())=owner_id);

CREATE TABLE public.lifeos_workouts (
 owner_id uuid NOT NULL, backup_id uuid NOT NULL,
 id text NOT NULL,
 title text NOT NULL,
 duration integer NOT NULL,
 weekday integer NOT NULL,
 PRIMARY KEY(owner_id,backup_id,id),
 FOREIGN KEY(owner_id,backup_id) REFERENCES public.lifeos_backups(owner_id,id) ON DELETE CASCADE
);
ALTER TABLE public.lifeos_workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rows ON public.lifeos_workouts FOR ALL TO authenticated USING ((SELECT auth.uid())=owner_id) WITH CHECK ((SELECT auth.uid())=owner_id);

CREATE TABLE public.lifeos_exercises (
 owner_id uuid NOT NULL, backup_id uuid NOT NULL,
 id text NOT NULL,
 workout_id text NOT NULL,
 title text NOT NULL,
 sets integer NOT NULL,
 reps integer NOT NULL,
 weight double precision NOT NULL,
 rest integer NOT NULL,
 PRIMARY KEY(owner_id,backup_id,id),
 FOREIGN KEY(owner_id,backup_id) REFERENCES public.lifeos_backups(owner_id,id) ON DELETE CASCADE
);
ALTER TABLE public.lifeos_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rows ON public.lifeos_exercises FOR ALL TO authenticated USING ((SELECT auth.uid())=owner_id) WITH CHECK ((SELECT auth.uid())=owner_id);

CREATE TABLE public.lifeos_workout_logs (
 owner_id uuid NOT NULL, backup_id uuid NOT NULL,
 id text NOT NULL,
 workout_id text NOT NULL,
 date text NOT NULL,
 duration integer NOT NULL,
 notes text NOT NULL,
 PRIMARY KEY(owner_id,backup_id,id),
 FOREIGN KEY(owner_id,backup_id) REFERENCES public.lifeos_backups(owner_id,id) ON DELETE CASCADE
);
ALTER TABLE public.lifeos_workout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rows ON public.lifeos_workout_logs FOR ALL TO authenticated USING ((SELECT auth.uid())=owner_id) WITH CHECK ((SELECT auth.uid())=owner_id);

CREATE TABLE public.lifeos_body_metrics (
 owner_id uuid NOT NULL, backup_id uuid NOT NULL,
 id text NOT NULL,
 date text NOT NULL,
 weight double precision NOT NULL,
 waist double precision NOT NULL,
 PRIMARY KEY(owner_id,backup_id,id),
 FOREIGN KEY(owner_id,backup_id) REFERENCES public.lifeos_backups(owner_id,id) ON DELETE CASCADE
);
ALTER TABLE public.lifeos_body_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rows ON public.lifeos_body_metrics FOR ALL TO authenticated USING ((SELECT auth.uid())=owner_id) WITH CHECK ((SELECT auth.uid())=owner_id);

CREATE TABLE public.lifeos_dependencies (
 owner_id uuid NOT NULL, backup_id uuid NOT NULL,
 id text NOT NULL,
 task_id text NOT NULL,
 depends_on_id text NOT NULL,
 PRIMARY KEY(owner_id,backup_id,id),
 FOREIGN KEY(owner_id,backup_id) REFERENCES public.lifeos_backups(owner_id,id) ON DELETE CASCADE
);
ALTER TABLE public.lifeos_dependencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rows ON public.lifeos_dependencies FOR ALL TO authenticated USING ((SELECT auth.uid())=owner_id) WITH CHECK ((SELECT auth.uid())=owner_id);

CREATE TABLE public.lifeos_settings (
 owner_id uuid NOT NULL, backup_id uuid NOT NULL,
 key text NOT NULL,
 value text NOT NULL,
 PRIMARY KEY(owner_id,backup_id,key),
 FOREIGN KEY(owner_id,backup_id) REFERENCES public.lifeos_backups(owner_id,id) ON DELETE CASCADE
);
ALTER TABLE public.lifeos_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rows ON public.lifeos_settings FOR ALL TO authenticated USING ((SELECT auth.uid())=owner_id) WITH CHECK ((SELECT auth.uid())=owner_id);
ALTER TABLE public.lifeos_tasks ADD FOREIGN KEY(owner_id,backup_id,parent_id) REFERENCES public.lifeos_tasks(owner_id,backup_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.lifeos_tasks ADD FOREIGN KEY(owner_id,backup_id,habit_id) REFERENCES public.lifeos_habits(owner_id,backup_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.lifeos_tasks ADD FOREIGN KEY(owner_id,backup_id,project_id) REFERENCES public.lifeos_projects(owner_id,backup_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.lifeos_tasks ADD FOREIGN KEY(owner_id,backup_id,skill_id) REFERENCES public.lifeos_skills(owner_id,backup_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.lifeos_tasks ADD FOREIGN KEY(owner_id,backup_id,subject_id) REFERENCES public.lifeos_subjects(owner_id,backup_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.lifeos_blocks ADD FOREIGN KEY(owner_id,backup_id,task_id) REFERENCES public.lifeos_tasks(owner_id,backup_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.lifeos_classes ADD FOREIGN KEY(owner_id,backup_id,subject_id) REFERENCES public.lifeos_subjects(owner_id,backup_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.lifeos_habit_logs ADD FOREIGN KEY(owner_id,backup_id,habit_id) REFERENCES public.lifeos_habits(owner_id,backup_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.lifeos_sessions ADD FOREIGN KEY(owner_id,backup_id,task_id) REFERENCES public.lifeos_tasks(owner_id,backup_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.lifeos_exercises ADD FOREIGN KEY(owner_id,backup_id,workout_id) REFERENCES public.lifeos_workouts(owner_id,backup_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.lifeos_workout_logs ADD FOREIGN KEY(owner_id,backup_id,workout_id) REFERENCES public.lifeos_workouts(owner_id,backup_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.lifeos_dependencies ADD FOREIGN KEY(owner_id,backup_id,depends_on_id) REFERENCES public.lifeos_tasks(owner_id,backup_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.lifeos_dependencies ADD FOREIGN KEY(owner_id,backup_id,task_id) REFERENCES public.lifeos_tasks(owner_id,backup_id,id) DEFERRABLE INITIALLY DEFERRED;
