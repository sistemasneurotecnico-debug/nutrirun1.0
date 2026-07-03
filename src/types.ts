export interface HistoryEntry {
  id: string;
  date: string;
  time: string;
  isManual: boolean;
  result: {
    plato_analizado: string;
    ingredientes_detectados: string[];
    informacion_nutricional: {
      calorias_totales: number;
      proteinas_g: number;
      carbohidratos_g: number;
      grasas_g: number;
    };
    ejercicio: {
      actividad: string;
      distancia_estimada_km: number;
      nota_explicativa: string;
    };
    rutina_gymrat?: {
      enfoque: string;
      con_maquinas: { titulo: string; ejercicios: Array<{ nombre: string; series: number; repeticiones: string; consejo: string }> };
      sin_maquinas: { titulo: string; ejercicios: Array<{ nombre: string; series: number; repeticiones: string; consejo: string }> };
      explicacion_cientifica: string;
    };
    error?: string;
  };
}
