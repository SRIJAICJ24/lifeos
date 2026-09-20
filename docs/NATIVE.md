# Native build and widget handoff

## Android prerequisites

- JDK 17; this environment's default Java 24 caused CMake configuration to fail.
- Android SDK platform 36 and Build Tools 36, NDK 27.1.12297006, accepted SDK licenses.
- Network access for first-time Gradle, Maven and Android dependency downloads.
- An arm64 Android phone for the provided preview build script, or change `reactNativeArchitectures` for your emulator/device.

Run `scripts/build-android.ps1` from the README. Its JDK argument is optional when Gradle has cached a JDK 17 installation. The script changes environment variables only in the running PowerShell process.

The reproducible postinstall patch updates React Native 0.83's bundled Foojay resolver from 0.5.0 to 1.0.0 for Gradle 9 compatibility. This matches the [upstream React Native issue](https://github.com/react/react-native/issues/55781) and [resolver changelog](https://github.com/gradle/foojay-toolchains/blob/main/CHANGELOG.md). Remove the patch when upgrading to a React Native release that carries the fix.

## Widgets

The source is `modules/lifeos-widget/android/`. Expo autolinking discovers the module during
prebuild, and its library manifest contributes five real `AppWidgetProvider` receivers.

| Widget | Default size | Shows | Opens |
|---|---|---|---|
| LifeOS · Today's classes | 4×3 | Every class today with times and rooms | Academic |
| LifeOS · Next class | 4×2 | What is next, when and where | Academic |
| LifeOS · Deadlines | 4×3 | Assignments and tests, nearest first | Assignments |
| LifeOS · Study next | 4×2 | The top study suggestion and its reason | Study plan |
| LifeOS · Day Order | 2×2 | Today's and tomorrow's Day Order | Academic calendar |

All five are resizable, and all five read the same snapshot, so they always agree with each other.

### Adding them on the phone

1. Install the APK and open LifeOS once — the snapshot is written on first load and after every
   change, so a widget added before that shows "Open LifeOS to refresh".
2. Long-press an empty spot on the home screen → **Widgets**.
3. Scroll to **LifeOS**. All five appear under it with a one-line description each.
4. Long-press one and drag it out, or tap it to place it. Drag the handles to resize.
5. Tap the widget to open the matching screen in the app.

On Motorola's launcher (Moto Edge 50 Fusion) this is Home screen → long-press → Widgets → LifeOS.
The widget picker groups them under the app name; if only some appear, scroll — the group is
collapsible and shows a count.

The providers are real `AppWidgetProvider` / `RemoteViews`, backed by private SharedPreferences
written by an Expo module. They are not in-app imitations. They deliberately report snapshot age
rather than claiming to recalculate while the app is closed: Android refreshes them on its own
schedule (30 minutes) and immediately whenever the app writes a change. iOS WidgetKit remains
future work.

## Device acceptance checks

No phone was attached during initial implementation. Before relying on this daily, verify airplane-mode CRUD/restart, focus timer recovery after process death, local notification permission denial/approval, notification delivery with the app backgrounded, launcher widget sizing/deep links and timezone/date changes.

## iOS

The React Native app has an iOS bundle identifier and shared SQLite/domain code. Building/signing iOS and implementing a WidgetKit extension require a macOS/Xcode environment. The versioned widget snapshot is ready to be shared through an App Group when that native extension is added.
