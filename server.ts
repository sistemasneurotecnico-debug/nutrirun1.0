import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Permite analizar imágenes base64 de tamaño razonable
  app.use(express.json({ limit: "15mb" }));

  // Inicializar GoogleGenAI
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Endpoint de la API para analizar comida
  app.post("/api/analyze-food", async (req: express.Request, res: express.Response) => {
    try {
      const { image, mimeType, profile } = req.body;
      if (!image || !mimeType) {
        return res.status(400).json({ error: "Faltan los datos de la imagen o el tipo MIME." });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "La clave GEMINI_API_KEY no está configurada en el servidor." });
      }

      // Dar formato a la parte de la imagen para el SDK de GoogleGenAI
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
        if (divisor < 40) divisor = 40; // Seguridad
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
   - Incluye dos variantes completas: 'con_maquinas' (ejercicios en gimnasio convencional usando máquinas/poleas/peso libre) y 'sin_maquinas' (ejercicios en casa o calistenia usando peso corporal).
   - Cada variante debe tener un título y una lista de 4 o 5 ejercicios reales con nombre, series (número de 3 a 5), repeticiones (ej. '10-12', '12', 'al fallo', '45 segundos') y un consejo útil de ejecución para maximizar resultados.
   - Proporciona una 'explicacion_cientifica' detallada en español explicando por qué esta rutina de ejercicios combate o aprovecha específicamente los macronutrientes y calorías de esta comida en base a la fisiología deportiva y el perfil.

IMPORTANTE: Si la imagen no contiene comida o no es posible identificarla en absoluto, debes rellenar el campo 'error' explicando detalladamente por qué no se puede procesar (en español de forma educada y profesional) y colocar 'No identificado' en el campo 'plato_analizado', y ceros/vacíos en el resto.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          imagePart,
          { text: "Analiza esta imagen y genera el informe nutricional estricto en formato JSON." }
        ],
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              plato_analizado: {
                type: Type.STRING,
                description: "Nombre o descripción del plato de comida identificado."
              },
              ingredientes_detectados: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Lista de los ingredientes principales detectados con su peso estimado (ej. 'Arroz blanco (120g)', 'Filete de salmón (150g)')."
              },
              informacion_nutricional: {
                type: Type.OBJECT,
                properties: {
                  calorias_totales: {
                    type: Type.INTEGER,
                    description: "Total de calorías estimadas del plato de comida."
                  },
                  proteinas_g: {
                    type: Type.INTEGER,
                    description: "Gramos estimados de proteínas."
                  },
                  carbohidratos_g: {
                    type: Type.INTEGER,
                    description: "Gramos estimados de carbohidratos."
                  },
                  grasas_g: {
                    type: Type.INTEGER,
                    description: "Gramos estimados de grasas."
                  }
                },
                required: ["calorias_totales", "proteinas_g", "carbohidratos_g", "grasas_g"]
              },
              ejercicio: {
                type: Type.OBJECT,
                properties: {
                  actividad: {
                    type: Type.STRING,
                    description: "Debe ser 'correr'."
                  },
                  distancia_estimada_km: {
                    type: Type.NUMBER,
                    description: "Distancia calculada en kilómetros dividiendo el total de calorías entre 75."
                  },
                  nota_explicativa: {
                    type: Type.STRING,
                    description: "Explicación breve del cálculo (ej. 'Calculado basado en un gasto promedio de 75 kcal por km para una persona de peso promedio corriendo a ritmo moderado.')."
                  }
                },
                required: ["actividad", "distancia_estimada_km", "nota_explicativa"]
              },
              rutina_gymrat: {
                type: Type.OBJECT,
                properties: {
                  enfoque: {
                    type: Type.STRING,
                    description: "Enfoque deportivo principal de la rutina en relación con los macros de la comida (ej. 'Hipertrofia - Síntesis Proteica', 'Depleción de Glucógeno', 'Circuito Metabólico Quema-Grasa')."
                  },
                  con_maquinas: {
                    type: Type.OBJECT,
                    properties: {
                      titulo: {
                        type: Type.STRING,
                        description: "Título descriptivo para la rutina con máquinas (ej. 'Rutina de Empuje e Hipertrofia en Gimnasio')."
                      },
                      ejercicios: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            nombre: { type: Type.STRING },
                            series: { type: Type.INTEGER },
                            repeticiones: { type: Type.STRING },
                            consejo: { type: Type.STRING }
                          },
                          required: ["nombre", "series", "repeticiones", "consejo"]
                        }
                      }
                    },
                    required: ["titulo", "ejercicios"]
                  },
                  sin_maquinas: {
                    type: Type.OBJECT,
                    properties: {
                      titulo: {
                        type: Type.STRING,
                        description: "Título descriptivo para la rutina sin máquinas (ej. 'Rutina Calistenia de Alta Densidad en Casa')."
                      },
                      ejercicios: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            nombre: { type: Type.STRING },
                            series: { type: Type.INTEGER },
                            repeticiones: { type: Type.STRING },
                            consejo: { type: Type.STRING }
                          },
                          required: ["nombre", "series", "repeticiones", "consejo"]
                        }
                      }
                    },
                    required: ["titulo", "ejercicios"]
                  },
                  explicacion_cientifica: {
                    type: Type.STRING,
                    description: "Justificación fisiológica deportiva detallada de la rutina según los macronutrientes del plato y el perfil."
                  }
                },
                required: ["enfoque", "con_maquinas", "sin_maquinas", "explicacion_cientifica"]
              },
              error: {
                type: Type.STRING,
                description: "Mensaje explicativo si la imagen no muestra comida. Si muestra comida, dejar vacío."
              }
            },
            required: ["plato_analizado", "ingredientes_detectados", "informacion_nutricional", "ejercicio", "rutina_gymrat"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No se recibió respuesta del modelo Gemini.");
      }

      const result = JSON.parse(responseText.trim());
      return res.json(result);

    } catch (error: any) {
      console.error("Error al analizar la comida:", error);
      return res.status(500).json({
        error: "Ocurrió un error al procesar el plato. Por favor, asegúrate de que sea una imagen válida e inténtalo de nuevo."
      });
    }
  });

  // Endpoint de la API para analizar comida ingresada manualmente
  app.post("/api/analyze-manual-food", async (req: express.Request, res: express.Response) => {
    try {
      const { plato, ingredientes, profile } = req.body;
      if (!plato || !ingredientes || !Array.isArray(ingredientes) || ingredientes.length === 0) {
        return res.status(400).json({ error: "Faltan el nombre del plato o la lista de ingredientes." });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "La clave GEMINI_API_KEY no está configurada en el servidor." });
      }

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
4. Modo GymRat (NUEVO):
   - Genera una rutina de ejercicios personalizada según los macronutrientes de la comida y el perfil.
   - Si la comida es alta en proteínas (ej. > 25g), enfócate en hipertrofia o fuerza (para aprovechar la síntesis proteica).
   - Si la comida es alta en carbohidratos (ej. > 50g), enfócate en gasto de glucógeno o fuerza explosiva (entrenamiento de alto volumen o HIIT).
   - Si la comida es alta en grasas o calorías, enfócate en acondicionamiento metabólico o quema de grasa general (ej. circuitos full-body de alta intensidad).
   - Incluye dos variantes completas: 'con_maquinas' (ejercicios en gimnasio convencional usando máquinas/poleas/peso libre) y 'sin_maquinas' (ejercicios en casa o calistenia usando peso corporal).
   - Cada variante debe tener un título y una lista de 4 o 5 ejercicios reales con nombre, series (número de 3 a 5), repeticiones (ej. '10-12', '12', 'al fallo', '45 segundos') y un consejo útil de ejecución para maximizar resultados.
   - Proporciona una 'explicacion_cientifica' detallada en español explicando por qué esta rutina de ejercicios combate o aprovecha específicamente los macronutrientes y calorías de esta comida en base a la fisiología deportiva y el perfil.`;

      const textPrompt = `Analiza detalladamente este plato de comida ingresado manualmente:
Nombre del plato: "${plato}"
Ingredientes y cantidades:
${ingredientes.map((i: any) => `- ${i.nombre}: ${i.peso_g}g`).join("\n")}

Genera el informe nutricional estricto en formato JSON estimando las calorías, proteínas, carbohidratos, grasas, la distancia para correr y la rutina GymRat personalizada.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: textPrompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              plato_analizado: {
                type: Type.STRING,
                description: "Nombre o descripción del plato de comida ingresado."
              },
              ingredientes_detectados: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Lista de los ingredientes provistos con su peso (ej. 'Arroz blanco (150g)', 'Huevo (50g)')."
              },
              informacion_nutricional: {
                type: Type.OBJECT,
                properties: {
                  calorias_totales: {
                    type: Type.INTEGER,
                    description: "Total de calorías estimadas del plato de comida."
                  },
                  proteinas_g: {
                    type: Type.INTEGER,
                    description: "Gramos estimados de proteínas."
                  },
                  carbohidratos_g: {
                    type: Type.INTEGER,
                    description: "Gramos estimados de carbohidratos."
                  },
                  grasas_g: {
                    type: Type.INTEGER,
                    description: "Gramos estimados de grasas."
                  }
                },
                required: ["calorias_totales", "proteinas_g", "carbohidratos_g", "grasas_g"]
              },
              ejercicio: {
                type: Type.OBJECT,
                properties: {
                  actividad: {
                    type: Type.STRING,
                    description: "Debe ser 'correr'."
                  },
                  distancia_estimada_km: {
                    type: Type.NUMBER,
                    description: "Distancia calculada en kilómetros dividiendo el total de calorías entre el factor de quema."
                  },
                  nota_explicativa: {
                    type: Type.STRING,
                    description: "Explicación breve del cálculo haciendo referencia al perfil del usuario si se proporcionó."
                  }
                },
                required: ["actividad", "distancia_estimada_km", "nota_explicativa"]
              },
              rutina_gymrat: {
                type: Type.OBJECT,
                properties: {
                  enfoque: {
                    type: Type.STRING,
                    description: "Enfoque deportivo principal de la rutina en relación con los macros de la comida (ej. 'Hipertrofia - Síntesis Proteica', 'Depleción de Glucógeno', 'Circuito Metabólico Quema-Grasa')."
                  },
                  con_maquinas: {
                    type: Type.OBJECT,
                    properties: {
                      titulo: {
                        type: Type.STRING,
                        description: "Título descriptivo para la rutina con máquinas (ej. 'Rutina de Empuje e Hipertrofia en Gimnasio')."
                      },
                      ejercicios: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            nombre: { type: Type.STRING },
                            series: { type: Type.INTEGER },
                            repeticiones: { type: Type.STRING },
                            consejo: { type: Type.STRING }
                          },
                          required: ["nombre", "series", "repeticiones", "consejo"]
                        }
                      }
                    },
                    required: ["titulo", "ejercicios"]
                  },
                  sin_maquinas: {
                    type: Type.OBJECT,
                    properties: {
                      titulo: {
                        type: Type.STRING,
                        description: "Título descriptivo para la rutina sin máquinas (ej. 'Rutina Calistenia de Alta Densidad en Casa')."
                      },
                      ejercicios: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            nombre: { type: Type.STRING },
                            series: { type: Type.INTEGER },
                            repeticiones: { type: Type.STRING },
                            consejo: { type: Type.STRING }
                          },
                          required: ["nombre", "series", "repeticiones", "consejo"]
                        }
                      }
                    },
                    required: ["titulo", "ejercicios"]
                  },
                  explicacion_cientifica: {
                    type: Type.STRING,
                    description: "Justificación fisiológica deportiva detallada de la rutina según los macronutrientes del plato y el perfil."
                  }
                },
                required: ["enfoque", "con_maquinas", "sin_maquinas", "explicacion_cientifica"]
              },
              error: {
                type: Type.STRING,
                description: "Mensaje explicativo si ocurre algún error con el análisis. Si todo es correcto, dejar vacío."
              }
            },
            required: ["plato_analizado", "ingredientes_detectados", "informacion_nutricional", "ejercicio", "rutina_gymrat"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No se recibió respuesta del modelo Gemini.");
      }

      const result = JSON.parse(responseText.trim());
      return res.json(result);

    } catch (error: any) {
      console.error("Error al analizar la comida manual:", error);
      return res.status(500).json({
        error: "Ocurrió un error al procesar la comida ingresada manualmente. Por favor, inténtalo de nuevo."
      });
    }
  });

  // Servidor de desarrollo con middleware de Vite
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
