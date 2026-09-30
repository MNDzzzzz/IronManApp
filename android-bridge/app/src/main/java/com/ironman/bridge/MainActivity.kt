package com.ironman.bridge

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.lifecycle.lifecycleScope
import androidx.work.*
import kotlinx.coroutines.launch
import java.util.concurrent.TimeUnit

class MainActivity : ComponentActivity() {

    private val healthManager by lazy { HealthConnectManager(this) }
    private val syncService = SyncService()

    private var sdkStatusState = mutableStateOf(HealthConnectClient.SDK_UNAVAILABLE)

    private val requestPermissions = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        Toast.makeText(this, "Permisos concedidos: ${granted.size}", Toast.LENGTH_SHORT).show()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val prefs = getSharedPreferences("ironman_bridge_prefs", Context.MODE_PRIVATE)
        sdkStatusState.value = healthManager.getSdkStatus()

        setContent {
            var serverUrl by remember {
                mutableStateOf(prefs.getString("server_url", "https://iron-man-app.vercel.app") ?: "")
            }
            var apiToken by remember {
                mutableStateOf(prefs.getString("api_token", "ironman_secret_fit3_token_2026") ?: "")
            }
            var statusText by remember { mutableStateOf("Listo para sincronizar") }
            var isSyncing by remember { mutableStateOf(false) }
            val currentSdkStatus by sdkStatusState

            val isHealthConnectReady = currentSdkStatus == HealthConnectClient.SDK_AVAILABLE

            Surface(
                modifier = Modifier.fillMaxSize(),
                color = Color(0xFF0A0A0C)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(20.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Spacer(modifier = Modifier.height(10.dp))

                    Text(
                        text = "IRONMAN BRIDGE",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFFFC5200),
                        letterSpacing = 1.sp
                    )
                    Text(
                        text = "Galaxy Fit3 ➔ Samsung Health ➔ Health Connect ➔ IronManApp",
                        fontSize = 11.sp,
                        color = Color.Gray
                    )

                    // 1. ESTADO DEL SDK HEALTH CONNECT
                    if (!isHealthConnectReady) {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF2A1508)),
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, Color(0xFFFC5200).copy(alpha = 0.5f), RoundedCornerShape(16.dp))
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Text(
                                    text = "⚠️ Health Connect no disponible",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp,
                                    color = Color(0xFFFF9E66)
                                )
                                Text(
                                    text = if (currentSdkStatus == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
                                        "El servicio de Google 'Health Connect (Conexión de Salud)' no está instalado o requiere actualización en este teléfono."
                                    } else {
                                        "Tu versión de Android no soporta de forma nativa Health Connect (requiere Android 9+ con Google Play)."
                                    },
                                    fontSize = 12.sp,
                                    color = Color.LightGray,
                                    lineHeight = 16.sp
                                )

                                Button(
                                    onClick = { openPlayStoreForHealthConnect() },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFC5200)),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Text("📥 Instalar Health Connect (Google Play)", color = Color.Black, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    } else {
                        // Badge verde de servicio disponible
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFF0F291E), RoundedCornerShape(12.dp))
                                .border(1.dp, Color(0xFF10B981).copy(alpha = 0.4f), RoundedCornerShape(12.dp))
                                .padding(horizontal = 14.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text("✅ Health Connect Activo", color = Color(0xFF34D399), fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                Text("Listo para leer pulso, sueño y pasos", color = Color.Gray, fontSize = 11.sp)
                            }
                            TextButton(onClick = { openHealthConnectSettings() }) {
                                Text("Ajustes", color = Color(0xFF34D399), fontSize = 12.sp)
                            }
                        }
                    }

                    // 2. GUÍA RÁPIDA DE CONFIGURACIÓN
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF16161A)),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text("📋 Pasos para conectar tu Fit3:", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color.White)
                            Text("1. En la app Samsung Health: Ajustes ➔ Health Connect ➔ Permitir todo.", fontSize = 11.sp, color = Color(0xFFA1A1AA))
                            Text("2. Pulsa abajo el botón 'Conceder Permisos'.", fontSize = 11.sp, color = Color(0xFFA1A1AA))
                            Text("3. Pulsa 'Sincronizar Ahora' para enviar los datos a IronManApp.", fontSize = 11.sp, color = Color(0xFFA1A1AA))
                        }
                    }

                    // 3. CAMPOS DE CONFIGURACIÓN DEL SERVIDOR
                    OutlinedTextField(
                        value = serverUrl,
                        onValueChange = {
                            serverUrl = it
                            prefs.edit().putString("server_url", it).apply()
                        },
                        label = { Text("URL de IronManApp") },
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

                    // 4. BOTONES DE ACCIÓN
                    Button(
                        onClick = {
                            if (!healthManager.isAvailable()) {
                                Toast.makeText(this@MainActivity, "Primero debes instalar Health Connect.", Toast.LENGTH_LONG).show()
                                openPlayStoreForHealthConnect()
                                return@Button
                            }
                            try {
                                requestPermissions.launch(healthManager.permissions)
                            } catch (e: Exception) {
                                Toast.makeText(this@MainActivity, "Error solicitando permisos: ${e.message}", Toast.LENGTH_LONG).show()
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22222A))
                    ) {
                        Text("1. Conceder Permisos de Health Connect", color = Color.White, fontSize = 13.sp)
                    }

                    Button(
                        onClick = {
                            if (!healthManager.isAvailable()) {
                                statusText = "❌ Health Connect no está instalado o listo. Pulsa arriba para instalarlo."
                                openPlayStoreForHealthConnect()
                                return@Button
                            }
                            isSyncing = true
                            statusText = "Leyendo datos de Fit3 y enviando a IronManApp..."
                            lifecycleScope.launch {
                                try {
                                    val data = healthManager.readLatestHealthData()
                                    val res = syncService.sendToWebApp(serverUrl, apiToken, data)
                                    if (res.isSuccess) {
                                        statusText = "✅ ¡Sincronizado con éxito! (${data.samples.size} muestras FC, ${data.steps} pasos)"
                                    } else {
                                        statusText = "❌ ${res.exceptionOrNull()?.message}"
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
                            fontSize = 15.sp,
                            color = Color.Black
                        )
                    }

                    Text(
                        text = statusText,
                        fontSize = 12.sp,
                        color = if (statusText.startsWith("✅")) Color(0xFF34D399) else if (statusText.startsWith("❌")) Color(0xFFF87171) else Color.LightGray,
                        modifier = Modifier.padding(top = 4.dp)
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Text(
                        text = "Sincronización periódica automática configurada (cada 12h: mediodía y noche)",
                        fontSize = 10.sp,
                        color = Color.DarkGray,
                        lineHeight = 14.sp
                    )
                }
            }
        }

        schedulePeriodicSync()
    }

    override fun onResume() {
        super.onResume()
        // Actualizar el estado del SDK al volver a la app (ej: tras instalar Health Connect en Play Store)
        sdkStatusState.value = healthManager.getSdkStatus()
    }

    private fun openPlayStoreForHealthConnect() {
        val uriString = "market://details?id=com.google.android.apps.healthdata&url=healthconnect%3A%2F%2Fonboarding"
        val intent = Intent(Intent.ACTION_VIEW).apply {
            data = Uri.parse(uriString)
            setPackage("com.android.vending")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        try {
            startActivity(intent)
        } catch (e: Exception) {
            val webIntent = Intent(
                Intent.ACTION_VIEW,
                Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata")
            ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
            startActivity(webIntent)
        }
    }

    private fun openHealthConnectSettings() {
        try {
            val intent = Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(this, "Abre Ajustes > Conexión de Salud (Health Connect) en tu teléfono", Toast.LENGTH_LONG).show()
        }
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
