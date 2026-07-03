import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  GEMINI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const { plato, ingredientes, profile, userContext } = await request.json<{
      plato: string;
      ingredientes: Array<{ nombre: string; peso_g: number }>;
      profile?: {
        edad: number;
        peso_kg: number;
        altura_cm: number;
        nivel_actividad: string;
        genero: string;
      };
      userContext?: {
        pais?: string;
        tipoComida?: string;
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

    const systemInstruction = `Actúas como un experto en nutrición y ciencias del deporte con amplio conocimiento de la gastronomía latinoamericana, española y caribeña.

Tu objetivo es analizar un plato de comida ingresado manualmente con sus ingredientes y pesos aproximados, y generar un informe detallado con estimaciones nutricionales y equivalencia de actividad física.

═══ CONTEXTO REGIONAL ═══
Los usuarios son principalmente de Latinoamérica y España. Ten en cuenta ingredientes regionales para estimar calorías con precisión:
- Ingredientes comunes: yuca (330 kcal/100g cocida), plátano maduro frito (250 kcal/100g), arepa de maíz (220 kcal/100g), chicharrón (544 kcal/100g), frijoles negros cocidos (132 kcal/100g), arroz blanco cocido (130 kcal/100g), aguacate (160 kcal/100g), queso blanco fresco (260 kcal/100g).
- Si el usuario escribe nombres locales como "tajadas", "patacón", "guandú", "ñame", "malanga", "chayote", "nopales", identifícalos correctamente con sus valores nutricionales reales.

═══ EJEMPLOS DE ANÁLISIS CORRECTO ═══
Ejemplo 1 — Entrada: plato="Bandeja Paisa", ingredientes=[frijoles(150g), arroz(150g), chicharrón(80g), chorizo(60g), huevo frito(50g), aguacate(60g), arepa(80g)]
- Respuesta: calorias_totales aprox. 1150 kcal, proteinas_g ~52, carbohidratos_g ~95, grasas_g ~55

Ejemplo 2 — Entrada: plato="Gallo pinto", ingredientes=[arroz(120g), frijoles negros(100g), cebolla(20g), culantro(5g), aceite(5g)]
- Respuesta: calorias_totales aprox. 380 kcal, proteinas_g ~12, carbohidratos_g ~70, grasas_g ~6

Ejemplo 3 — Entrada: plato="Ceviche de camarón", ingredientes=[camarón cocido(150g), limón(30g), cebolla(40g), tomate(50g), cilantro(10g)]
- Respuesta: calorias_totales aprox. 165 kcal, proteinas_g ~28, carbohidratos_g ~8, grasas_g ~2

═══ INSTRUCCIONES DE ANÁLISIS ═══
1. Identificación: Confirma el plato con su nombre específico y regional si aplica. Indica los ingredientes con su peso en gramos.
2. Estimación Nutricional:
   - Estima calorías basándote científicamente en los ingredientes, pesos y métodos de cocción típicos.
   - Proporciona desglose de macronutrientes (proteínas, carbohidratos y grasas en gramos).
3. Equivalencia de Actividad Física (Modo Runner):
   - Calcula distancia en km para quemar el total de calorías. Por defecto usa 75 kcal/km si no hay perfil. ${profileInstruction ? "Sigue exactamente las siguientes instrucciones de perfil:" + profileInstruction : "Usa exactamente 75 kcal/km como constante para la división."}
4. Modo GymRat:
   - Genera una rutina de ejercicios personalizada según los macronutrientes.
   - Si proteínas > 25g: hipertrofia o fuerza.
   - Si carbohidratos > 50g: gasto de glucógeno o HIIT.
   - Si grasas o calorías altas: acondicionamiento metabólico.
   - Variantes 'con_maquinas' y 'sin_maquinas' con 4-5 ejercicios cada una (nombre, series, repeticiones, consejo).
   - 'explicacion_cientifica' detallada en español.`;

    const contextExtra = [
      userContext?.pais ? `País del usuario: ${userContext.pais}.` : "",
      userContext?.tipoComida ? `Tipo de comida: ${userContext.tipoComida}.` : "",
    ].filter(Boolean).join(" ");

    const enrichedSystemInstruction = systemInstruction + (contextExtra ? `\n\nCONTEXTO ADICIONAL: ${contextExtra}` : "");

    const textPrompt = `Analiza detalladamente este plato de comida ingresado manualmente:
Nombre del plato: "${plato}"
Ingredientes y cantidades:
${ingredientes.map((i) => `- ${i.nombre}: ${i.peso_g}g`).join("\n")}

Genera el informe nutricional estricto en formato JSON estimando las calorías, proteínas, carbohidratos, grasas, la distancia para correr y la rutina GymRat personalizada.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: textPrompt,
      config: {
        temperature: 0.2,
        systemInstruction: enrichedSystemInstruction,
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
