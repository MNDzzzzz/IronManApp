/**
 * Servicio Meteorológico en tiempo real (Open-Meteo Engine)
 * Provee condiciones atmosféricas y consejos biomecánicos adaptados a la rodilla de Álvaro
 */

export interface WeatherCondition {
  temperature_c: number;
  humidity_pct: number;
  weather_code: number;
  is_raining: boolean;
  wind_kmh: number;
  surface_risk: 'seco_optimo' | 'humedo_precaucion' | 'mojado_resbaladizo';
  runner_tip: string;
  weather_description: string;
}

// Códigos WMO de precipitación de Open-Meteo
const RAIN_WEATHER_CODES = [51, 53, 55, 61, 63, 65, 80, 81, 82];

/**
 * Consulta las condiciones del tiempo actuales y genera recomendaciones de carrera
 * Coordenadas por defecto: Madrid (40.4168, -3.7038)
 */
export async function getLiveRunningWeather(lat = 40.4168, lon = -3.7038): Promise<WeatherCondition> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`;
    const res = await fetch(url, { next: { revalidate: 1800 } }); // Revalida cada 30 minutos

    if (!res.ok) {
      throw new Error(`Error en API Open-Meteo: status ${res.status}`);
    }

    const data = await res.json();
    const current = data.current || {};

    const temp = Math.round(current.temperature_2m ?? 18);
    const humidity = current.relative_humidity_2m ?? 50;
    const weatherCode = current.weather_code ?? 0;
    const wind = Math.round(current.wind_speed_10m ?? 8);

    const isRaining = RAIN_WEATHER_CODES.includes(weatherCode);
    const surfaceRisk: 'seco_optimo' | 'humedo_precaucion' | 'mojado_resbaladizo' = isRaining
      ? 'mojado_resbaladizo'
      : humidity > 85
      ? 'humedo_precaucion'
      : 'seco_optimo';

    let tip = 'Condiciones óptimas. Mantén cadencia constante de 168-172 ppm para impacto articular controlado.';
    let desc = 'Despejado / Óptimo';

    if (isRaining) {
      desc = 'Lluvia / Calzada húmeda';
      tip = '🌧️ Asfalto resbaladizo. Acorta la zancada y extrema precaución en apoyos para evitar torsión de rodilla.';
    } else if (temp > 25) {
      desc = `Caluroso (${temp}°C)`;
      tip = '☀️ Calor elevado. Añade +500 ml de agua con sales y no superes 142 bpm en Zona 2.';
    } else if (temp < 6) {
      desc = `Frío intenso (${temp}°C)`;
      tip = '❄️ Frío. Realiza 8 min de calentamiento articular de rodilla y tobillo antes de comenzar el trote.';
    } else if (wind > 25) {
      desc = `Viento racheado (${wind} km/h)`;
      tip = '💨 Viento considerable. Ajusta el esfuerzo por pulsómetro (Z2) en lugar de obsesionarte con el ritmo min/km.';
    }

    return {
      temperature_c: temp,
      humidity_pct: humidity,
      weather_code: weatherCode,
      is_raining: isRaining,
      wind_kmh: wind,
      surface_risk: surfaceRisk,
      runner_tip: tip,
      weather_description: desc,
    };
  } catch (error) {
    console.warn('Fallback meteorológico activado por fallo de red:', error);
    return {
      temperature_c: 18,
      humidity_pct: 55,
      weather_code: 0,
      is_raining: false,
      wind_kmh: 10,
      surface_risk: 'seco_optimo',
      runner_tip: 'Condiciones estándar de carrera. Mantén el foco en Zona 2 estricta y cadencia alta.',
      weather_description: 'Templado / Despejado',
    };
  }
}
