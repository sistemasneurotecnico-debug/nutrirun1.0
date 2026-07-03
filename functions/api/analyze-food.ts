import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  GEMINI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const { image, mimeType, profile } = await request.json<{
      image: string;
      mimeType: string;
      profile?: {
        edad: number;
        peso_kg: number;
        altura_cm: number;
        nivel_actividad: string;
        genero: string;
      };
    }>();

    if (!image || !mimeType) {
      return Response.json(
        { error: "Faltan los datos de la imagen o el tipo MIME." },
        { status: 400 }
      );
    }

    if (!env.GEMINI_API_KEY) {
      return Response.json(
        { error: "La clave GEMINI_API_KEY no está configurada en el servidor." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: image,
      },
    };

    let divisor = 75;
    let profileInstruction = "";
    if (profile && profile.peso_kg) {
      const peso = Number(profile.peso_kg);
      divisor = Math.round(peso * 1.03);
      if (divisor < 40) divisor = 40;
      profileInstruction = `
El usuario tiene un perfil físico registrado:
- Edad: ${profile.edad} años
- Peso: ${profile.peso_kg} kg
- Altura: ${profile.altura_cm} cm
- Nivel de Actividad: ${profile.nivel_actividad}

Usa este perfil para ajustar de manera exacta los cálculos. Específicamente, calcula la distancia que necesita correr basándote en que este corredor en particular de ${profile.peso_kg} kg gasta aproximadamente ${divisor} kcal por kilómetro (por lo tanto, divide las calorías totales del plato entre ${divisor} para obtener los 'distancia_estimada_km' que debe correr). En la 'nota_explicativa', incluye detalles personalizados en español haciendo referencia a su edad, peso, altura y nivel de actividad, explicando brevemente cómo influye su perfil en la quema de energía de este plato.`;
    }

    const systemInstruction = `Actúas como un experto en nutrición y ciencias del deporte.
Tu objetivo es analizar la imagen de un plato de comida que el usuario subirá y generar un informe detallado con estimaciones nutricionales y equivalencia de actividad física.

1. Identificación: Identifica el plato y lista los ingredientes principales con un peso estimado aproximado en gramos.
2. Estimación Nutricional:
   - Estima el peso aproximado de cada ingrediente.
   - Calcula el total de calorías aproximado del plato.
   - Proporciona un desglose de macronutrientes (proteínas, carbohidratos y grasas en gramos).
3. Equivalencia de Actividad Física (Modo Runner):
   - Calcula cuánta distancia (en kilómetros) debe correr el usuario para quemar el total de calorías del plato. Por defecto usa una constante de 75 kcal/km si no hay perfil. ${profileInstruction ? "Sigue exactamente las siguientes instrucciones de perfil:" + profileInstruction : "Usa exactamente 75 kcal/km como constante para la división."}
4. Modo GymRat (NUEVO):
   - Genera una rutina de ejercicios personalizada según los macronutrientes de la comida y el perfil.
   - Si la comida es alta en proteínas (ej. > 25g), enfócate en hipertrofia o fuerza (para aprovechar la síntesis proteica).
   - Si la comida es alta en carbohidratos (ej. > 50g), enfócate en gasto de glucógeno o fuerza explosiva (entrenamiento de alto volumen o HIIT).
   - Si la comida es alta en grasas o calorías, enfócate en acondicionamiento metabólico o quema de grasa general (ej. circuitos full-body de alta intensidad).
   - Incluye dos variantes completas: 'con_maquinas' y 'sin_maquinas'.
   - Cada variante debe tener un título y una lista de 4 o 5 ejercicios reales con nombre, series, repeticiones y consejo.
   - Proporciona una 'explicacion_cientifica' detallada en español.

IMPORTANTE: Si la imagen no contiene comida o no es posible identificarla, rellena el campo 'error' explicando detalladamente por qué no se puede procesar y coloca 'No identificado' en 'plato_analizado'.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        imagePart,
        { text: "Analiza esta imagen y genera el informe nutricional estricto en formato JSON." },
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plato_analizado: { type: Type.STRING },
            ingredientes_detectados: { type: Type.ARRAY, items: { type: Type.STRING } },
            informacion_nutricional: {
              type: Type.OBJECT,
              properties: {
                calorias_totales: { type: Type.INTEGER },
                proteinas_g: { type: Type.INTEGER },
                carbohidratos_g: { type: Type.INTEGER },
                grasas_g: { type: Type.INTEGER },
              },
              required: ["calorias_totales", "proteinas_g", "carbohidratos_g", "grasas_g"],
            },
            ejercicio: {
              type: Type.OBJECT,
              properties: {
                actividad: { type: Type.STRING },
                distancia_estimada_km: { type: Type.NUMBER },
                nota_explicativa: { type: Type.STRING },
              },
              required: ["actividad", "distancia_estimada_km", "nota_explicativa"],
            },
            rutina_gymrat: {
              type: Type.OBJECT,
              properties: {
                enfoque: { type: Type.STRING },
                con_maquinas: {
                  type: Type.OBJECT,
                  properties: {
                    titulo: { type: Type.STRING },
                    ejercicios: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          nombre: { type: Type.STRING },
                          series: { type: Type.INTEGER },
                          repeticiones: { type: Type.STRING },
                          consejo: { type: Type.STRING },
                        },
                        required: ["nombre", "series", "repeticiones", "consejo"],
                      },
                    },
                  },
                  required: ["titulo", "ejercicios"],
                },
                sin_maquinas: {
                  type: Type.OBJECT,
                  properties: {
                    titulo: { type: Type.STRING },
                    ejercicios: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          nombre: { type: Type.STRING },
                          series: { type: Type.INTEGER },
                          repeticiones: { type: Type.STRING },
                          consejo: { type: Type.STRING },
                        },
                        required: ["nombre", "series", "repeticiones", "consejo"],
                      },
                    },
                  },
                  required: ["titulo", "ejercicios"],
                },
                explicacion_cientifica: { type: Type.STRING },
              },
              required: ["enfoque", "con_maquinas", "sin_maquinas", "explicacion_cientifica"],
            },
            error: { type: Type.STRING },
          },
          required: ["plato_analizado", "ingredientes_detectados", "informacion_nutricional", "ejercicio", "rutina_gymrat"],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No se recibió respuesta del modelo Gemini.");
    }

    const result = JSON.parse(responseText.trim());
    return Response.json(result);
  } catch (error: unknown) {
    console.error("Error al analizar la comida:", error);
    return Response.json(
      { error: "Ocurrió un error al procesar el plato. Por favor, asegúrate de que sea una imagen válida e inténtalo de nuevo." },
      { status: 500 }
    );
  }
};
