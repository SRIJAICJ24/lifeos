package com.personal.lifeos.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class LifeOSWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LifeOSWidget")
    AsyncFunction("updateSnapshot") { payload: String ->
      val context = appContext.reactContext ?: return@AsyncFunction
      context.getSharedPreferences(LifeOSBaseWidget.PREFS, 0).edit()
        .putString(LifeOSBaseWidget.KEY, payload).apply()
      val manager = AppWidgetManager.getInstance(context)
      // Every placed LifeOS widget redraws from the snapshot that was just written.
      for (provider in LifeOSBaseWidget.providers) {
        val ids = manager.getAppWidgetIds(ComponentName(context, provider))
        if (ids.isNotEmpty())
          provider.getDeclaredConstructor().newInstance().onUpdate(context, manager, ids)
      }
    }
  }
}
