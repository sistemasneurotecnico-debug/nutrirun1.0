import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  GEMINI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const { plato, ingredientes, profile } = await request.json<{
      plato: string;
      ingredientes: Array<{ nombre: string; peso_g: number }>;
      profile?: {
        edad: number;
        peso_kg: number;
        altura_cm: number;
        nivel_actividad: string;
        genero: string;
      };
    }>();

    if (!plato || !ingredientes || !Array.isArray(ingredientes) || ingredientes.length === 0) {
      return Response.json(
        { error: "Faltan el nombre del plato o la lista de ingredientes." },
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

Usa este perfil para ajustar de manera exacta los cálculos. Específicamente, calcula la distancia que necesita correr basándote en que este corredor en particular de ${profile.peso_kg} kg gasta aproximadamente ${divisor} kcal por kilómetro (por lo tanto, divide las calorías totales calculadas para este plato entre ${divisor} para obtener los 'distancia_estimada_km' que debe correr). En la 'nota_explicativa', incluye detalles personalizados en español haciendo referencia a su edad, peso, altura y nivel de actividad, explicando brevemente cómo influye en la quema de energía de este plato y de estos ingredientes.`;
    }

    const systemInstruction = `Actúas como un experto en nutrición y ciencias del deporte.
Tu objetivo es analizar un plato de comida ingresado manualmente con sus ingredientes y pesos aproximados y generar un informe detallado con estimaciones nutricionales y equivalencia de actividad física.

1. Identificación: Confirma el plato de comida e indica los ingredientes con su peso proporcionado en gramos.
2. Estimación Nutricional:
   - Estima las calorías basándote científicamente en los ingredientes y pesos provistos.
   - Proporciona el desglose de macronutrientes (proteínas, carbohidratos y grasas en gramos).
3. Equivalencia de Actividad Física (Modo Runner):
   - Calcula cuánta distancia (en kilómetros) debe correr el usuario para quemar el total de calorías. Por defecto usa una constante de 75 kcal/km si no hay perfil. ${profileInstruction ? "Sigue exactamente las siguientes instrucciones de perfil:" + profileInstruction : "Usa exactamente 75 kcal/km como constante para la división."}
4. Modo GymRat:
   - Genera una rutina de ejercicios personalizada según los macronutrientes de la comida y el perfil.
   - Si la comida es alta en proteínas (ej. > 25g), enfócate en hipertrofia o fuerza.
   - Si la comida es alta en carbohidratos (ej. > 50g), enfócate en gasto de glucógeno o fuerza explosiva.
   - Si la comida es alta en grasas o calorías, enfócate en acondicionamiento metabólico o quema de grasa general.
   - Incluye dos variantes completas: 'con_maquinas' y 'sin_maquinas'.
   - Cada variante debe tener un título y una lista de 4 o 5 ejercicios con nombre, series, repeticiones y consejo.
   - Proporciona una 'explicacion_cientifica' detallada en español.`;

    const textPrompt = `Analiza detalladamente este plato de comida ingresado manualmente:
Nombre del plato: "${plato}"
Ingredientes y cantidades:
${ingredientes.map((i) => `- ${i.nombre}: ${i.peso_g}g`).join("\n")}

Genera el informe nutricional estricto en formato JSON estimando las calorías, proteínas, carbohidratos, grasas, la distancia para correr y la rutina GymRat personalizada.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: textPrompt,
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
    console.error("Error al analizar la comida manual:", error);
    return Response.json(
      { error: "Ocurrió un error al procesar la comida ingresada manualmente. Por favor, inténtalo de nuevo." },
      { status: 500 }
    );
  }
};
