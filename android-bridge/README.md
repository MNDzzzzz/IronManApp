# IronManApp: Android Bridge (Puente Health Connect -> WebApp)

Aplicación nativa ligera para Android (Kotlin + Jetpack Compose) que extrae los datos de salud sincronizados desde tu **Samsung Galaxy Fit3** (vía Samsung Health y Health Connect) y los envía mediante un `HTTP POST` seguro con cabecera `x-bridge-token` a tu aplicación web **IronManApp**.

---

## 📱 ¿Cómo Funciona el Flujo de Datos?
1. Llevas tu **Samsung Galaxy Fit3** en la muñeca (registra pulso continuo, sueño, pasos y SpO2).
2. La Fit3 sincroniza automáticamente por Bluetooth con **Samsung Health** en tu teléfono Android secundario.
3. Samsung Health vuelca los datos a **Android Health Connect** de forma nativa.
4. Esta aplicación (**IronMan Bridge**) consulta Health Connect y envía el JSON consolidado a tu WebApp:
   - **Sincronización Automática:** Programada 2 veces al día (al mediodía ~14:00 y antes de dormir ~23:00) mediante `WorkManager` (sin gastar batería).
   - **Sincronización Manual:** Pulsa el botón *"Sincronizar Ahora"* en cualquier momento para volcar los datos inmediatamente.

---

## 🛠️ Requisitos
- Dispositivo Android con **Android 14+** (Health Connect viene integrado en los ajustes del sistema) o Android 9-13 con la app oficial de Google *Health Connect* instalada desde Google Play Store.
- En la app Samsung Health: activa la sincronización en **Ajustes -> Health Connect -> Permitir todo**.

---

## 🚀 Pasos para Abrir y Compilar en Android Studio
1. Abre **Android Studio** en tu PC.
2. Selecciona **Open** y abre la carpeta `android-bridge`.
3. Deja que Gradle sincronice las dependencias (Health Connect Client, OkHttp, Jetpack Compose).
4. Conecta tu teléfono Android secundario por cable USB (con depuración USB activa) o pulsa **Run 'app'**.
5. Al abrir la app por primera vez:
   - Pulsa en **"Conceder Permisos de Health Connect"** y acepta los permisos de lectura de ritmo cardíaco, sueño, pasos y oxígeno en sangre.
   - Introduce la URL de tu WebApp (ej: `https://tu-app.vercel.app`) y el token secreto (`ironman_secret_fit3_token_2026`).
   - Pulsa **"Sincronizar Ahora"**. ¡Listo!
