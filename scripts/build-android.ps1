param([string]$JdkHome = '')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
if (-not $JdkHome) {
    $cachedJdk = Get-ChildItem -LiteralPath (Join-Path $env:USERPROFILE '.gradle\jdks') -Directory -ErrorAction SilentlyContinue | Where-Object Name -Match '17-' | Select-Object -First 1
    if ($cachedJdk) { $JdkHome = $cachedJdk.FullName } else { $JdkHome = $env:JAVA_HOME }
}
if (-not $JdkHome -or -not (Test-Path -LiteralPath (Join-Path $JdkHome 'bin\java.exe'))) { throw 'Install JDK 17 and pass -JdkHome C:\path\to\jdk-17.' }
$env:JAVA_HOME = $JdkHome
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
$env:NODE_ENV = 'production'
$env:EXPO_NO_TELEMETRY = '1'
node scripts/patch-android-toolchain.mjs
npx.cmd expo prebuild --platform android --no-install
if ($LASTEXITCODE -ne 0) { throw 'Expo prebuild failed.' }
Push-Location android
try {
    .\gradlew.bat :app:assembleRelease --no-daemon --max-workers=2 -PreactNativeArchitectures=arm64-v8a '-Dorg.gradle.jvmargs=-Xmx3072m -Djava.net.preferIPv4Stack=true'
    if ($LASTEXITCODE -ne 0) { throw 'Android build failed. Read the Gradle error above.' }
} finally { Pop-Location }
New-Item -ItemType Directory -Path output -Force | Out-Null
Copy-Item -LiteralPath android/app/build/outputs/apk/release/app-release.apk -Destination output/lifeos-preview.apk
Write-Host 'Ready: output/lifeos-preview.apk (arm64, development signing key).'
