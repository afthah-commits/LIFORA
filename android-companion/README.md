# FITPULSE AI – Android Companion App (Screen Time Sync)

This directory contains the native Android companion service for **FITPULSE AI V2**.

## 1. Technical Architecture

Browser-based Progressive Web Apps (PWAs) cannot directly inspect processes or usage statistics of other installed Android or iOS apps due to operating system sandbox restrictions. 

To bridge this gap cleanly and transparently:
- The **Android Companion App** uses Android's official `android.app.usage.UsageStatsManager`.
- It prompts the user with clear intent to grant the special **Usage Access** permission (`Settings.ACTION_USAGE_ACCESS_SETTINGS`).
- It allows the user to configure which application packages to track.
- A background `CoroutineWorker` (`WorkManager`) batches the daily application usage durations and synchronizes them with the FITPULSE FastAPI backend via:
  ```http
  POST /api/v1/screen-time/sync
  Authorization: Bearer <jwt_access_token>
  Content-Type: application/json

  {
    "device_id": "Pixel-8-Pro",
    "items": [
      {
        "app_name": "Instagram",
        "package_name": "com.instagram.android",
        "category": "Social Media",
        "duration_minutes": 55,
        "date": "2026-10-31"
      }
    ]
  }
  ```

---

## 2. iOS Screen Time API Limitations

Unlike Android's `UsageStatsManager`, Apple's iOS ecosystem restricts cross-app usage reading:
1. **Screen Time Framework (`FamilyControls`, `DeviceActivity`, `ManagedSettings`):**
   - Available on iOS 15+.
   - Designed exclusively for parental control apps or specific individual screen time limit apps.
   - Requires a **special entitlement from Apple** (`com.apple.developer.family-controls`) granted only through an Apple Developer account application review.
   - Third-party apps cannot inspect raw screen time of arbitrary apps without this entitlement.
2. **PWA Limitations:**
   - Web apps and PWAs running on iOS Safari or WebKit have zero access to system usage telemetry.
3. **FITPULSE Recommendation for iOS:**
   - iOS users can utilize the **Manual Screen Time Entry** modal in FITPULSE AI (which takes < 10 seconds per day) to record their daily top apps from Settings -> Screen Time.

---

## 3. Android Setup & Permissions Guide

### Permissions in `AndroidManifest.xml`
```xml
<uses-permission
    android:name="android.permission.PACKAGE_USAGE_STATS"
    tools:ignore="ProtectedPermissions" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### Requesting User Permission in Kotlin
`PACKAGE_USAGE_STATS` cannot be granted through the standard runtime permission popup. It requires launching a system settings intent:

```kotlin
fun hasUsageStatsPermission(context: Context): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = appOps.checkOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        Process.myUid(),
        context.packageName
    )
    return mode == AppOpsManager.MODE_ALLOWED
}

fun requestUsageStatsPermission(context: Context) {
    val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
    }
    context.startActivity(intent)
}
```

### Testing on Local Wi-Fi Network
1. Ensure your laptop running FastAPI and React is accessible on your local Wi-Fi (e.g. `http://192.168.1.100:8000`).
2. In `android-companion`, configure `BASE_URL = "http://192.168.1.100:8000/api/v1"`.
3. Open the companion app on your Android phone, grant Usage Access, and tap **"Sync Usage to FITPULSE"**.
4. Refresh your FITPULSE web dashboard or `/screen-time` to see your synchronized device stats!
