# Architecture and decisions

## Boundaries

| Layer        | Location                                           | Responsibility                                                                        |
| ------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Navigation   | `app/`                                             | Expo Router screens and five-tab shell                                                |
| UI           | `src/ui/`, `src/screens/`                          | Theme, reusable forms/cards, module interactions                                      |
| Application  | `src/state/store.ts`, `src/services/lifeEngine.ts` | Serialized mutations, validation, transactional focus/completion, plan reconciliation |
| Domain       | `src/domain/`                                      | Day Orders, interval arithmetic, task ranking, scheduling, analytics                  |
| Persistence  | `src/data/`                                        | Versioned schema, relational repositories, seed data                                  |
| Integrations | `src/services/`, `src/cloud/`, `modules/`          | Widget snapshots, notifications, optional Supabase transport, native Android provider |

## Time

Calendar dates are local `YYYY-MM-DD`; intra-day blocks use minutes since midnight. Creation/completion timestamps are ISO instants. Date arithmetic uses calendar operations rather than adding 24-hour milliseconds across DST. The day-order count skips holiday/exam/non-academic dates. Forward manual overrides reset rotation. For historical dates before the anchor, choose an earlier anchor if historical overrides need to influence intervening dates.

## Tasks and sessions

Tasks carry estimates, actual totals, progress, priority, links and recurrence. Blocks reserve calendar time; focus sessions record actual effort. They are separate records. Completed tasks never enter scheduling; active focus work is not newly allocated elsewhere. Completing a daily/weekly task creates the next uniquely keyed occurrence. A habit is a daily behavioural target, not a duplicate task: generated habit work has a deterministic occurrence ID, and a completed duration/boolean task updates its associated habit once. Quantity habits require a quantity check-in, since minutes do not imply pages or glasses.

Task splitting uses remaining estimated effort. Scheduling other dates respects existing uncompleted reservations. Missed historical reservations are marked before plan generation. Explicitly skipping today records the date so reopening on a later day makes that work available again.

## SQLite

Migrations execute in transactions and record their version in `schema_migrations`. Foreign keys are enabled. Normalized tables hold subjects, tasks, blocks, academic date exceptions, classes, skills, projects, topics, habits/logs, exercises, workouts/logs, meals, focus sessions, measurements and dependencies. Polymorphic topics use an explicit owner type and ID; repository deletion cleans module topics. Settings are typed scalar key/value entries. JSON is limited to export interchange, the derived widget snapshot and the small recoverable active-timer record.

Zustand contains an in-memory read model, not the persistence layer. Mutations run in a queue to prevent overlapping SQLite transactions. Screens receive the updated read model only after successful writes. SQL values are bound parameters; table names are allowlisted. Backup restore is transactional; a corrupt foreign key rolls back to the prior data.

## Scheduling and recalculation

Free-time calculation clips and merges occupied ranges, expands buffers, then subtracts them from waking hours. Priority is a deterministic weighted sum of deadline urgency/risk, importance, personal priority, dependent tasks, remaining progress and nearby exams. Unresolved dependencies exclude a candidate.

Daily planning uses an intensity budget and can allocate partial work across windows. Relevant input changes are compared after each application mutation; existing plan dates are regenerated while completed, partially logged, active and missed history is retained. Reading a screen does not regenerate plans. Manual rescheduling changes reservations without triggering a blanket re-plan. Manual actions may use time intentionally left free by automatic intensity limits.

## Native widgets and notifications

The JS engine persists a versioned widget payload in SQLite, then writes the same payload through a local Expo module to Android SharedPreferences. An AppWidgetProvider renders RemoteViews from that snapshot and opens the app on tap. It never imports or runs the scheduler. Missing or previous-day snapshots show a refresh prompt; same-day snapshots expose their update timestamp.

A permission-gated local notification combines up to three nearby/overdue deadlines into one digest. Pending digest content updates when records change. The daily identifier and fire timestamp avoid multiple deliveries on the same day. Background scheduling is deliberately not required for basic use.

## Cloud boundary

`SupabaseBackup` has explicit email-code authentication, token refresh, upload, list and download methods. No method runs during app startup. Backups upload to separate normalized tables, scoped by owner and backup ID; only a completed upload is listed for restore. RLS enforces `auth.uid() = owner_id`. Foreign keys include ownership and snapshot identifiers. Downloads paginate. The caller passes a session; persist it only in a platform secure store when wiring up cloud UI. Failed uploads leave an incomplete archive, never replace the local database and never appear as restorable backups.

No credentials are committed, no cloud project is created, and no external data is uploaded by this build.
