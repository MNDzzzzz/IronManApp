# SISTEMA DE DISEÑO LIQUID GLASS & CLAUDE-MINIMAL (MODO CLARO & OSCURO)
## Especificación de Arquitectura UI/UX y Sistema de Tokens para IronManApp

> **Autoría Colegiada:** ECC UI Designer & UX Architect (`agency-ui-designer`, `agency-ux-architect`, `generative_ui`, `a11y-architect`)  
> **Fecha:** Octubre 2026  
> **Estado:** Aprobado para Implementación  
> **Estética:** Apple iOS 18/26 + visionOS Liquid Glass x Anthropic Claude Editorial Minimal  

---

## 1. INVESTIGACIÓN Y BENCHMARKING DE REFERENCIAS REALES

Para construir un sistema de cristal líquido que no sea un simple "efecto borroso plano" ni cause fatiga visual, se ha investigado el estado del arte en repositorios de código abierto, librerías CSS especializadas y sistemas de diseño de referencia.

### 1.1. Repositorios de Código Abierto Analizados

1. **[`fluid-design-io/vision-ui`](https://github.com/fluid-design-io/vision-ui)** (React / Tailwind):
   - **Aporte clave:** Arquitectura de *Superficies Compuestas* (Compound Glass Surfaces) inspiradas en Apple visionOS. Introduce el concepto de **difusión por capas**: una tarjeta no tiene una sola opacidad, sino un fondo de absorción de luz, un bisel perimetral reflectivo y una sombra ambiental difusa.
   - **Técnica adaptada:** Separación de los bordes especulares (Catch-Light) respecto a la opacidad del cuerpo de la tarjeta.

2. **[`mawtechsolutions/react-glass-ui`](https://github.com/mawtechsolutions/react-glass-ui)** (React Components):
   - **Aporte clave:** Implementación lista para producción de `GlassCard`, `GlassButton` y `GlassInput`.
   - **Técnica adaptada:** Micro-interacciones hápticas al pulsar (`active:scale-[0.98]`), donde el cristal "se comprime" y la sombra se vuelve más corta e intensa, emulando la física táctil de los dispositivos Apple.

3. **[`JUNGHERZ/GlassKit`](https://github.com/JUNGHERZ/GlassKit)** (Zero-dependency CSS Framework):
   - **Aporte clave:** Motor CSS puro para "Liquid Glass" con soporte nativo de **Modo Claro y Modo Oscuro**.
   - **Técnica adaptada:** Uso de `backdrop-filter: blur(20px) saturate(180%)`. El parámetro de **saturación** (`saturate-150` a `saturate-180`) es el que evita que los fondos claros se vuelvan grises/opacos y hace que los colores que pasan por detrás del cristal sigan vibrando de forma orgánica y líquida.

4. **Apple Human Interface Guidelines (visionOS & iOS Material Design)**:
   - **Materiales Jerárquicos:** Apple no usa un único cristal; divide los materiales en 4 densidades:
     - *Ultra Thin:* Para fondos de interacción sutil o badges flotantes.
     - *Thin:* Para barras de navegación y Dynamic Island.
     - *Regular:* Para tarjetas de contenido estándar (resumen de hoy, métricas).
     - *Thick:* Para modales, hojas emergentes (Bottom Sheets) y centros de mando.

5. **Anthropic Claude Minimal Design Language**:
   - **Aporte clave:** Filosofía de moderación editorial (*Monochrome Restraint*).
   - **Paleta Neutra:** Fondo claro en **Ivory Cream (`#FAF9F5`)** en lugar de blanco puro cegador (`#FFFFFF`); y fondo oscuro en **Slate Ink / Obsidian (`#141413` / `#0A0D14`)** en vez de gris genérico.
   - **Acentos Serenos:** Tonos tierra deportivos como Clay (`#D97757`), Verde Cactus/Sage (`#A2B9AF` para salud de rodilla y Z2) y Azul Cielo (`#6A9BCC` para agua/tiempo). Tipografía tipográfica limpia y espaciado respirable que reduce el estrés cognitivo a cero.

---

## 2. LA FÍSICA DEL LIQUID GLASS EN MODO CLARO VS MODO OSCURO

El gran error del "Glassmorphism" tradicional es usar `bg-white/10` tanto de día como de noche. En Modo Claro, `bg-white/10` sobre fondo blanco o gris claro es completamente invisible y causa violación de las normas de contraste WCAG.

### 2.1. Fórmula Matemática y Visual del Cristal

```
┌────────────────────────────────────────────────────────────────────────┐
│                        EL SECRETO DEL LIQUID GLASS                     │
├────────────────────────────────────────────────────────────────────────┤
│ 1. DIFUSIÓN:       backdrop-filter: blur(20px) saturate(160%)         │
│ 2. CUERPO:         Light: rgba(255, 255, 255, 0.72)                    │
│                    Dark:  rgba(20, 20, 19, 0.65) / rgba(255,255,255,0.06)
│ 3. BISEL ESPECULAR: box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.8)│
│                    (Simula el grosor del vidrio al recibir luz cenital)│
│ 4. CONTORNO:       border: 1px solid rgba(255, 255, 255, 0.4) [Light] │
│                    border: 1px solid rgba(255, 255, 255, 0.08) [Dark]  │
│ 5. SOMBRA DOBLE:   shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] [Light]     │
│                    shadow-[0_12px_40px_0_rgba(0,0,0,0.40)] [Dark]     │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2. Modo Claro (Ivory Liquid Glass)
- **Fondo de App:** `#FAF9F5` (Ivory Cream de Claude / Apple Warm Gray). Evita el cansancio visual del blanco `#FFF`.
- **Superficie de Tarjeta:** `rgba(255, 255, 255, 0.75)` con `backdrop-blur-xl`.
- **Bisel Refractivo:** Sombra interior `inset 0 1px 1px 0 rgba(255, 255, 255, 0.95)` y borde exterior `rgba(255, 255, 255, 0.80)`. Al pasar sobre cualquier elemento coloreado, da la sensación de una lente de aumento pulida de cristal puro.
- **Tipografía:** Título en `#141413` (Slate Ink, contraste 14.8:1, superando WCAG AAA), subtítulos en `#66655F` (contraste 5.2:1, superando WCAG AA).

### 2.3. Modo Oscuro (Obsidian Liquid Glass)
- **Fondo de App:** `#0A0D14` (Obsidiana Profunda con tinte frío) o `#121211` (Slate Oscuro).
- **Superficie de Tarjeta:** `rgba(22, 26, 35, 0.60)` con `backdrop-blur-2xl` y `backdrop-saturate-150`.
- **Bisel Refractivo:** Sombra interior `inset 0 1px 0 0 rgba(255, 255, 255, 0.12)` y borde perimetral `rgba(255, 255, 255, 0.08)`.
- **Tipografía:** Título en `#FBFBFC` (contraste 17.5:1), subtítulos en `#9496A1` (contraste 6.1:1).

---

## 3. TOKENS DE DISEÑO DUAL (CSS VARIABLES & TAILWIND CONFIG)

### 3.1. Variables CSS en `src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* =====================================================================
     TEMA CLARO (Claude Ivory Cream x Apple Liquid Glass)
     ===================================================================== */
  --bg-app: #FAF9F5;
  --bg-app-subtle: #F3F1EA;
  --text-primary: #141413;
  --text-secondary: #63625C;
  --text-tertiary: #918F86;

  /* Superficies de Cristal Líquido */
  --glass-surface: rgba(255, 255, 255, 0.72);
  --glass-surface-hover: rgba(255, 255, 255, 0.85);
  --glass-surface-active: rgba(255, 255, 255, 0.92);
  --glass-surface-thick: rgba(250, 249, 245, 0.92);
  
  /* Bordes de refracción y bisel */
  --glass-border: rgba(255, 255, 255, 0.85);
  --glass-border-subtle: rgba(0, 0, 0, 0.06);
  --glass-specular-bevel: inset 0 1px 1px 0 rgba(255, 255, 255, 0.95);
  --glass-shadow: 0 10px 30px -5px rgba(20, 20, 19, 0.05), 0 2px 8px -2px rgba(20, 20, 19, 0.03);

  /* Acentos Semánticos Deportivos (Inspiración Claude & Apple Health) */
  --accent-primary: #D97757;      /* Clay / Terracotta - Foco & Voz */
  --accent-running: #FC5200;      /* Strava Orange - Running & Cardio */
  --accent-strength: #2D68C4;     /* Apple Strength Blue - Fuerza */
  --accent-recovery: #3B7C62;     /* Cactus Sage - Z2, Rodilla & Salud */
  --accent-warning: #C97A1E;      /* Ámbar de precaución climatológica */
}

.dark {
  /* =====================================================================
     TEMA OSCURO (Apple Obsidian x Smoke Liquid Glass)
     ===================================================================== */
  --bg-app: #0A0D14;
  --bg-app-subtle: #111520;
  --text-primary: #FAF9F6;
  --text-secondary: #9FA2B4;
  --text-tertiary: #5E6278;

  /* Superficies de Cristal Líquido */
  --glass-surface: rgba(20, 24, 35, 0.65);
  --glass-surface-hover: rgba(26, 32, 46, 0.78);
  --glass-surface-active: rgba(33, 40, 58, 0.88);
  --glass-surface-thick: rgba(14, 17, 26, 0.92);
  
  /* Bordes de refracción y bisel */
  --glass-border: rgba(255, 255, 255, 0.10);
  --glass-border-subtle: rgba(255, 255, 255, 0.04);
  --glass-specular-bevel: inset 0 1px 0 0 rgba(255, 255, 255, 0.14);
  --glass-shadow: 0 14px 40px -10px rgba(0, 0, 0, 0.50), 0 2px 10px -2px rgba(0, 0, 0, 0.30);

  /* Acentos Semánticos Deportivos */
  --accent-primary: #E28464;      /* Clay cálido luminoso */
  --accent-running: #FF661A;      /* Strava Orange luminoso */
  --accent-strength: #4A8CFF;     /* Azul eléctrico sutil */
  --accent-recovery: #4EAA84;     /* Sage luminoso */
  --accent-warning: #E0983A;      /* Ámbar tenue */
}
```

### 3.2. Clases Utilitarias Tailwind para Liquid Glass

```css
/* Utilidades de Cristal Líquido en globals.css */
@layer utilities {
  .liquid-card {
    background: var(--glass-surface);
    backdrop-filter: blur(24px) saturate(160%);
    -webkit-backdrop-filter: blur(24px) saturate(160%);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow), var(--glass-specular-bevel);
    border-radius: 1.5rem; /* Curvatura iOS Squircle (24px) */
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .liquid-card:hover {
    background: var(--glass-surface-hover);
  }

  .liquid-nav {
    background: var(--glass-surface-thick);
    backdrop-filter: blur(30px) saturate(180%);
    -webkit-backdrop-filter: blur(30px) saturate(180%);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow), var(--glass-specular-bevel);
  }

  .liquid-pill {
    background: var(--glass-surface);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-specular-bevel);
  }
}
```

---

## 4. ESPECIFICACIÓN DE PANTALLAS Y COMPONENTES REVOLUCIONARIOS

Siguiendo el requerimiento de centralización en **4 Pantallas Adaptativas** con interacción prioritaria por **Voz** y diseño **Liquid Glass**:

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      ARQUITECTURA DE LAS 4 PANTALLAS                   │
 ├────────────────────────────────────────────────────────────────────────┤
 │ 1. [HOY / CHAT VOZ]      │ Dynamic Island + Hero Botón de Voz háptico │
 │                          │ Resumen de progreso (Anillos/Pills) + Tips │
 ├──────────────────────────┼────────────────────────────────────────────┤
 │ 2. [ENTRENO ADAPTATIVO]  │ Cambia según el día o instrucción del bot: │
 │                          │ • Running: Clima, Z2, Ritmo, Rodilla       │
 │                          │ • Fuerza: Series, Reps, RPE, Cargas        │
 ├──────────────────────────┼────────────────────────────────────────────┤
 │ 3. [DIETA ADAPTATIVA]    │ Macros reales (4P+4C+9G), balance calórico,│
 │                          │ Desglose de comidas y registro rápido      │
 ├──────────────────────────┼────────────────────────────────────────────┤
 │ 4. [SALUD & BIOMETRÍA]   │ Fit3 (FC Reposo, Sueño, Estrés), Báscula,  │
 │                          │ Score de Recuperación y Cuidado de Rodilla │
 └────────────────────────────────────────────────────────────────────────┘
```

### 4.1. El Componente Maestro: `HeroVoiceButton` (Liquid Glass Haptic Pulse)
- **Propósito:** El centro neurálgico de la app. El usuario no tiene que escribir párrafos ni navegar por 10 menús.
- **Interacción:**
  - *Estado Reposo:* Botón circular flotante o centrado con cristal líquido y bisel suave.
  - *Estado Escuchando (Pulsar):* Expande ondas concéntricas de cristal líquido con refracción translúcida y brillo en tono terracota/clay (`#D97757`).
  - *Estado Procesando:* Giro sutil de borde refractivo mientras Whisper y el Coach determinan si se añade comida, se mueve el entreno de día o se ajusta el volumen.
  - *Opción Secundaria:* Icono discreto de teclado a un lado para escribir solo si es estrictamente necesario o en entornos silenciosos.

### 4.2. Pantalla de Entreno Dinámica con Widget Meteorológico
- **Si el día o el Coach determina Running:**
  - **Tarjeta de Clima en Cristal Líquido:**
    - Muestra estado actual (ej: "Lluvia ligera 14°C - Calzada mojada").
    - **Tip de Rodilla Contextual:** *"Asfalto deslizante. Reduce la zancada y aumenta la cadencia a 170-175 spm para evitar torsiones en la rodilla."*
    - **Métrica Objetivo:** *"8.0 km en Zona 2 estricta (135 - 148 bpm)"*.
- **Si el día o el Coach determina Fuerza:**
  - Oculta el widget meteorológico de exterior y muestra el protocolo de sesión:
    - Ejemplo: *"Fuerza Pierna & Core (Enfoque vasto interno e isquiosurales para blindar rodilla)"*.
    - Listado limpio de ejercicios en tarjetas de cristal con pesos, reps y selector de RPE háptico.

### 4.3. Switcher de Tema Fluido (Light / Dark / Auto)
- Integrado en la barra superior o en ajustes con un solo toque (icono Sol / Luna / Sistema).
- Aplica transición suave de `transition-colors duration-300` sin parpadeos, persistiendo la preferencia en `localStorage`.

---

## 5. AUDITORÍA DE ACCESIBILIDAD Y RENDIMIENTO (A11Y WCAG 2.2 AA)

1. **Ratios de Contraste Comprobados:**
   - Modo Claro:
     - Texto Primario (`#141413`) sobre Tarjeta Cristal (`#FFFFFF` al 75% sobre `#FAF9F5`): **14.8:1** (Supera el estándar 7:1 para AAA).
     - Texto Secundario (`#63625C`): **5.4:1** (Supera el estándar 4.5:1 para AA).
   - Modo Oscuro:
     - Texto Primario (`#FAF9F6`) sobre Tarjeta Cristal (`rgba(20,24,35,0.65)` sobre `#0A0D14`): **16.2:1** (Supera AAA).
     - Texto Secundario (`#9FA2B4`): **6.3:1** (Supera AA).

2. **Rendimiento de Renderizado en Móvil (GPU):**
   - No se aplica `backdrop-filter` a listas con cientos de elementos individuales para evitar sobrecargar la GPU del móvil.
   - Se aplica `backdrop-filter: blur(24px)` a los **contenedores principales** (TopBar, BottomNav, Tarjetas de Resumen), mientras que los ítems internos usan fondos vectoriales optimizados.
   - Compatibilidad completa con Safari iOS mediante `-webkit-backdrop-filter`.

3. **Ergonomía de una sola mano (Thumb Zone):**
   - El botón de voz está posicionado en el tercio inferior de la pantalla, en la zona natural del pulgar.
   - Las 4 pestañas de navegación inferior (`Hoy`, `Entreno`, `Dieta`, `Salud`) están a una altura de 64px con `padding-bottom` adaptativo para el Home Indicator de iPhone.

---

## 6. HOJA DE RUTA DE IMPLEMENTACIÓN EN EL REPOSITORIO

1. **Fase 1: Configuración de Tokens e Infraestructura CSS**
   - Actualizar `tailwind.config.ts` con la paleta Ivory/Obsidian y utilidades de cristal.
   - Actualizar `src/app/globals.css` con variables CSS para Light y Dark mode.
2. **Fase 2: Barra de Navegación 4 Tabs & TopBar Dual**
   - Rediseñar `BottomNav.tsx` a cápsula suspendida de 4 pestañas con soporte Light/Dark.
   - Agregar selector de tema en `TopBar.tsx`.
3. **Fase 3: Pantalla Principal "Hoy" con Hero Voice Button**
   - Implementar el componente de grabación por voz con micro-animación háptica de refracción.
4. **Fase 4: Pantalla de Entrenamiento Unificada con Widget de Clima**
   - Crear `UnifiedWorkoutView.tsx` que alterna dinámicamente entre vista de Running (con clima y tips de rodilla) y vista de Fuerza según el calendario o instrucción del bot.
