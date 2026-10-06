import test from 'node:test';
import assert from 'node:assert/strict';
import { getLiveRunningWeather } from '../src/lib/weather/weatherService';

test('WEATHER: getLiveRunningWeather devuelve datos válidos y recomendación biomecánica para la rodilla', async () => {
  const weather = await getLiveRunningWeather();

  assert.ok(typeof weather.temperature_c === 'number', 'La temperatura debe ser un número');
  assert.ok(typeof weather.humidity_pct === 'number', 'La humedad debe ser un número');
  assert.ok(typeof weather.wind_kmh === 'number', 'El viento debe ser un número');
  assert.ok(typeof weather.is_raining === 'boolean', 'is_raining debe ser booleano');
  assert.ok(['seco_optimo', 'humedo_precaucion', 'mojado_resbaladizo'].includes(weather.surface_risk), 'surface_risk debe ser un valor válido');
  assert.ok(weather.runner_tip.length > 10, 'Debe incluir un consejo útil de carrera/rodilla');
  assert.ok(weather.weather_description.length > 0, 'Debe incluir descripción del tiempo');
});
