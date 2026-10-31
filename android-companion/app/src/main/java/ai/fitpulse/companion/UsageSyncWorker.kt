package ai.fitpulse.companion

import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class UsageSyncWorker(
    private val appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val prefs = appContext.getSharedPreferences("fitpulse_prefs", Context.MODE_PRIVATE)
        val token = prefs.getString("jwt_token", null) ?: return@withContext Result.failure()
        val serverUrl = prefs.getString("server_url", "http://10.0.2.2:8000/api/v1") ?: return@withContext Result.failure()

        val usageManager = appContext.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            ?: return@withContext Result.failure()

        val calendar = Calendar.getInstance()
        calendar.set(Calendar.HOUR_OF_DAY, 0)
        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        val startTime = calendar.timeInMillis
        val endTime = System.currentTimeMillis()

        val stats = usageManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY,
            startTime,
            endTime
        )

        if (stats.isNullOrEmpty()) {
            return@withContext Result.success()
        }

        val packageManager = appContext.packageManager
        val itemsArray = JSONArray()
        val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())

        for (usage in stats) {
            val totalTimeInForeground = usage.totalTimeInForeground
            val durationMinutes = (totalTimeInForeground / (1000 * 60)).toInt()

            // Filter out system apps and apps with < 1 minute usage
            if (durationMinutes <= 0 || isSystemPackage(usage.packageName)) {
                continue
            }

            val appName = try {
                val appInfo = packageManager.getApplicationInfo(usage.packageName, 0)
                packageManager.getApplicationLabel(appInfo).toString()
            } catch (e: PackageManager.NameNotFoundException) {
                usage.packageName
            }

            val itemObj = JSONObject().apply {
                put("app_name", appName)
                put("package_name", usage.packageName)
                put("category", categorizeApp(usage.packageName))
                put("duration_minutes", durationMinutes)
                put("date", todayStr)
            }
            itemsArray.put(itemObj)
        }

        if (itemsArray.length() == 0) {
            return@withContext Result.success()
        }

        val payload = JSONObject().apply {
            put("device_id", "${Build.MANUFACTURER} ${Build.MODEL}")
            put("items", itemsArray)
        }

        val success = postSyncData("$serverUrl/screen-time/sync", token, payload.toString())
        if (success) Result.success() else Result.retry()
    }

    private fun postSyncData(endpoint: String, token: String, jsonBody: String): Boolean {
        return try {
            val url = URL(endpoint)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("Authorization", "Bearer $token")
            conn.doOutput = true
            conn.connectTimeout = 10000
            conn.readTimeout = 10000

            OutputStreamWriter(conn.outputStream).use { writer ->
                writer.write(jsonBody)
                writer.flush()
            }

            val responseCode = conn.responseCode
            responseCode in 200..299
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    private fun isSystemPackage(pkg: String): Boolean {
        return pkg.startsWith("com.android.") ||
                pkg.startsWith("android") ||
                pkg == "com.google.android.googlequicksearchbox" ||
                pkg == "com.google.android.inputmethod.latin"
    }

    private fun categorizeApp(pkg: String): String {
        return when {
            pkg.contains("instagram") || pkg.contains("twitter") || pkg.contains("facebook") || pkg.contains("tiktok") -> "Social Media"
            pkg.contains("youtube") || pkg.contains("netflix") || pkg.contains("spotify") || pkg.contains("primevideo") -> "Entertainment"
            pkg.contains("whatsapp") || pkg.contains("telegram") || pkg.contains("slack") || pkg.contains("discord") -> "Communication"
            pkg.contains("chrome") || pkg.contains("docs") || pkg.contains("github") || pkg.contains("notion") -> "Productivity"
            pkg.contains("duolingo") || pkg.contains("coursera") || pkg.contains("udemy") || pkg.contains("khan") -> "Education"
            else -> "Other"
        }
    }
}
