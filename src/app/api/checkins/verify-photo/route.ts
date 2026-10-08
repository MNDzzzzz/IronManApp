// ====================================================================
// ENDPOINT: /api/checkins/verify-photo
// POST: Verificación de foto de gimnasio / Proof of Workout con Gemini Vision
// Evalúa si la imagen corresponde a una máquina, peso libre o sala deportiva
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, mimeType = 'image/jpeg' } = body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Se requiere la imagen en base64' },
        { status: 400 }
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      // Modo Mock / Desarrollo local cuando no hay API Key configurada
      return NextResponse.json({
        success: true,
        data: {
          is_gym_equipment: true,
          confidence: 0.95,
          detected_equipment: 'Equipamiento de fuerza (Simulado / Dev)',
          reason: 'Verificación simulada en entorno de desarrollo local.',
        },
      });
    }

    const prompt = `
Eres un inspector deportivo de alta precisión para la aplicación IronManApp.
Tu objetivo es analizar la fotografía tomada por un atleta en su sesión de entrenamiento y determinar si contiene de forma evidente equipamiento de gimnasio, máquinas de fuerza (poleas, prensa, femoral, multipower), barras olímpicas, mancuernas, bancos de entrenamiento o salas de fitness legítimas.

Devuelve estrictamente un objeto JSON con esta estructura exacta:
{
  "is_gym_equipment": boolean,
  "confidence": number, // entre 0.0 y 1.0
  "detected_equipment": string, // ej. "Prensa de piernas inclinada", "Mancuernas en rack", "Banco plano con barra"
  "reason": string
}

Si la imagen es una selfie sin máquinas visibles, comida, un meme, una foto de calle o no tiene relación con el gimnasio, establece:
"is_gym_equipment": false
`;

    const visionModels = [
      'gemini-3.5-flash',
      'gemini-3.8-flash',
      'gemini-3.5-flash-lite',
    ];

    let resultJson: any = null;
    let lastError = '';

    for (const model of visionModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(8000), // Timeout defensivo de 8 segundos
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inline_data: {
                        mime_type: mimeType,
                        data: imageBase64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                responseMimeType: 'application/json',
              },
            }),
          }
        );

        if (response.ok) {
          const raw = await response.json();
          const text = raw.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            resultJson = JSON.parse(text);
            break;
          }
        } else {
          lastError = `Modelo ${model} retornó código ${response.status}`;
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    if (!resultJson) {
      return NextResponse.json({
        success: true,
        data: {
          is_gym_equipment: true, // Fallback benevolente ante indisponibilidad de la red
          confidence: 0.8,
          detected_equipment: 'Equipamiento de gimnasio',
          reason: `Verificación por fallback debido a: ${lastError}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: resultJson,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al verificar imagen';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
