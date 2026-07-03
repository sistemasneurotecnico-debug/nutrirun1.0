import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  GEMINI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const { image, mimeType, profile, userContext, confirmedDish } = await request.json<{
      image: string;
      mimeType: string;
      profile?: {
        edad: number;
        peso_kg: number;
        altura_cm: number;
        nivel_actividad: string;
        genero: string;
      };
      userContext?: {
        pais?: string;
        tipoComida?: string; // "casera" | "restaurante" | "rapida"
      };
      confirmedDish?: string; // Nombre confirmado por el usuario en paso 2
    }>();

    if (!image || !mimeType) {
      return Response.json({ error: "Faltan los datos de la imagen o el tipo MIME." }, { status: 400 });
    }

    if (!env.GEMINI_API_KEY) {
      return Response.json({ error: "La clave GEMINI_API_KEY no está configurada en el servidor." }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

    const imagePart = { inlineData: { mimeType, data: image } };

    // ── PASO 1: Solo identificar el plato (rápido, sin análisis completo) ──
    // Si no viene confirmedDish, primero identificamos
    if (!confirmedDish) {
      const identifyResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          imagePart,
          {
            text: `Identifica el plato de comida en esta imagen. 
${userContext?.pais ? `El usuario es de: ${userContext.pais}.` : ""}
${userContext?.tipoComida ? `Tipo de comida: ${userContext.tipoComida}.` : ""}
Responde SOLO con el nombre específico del plato (incluyendo nombre regional si aplica). 
Si no hay comida, responde exactamente: "NO_FOOD".
Si la imagen es muy oscura o borrosa para identificar, responde: "LOW_QUALITY".`
          }
        ],
        config: {
          temperature: 0.1,
          maxOutputTokens: 80,
        }
      });

      const identified = (identifyResponse.text || "").trim();

      if (identified === "NO_FOOD") {
        return Response.json({
          step: "identified",
          noFood: true,
          plato_analizado: "No identificado",
          error: "La imagen no parece contener un plato de comida. Por favor sube una foto clara de tu comida.",
        });
      }

      if (identified === "LOW_QUALITY") {
        return Response.json({
          step: "identified",
          lowQuality: true,
          plato_analizado: "Imagen poco clara",
          error: "La imagen está muy oscura o borrosa. Por favor toma la foto desde arriba con buena iluminación.",
        });
      }

      // Devolver identificación para que el usuario confirme
      return Response.json({
        step: "identified",
        plato_identificado: identified,
      });
    }

    // ── PASO 2: Análisis completo con el nombre confirmado ──
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

Calcula la distancia que necesita correr basándote en que este corredor de ${profile.peso_kg} kg gasta aproximadamente ${divisor} kcal por kilómetro (divide calorías totales entre ${divisor} para obtener 'distancia_estimada_km'). En 'nota_explicativa', incluye detalles personalizados referenciando su perfil.`;
    }

    const contextExtra = [
      userContext?.pais ? `País del usuario: ${userContext.pais}.` : "",
      userContext?.tipoComida ? `Tipo de comida: ${userContext.tipoComida}.` : "",
    ].filter(Boolean).join(" ");

    const systemInstruction = `Actúas como un experto en nutrición y ciencias del deporte con amplio conocimiento de la gastronomía latinoamericana, española y caribeña.

El usuario ya confirmó que el plato es: "${confirmedDish}". Usa este nombre exacto en 'plato_analizado'.
${contextExtra}

═══ VALORES CALÓRICOS DE REFERENCIA REGIONAL ═══
Ingredientes comunes: arroz blanco cocido (130 kcal/100g), frijoles negros cocidos (132 kcal/100g), pechuga de pollo a la plancha (165 kcal/100g), carne molida res (250 kcal/100g), plátano maduro frito (250 kcal/100g), yuca cocida (330 kcal/100g), arepa de maíz (220 kcal/100g), chicharrón (544 kcal/100g), aguacate (160 kcal/100g), queso blanco fresco (260 kcal/100g), huevo frito (196 kcal/100g), aceite (884 kcal/100g), papa cocida (87 kcal/100g).

═══ INSTRUCCIONES ═══
1. Usa el nombre confirmado. Lista ingredientes con peso visual estimado en gramos.
2. Calcula calorías y macros usando los valores de referencia cuando apliquen.
3. Equivalencia runner: ${profileInstruction ? "Usa perfil del usuario:" + profileInstruction : "Usa 75 kcal/km como constante."}
4. Rutina GymRat personalizada según macros:
   - Proteínas > 25g → hipertrofia/fuerza
   - Carbohidratos > 50g → depleción glucógeno/HIIT
   - Calorías altas/grasas → acondicionamiento metabólico
   - Variantes con_maquinas y sin_maquinas (4-5 ejercicios cada una con nombre, series, repeticiones, consejo)
   - explicacion_cientifica detallada en español`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        imagePart,
        { text: `Genera el informe nutricional completo en JSON para: "${confirmedDish}".` },
      ],
      config: {
        temperature: 0.2,
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
    if (!responseText) throw new Error("No se recibió respuesta del modelo Gemini.");

    const result = JSON.parse(responseText.trim());
    return Response.json({ step: "complete", ...result });

  } catch (error: unknown) {
    console.error("Error al analizar la comida:", error);
    return Response.json(
      { error: "Ocurrió un error al procesar el plato. Por favor, asegúrate de que sea una imagen válida e inténtalo de nuevo." },
      { status: 500 }
    );
  }
};
