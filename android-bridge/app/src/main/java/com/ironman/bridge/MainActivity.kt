package com.ironman.bridge

import android.content.Context
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.health.connect.client.PermissionController
import androidx.lifecycle.lifecycleScope
import androidx.work.*
import kotlinx.coroutines.launch
import java.util.concurrent.TimeUnit

class MainActivity : ComponentActivity() {

    private val healthManager by lazy { HealthConnectManager(this) }
    private val syncService = SyncService()

    private val requestPermissions = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        Toast.makeText(this, "Permisos concedidos: ${granted.size}", Toast.LENGTH_SHORT).show()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val prefs = getSharedPreferences("ironman_bridge_prefs", Context.MODE_PRIVATE)

        setContent {
            var serverUrl by remember {
                mutableStateOf(prefs.getString("server_url", "https://tu-app.vercel.app") ?: "")
            }
            var apiToken by remember {
                mutableStateOf(prefs.getString("api_token", "ironman_secret_fit3_token_2026") ?: "")
            }
            var statusText by remember { mutableStateOf("Listo para sincronizar") }
            var isSyncing by remember { mutableStateOf(false) }

            Surface(
                modifier = Modifier.fillMaxSize(),
                color = Color(0xFF0A0A0C)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Spacer(modifier = Modifier.height(24.dp))

                    Text(
                        text = "IRONMAN BRIDGE",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFFFC5200)
                    )
                    Text(
                        text = "Samsung Galaxy Fit3 -> Health Connect",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = serverUrl,
                        onValueChange = {
                            serverUrl = it
                            prefs.edit().putString("server_url", it).apply()
                        },
                        label = { Text("URL de IronManApp (Vercel / Local)") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = Color(0xFFFC5200),
                            unfocusedBorderColor = Color.DarkGray
                        )
                    )

                    OutlinedTextField(
                        value = apiToken,
                        onValueChange = {
                            apiToken = it
                            prefs.edit().putString("api_token", it).apply()
                        },
                        label = { Text("Token Secreto (x-bridge-token)") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = Color(0xFFFC5200),
                            unfocusedBorderColor = Color.DarkGray
                        )
                    )

                    Button(
                        onClick = {
                            requestPermissions.launch(healthManager.permissions)
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E1E24))
                    ) {
                        Text("1. Conceder Permisos de Health Connect", color = Color.White)
                    }

                    Button(
                        onClick = {
                            isSyncing = true
                            statusText = "Leyendo datos de Fit3 y enviando..."
                            lifecycleScope.launch {
                                try {
                                    val data = healthManager.readLatestHealthData()
                                    val res = syncService.sendToWebApp(serverUrl, apiToken, data)
                                    if (res.isSuccess) {
                                        statusText = "✅ ¡Sincronizado con éxito! (${data.samples.size} muestras FC)"
                                    } else {
                                        statusText = "❌ Error: ${res.exceptionOrNull()?.message}"
                                    }
                                } catch (e: Exception) {
                                    statusText = "❌ Error: ${e.message}"
                                } finally {
                                    isSyncing = false
                                }
                            }
                        },
                        enabled = !isSyncing,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFC5200))
                    ) {
                        Text(
                            text = if (isSyncing) "Sincronizando..." else "2. Sincronizar Ahora",
                            fontWeight = FontWeight.Bold,
                            color = Color.Black
                        )
                    }

                    Text(
                        text = statusText,
                        fontSize = 12.sp,
                        color = Color.LightGray,
                        modifier = Modifier.padding(top = 8.dp)
                    )

                    Spacer(modifier = Modifier.weight(1f))

                    Text(
                        text = "Sincronización automática activa en segundo plano (mediodía y noche)",
                        fontSize = 10.sp,
                        color = Color.DarkGray,
                        lineHeight = 14.sp
                    )
                }
            }
        }

        // Programar sincronización periódica (cada 12 horas: mediodía y noche)
        schedulePeriodicSync()
    }

    private fun schedulePeriodicSync() {
        val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(12, TimeUnit.HOURS)
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
            )
            .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "ironman_fit3_sync",
            ExistingPeriodicWorkPolicy.KEEP,
            syncRequest
        )
    }
}
