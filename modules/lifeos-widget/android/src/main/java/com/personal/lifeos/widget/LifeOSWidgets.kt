package com.personal.lifeos.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Every LifeOS widget reads the one snapshot the app writes after each change. */
abstract class LifeOSBaseWidget : AppWidgetProvider() {
  protected open val layout: Int = R.layout.lifeos_widget
  protected open val deepLink: String = "lifeos:///"
  protected abstract fun render(views: RemoteViews, snapshot: JSONObject?)

  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    val raw = context.getSharedPreferences(PREFS, 0).getString(KEY, null)
    val parsed = try { raw?.let { JSONObject(it) } } catch (_: Exception) { null }
    val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
    val snapshot = if (parsed != null && parsed.optString("date") == today) parsed else null
    for (id in ids) {
      val views = RemoteViews(context.packageName, layout)
      render(views, snapshot)
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLink)).setPackage(context.packageName)
      val pending = PendingIntent.getActivity(
        context, id, intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      views.setOnClickPendingIntent(R.id.lifeos_widget_root, pending)
      manager.updateAppWidget(id, views)
    }
  }

  companion object {
    const val PREFS = "lifeos_widgets"
    const val KEY = "snapshot"
    val providers = listOf(
      LifeOSWidgetProvider::class.java,
      LifeOSNextClassWidget::class.java,
      LifeOSDeadlinesWidget::class.java,
      LifeOSStudyWidget::class.java,
      LifeOSDayOrderWidget::class.java,
      LifeOSOverviewWidget::class.java
    )
    fun time(m: Int) = "%02d:%02d".format(m / 60, m % 60)
    fun dayOrderLabel(snapshot: JSONObject?) =
      if (snapshot == null || snapshot.isNull("dayOrder")) snapshot?.optString("dayType").orEmpty()
        .ifEmpty { "No classes" }
      else "Day Order ${snapshot.optInt("dayOrder")}"
    fun <T> JSONArray?.map(limit: Int, block: (JSONObject) -> T): List<T> {
      if (this == null) return emptyList()
      val out = mutableListOf<T>()
      for (i in 0 until minOf(length(), limit)) out.add(block(getJSONObject(i)))
      return out
    }
    fun synced(snapshot: JSONObject?) = snapshot
      ?.optString("generatedAt")?.take(16)?.replace('T', ' ')
      ?.let { "Updated $it · tap to open" } ?: "Open LifeOS to refresh"
    fun fill(views: RemoteViews, label: String, title: String, body: String, footer: String) {
      views.setTextViewText(R.id.lifeos_widget_label, label)
      views.setTextViewText(R.id.lifeos_widget_title, title)
      views.setTextViewText(R.id.lifeos_widget_body, body)
      views.setTextViewText(R.id.lifeos_widget_footer, footer)
    }
  }
}

/** Today's classes, in order. */
class LifeOSWidgetProvider : LifeOSBaseWidget() {
  override val deepLink = "lifeos:///area/academic"
  override fun render(views: RemoteViews, snapshot: JSONObject?) {
    if (snapshot == null) {
      fill(views, "LIFEOS · TODAY", "A new day.", "Open LifeOS to refresh your plan.", synced(null))
      return
    }
    val classes = snapshot.optJSONArray("classes")
    val lines = classes.map(6) {
      "${time(it.optInt("start"))}  ${it.optString("short")}" +
        if (it.optString("room").isNotEmpty()) "  ·  ${it.optString("room")}" else ""
    }
    fill(
      views,
      "TODAY · ${dayOrderLabel(snapshot).uppercase()}",
      if (lines.isEmpty()) "No classes today" else "${classes?.length() ?: 0} classes",
      if (lines.isEmpty()) "The whole day is yours." else lines.joinToString("\n"),
      synced(snapshot)
    )
  }
}

/** What is coming up next, and where. */
class LifeOSNextClassWidget : LifeOSBaseWidget() {
  override val deepLink = "lifeos:///area/academic"
  override fun render(views: RemoteViews, snapshot: JSONObject?) {
    val next = snapshot?.optJSONObject("nextClass")
    if (next == null) {
      fill(
        views, "NEXT CLASS",
        if (snapshot == null) "Open LifeOS" else "Nothing left today",
        if (snapshot == null) "Open LifeOS to refresh your plan." else dayOrderLabel(snapshot),
        synced(snapshot)
      )
      return
    }
    val room = next.optString("room")
    fill(
      views, "NEXT CLASS · ${dayOrderLabel(snapshot).uppercase()}",
      next.optString("title"),
      "${time(next.optInt("start"))} – ${time(next.optInt("end"))}" +
        (if (room.isNotEmpty()) "\n$room" else "") +
        "\n${next.optString("kind")}",
      synced(snapshot)
    )
  }
}

/** Assignments and tests, nearest first. */
class LifeOSDeadlinesWidget : LifeOSBaseWidget() {
  override val deepLink = "lifeos:///academic/assignments"
  override fun render(views: RemoteViews, snapshot: JSONObject?) {
    val items = snapshot?.optJSONArray("deadlines")
    val lines = items.map(5) {
      val days = it.optInt("days")
      val whenLabel = when {
        days < 0 -> "overdue"
        days == 0 -> "today"
        days == 1 -> "tomorrow"
        else -> "in ${days}d"
      }
      "$whenLabel  ·  ${it.optString("title")}  (${it.optString("subject")})"
    }
    fill(
      views, "DEADLINES",
      if (lines.isEmpty()) "Nothing due" else lines.first().substringAfter("·").trim(),
      if (lines.isEmpty()) "A good moment to get ahead."
      else lines.joinToString("\n"),
      synced(snapshot)
    )
  }
}

/** The single best thing to study right now, with its reason. */
class LifeOSStudyWidget : LifeOSBaseWidget() {
  override val deepLink = "lifeos:///academic/study"
  override fun render(views: RemoteViews, snapshot: JSONObject?) {
    val study = snapshot?.optJSONObject("study")
    if (study == null) {
      fill(
        views, "STUDY NEXT", "Nothing queued",
        "Add a topic, an assignment or a test and a suggestion appears here.",
        synced(snapshot)
      )
      return
    }
    fill(
      views, "STUDY NEXT",
      study.optString("title"),
      "${study.optString("subject")} · ${study.optString("kind")}\n" +
        "${study.optInt("minutes")} min\n${study.optString("reason")}",
      synced(snapshot)
    )
  }
}

/** Today's and tomorrow's Day Order at a glance. */
class LifeOSDayOrderWidget : LifeOSBaseWidget() {
  override val layout = R.layout.lifeos_widget_compact
  override val deepLink = "lifeos:///academic/calendar"
  override fun render(views: RemoteViews, snapshot: JSONObject?) {
    val order = if (snapshot == null || snapshot.isNull("dayOrder")) null
    else snapshot.optInt("dayOrder")
    val tomorrow = snapshot?.optJSONObject("tomorrow")
    val tomorrowOrder =
      if (tomorrow == null || tomorrow.isNull("dayOrder")) null else tomorrow.optInt("dayOrder")
    views.setTextViewText(R.id.lifeos_widget_label, "TODAY")
    views.setTextViewText(R.id.lifeos_widget_big, order?.let { "DO$it" } ?: "—")
    views.setTextViewText(
      R.id.lifeos_widget_sub,
      if (snapshot == null) "Open LifeOS"
      else "Tomorrow  " + (tomorrowOrder?.let { "DO$it" }
        ?: tomorrow?.optString("type").orEmpty().ifEmpty { "—" })
    )
  }
}

/** Comprehensive life overview: tasks by area, projects, habits, next task. */
class LifeOSOverviewWidget : LifeOSBaseWidget() {
  override val deepLink = "lifeos:///"
  override fun render(views: RemoteViews, snapshot: JSONObject?) {
    if (snapshot == null) {
      fill(views, "LIFEOS · OVERVIEW", "Open LifeOS",
        "Open the app to see your life at a glance.", synced(null))
      return
    }
    val remaining = snapshot.optJSONObject("remainingByArea")
    val habits = snapshot.optJSONObject("habitSummary")
    val nextTask = snapshot.optJSONObject("nextTask")
    val projects = snapshot.optJSONArray("projectProgress")

    val lines = mutableListOf<String>()

    if (nextTask != null) {
      lines.add("▶ ${nextTask.optString("title")}  ${time(nextTask.optInt("start"))}")
    }

    if (remaining != null) {
      val parts = mutableListOf<String>()
      val academic = remaining.optInt("academic")
      val skills = remaining.optInt("skills")
      val proj = remaining.optInt("projects")
      val fitness = remaining.optInt("fitness")
      if (academic > 0) parts.add("Academic: $academic")
      if (skills > 0) parts.add("Skills: $skills")
      if (proj > 0) parts.add("Projects: $proj")
      if (fitness > 0) parts.add("Fitness: $fitness")
      if (parts.isNotEmpty()) lines.add(parts.joinToString(" · "))
    }

    if (habits != null) {
      val done = habits.optInt("done")
      val total = habits.optInt("total")
      if (total > 0) lines.add("Habits: $done/$total done")
    }

    projects.map(3) {
      val progress = it.optInt("progress")
      val title = it.optString("title")
      val status = it.optString("status")
      lines.add("$title · $status · ${progress}%")
    }

    val weekly = snapshot.optJSONObject("weeklySummary")
    if (weekly != null) {
      val tc = weekly.optInt("tasksCompleted")
      val hr = weekly.optInt("habitsRate")
      val fm = weekly.optInt("focusMinutes")
      lines.add("Week: ${tc} done · ${hr}% habits · ${fm}m focus")
    }

    val tomorrowCount = snapshot.optInt("tomorrowTaskCount")
    if (tomorrowCount > 0) lines.add("Tomorrow: $tomorrowCount task${if (tomorrowCount > 1) "s" else ""} due")

    val totalTasks = remaining?.optInt("total") ?: 0
    fill(
      views, "LIFEOS · OVERVIEW",
      if (totalTasks > 0) "$totalTasks tasks open" else "All clear",
      if (lines.isEmpty()) "Nothing pending. Time to breathe." else lines.joinToString("\n"),
      synced(snapshot)
    )
  }
}
