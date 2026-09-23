package com.ironman.bridge

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

/**
 * Worker en segundo plano que sincroniza silenciosamente las métricas de la Fit3 a mediodía y noche
 */
class SyncWorker(
    private val context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val prefs = context.getSharedPreferences("ironman_bridge_prefs", Context.MODE_PRIVATE)
        val serverUrl = prefs.getString("server_url", "https://tu-app.vercel.app") ?: return Result.failure()
        val apiToken = prefs.getString("api_token", "ironman_secret_fit3_token_2026") ?: return Result.failure()

        val manager = HealthConnectManager(context)
        if (!manager.hasAllPermissions()) {
            return Result.retry()
        }

        return try {
            val healthData = manager.readLatestHealthData()
            val syncResult = SyncService().sendToWebApp(serverUrl, apiToken, healthData)
            if (syncResult.isSuccess) {
                Result.success()
            } else {
                Result.retry()
            }
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
