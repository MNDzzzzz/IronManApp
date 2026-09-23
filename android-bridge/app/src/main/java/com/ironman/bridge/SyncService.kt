package com.ironman.bridge

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.time.LocalDate
import java.util.concurrent.TimeUnit

/**
 * Servicio de envío HTTP hacia la WebApp IronManApp
 */
class SyncService {

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    suspend fun sendToWebApp(
        serverUrl: String,
        apiToken: String,
        data: BridgeData
    ): Result<String> = withContext(Dispatchers.IO) {
        try {
            val endpoint = if (serverUrl.endsWith("/")) "${serverUrl}api/bridge/sync" else "$serverUrl/api/bridge/sync"
            val todayStr = LocalDate.now().toString()

            // Construir JSON manualmente para no requerir dependencias complejas de Gson/Moshi
            val samplesJson = data.samples.take(500).joinToString(",") {
                """{"timestamp":"${it.timestamp}","bpm":${it.bpm}}"""
            }

            val jsonBody = """
            {
                "device": "Samsung Galaxy Fit3",
                "synced_at": "${java.time.Instant.now()}",
                "daily_metric": {
                    "date": "$todayStr",
                    "resting_hr": ${data.restingHr},
                    "sleep_duration_minutes": ${data.sleepMinutes},
                    "sleep_score": ${data.sleepScore},
                    "deep_sleep_minutes": ${Math.round(data.sleepMinutes * 0.22)},
                    "rem_sleep_minutes": ${Math.round(data.sleepMinutes * 0.24)},
                    "light_sleep_minutes": ${Math.round(data.sleepMinutes * 0.48)},
                    "awake_minutes": ${Math.round(data.sleepMinutes * 0.06)},
                    "spo2_avg": ${String.format(java.util.Locale.US, "%.1f", data.spo2)},
                    "spo2_min": ${String.format(java.util.Locale.US, "%.1f", data.spo2 - 3.2)},
                    "total_steps": ${data.steps},
                    "active_calories": ${Math.round(data.steps * 0.045)}
                },
                "heart_rate_samples": [$samplesJson]
            }
            """.trimIndent()

            val request = Request.Builder()
                .url(endpoint)
                .addHeader("Content-Type", "application/json")
                .addHeader("x-bridge-token", apiToken)
                .post(jsonBody.toRequestBody("application/json".toMediaType()))
                .build()

            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    Result.success("Sincronización exitosa (${response.code})")
                } else {
                    Result.failure(Exception("Error en servidor: ${response.code} ${response.message}"))
                }
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
