package ai.fitpulse.companion

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Process
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity() {

    private lateinit var statusText: TextView
    private lateinit var serverUrlInput: EditText
    private lateinit var tokenInput: EditText
    private lateinit var grantPermBtn: Button
    private lateinit var syncNowBtn: Button
    private lateinit var scheduleSyncBtn: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Inflate basic programmatic layout for companion interface
        val layout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(48, 64, 48, 64)
            setBackgroundColor(0xFF09090B.toInt())
        }

        statusText = TextView(this).apply {
            setTextColor(0xFFFFFFFF.toInt())
            textSize = 16f
            text = "FITPULSE AI – Screen Time Companion"
            setPadding(0, 0, 0, 32)
        }
        layout.addView(statusText)

        serverUrlInput = EditText(this).apply {
            hint = "Backend API URL (e.g. http://192.168.1.100:8000/api/v1)"
            setTextColor(0xFFFFFFFF.toInt())
            setHintTextColor(0xFF71717A.toInt())
            setText(getSharedPreferences("fitpulse_prefs", Context.MODE_PRIVATE).getString("server_url", "http://10.0.2.2:8000/api/v1"))
        }
        layout.addView(serverUrlInput)

        tokenInput = EditText(this).apply {
            hint = "JWT Access Token"
            setTextColor(0xFFFFFFFF.toInt())
            setHintTextColor(0xFF71717A.toInt())
            setText(getSharedPreferences("fitpulse_prefs", Context.MODE_PRIVATE).getString("jwt_token", ""))
        }
        layout.addView(tokenInput)

        grantPermBtn = Button(this).apply {
            text = "1. Grant Usage Access Permission"
            setBackgroundColor(0xFF27272A.toInt())
            setTextColor(0xFFFFFFFF.toInt())
            setOnClickListener { requestUsagePermission() }
        }
        layout.addView(grantPermBtn)

        syncNowBtn = Button(this).apply {
            text = "2. Sync Screen Time Now"
            setBackgroundColor(0xFF10B981.toInt())
            setTextColor(0xFF000000.toInt())
            setOnClickListener { triggerImmediateSync() }
        }
        layout.addView(syncNowBtn)

        scheduleSyncBtn = Button(this).apply {
            text = "3. Enable Daily Auto-Sync"
            setBackgroundColor(0xFF18181B.toInt())
            setTextColor(0xFFA1A1AA.toInt())
            setOnClickListener { schedulePeriodicSync() }
        }
        layout.addView(scheduleSyncBtn)

        setContentView(layout)
    }

    override fun onResume() {
        super.onResume()
        updatePermissionStatus()
    }

    private fun updatePermissionStatus() {
        val hasPerm = hasUsageStatsPermission()
        if (hasPerm) {
            statusText.text = "Status: ✓ Usage Access Granted"
            statusText.setTextColor(0xFF10B981.toInt())
            grantPermBtn.isEnabled = false
            grantPermBtn.text = "Usage Permission Granted"
        } else {
            statusText.text = "Status: ⚠ Usage Access Required"
            statusText.setTextColor(0xFFF43F5E.toInt())
            grantPermBtn.isEnabled = true
            grantPermBtn.text = "Grant Usage Access"
        }
    }

    private fun hasUsageStatsPermission(): Boolean {
        val appOps = getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            packageName
        )
        return mode == AppOpsManager.MODE_ALLOWED
    }

    private fun requestUsagePermission() {
        startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
    }

    private fun saveConfig() {
        val prefs = getSharedPreferences("fitpulse_prefs", Context.MODE_PRIVATE)
        prefs.edit()
            .putString("server_url", serverUrlInput.text.toString().trim())
            .putString("jwt_token", tokenInput.text.toString().trim())
            .apply()
    }

    private fun triggerImmediateSync() {
        if (!hasUsageStatsPermission()) {
            Toast.makeText(this, "Please grant Usage Access first", Toast.LENGTH_SHORT).show()
            return
        }
        saveConfig()

        val syncRequest = OneTimeWorkRequestBuilder<UsageSyncWorker>()
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
            )
            .build()

        WorkManager.getInstance(this).enqueue(syncRequest)
        Toast.makeText(this, "Usage synchronization enqueued", Toast.LENGTH_SHORT).show()
    }

    private fun schedulePeriodicSync() {
        saveConfig()
        val periodicRequest = PeriodicWorkRequestBuilder<UsageSyncWorker>(6, TimeUnit.HOURS)
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
            )
            .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "fitpulse_screen_time_sync",
            ExistingPeriodicWorkPolicy.UPDATE,
            periodicRequest
        )
        Toast.makeText(this, "Periodic 6-hour background sync scheduled", Toast.LENGTH_SHORT).show()
    }
}
