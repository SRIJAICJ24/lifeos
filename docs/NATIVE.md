# Native build and widget handoff

## Android prerequisites

- JDK 17; this environment's default Java 24 caused CMake configuration to fail.
- Android SDK platform 36 and Build Tools 36, NDK 27.1.12297006, accepted SDK licenses.
- Network access for first-time Gradle, Maven and Android dependency downloads.
- An arm64 Android phone for the provided preview build script, or change `reactNativeArchitectures` for your emulator/device.

Run `scripts/build-android.ps1` from the README. Its JDK argument is optional when Gradle has cached a JDK 17 installation. The script changes environment variables only in the running PowerShell process.

The reproducible postinstall patch updates React Native 0.83's bundled Foojay resolver from 0.5.0 to 1.0.0 for Gradle 9 compatibility. This matches the [upstream React Native issue](https://github.com/react/react-native/issues/55781) and [resolver changelog](https://github.com/gradle/foojay-toolchains/blob/main/CHANGELOG.md). Remove the patch when upgrading to a React Native release that carries the fix.

## Widget

The source is `modules/lifeos-widget/android/`. Expo autolinking discovers the module automatically during prebuild. Its Android library manifest contributes the real widget receiver and metadata.

1. Install the native APK and open LifeOS once.
2. Generate a plan or save an entry to update the snapshot.
3. Long-press the Android launcher → Widgets → **LifeOS · Today**.
4. Place and resize the widget. It shows the next class/day order, pending tasks and next free slot from the latest snapshot.
5. Tap it to open LifeOS. Complete a task and confirm the widget changes.
6. Test force-stop/reopen, a date rollover and adding a widget before any snapshot exists.

The provider is real `AppWidgetProvider` / `RemoteViews`, backed by private SharedPreferences written by an Expo module. It is not an in-app imitation. It deliberately reports snapshot age rather than claiming to recalculate while the app is closed. Seven specialized widget layouts and iOS WidgetKit remain future work.

## Device acceptance checks

No phone was attached during initial implementation. Before relying on this daily, verify airplane-mode CRUD/restart, focus timer recovery after process death, local notification permission denial/approval, notification delivery with the app backgrounded, launcher widget sizing/deep links and timezone/date changes.

## iOS

The React Native app has an iOS bundle identifier and shared SQLite/domain code. Building/signing iOS and implementing a WidgetKit extension require a macOS/Xcode environment. The versioned widget snapshot is ready to be shared through an App Group when that native extension is added.
