import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import AuthScreen, { getSession, saveSession, clearSession, type AuthUser } from "./AuthScreen";
import GoalsTab from "./GoalsTab";
import { 
  Camera, 
  Upload, 
  Flame, 
  Sparkles, 
  Dumbbell, 
  Activity, 
  ClipboardCheck, 
  Clipboard, 
  RefreshCw, 
  AlertTriangle, 
  Check, 
  Info,
  Scale,
  TrendingUp,
  Apple,
  // New icons:
  User,
  History,
  Plus,
  Trash2,
  Calendar,
  Clock,
  ChevronRight,
  Save,
  Utensils,
  Calculator,
  UserCheck,
  ChevronLeft,
  X,
  LogOut,
  Target
} from "lucide-react";

interface FoodAnalysisResult {
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
    con_maquinas: {
      titulo: string;
      ejercicios: Array<{
        nombre: string;
        series: number;
        repeticiones: string;
        consejo: string;
      }>;
    };
    sin_maquinas: {
      titulo: string;
      ejercicios: Array<{
        nombre: string;
        series: number;
        repeticiones: string;
        consejo: string;
      }>;
    };
    explicacion_cientifica: string;
  };
  error?: string;
}

interface UserProfile {
  edad: number;
  peso_kg: number;
  altura_cm: number;
  nivel_actividad: "sedentario" | "ligero" | "moderado" | "activo" | "muy activo";
  genero: "masculino" | "femenino";
}

interface HistoryEntry {
  id: string;
  date: string;
  time: string;
  isManual: boolean;
  result: FoodAnalysisResult;
}

interface SampleItem {
  id: string;
  name: string;
  imgUrl: string;
  data: FoodAnalysisResult;
}

// Muestras pre-calculadas con imágenes conceptuales para pruebas rápidas
const SAMPLES: SampleItem[] = [
  {
    id: "salmon",
    name: "Salmón con Espárragos y Quinua",
    imgUrl: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=400",
    data: {
      plato_analizado: "Salmón al horno con espárragos y quinua",
      ingredientes_detectados: [
        "Filete de salmón fresco (150g)",
        "Quinua cocida (120g)",
        "Espárragos verdes salteados (100g)",
        "Aceite de oliva virgen extra (10g)"
      ],
      informacion_nutricional: {
        calorias_totales: 520,
        proteinas_g: 34,
        carbohidratos_g: 32,
        grasas_g: 28
      },
      ejercicio: {
        actividad: "correr",
        distancia_estimada_km: 6.9,
        nota_explicativa: "Calculado basado en un gasto promedio de 75 kcal por kilómetro para una persona de 70kg corriendo a un ritmo moderado de 6 min/km."
      },
      rutina_gymrat: {
        enfoque: "Hipertrofia - Aprovechamiento de Proteínas de Alto Valor Biológico",
        con_maquinas: {
          titulo: "Rutina Básica de Tirón (Pull) en Gimnasio",
          ejercicios: [
            { nombre: "Jalón al pecho con agarre prono ancho", series: 4, repeticiones: "10-12", consejo: "Asegúrate de llevar la barra al pecho superior retrayendo las escápulas al final del recorrido." },
            { nombre: "Remo sentado en polea baja con manillar en D", series: 3, repeticiones: "12", consejo: "Mantén el torso erguido y estira por completo los dorsales en la fase excéntrica." },
            { nombre: "Remo unilateral apoyado en banco con mancuerna", series: 3, repeticiones: "10 por lado", consejo: "Sube el codo pegado al cuerpo controlando el descenso sin balancear el torso." },
            { nombre: "Curl de bíceps con barra Z de pie", series: 3, repeticiones: "12-15", consejo: "No uses balanceo de hombros, aprieta los bíceps arriba durante 1 segundo." }
          ]
        },
        sin_maquinas: {
          titulo: "Rutina Calistenia de Tracción (Espalda y Bíceps) en Casa",
          ejercicios: [
            { nombre: "Dominadas supinas en barra", series: 4, repeticiones: "al fallo", consejo: "El agarre supino recluta enormemente tus bíceps para aprovechar los aminoácidos del salmón." },
            { nombre: "Remo australiano en mesa o barra baja", series: 4, repeticiones: "12-15", consejo: "Mantén el cuerpo completamente rígido (tabla) y contrae el abdomen durante cada repetición." },
            { nombre: "Flexiones 'Delfín' enfocadas en espalda alta", series: 3, repeticiones: "12", consejo: "Empuja elevando las caderas y siente la tensión en la espalda superior al descender." },
            { nombre: "Curl de bíceps de arrastre con mochila (con peso)", series: 3, repeticiones: "15", consejo: "Llena una mochila de libros y realiza el curl deslizando los codos hacia atrás pegados al cuerpo." }
          ]
        },
        explicacion_cientifica: "El salmón proporciona proteínas limpias esenciales y grasas Omega-3 que promueven la recuperación y síntesis proteica. Esta rutina de tracción muscular es ideal para activar las vías de señalización de hipertrofia (mTOR), utilizando de inmediato los nutrientes de este plato para construir masa muscular magra."
      }
    }
  },
  {
    id: "salad",
    name: "Ensalada de Pollo y Aguacate",
    imgUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=400",
    data: {
      plato_analizado: "Ensalada de pechuga de pollo con aguacate",
      ingredientes_detectados: [
        "Pechuga de pollo a la plancha (150g)",
        "Aguacate maduro (80g)",
        "Hojas de espinaca y lechuga fresca (100g)",
        "Tomates cherry (100g)",
        "Aderezo de limón y mostaza (15g)"
      ],
      informacion_nutricional: {
        calorias_totales: 380,
        proteinas_g: 38,
        carbohidratos_g: 12,
        grasas_g: 20
      },
      ejercicio: {
        actividad: "correr",
        distancia_estimada_km: 5.1,
        nota_explicativa: "Calculado basado en un gasto promedio de 75 kcal por kilómetro para una persona de 70kg."
      },
      rutina_gymrat: {
        enfoque: "Recomposición Corporal - Tonificación de Tren Inferior",
        con_maquinas: {
          titulo: "Fuerza y Esculpidor de Piernas en Gimnasio",
          ejercicios: [
            { nombre: "Prensa de piernas inclinada 45°", series: 4, repeticiones: "10-12", consejo: "Baja de manera controlada abriendo las rodillas levemente hacia el exterior." },
            { nombre: "Extensión de cuádriceps en máquina", series: 3, repeticiones: "15", consejo: "Sostén la contracción 1 segundo arriba para maximizar el reclutamiento del vasto medial." },
            { nombre: "Curl femoral acostado en máquina", series: 3, repeticiones: "12", consejo: "Mantén la cadera pegada al banco para evitar trampas con la zona lumbar." },
            { nombre: "Elevación de talones sentado (gemelos)", series: 3, repeticiones: "20", consejo: "Realiza el rango de movimiento completo con pausas tanto arriba como abajo." }
          ]
        },
        sin_maquinas: {
          titulo: "Rutina Calistenia Metabólica de Piernas en Casa",
          ejercicios: [
            { nombre: "Sentadillas búlgaras en silla", series: 4, repeticiones: "12 por pierna", consejo: "Coloca el pie de atrás en una silla y desciende verticalmente concentrando el esfuerzo en el talón de la pierna delantera." },
            { nombre: "Zancadas inversas alternas", series: 3, repeticiones: "20 totales", consejo: "Da un paso amplio hacia atrás para enfocar la tensión en glúteos e isquiotibiales." },
            { nombre: "Sentadilla isométrica contra la pared", series: 3, repeticiones: "45 segundos", consejo: "Mantén tus rodillas en un ángulo exacto de 90 grados y respira hondo de forma continua." },
            { nombre: "Puentes de glúteo a una pierna en el suelo", series: 3, repeticiones: "15 por pierna", consejo: "Eleva la pelvis contrayendo activamente el glúteo en el punto más alto del ejercicio." }
          ]
        },
        explicacion_cientifica: "Un plato abundante en proteínas puras y grasas saludables con bajo índice de carbohidratos es óptimo para la recomposición corporal. Realizar un entrenamiento de tren inferior de alta exigencia promueve la secreción de hormona del crecimiento y conserva intacta la masa muscular, mientras tu metabolismo utiliza las grasas del aguacate como energía estable."
      }
    }
  },
  {
    id: "pancakes",
    name: "Pancakes de Avena y Plátano",
    imgUrl: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&q=80&w=400",
    data: {
      plato_analizado: "Pancakes saludables de avena con plátano y miel",
      ingredientes_detectados: [
        "Harina de avena integral (60g)",
        "Un plátano maduro (110g)",
        "Huevo entero (1 unidad)",
        "Leche de almendras sin azúcar (50ml)",
        "Miel de abeja pura (15g)"
      ],
      informacion_nutricional: {
        calorias_totales: 440,
        proteinas_g: 14,
        carbohidratos_g: 72,
        grasas_g: 10
      },
      ejercicio: {
        actividad: "correr",
        distancia_estimada_km: 5.9,
        nota_explicativa: "Calculado basado en un gasto promedio de 75 kcal por km para un corredor promedio."
      },
      rutina_gymrat: {
        enfoque: "Gasto de Glucógeno Muscular - Rutina de Empuje (Push)",
        con_maquinas: {
          titulo: "Fuerza y Volumen de Empuje en Gimnasio",
          ejercicios: [
            { nombre: "Press de banca plano con barra", series: 4, repeticiones: "8-10", consejo: "Baja la barra lentamente a la altura del esternón e impulsa de forma explosiva." },
            { nombre: "Press de hombros sentado en máquina de palanca", series: 3, repeticiones: "12", consejo: "No bloquees los codos arriba del todo para mantener la tensión continua en los deltoides." },
            { nombre: "Cruce de poleas altas para pecho inferior", series: 3, repeticiones: "15", consejo: "Siente el estiramiento de las fibras del pectoral en la fase inicial del movimiento." },
            { nombre: "Extensiones de tríceps en polea alta con cuerda", series: 3, repeticiones: "12-15", consejo: "Abre la cuerda al final de la extensión para exprimir la cabeza larga del tríceps." }
          ]
        },
        sin_maquinas: {
          titulo: "Calistenia HIIT de Empuje Explosivo en Casa",
          ejercicios: [
            { nombre: "Flexiones de brazos declinadas (pies elevados)", series: 4, repeticiones: "15-18", consejo: "Coloca tus pies en una silla para desplazar el peso al haz clavicular del pectoral." },
            { nombre: "Fondos en silla o banco para tríceps", series: 4, repeticiones: "15", consejo: "Mantén la espalda bien pegada al banco o silla y evita que los hombros suban." },
            { nombre: "Flexiones 'Pike' para deltoides", series: 3, repeticiones: "10-12", consejo: "Eleva las caderas formando una 'V' invertida y desciende con la coronilla apuntando al suelo." },
            { nombre: "Burpees con flexión de pecho y salto alto", series: 3, repeticiones: "10", consejo: "Realiza la transición de forma fluida y explosiva para depletar el glucógeno acumulado de los pancakes." }
          ]
        },
        explicacion_cientifica: "Los carbohidratos complejos de la avena y simples del plátano/miel rellenan rápidamente los depósitos de glucógeno muscular y hepático. Una rutina de empuje (pecho, hombros, tríceps) de alto volumen e intensidad utiliza activamente esa glucosa en sangre como combustible inmediato, logrando entrenamientos de máxima fuerza, congestión muscular y rendimiento."
      }
    }
  }
];

const LOADING_STEPS = [
  "Iniciando análisis inteligente de tu comida...",
  "Llamando a visión artificial con Gemini 3.5-Flash...",
  "Identificando ingredientes y alimentos principales...",
  "Estimando calorías y macronutrientes...",
  "Ajustando cálculos según tu perfil deportivo...",
  "Calculando equivalencia exacta en running...",
  "Generando informe detallado en formato JSON..."
];

export default function App() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getSession());

  const handleLogin = (user: AuthUser) => {
    saveSession(user);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    clearSession();
    window.location.href = "/";
  };

  if (!currentUser) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"analizador" | "historial" | "perfil" | "metas">("analizador");
  const [activeSubTab, setActiveSubTab] = useState<"imagen" | "manual">("imagen");

  // User profile
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const stored = localStorage.getItem("nutrirun_profile_v2");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // error parsing
      }
    }
    return {
      edad: 28,
      peso_kg: 70,
      altura_cm: 172,
      nivel_actividad: "moderado",
      genero: "masculino"
    };
  });

  // History state
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const stored = localStorage.getItem("nutrirun_history_v2");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }
    return [];
  });

  // Search filter for history
  const [historySearch, setHistorySearch] = useState("");

  // Saved result session tracking
  const [savedInSession, setSavedInSession] = useState<string[]>([]);

  // Selected entry from history
  const [viewingHistoryEntry, setViewingHistoryEntry] = useState<HistoryEntry | null>(null);

  // States for Image upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FoodAnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewJson, setViewJson] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [activityMode, setActivityMode] = useState<"runner" | "gymrat">("runner");
  const [gymratSubMode, setGymratSubMode] = useState<"con_maquinas" | "sin_maquinas">("con_maquinas");

  // Feedback state
  const [feedbackState, setFeedbackState] = useState<"idle" | "editing" | "sent">("idle");
  const [feedbackCorrection, setFeedbackCorrection] = useState("");

  // States for manual food assemble
  const [manualPlateName, setManualPlateName] = useState("");
  const [manualIngredients, setManualIngredients] = useState<Array<{ id: string; nombre: string; peso_g: number }>>([]);
  const [tempIngName, setTempIngName] = useState("");
  const [tempIngWeight, setTempIngWeight] = useState<number | "">("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Save profile helper
  const handleSaveProfile = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
    localStorage.setItem("nutrirun_profile_v2", JSON.stringify(newProfile));
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecciona una imagen válida (PNG, JPG o WEBP).");
      return;
    }
    setError(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
      setResults(null);
      setViewingHistoryEntry(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Image analysis API request
  const startAnalysis = async () => {
    if (!imagePreview) return;

    setIsAnalyzing(true);
    setError(null);
    setResults(null);
    setViewingHistoryEntry(null);
    setAnalysisStep(0);
    setFeedbackState("idle");
    setFeedbackCorrection("");

    let step = 0;
    loadingIntervalRef.current = setInterval(() => {
      step = (step + 1) % LOADING_STEPS.length;
      setAnalysisStep(step);
    }, 1500);

    try {
      const base64Content = imagePreview.split(",")[1];
      const mimeType = imagePreview.split(",")[0].split(":")[1].split(";")[0];

      const response = await fetch("/api/analyze-food", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: base64Content,
          mimeType: mimeType,
          profile: userProfile
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData?.error || "No se pudo completar el análisis del plato. Intenta nuevamente.";
        setError(errMsg);
        setResults({ plato_analizado: "", ingredientes_detectados: [], informacion_nutricional: { calorias_totales: 0, proteinas_g: 0, carbohidratos_g: 0, grasas_g: 0 }, ejercicio: { actividad: "", distancia_estimada_km: 0, nota_explicativa: "" }, rutina_gymrat: { enfoque: "", con_maquinas: { titulo: "", ejercicios: [] }, sin_maquinas: { titulo: "", ejercicios: [] }, explicacion_cientifica: "" }, error: errMsg });
        return;
      }

      const data: FoodAnalysisResult = await response.json();

      if (data.error) {
        setError(data.error);
        setResults(data);
      } else {
        setResults(data);
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || "Error al conectar con el servidor.";
      setError(errMsg);
      setResults({ plato_analizado: "", ingredientes_detectados: [], informacion_nutricional: { calorias_totales: 0, proteinas_g: 0, carbohidratos_g: 0, grasas_g: 0 }, ejercicio: { actividad: "", distancia_estimada_km: 0, nota_explicativa: "" }, rutina_gymrat: { enfoque: "", con_maquinas: { titulo: "", ejercicios: [] }, sin_maquinas: { titulo: "", ejercicios: [] }, explicacion_cientifica: "" }, error: errMsg });
    } finally {
      setIsAnalyzing(false);
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
    }
  };

  // Manual analysis API request
  const handleAnalyzeManual = async () => {
    if (!manualPlateName.trim()) {
      setError("Por favor, introduce un nombre para el plato (ej. Arroz con Huevo y Aguacate).");
      return;
    }
    if (manualIngredients.length === 0) {
      setError("Por favor, añade al menos un ingrediente a tu plato.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResults(null);
    setViewingHistoryEntry(null);
    setAnalysisStep(0);

    let step = 0;
    loadingIntervalRef.current = setInterval(() => {
      step = (step + 1) % LOADING_STEPS.length;
      setAnalysisStep(step);
    }, 1500);

    try {
      const response = await fetch("/api/analyze-manual-food", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plato: manualPlateName,
          ingredientes: manualIngredients.map(i => ({ nombre: i.nombre, peso_g: i.peso_g })),
          profile: userProfile
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData?.error || "No se pudo completar el análisis de la comida manual. Intenta nuevamente.";
        setError(errMsg);
        setResults({ plato_analizado: "", ingredientes_detectados: [], informacion_nutricional: { calorias_totales: 0, proteinas_g: 0, carbohidratos_g: 0, grasas_g: 0 }, ejercicio: { actividad: "", distancia_estimada_km: 0, nota_explicativa: "" }, rutina_gymrat: { enfoque: "", con_maquinas: { titulo: "", ejercicios: [] }, sin_maquinas: { titulo: "", ejercicios: [] }, explicacion_cientifica: "" }, error: errMsg });
        return;
      }

      const data: FoodAnalysisResult = await response.json();

      if (data.error) {
        setError(data.error);
        setResults(data);
      } else {
        setResults(data);
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || "Error al conectar con el servidor.";
      setError(errMsg);
      setResults({ plato_analizado: "", ingredientes_detectados: [], informacion_nutricional: { calorias_totales: 0, proteinas_g: 0, carbohidratos_g: 0, grasas_g: 0 }, ejercicio: { actividad: "", distancia_estimada_km: 0, nota_explicativa: "" }, rutina_gymrat: { enfoque: "", con_maquinas: { titulo: "", ejercicios: [] }, sin_maquinas: { titulo: "", ejercicios: [] }, explicacion_cientifica: "" }, error: errMsg });
    } finally {
      setIsAnalyzing(false);
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
    }
  };

  // Add ingredient helper
  const handleAddIngredient = (name: string, weight: number) => {
    if (!name.trim()) return;
    if (!weight || weight <= 0) return;

    const newIng = {
      id: String(Date.now() + Math.random()),
      nombre: name.trim(),
      peso_g: weight
    };
    setManualIngredients([...manualIngredients, newIng]);
    setTempIngName("");
    setTempIngWeight("");
    setError(null);
  };

  const handleRemoveIngredient = (id: string) => {
    setManualIngredients(manualIngredients.filter(i => i.id !== id));
  };

  // Pre-configured ingredients helper
  const handleQuickAdd = (name: string, weight: number) => {
    handleAddIngredient(name, weight);
  };

  const handleSelectSample = (sample: typeof SAMPLES[0]) => {
    setImagePreview(sample.imgUrl);
    setResults(sample.data);
    setError(sample.data.error || null);
    setImageFile(null);
    setViewingHistoryEntry(null);
    setActiveSubTab("imagen");
  };

  const copyToClipboard = () => {
    if (!results) return;
    navigator.clipboard.writeText(JSON.stringify(results, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetAll = () => {
    setImageFile(null);
    setImagePreview(null);
    setResults(null);
    setError(null);
    setViewingHistoryEntry(null);
    setManualPlateName("");
    setManualIngredients([]);
  };

  // Save meal to history
  const handleSaveToHistory = () => {
    if (!results) return;

    // Check if already saved in current results (avoid double saving)
    const isAlreadySaved = history.some(h => JSON.stringify(h.result.plato_analizado) === JSON.stringify(results.plato_analizado) && h.result.informacion_nutricional.calorias_totales === results.informacion_nutricional.calorias_totales);
    if (isAlreadySaved) {
      alert("Este plato ya está guardado en tu historial.");
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString("es-ES", { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit' });

    const newEntry: HistoryEntry = {
      id: String(Date.now()),
      date: dateStr,
      time: timeStr,
      isManual: activeSubTab === "manual",
      result: results
    };

    const updatedHistory = [newEntry, ...history];
    setHistory(updatedHistory);
    localStorage.setItem("nutrirun_history_v2", JSON.stringify(updatedHistory));
    setSavedInSession([...savedInSession, newEntry.id]);
  };

  // Load history entry back into results
  const handleViewHistoryDetail = (entry: HistoryEntry) => {
    setViewingHistoryEntry(entry);
    setResults(entry.result);
    setError(null);
    if (entry.isManual) {
      setActiveSubTab("manual");
      setManualPlateName(entry.result.plato_analizado);
      // parse ingredients if possible or leave empty
    } else {
      setActiveSubTab("imagen");
      setImagePreview("https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&q=80&w=400"); // placeholder for image
    }
    setActiveTab("analizador");
  };

  // Remove history item
  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem("nutrirun_history_v2", JSON.stringify(updated));
    if (viewingHistoryEntry?.id === id) {
      setViewingHistoryEntry(null);
      setResults(null);
    }
  };

  // Clear all history
  const handleClearHistory = () => {
    if (confirm("¿Estás seguro de que deseas vaciar todo tu historial de comidas?")) {
      setHistory([]);
      localStorage.removeItem("nutrirun_history_v2");
      setViewingHistoryEntry(null);
      setResults(null);
    }
  };

  // BMR & TDEE Scientific Calculations
  const calculateBMRandTDEE = (profile: UserProfile) => {
    const { edad, peso_kg, altura_cm, genero, nivel_actividad } = profile;
    let bmr = 0;
    if (genero === "masculino") {
      bmr = 88.362 + (13.397 * peso_kg) + (4.799 * altura_cm) - (5.677 * edad);
    } else {
      bmr = 447.593 + (9.247 * peso_kg) + (3.098 * altura_cm) - (4.330 * edad);
    }
    
    const multipliers = {
      sedentario: 1.2,
      ligero: 1.375,
      moderado: 1.55,
      activo: 1.725,
      "muy activo": 1.9
    };
    
    const tdee = bmr * (multipliers[nivel_actividad] || 1.2);
    
    // Macro splits guidelines (30% Protein, 45% Carbs, 25% Fat of TDEE)
    const protKcal = tdee * 0.30;
    const carbKcal = tdee * 0.45;
    const fatKcal = tdee * 0.25;

    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      targetProt: Math.round(protKcal / 4),
      targetCarb: Math.round(carbKcal / 4),
      targetFat: Math.round(fatKcal / 9)
    };
  };

  const sportsMetrics = calculateBMRandTDEE(userProfile);

  // Helper macro percentages of current results
  const calculateMacroPercentages = () => {
    if (!results?.informacion_nutricional) return { p: 0, c: 0, f: 0 };
    const { proteinas_g, carbohidratos_g, grasas_g } = results.informacion_nutricional;
    
    const pKcal = proteinas_g * 4;
    const cKcal = carbohidratos_g * 4;
    const fKcal = grasas_g * 9;
    const totalKcal = pKcal + cKcal + fKcal;
    
    if (totalKcal === 0) return { p: 0, c: 0, f: 0 };
    
    return {
      p: Math.round((pKcal / totalKcal) * 100),
      c: Math.round((cKcal / totalKcal) * 100),
      f: Math.round((fKcal / totalKcal) * 100)
    };
  };

  const macroPercentages = calculateMacroPercentages();

  // Check if current results matches anything in history to show save state
  const isCurrentSaved = results && (
    viewingHistoryEntry !== null || 
    history.some(h => h.result.plato_analizado === results.plato_analizado && h.result.informacion_nutricional.calorias_totales === results.informacion_nutricional.calorias_totales)
  );

  // Filter history
  const filteredHistory = history.filter(item => 
    item.result.plato_analizado.toLowerCase().includes(historySearch.toLowerCase()) ||
    item.result.ingredientes_detectados.some(i => i.toLowerCase().includes(historySearch.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900 flex flex-col" id="main-container">
      
      {/* Header Premium (Tema Polished) */}
      <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-50 px-6 flex items-center justify-between shrink-0 shadow-sm" id="app-header">
        <div className="flex items-center gap-3 font-sans" id="brand-logo">
          <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
            <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
            </svg>
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-slate-900 flex items-center gap-1.5">
              NutriRun <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-1.5 py-0.5 rounded">Pro</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold -mt-0.5">Deporte & Nutrición con IA</p>
          </div>
        </div>

        {/* Dynamic Profile Summary in Header */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span>Hola, {currentUser.username}</span>
          </div>
          <button
            onClick={() => setActiveTab("perfil")}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-slate-700"
          >
            <span>{userProfile.peso_kg} kg ({userProfile.nivel_actividad})</span>
          </button>

          {imagePreview && activeTab === "analizador" && (
            <button 
              onClick={resetAll}
              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3.5 py-1.5 rounded-xl text-xs font-bold border border-emerald-200 transition-colors cursor-pointer"
            >
              Nuevo Análisis
            </button>
          )}

          <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-mono bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-emerald-700 font-semibold text-[10px] uppercase tracking-wider">AI Live</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 transition-all cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6" id="main-content">
        
        {/* Intro Branding Header */}
        <div className="mb-6 text-center max-w-2xl mx-auto" id="intro-box">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-black mb-2.5 border border-emerald-200/60"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Asistente Experto en Ciencias Deportivas & Nutrición
          </motion.div>
          <h2 className="text-2xl sm:text-3.5xl font-black text-slate-900 tracking-tight">
            Análisis Nutricional Científico
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
            Sube fotos o arma tus platos de forma manual. Adaptamos los desgloses calóricos y las metas de running a tu perfil físico actual.
          </p>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex justify-center mb-8" id="tab-navigation">
          <div className="bg-slate-200/80 p-1 rounded-2xl flex gap-1 border border-slate-300/40">
            <button
              onClick={() => { setActiveTab("analizador"); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "analizador"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
              }`}
            >
              <Utensils className="w-3.5 h-3.5 text-emerald-600" />
              <span>Analizar Plato</span>
            </button>
            <button
              onClick={() => { setActiveTab("historial"); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
                activeTab === "historial"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
              }`}
            >
              <History className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mi Historial</span>
              {history.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-600 text-white font-extrabold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white">
                  {history.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab("perfil"); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "perfil"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
              }`}
            >
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>Perfil Deportivo</span>
            </button>
            <button
              onClick={() => { setActiveTab("metas"); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "metas"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
              }`}
            >
              <Target className="w-3.5 h-3.5 text-emerald-600" />
              <span>Metas</span>
            </button>
          </div>
        </div>

        {/* MAIN BODY LAYOUT */}
        <AnimatePresence mode="wait">
          
          {/* TAB 1: ANALYZER (CAMERA / MANUAL) */}
          {activeTab === "analizador" && (
            <motion.div
              key="analizador-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* Left Column: Form / Upload Input */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Mode Selector (Sub-tabs) */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200 flex justify-between gap-2 shadow-sm">
                  <button
                    onClick={() => { setActiveSubTab("imagen"); setError(null); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeSubTab === "imagen"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/10"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Analizar Foto</span>
                  </button>
                  <button
                    onClick={() => { setActiveSubTab("manual"); setError(null); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeSubTab === "manual"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/10"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Armar Plato Manual</span>
                  </button>
                </div>

                {/* Sub Tab Panel 1: IMAGE CAPTURE */}
                {activeSubTab === "imagen" && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5" id="upload-card">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <Camera className="w-4 h-4 text-emerald-600" />
                        Sube tu Foto
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1">Sube una foto de tu comida o arrástrala. Nuestra IA se encarga de identificar todo.</p>
                    </div>

                    {!imagePreview ? (
                      <div 
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={triggerFileSelect}
                        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                          dragActive 
                            ? "border-emerald-500 bg-emerald-50/30" 
                            : "border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/10"
                        }`}
                        id="dropzone"
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          onChange={handleFileInput}
                          className="hidden" 
                          accept="image/*"
                        />
                        <div className="flex flex-col items-center">
                          <div className="p-3 bg-slate-100 rounded-full text-slate-600 mb-3 group-hover:scale-110 transition-transform">
                            <Upload className="w-7 h-7 text-emerald-600" />
                          </div>
                          <p className="text-xs font-bold text-slate-700">
                            Arrastra tu imagen aquí o <span className="text-emerald-600 hover:underline">haz clic</span>
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Formatos PNG, JPG, JPEG o WEBP
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4" id="preview-container">
                        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-video flex items-center justify-center shadow-inner">
                          <img 
                            src={imagePreview} 
                            alt="Previsualización de comida" 
                            className="max-h-full max-w-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                          <button 
                            onClick={resetAll}
                            disabled={isAnalyzing}
                            className="absolute top-2.5 right-2.5 p-2 bg-white/90 backdrop-blur text-slate-600 hover:text-slate-950 rounded-lg border border-slate-200 hover:bg-white shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                            title="Quitar imagen"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>

                        {!isAnalyzing && !results && (
                          <button
                            onClick={startAnalysis}
                            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/10 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
                            id="btn-analyze"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>Analizar Imagen con IA</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Sub Tab Panel 2: MANUAL MEAL BUILDER */}
                {activeSubTab === "manual" && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <Utensils className="w-4 h-4 text-emerald-600" />
                        Armar Plato Manualmente
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1">Especifica los ingredientes y pesos. Nuestra IA calculará el aporte nutricional científico exacto.</p>
                    </div>

                    <div className="space-y-4">
                      {/* Plate Name Input */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nombre de la Comida / Plato</label>
                        <input
                          type="text"
                          value={manualPlateName}
                          onChange={(e) => setManualPlateName(e.target.value)}
                          placeholder="Ej. Bowl de Avena con Plátano y Almendras"
                          className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:bg-white transition-all outline-none"
                        />
                      </div>

                      {/* Ingredient Form Row */}
                      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/50 space-y-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Añadir Ingrediente</span>
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-7">
                            <input
                              type="text"
                              value={tempIngName}
                              onChange={(e) => setTempIngName(e.target.value)}
                              placeholder="Ej. Pechuga de Pollo"
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div className="col-span-3">
                            <input
                              type="number"
                              value={tempIngWeight}
                              onChange={(e) => setTempIngWeight(e.target.value !== "" ? Number(e.target.value) : "")}
                              placeholder="g"
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-center outline-none focus:border-emerald-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddIngredient(tempIngName, Number(tempIngWeight))}
                            className="col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center justify-center cursor-pointer h-[32px]"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Quick-add buttons */}
                        <div className="pt-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Frecuentes:</span>
                          <div className="flex flex-wrap gap-1">
                            {[
                              { n: "Pechuga de Pollo", w: 150 },
                              { n: "Arroz Blanco", w: 150 },
                              { n: "Huevo", w: 50 },
                              { n: "Aguacate", w: 80 },
                              { n: "Avena", w: 50 },
                              { n: "Aceite de Oliva", w: 10 }
                            ].map((food, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleQuickAdd(food.n, food.w)}
                                className="px-2 py-0.5 bg-white hover:bg-emerald-50 border border-slate-200 rounded text-[9px] text-slate-600 font-semibold transition-all cursor-pointer"
                              >
                                + {food.n} ({food.w}g)
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Ingredients List */}
                      {manualIngredients.length > 0 && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                          <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase flex justify-between">
                            <span>Ingrediente</span>
                            <span>Peso (g)</span>
                          </div>
                          <div className="divide-y divide-slate-100 max-h-[160px] overflow-y-auto">
                            {manualIngredients.map((ing) => (
                              <div key={ing.id} className="px-3 py-2 flex items-center justify-between text-xs font-semibold text-slate-700">
                                <span className="truncate max-w-[200px]">{ing.nombre}</span>
                                <div className="flex items-center gap-3">
                                  <span>{ing.peso_g} g</span>
                                  <button
                                    onClick={() => handleRemoveIngredient(ing.id)}
                                    className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                                    title="Eliminar ingrediente"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!isAnalyzing && !results && (
                        <button
                          onClick={handleAnalyzeManual}
                          disabled={!manualPlateName || manualIngredients.length === 0}
                          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 active:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/10 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Analizar Plato con IA</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Samples Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200" id="samples-card">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-emerald-600" />
                    Platos de Prueba Instantánea
                  </h3>
                  <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                    ¿Quieres ver cómo funciona de inmediato? Selecciona un plato prediseñado con datos de ejemplo:
                  </p>
                  <div className="space-y-2.5" id="samples-list">
                    {SAMPLES.map((sample) => (
                      <button
                        key={sample.id}
                        onClick={() => handleSelectSample(sample)}
                        disabled={isAnalyzing}
                        className="w-full flex items-center gap-3 p-2 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/60 text-left transition-all disabled:opacity-50 group cursor-pointer"
                      >
                        <img 
                          src={sample.imgUrl} 
                          alt={sample.name} 
                          className="w-11 h-11 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 group-hover:text-emerald-600 transition-colors truncate">
                            {sample.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {sample.data.informacion_nutricional.calorias_totales} kcal • Run {sample.data.ejercicio.distancia_estimada_km} km
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Column: Output / Load / Active Results */}
              <div className="lg:col-span-7" id="output-workspace">
                <AnimatePresence mode="wait">
                  
                  {/* IS ANALYZING / LOADING */}
                  {isAnalyzing && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white rounded-2xl border border-emerald-200 p-8 text-center space-y-6 shadow-sm flex flex-col items-center justify-center min-h-[440px]"
                      id="loading-view"
                    >
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-emerald-600 animate-spin"></div>
                        <Activity className="w-6 h-6 text-emerald-600 absolute inset-0 m-auto animate-pulse" />
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-base font-bold text-slate-900">Calculando con Ciencias del Deporte...</h3>
                        <div className="h-6 overflow-hidden max-w-sm mx-auto">
                          <AnimatePresence mode="wait">
                            <motion.p
                              key={analysisStep}
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              exit={{ y: -20, opacity: 0 }}
                              className="text-xs text-emerald-600 font-bold"
                            >
                              {LOADING_STEPS[analysisStep]}
                            </motion.p>
                          </AnimatePresence>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                        Nuestra red neuronal estima el peso de los ingredientes y la equivalencia basándose en tu gasto metabólico individual.
                      </p>
                    </motion.div>
                  )}

                  {/* EMPTY SCREEN STATE */}
                  {!isAnalyzing && !results && !error && (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white/60 rounded-2xl border border-slate-200 border-dashed p-8 text-center py-28 shadow-sm flex flex-col items-center justify-center min-h-[440px]"
                      id="empty-view"
                    >
                      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                        <Apple className="w-6 h-6 text-slate-500" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-700">Esperando datos de plato</h3>
                      <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed mx-auto">
                        Sube una foto de tu comida o agrégala manualmente para generar el informe nutricional detallado, el equivalente de running y el JSON estructurado.
                      </p>
                    </motion.div>
                  )}

                  {/* ACTIVE RESULTS DISPLAY */}
                  {!isAnalyzing && results && (
                    <motion.div
                      key="results"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                      id="results-view"
                    >
                      {/* Viewing a History item indicator */}
                      {viewingHistoryEntry && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-center justify-between text-xs font-semibold">
                          <div className="flex items-center gap-2">
                            <History className="w-4 h-4 text-emerald-600" />
                            <span>Visualizando plato del historial ({viewingHistoryEntry.date} {viewingHistoryEntry.time})</span>
                          </div>
                          <button
                            onClick={resetAll}
                            className="text-emerald-700 hover:text-emerald-900 underline text-[11px]"
                          >
                            Volver a Analizar
                          </button>
                        </div>
                      )}

                      {/* Error warning from Vision */}
                      {error && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-3 text-xs shadow-sm">
                          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />
                          <div>
                            <span className="font-bold block text-sm mb-1">Aviso del Experto:</span>
                            <p>{error}</p>
                            <p className="mt-1 text-amber-700 font-medium">Por favor, asegúrate de describir ingredientes válidos o subir fotos claras.</p>
                          </div>
                        </div>
                      )}

                      {/* Plate Card Details */}
                      <div className="bg-white p-6 sm:p-7 rounded-2xl shadow-sm border border-slate-200" id="result-plate-card">
                        
                        {/* Title and Action Buttons */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                          <div>
                            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider inline-block mb-1 border border-emerald-200/50">
                              Análisis Exitoso
                            </span>
                            <h3 className="text-xl font-black text-slate-950 tracking-tight">
                              {results.plato_analizado}
                            </h3>
                            {/* Feedback inline */}
                            {!error && feedbackState === "idle" && (
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] text-slate-400">¿Identificó bien el plato?</span>
                                <button onClick={() => { setFeedbackState("sent"); }} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-lg transition-all">✓ Sí</button>
                                <button onClick={() => setFeedbackState("editing")} className="text-[10px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg transition-all">✗ No, corregir</button>
                              </div>
                            )}
                            {feedbackState === "editing" && (
                              <div className="flex items-center gap-2 mt-2">
                                <input
                                  type="text"
                                  placeholder="¿Cómo se llama realmente este plato?"
                                  value={feedbackCorrection}
                                  onChange={e => setFeedbackCorrection(e.target.value)}
                                  className="text-[11px] px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 flex-1 min-w-0"
                                  autoFocus
                                />
                                <button
                                  onClick={() => {
                                    if (feedbackCorrection.trim()) {
                                      // Save correction to localStorage for future reference
                                      const key = "nutrirun_feedback_v1";
                                      const existing = JSON.parse(localStorage.getItem(key) || "[]");
                                      existing.push({ detected: results.plato_analizado, correction: feedbackCorrection.trim(), date: new Date().toISOString() });
                                      localStorage.setItem(key, JSON.stringify(existing.slice(-50)));
                                      setFeedbackState("sent");
                                    }
                                  }}
                                  className="text-[10px] font-bold px-2.5 py-1 bg-emerald-600 text-white rounded-lg cursor-pointer hover:bg-emerald-500 transition-all flex-shrink-0"
                                >
                                  Enviar
                                </button>
                                <button onClick={() => setFeedbackState("idle")} className="text-slate-400 hover:text-slate-600 cursor-pointer flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            )}
                            {feedbackState === "sent" && (
                              <p className="text-[10px] text-emerald-600 font-semibold mt-2 flex items-center gap-1">
                                <Check className="w-3 h-3" /> ¡Gracias por el feedback!
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {/* Save to History Button */}
                            <button
                              onClick={handleSaveToHistory}
                              className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                isCurrentSaved
                                  ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              }`}
                              disabled={!!isCurrentSaved}
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>{isCurrentSaved ? "Guardado" : "Guardar en Historial"}</span>
                            </button>

                            {/* View JSON Button */}
                            <button
                              onClick={() => setViewJson(!viewJson)}
                              className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                viewJson 
                                  ? "bg-slate-900 text-emerald-400 border-slate-800" 
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                              title="Ver formato JSON"
                            >
                              <span className="font-mono text-[10px]">{"{ }"}</span>
                              <span>{viewJson ? "Ficha" : "JSON"}</span>
                            </button>
                          </div>
                        </div>

                        {/* JSON VIEW */}
                        {viewJson ? (
                          <div className="space-y-3 animate-fadeIn" id="json-mode-panel">
                            <div className="flex justify-between items-center bg-slate-900 px-4 py-2 rounded-t-lg border-b border-slate-800 text-[11px] font-mono text-slate-400">
                              <span>Salida JSON Estricta</span>
                              <button
                                onClick={copyToClipboard}
                                className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                              >
                                {copied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" /> Copiado
                                  </>
                                ) : (
                                  <>
                                    <Clipboard className="w-3.5 h-3.5" /> Copiar
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="bg-slate-950 text-emerald-400 p-4 rounded-b-lg overflow-x-auto text-[11px] font-mono leading-relaxed max-h-[300px] border border-slate-800 shadow-inner">
                              <code>{JSON.stringify(results, null, 2)}</code>
                            </pre>
                          </div>
                        ) : (
                          /* DASHBOARD MODE VIEW */
                          <div className="space-y-6 animate-fadeIn" id="dashboard-mode-panel">
                            
                            {/* Calories & Ingredients Display */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                              
                              {/* Calories Card */}
                              <div className="md:col-span-5 bg-slate-50 border border-slate-100 rounded-xl p-5 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-xl shadow-sm flex-shrink-0">
                                  🔥
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    Calorías Totales
                                  </p>
                                  <p className="text-2.5xl font-black text-slate-900 mt-0.5">
                                    {results.informacion_nutricional.calorias_totales} <span className="text-sm font-semibold text-slate-400">kcal</span>
                                  </p>
                                </div>
                              </div>

                              {/* Ingredients list */}
                              <div className="md:col-span-7 bg-slate-50 rounded-xl border border-slate-100 p-5">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">
                                  Ingredientes Registrados
                                </h4>
                                <div className="flex flex-wrap gap-1.5" id="ingredients-chips">
                                  {results.ingredientes_detectados.length > 0 ? (
                                    results.ingredientes_detectados.map((ing, idx) => (
                                      <span 
                                        key={idx}
                                        className="px-2.5 py-0.5 bg-white border border-slate-200/80 rounded-lg text-xs text-slate-700 font-semibold shadow-sm flex items-center gap-1.5"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        {ing}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-slate-400 italic">No se indicaron ingredientes detallados.</span>
                                  )}
                                </div>
                              </div>

                            </div>

                            {/* Macro bars */}
                            <div className="border-t border-slate-100 pt-5 space-y-3">
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Scale className="w-3.5 h-3.5 text-emerald-600" />
                                Estimación de Macronutrientes
                              </h4>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="macros-bars-container">
                                {/* Protein */}
                                <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 space-y-1.5">
                                  <div className="flex justify-between items-end text-xs font-semibold">
                                    <span className="text-slate-500">Proteínas</span>
                                    <span className="text-slate-950 font-bold">{results.informacion_nutricional.proteinas_g}g <span className="text-slate-400 text-[10px] font-medium">({macroPercentages.p}%)</span></span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                                      style={{ width: `${Math.min(100, (results.informacion_nutricional.proteinas_g / 100) * 100)}%` }}
                                    ></div>
                                  </div>
                                </div>

                                {/* Carbs */}
                                <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 space-y-1.5">
                                  <div className="flex justify-between items-end text-xs font-semibold">
                                    <span className="text-slate-500">Carbohidratos</span>
                                    <span className="text-slate-950 font-bold">{results.informacion_nutricional.carbohidratos_g}g <span className="text-slate-400 text-[10px] font-medium">({macroPercentages.c}%)</span></span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                                      style={{ width: `${Math.min(100, (results.informacion_nutricional.carbohidratos_g / 200) * 100)}%` }}
                                    ></div>
                                  </div>
                                </div>

                                {/* Fats */}
                                <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 space-y-1.5">
                                  <div className="flex justify-between items-end text-xs font-semibold">
                                    <span className="text-slate-500">Grasas</span>
                                    <span className="text-slate-950 font-bold">{results.informacion_nutricional.grasas_g}g <span className="text-slate-400 text-[10px] font-medium">({macroPercentages.f}%)</span></span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-rose-500 rounded-full transition-all duration-1000"
                                      style={{ width: `${Math.min(100, (results.informacion_nutricional.grasas_g / 80) * 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* COMPARISON WITH USER DAILY LIMITS TDEE */}
                            {userProfile && (
                              <div className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                  <Calculator className="w-4 h-4 text-emerald-600" />
                                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">Aporte Relativo a Tu Perfil</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                                  <div className="bg-white p-2 rounded-lg border border-emerald-100">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Calorías</p>
                                    <p className="text-sm font-extrabold text-slate-800">{Math.round((results.informacion_nutricional.calorias_totales / sportsMetrics.tdee) * 100)}%</p>
                                    <p className="text-[8px] text-slate-400 mt-0.5">de tu TDEE ({sportsMetrics.tdee} kcal)</p>
                                  </div>
                                  <div className="bg-white p-2 rounded-lg border border-emerald-100">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Proteína</p>
                                    <p className="text-sm font-extrabold text-blue-600">{Math.round((results.informacion_nutricional.proteinas_g / sportsMetrics.targetProt) * 100)}%</p>
                                    <p className="text-[8px] text-slate-400 mt-0.5">de tu meta ({sportsMetrics.targetProt}g)</p>
                                  </div>
                                  <div className="bg-white p-2 rounded-lg border border-emerald-100">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Carbos</p>
                                    <p className="text-sm font-extrabold text-amber-600">{Math.round((results.informacion_nutricional.carbohidratos_g / sportsMetrics.targetCarb) * 100)}%</p>
                                    <p className="text-[8px] text-slate-400 mt-0.5">de tu meta ({sportsMetrics.targetCarb}g)</p>
                                  </div>
                                  <div className="bg-white p-2 rounded-lg border border-emerald-100">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Grasas</p>
                                    <p className="text-sm font-extrabold text-rose-600">{Math.round((results.informacion_nutricional.grasas_g / sportsMetrics.targetFat) * 100)}%</p>
                                    <p className="text-[8px] text-slate-400 mt-0.5">de tu meta ({sportsMetrics.targetFat}g)</p>
                                  </div>
                                </div>
                              </div>
                            )}

                          </div>
                        )}
                      </div>

                      {/* MODE SELECTOR (RUNNER VS GYMRAT) */}
                      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 gap-1.5" id="mode-selector-tabs">
                        <button
                          onClick={() => setActivityMode("runner")}
                          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
                            activityMode === "runner"
                              ? "bg-white text-emerald-800 shadow-sm border border-emerald-100"
                              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                          }`}
                        >
                          <Activity className="w-4 h-4 text-emerald-600" />
                          <span className="uppercase tracking-wider">Modo Runner 🏃‍♂️</span>
                        </button>
                        <button
                          onClick={() => setActivityMode("gymrat")}
                          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
                            activityMode === "gymrat"
                              ? "bg-slate-900 text-white shadow-sm border border-slate-800"
                              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                          }`}
                        >
                          <Dumbbell className="w-4 h-4 text-orange-400" />
                          <span className="uppercase tracking-wider">Modo GymRat 🏋️‍♂️</span>
                        </button>
                      </div>

                      <AnimatePresence mode="wait">
                        {activityMode === "runner" ? (
                          <motion.div
                            key="runner-panel"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white p-6 sm:p-7 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden" 
                            id="athletic-equivalent-card"
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                              <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-2.5xl shadow-sm flex-shrink-0">
                                  🏃‍♂️
                                </div>
                                <div>
                                  <h3 className="text-base font-bold text-slate-900">Gasto Energético Equivalente</h3>
                                  <p className="text-xs text-slate-500">Esfuerzo necesario para equilibrar este plato</p>
                                </div>
                              </div>

                              <div className="text-left md:text-right">
                                <p className="text-3.5xl font-black text-orange-600">
                                  {results.ejercicio.distancia_estimada_km} <span className="text-lg">km</span>
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">De carrera continua</p>
                              </div>
                            </div>

                            <div className="mt-5 space-y-4">
                              {/* explanation note */}
                              <div className="p-3.5 bg-orange-50 rounded-xl text-xs text-orange-900 leading-relaxed italic border border-orange-100 flex items-start gap-2.5">
                                <Info className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                                <p>"{results.ejercicio.nota_explicativa}"</p>
                              </div>

                              {/* run track visualizer */}
                              <div className="pt-2">
                                <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                                  <span>Partida (0 km)</span>
                                  <span>Meta ({results.ejercicio.distancia_estimada_km} km)</span>
                                </div>
                                
                                <div className="relative w-full h-8 bg-slate-100 rounded-xl border border-slate-200 p-1 flex items-center overflow-hidden">
                                  <div className="absolute inset-0 border-t border-dashed border-slate-300 m-auto h-0 w-full"></div>
                                  <motion.div 
                                    className="flex items-center gap-1 bg-orange-500 text-white font-bold px-2.5 py-0.5 rounded-lg text-[10px] shadow-sm relative z-10"
                                    initial={{ left: "0%" }}
                                    animate={{ left: "calc(100% - 80px)" }}
                                    transition={{ duration: 2, ease: "easeOut" }}
                                    style={{ position: 'absolute' }}
                                  >
                                    <Activity className="w-3 h-3 animate-pulse" />
                                    <span>RUNNING</span>
                                  </motion.div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="gymrat-panel"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white p-6 sm:p-7 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden" 
                            id="gymrat-equivalent-card"
                          >
                            <div className="border-b border-slate-100 pb-5">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-sm">
                                  <Dumbbell className="w-5 h-5 text-orange-400" />
                                </div>
                                <div>
                                  <h3 className="text-base font-black text-slate-900">Entrenamiento Antídoto GymRat</h3>
                                  <p className="text-xs text-slate-400">Neutraliza y aprovecha los nutrientes de tu comida</p>
                                </div>
                              </div>
                              
                              {results.rutina_gymrat && (
                                <div className="mt-4 bg-orange-50/50 border border-orange-100 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-orange-900">
                                  <div className="flex items-center gap-2">
                                    <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
                                    <span>Enfoque Deportivo:</span>
                                  </div>
                                  <span className="bg-orange-100 text-orange-800 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wide">
                                    {results.rutina_gymrat.enfoque}
                                  </span>
                                </div>
                              )}
                            </div>

                            {results.rutina_gymrat ? (
                              <div className="mt-6 space-y-6">
                                {/* Sub-tabs for gymratSubMode (Con Máquinas vs Sin Máquinas) */}
                                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200/60 max-w-md">
                                  <button
                                    onClick={() => setGymratSubMode("con_maquinas")}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                      gymratSubMode === "con_maquinas"
                                        ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                                        : "text-slate-500 hover:text-slate-800"
                                    }`}
                                  >
                                    <Dumbbell className="w-3.5 h-3.5" />
                                    <span>Con Máquinas (Gym)</span>
                                  </button>
                                  <button
                                    onClick={() => setGymratSubMode("sin_maquinas")}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                      gymratSubMode === "sin_maquinas"
                                        ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                                        : "text-slate-500 hover:text-slate-800"
                                    }`}
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Sin Máquinas (Casa)</span>
                                  </button>
                                </div>

                                {/* Routine details */}
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                                      <span className="w-1.5 h-3.5 bg-orange-500 rounded-full inline-block"></span>
                                      {gymratSubMode === "con_maquinas" 
                                        ? results.rutina_gymrat.con_maquinas.titulo 
                                        : results.rutina_gymrat.sin_maquinas.titulo}
                                    </h4>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                      {gymratSubMode === "con_maquinas" ? "Equipamiento Completo" : "Peso Corporal"}
                                    </span>
                                  </div>

                                  {/* Exercises list */}
                                  <div className="grid grid-cols-1 gap-3.5">
                                    {(gymratSubMode === "con_maquinas" 
                                      ? results.rutina_gymrat.con_maquinas.ejercicios 
                                      : results.rutina_gymrat.sin_maquinas.ejercicios
                                    ).map((exercise, idx) => (
                                      <div 
                                        key={idx}
                                        className="bg-slate-50 hover:bg-slate-100/50 border border-slate-200/60 rounded-xl p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm group"
                                      >
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                              {idx + 1}
                                            </span>
                                            <span className="text-xs font-bold text-slate-800">
                                              {exercise.nombre}
                                            </span>
                                          </div>
                                          <p className="text-[11px] text-slate-400 leading-normal italic pl-7">
                                            💡 {exercise.consejo}
                                          </p>
                                        </div>
                                        
                                        <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-right font-mono text-[10px] font-bold text-slate-700 flex-shrink-0 self-start sm:self-center">
                                          {exercise.series} S <span className="text-slate-300 mx-0.5">|</span> {exercise.repeticiones}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Scientific explanation */}
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-2">
                                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                                    Justificación Científica Fisiológica 🧪
                                  </span>
                                  <p className="text-xs text-slate-600 leading-relaxed">
                                    {results.rutina_gymrat.explicacion_cientifica}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-5 p-4 bg-amber-50 rounded-xl text-xs text-amber-900 leading-relaxed italic border border-amber-100 flex items-start gap-2.5">
                                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                <p>Este plato del historial no cuenta con datos de rutina GymRat. Vuelve a analizar el plato para generarla automáticamente.</p>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

            </motion.div>
          )}

          {/* TAB 2: HISTORY LIST */}
          {activeTab === "historial" && (
            <motion.div
              key="historial-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <History className="w-5 h-5 text-emerald-600" />
                    Historial de Comidas Guardadas
                  </h3>
                  <p className="text-xs text-slate-400">Guarda registro de tus platos diarios para realizar un seguimiento exacto de calorías y running.</p>
                </div>

                {history.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="text-rose-600 hover:text-rose-800 text-xs font-bold flex items-center gap-1.5 border border-rose-200 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Vaciar Historial</span>
                  </button>
                )}
              </div>

              {/* History Empty State */}
              {history.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                    <History className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">Aún no hay platos guardados</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Cuando analices una comida mediante imagen o manualmente, haz clic en el botón "Guardar en Historial" para registrarla aquí.
                  </p>
                  <button
                    onClick={() => setActiveTab("analizador")}
                    className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Comenzar Análisis
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar platos o ingredientes..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:bg-white outline-none transition-all"
                    />
                    <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                  </div>

                  {/* List Container */}
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
                    {filteredHistory.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 italic">
                        Ningún plato coincide con tu búsqueda "{historySearch}".
                      </div>
                    ) : (
                      filteredHistory.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleViewHistoryDetail(item)}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-start gap-3">
                            {/* Type Indicator */}
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${item.isManual ? "bg-amber-500" : "bg-blue-500"} shadow-sm flex-shrink-0`}>
                              {item.isManual ? <Utensils className="w-4.5 h-4.5" /> : <Camera className="w-4.5 h-4.5" />}
                            </div>

                            <div className="space-y-0.5">
                              <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                                {item.result.plato_analizado}
                              </h4>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {item.date}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {item.time}
                                </span>
                                <span className="px-1.5 py-0.2 bg-slate-100 rounded font-mono text-[9px]">
                                  {item.isManual ? "MANUAL" : "IMAGEN"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Stats and action */}
                          <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                            <div className="flex items-center gap-5 text-right font-mono text-xs">
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Calorías</p>
                                <p className="font-extrabold text-slate-800">{item.result.informacion_nutricional.calorias_totales} kcal</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Esfuerzo</p>
                                <p className="font-extrabold text-orange-600">🏃‍♂️ {item.result.ejercicio.distancia_estimada_km} km</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                              >
                                Ver Ficha
                              </button>
                              <button
                                onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                                className="p-2 text-slate-300 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar del historial"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: USER SPORTS PROFILE */}
          {activeTab === "perfil" && (
            <motion.div
              key="perfil-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              
              {/* Profile Fields Column */}
              <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-600" />
                    Mi Perfil Deportivo
                  </h3>
                  <p className="text-xs text-slate-400">Tus datos físicos sirven para recalcular con precisión científica tu TDEE (gasto diario) y las metas de running necesarias para metabolizar cada plato.</p>
                </div>

                <div className="space-y-4">
                  
                  {/* Genero Row */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Género Biológico</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleSaveProfile({ ...userProfile, genero: "masculino" })}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          userProfile.genero === "masculino"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/10"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        Masculino
                      </button>
                      <button
                        onClick={() => handleSaveProfile({ ...userProfile, genero: "femenino" })}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          userProfile.genero === "femenino"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/10"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        Femenino
                      </button>
                    </div>
                  </div>

                  {/* Edad Input */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Edad (Años)</label>
                    <input
                      type="number"
                      min="5"
                      max="110"
                      value={userProfile.edad}
                      onChange={(e) => handleSaveProfile({ ...userProfile, edad: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
                    />
                  </div>

                  {/* Peso Input */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Peso Corporal (kg)</label>
                    <input
                      type="number"
                      min="20"
                      max="250"
                      value={userProfile.peso_kg}
                      onChange={(e) => handleSaveProfile({ ...userProfile, peso_kg: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
                    />
                  </div>

                  {/* Altura Input */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Altura (cm)</label>
                    <input
                      type="number"
                      min="50"
                      max="250"
                      value={userProfile.altura_cm}
                      onChange={(e) => handleSaveProfile({ ...userProfile, altura_cm: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
                    />
                  </div>

                  {/* Nivel de actividad dropdown */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nivel de Actividad Física</label>
                    <select
                      value={userProfile.nivel_actividad}
                      onChange={(e) => handleSaveProfile({ ...userProfile, nivel_actividad: e.target.value as any })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white font-semibold cursor-pointer"
                    >
                      <option value="sedentario">Sedentario (Trabajo de escritorio, poco ejercicio)</option>
                      <option value="ligero">Actividad Ligera (Ejercicio suave 1-3 días/semana)</option>
                      <option value="moderado">Actividad Moderada (Entrenamiento 3-5 días/semana)</option>
                      <option value="activo">Actividad Alta (Deporte intenso diario)</option>
                      <option value="muy activo">Atleta Pro (Entrenamientos dobles diarios)</option>
                    </select>
                  </div>

                  <div className="bg-emerald-50 text-emerald-800 text-[10px] p-3 rounded-xl border border-emerald-100 flex items-start gap-2 leading-relaxed">
                    <Info className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Los cambios se guardan y aplican automáticamente para todos los cálculos futuros de running y balances calóricos.</span>
                  </div>

                </div>
              </div>

              {/* Calculated Sports Metrics Column */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Calories summary board */}
                <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-emerald-600" />
                      Tus Parámetros Metabólicos Calculados
                    </h3>
                    <p className="text-xs text-slate-400">Cálculos matemáticos del cuerpo mediante la ecuación de Harris-Benedict adaptada.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* BMR */}
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Tasa Metabólica Basal (BMR)</span>
                      <p className="text-2xl font-black text-slate-900">{sportsMetrics.bmr} <span className="text-xs font-semibold text-slate-400">kcal</span></p>
                      <p className="text-[10px] text-slate-500 leading-relaxed">Energía indispensable que consume tu cuerpo en reposo absoluto para mantenerse vivo.</p>
                    </div>

                    {/* TDEE */}
                    <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">Gasto Energético Total Diario (TDEE)</span>
                      <p className="text-2.5xl font-black text-emerald-800">{sportsMetrics.tdee} <span className="text-xs font-semibold text-emerald-600">kcal</span></p>
                      <p className="text-[10px] text-emerald-700/80 leading-relaxed">Tu meta calórica de mantenimiento diario ajustada a tu gasto por ejercicio físico.</p>
                    </div>
                  </div>
                </div>

                {/* Sports Macros Guidance targets */}
                <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                      Distribución Diaria Recomendada para Deportistas
                    </h3>
                    <p className="text-xs text-slate-400">Distribución balanceada óptima para recomposición corporal (30% Proteína, 45% Carbohidratos, 25% Grasa).</p>
                  </div>

                  <div className="space-y-4">
                    
                    {/* Protein bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-end text-xs font-semibold">
                        <span className="text-blue-600">Proteínas (Construcción Muscular)</span>
                        <span className="font-bold text-slate-900">{sportsMetrics.targetProt} g <span className="text-slate-400 text-[10px] font-normal">({Math.round(sportsMetrics.targetProt * 4)} kcal)</span></span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full w-[30%]"></div>
                      </div>
                    </div>

                    {/* Carbs bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-end text-xs font-semibold">
                        <span className="text-amber-600">Carbohidratos (Energía y Rendimiento)</span>
                        <span className="font-bold text-slate-900">{sportsMetrics.targetCarb} g <span className="text-slate-400 text-[10px] font-normal">({Math.round(sportsMetrics.targetCarb * 4)} kcal)</span></span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full w-[45%]"></div>
                      </div>
                    </div>

                    {/* Fat bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-end text-xs font-semibold">
                        <span className="text-rose-600">Grasas Saludables (Regulación Hormonal)</span>
                        <span className="font-bold text-slate-900">{sportsMetrics.targetFat} g <span className="text-slate-400 text-[10px] font-normal">({Math.round(sportsMetrics.targetFat * 9)} kcal)</span></span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full w-[25%]"></div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

            </motion.div>
          )}

          {/* TAB 4: GOALS & ACHIEVEMENTS */}
          {activeTab === "metas" && (
            <GoalsTab history={history} username={currentUser.username} />
          )}

        </AnimatePresence>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-auto text-center text-xs text-slate-500" id="app-footer">
        <div className="max-w-6xl mx-auto px-6 space-y-1.5">
          <p className="font-semibold text-slate-700">NutriRun v2.4 — Analizador de Nutrición y Gasto Metabólico • Ciencias del Deporte</p>
          <p className="text-[10px] text-slate-400 max-w-md mx-auto leading-relaxed">Este informe es una estimación científica aproximada. No sustituye el diagnóstico de un profesional médico o nutricionista.</p>
          <p className="text-[10px] text-slate-300 mt-1">v1.0 · Una aplicación creada para Tatiana 💚</p>
        </div>
      </footer>
    </div>
  );
}
