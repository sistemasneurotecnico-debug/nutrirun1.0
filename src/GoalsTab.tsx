import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Target, Trophy, Plus, Trash2, CheckCircle, Circle,
  Flame, TrendingUp, Star, Zap, Award, Calendar, X,
  Utensils, Activity, ClipboardCheck, Calculator
} from "lucide-react";
import type { HistoryEntry } from "./types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Goal {
  id: string;
  title: string;
  type: "calorias" | "running" | "comidas" | "custom";
  target: number;
  unit: string;
  period: "daily" | "weekly";
  createdAt: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlockedAt: string | null;
  condition: (history: HistoryEntry[], goals: Goal[]) => boolean;
}

interface GoalsTabProps {
  history: HistoryEntry[];
  username: string;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const GOALS_KEY = "nutrirun_goals_v1";
const ACHIEVEMENTS_KEY = "nutrirun_achievements_v1";

function loadGoals(username: string): Goal[] {
  try {
    const raw = localStorage.getItem(`${GOALS_KEY}_${username}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveGoals(username: string, goals: Goal[]) {
  localStorage.setItem(`${GOALS_KEY}_${username}`, JSON.stringify(goals));
}

function loadUnlocked(username: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(`${ACHIEVEMENTS_KEY}_${username}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveUnlocked(username: string, unlocked: Record<string, string>) {
  localStorage.setItem(`${ACHIEVEMENTS_KEY}_${username}`, JSON.stringify(unlocked));
}

// ─── Suggested goals ─────────────────────────────────────────────────────────

const SUGGESTED_GOALS: Omit<Goal, "id" | "createdAt">[] = [
  { title: "Quemar 500 kcal corriendo hoy", type: "running", target: 6.7, unit: "km", period: "daily" },
  { title: "Registrar 3 comidas hoy", type: "comidas", target: 3, unit: "platos", period: "daily" },
  { title: "Mantener < 2000 kcal diarias", type: "calorias", target: 2000, unit: "kcal", period: "daily" },
  { title: "Correr 20 km esta semana", type: "running", target: 20, unit: "km", period: "weekly" },
  { title: "Analizar 10 comidas esta semana", type: "comidas", target: 10, unit: "platos", period: "weekly" },
  { title: "Consumir < 14000 kcal esta semana", type: "calorias", target: 14000, unit: "kcal", period: "weekly" },
];

// ─── Achievements definition ──────────────────────────────────────────────────

const ACHIEVEMENT_DEFS: Omit<Achievement, "unlockedAt">[] = [
  {
    id: "first_meal",
    title: "Primera Comida",
    description: "Registraste tu primer plato",
    icon: <Utensils className="w-6 h-6 text-orange-500" />,
    condition: (h) => h.length >= 1,
  },
  {
    id: "five_meals",
    title: "Cinco Platos",
    description: "Registraste 5 comidas",
    icon: <ClipboardCheck className="w-6 h-6 text-emerald-500" />,
    condition: (h) => h.length >= 5,
  },
  {
    id: "ten_meals",
    title: "Veterano Nutricional",
    description: "Registraste 10 comidas",
    icon: <Trophy className="w-6 h-6 text-amber-500" />,
    condition: (h) => h.length >= 10,
  },
  {
    id: "run_10km",
    title: "10K Runner",
    description: "Acumulaste 10 km de running en tus registros",
    icon: <Activity className="w-6 h-6 text-blue-500" />,
    condition: (h) => h.reduce((acc, e) => acc + (e.result.ejercicio.distancia_estimada_km || 0), 0) >= 10,
  },
  {
    id: "run_50km",
    title: "Ultra Runner",
    description: "Acumulaste 50 km de running en tus registros",
    icon: <Zap className="w-6 h-6 text-purple-500" />,
    condition: (h) => h.reduce((acc, e) => acc + (e.result.ejercicio.distancia_estimada_km || 0), 0) >= 50,
  },
  {
    id: "daily_3",
    title: "Día Completo",
    description: "Registraste 3 comidas en un mismo día",
    icon: <Calendar className="w-6 h-6 text-indigo-500" />,
    condition: (h) => {
      const byDay: Record<string, number> = {};
      h.forEach(e => { byDay[e.date] = (byDay[e.date] || 0) + 1; });
      return Object.values(byDay).some(v => v >= 3);
    },
  },
  {
    id: "goal_created",
    title: "Planificador",
    description: "Creaste tu primera meta personalizada",
    icon: <Target className="w-6 h-6 text-emerald-500" />,
    condition: (_, goals) => goals.some(g => g.type === "custom"),
  },
  {
    id: "manual_analyst",
    title: "Chef Analítico",
    description: "Analizaste 3 comidas de forma manual",
    icon: <Calculator className="w-6 h-6 text-slate-600" />,
    condition: (h) => h.filter(e => e.isManual).length >= 3,
  },
];

// ─── Progress helpers ─────────────────────────────────────────────────────────

function getTodayStr() {
  return new Date().toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function getWeekEntries(history: HistoryEntry[]) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return history.filter(e => {
    // parse date strings like "3 jul 2026"
    try {
      const d = new Date(e.date.replace(/(\d+) (\w+) (\d+)/, "$2 $1, $3"));
      return d >= weekAgo;
    } catch { return false; }
  });
}

function getGoalProgress(goal: Goal, history: HistoryEntry[]): number {
  const entries = goal.period === "daily"
    ? history.filter(e => e.date === getTodayStr())
    : getWeekEntries(history);

  switch (goal.type) {
    case "calorias":
      return entries.reduce((s, e) => s + e.result.informacion_nutricional.calorias_totales, 0);
    case "running":
      return entries.reduce((s, e) => s + e.result.ejercicio.distancia_estimada_km, 0);
    case "comidas":
      return entries.length;
    case "custom":
      return 0; // manual progress not tracked automatically
    default:
      return 0;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GoalsTab({ history, username }: GoalsTabProps) {
  const [goals, setGoals] = useState<Goal[]>(() => loadGoals(username));
  const [unlocked, setUnlocked] = useState<Record<string, string>>(() => loadUnlocked(username));
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [activeSection, setActiveSection] = useState<"metas" | "logros">("metas");

  // New goal form state
  const [newTitle, setNewTitle] = useState("");
  const [newTarget, setNewTarget] = useState<number | "">("");
  const [newUnit, setNewUnit] = useState("km");
  const [newPeriod, setNewPeriod] = useState<"daily" | "weekly">("daily");

  // Check achievements whenever history or goals change
  useEffect(() => {
    const newUnlocked = { ...unlocked };
    let changed = false;
    ACHIEVEMENT_DEFS.forEach(def => {
      if (!newUnlocked[def.id] && def.condition(history, goals)) {
        newUnlocked[def.id] = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
        changed = true;
      }
    });
    if (changed) {
      setUnlocked(newUnlocked);
      saveUnlocked(username, newUnlocked);
    }
  }, [history, goals]);

  const handleAddGoal = () => {
    if (!newTitle.trim() || !newTarget || Number(newTarget) <= 0) return;
    const goal: Goal = {
      id: String(Date.now()),
      title: newTitle.trim(),
      type: "custom",
      target: Number(newTarget),
      unit: newUnit.trim() || "unidades",
      period: newPeriod,
      createdAt: getTodayStr(),
    };
    const updated = [goal, ...goals];
    setGoals(updated);
    saveGoals(username, updated);
    setNewTitle(""); setNewTarget(""); setNewUnit("km"); setNewPeriod("daily");
    setShowAddGoal(false);
  };

  const handleAddSuggested = (s: typeof SUGGESTED_GOALS[0]) => {
    const goal: Goal = { ...s, id: String(Date.now()), createdAt: getTodayStr() };
    const updated = [goal, ...goals];
    setGoals(updated);
    saveGoals(username, updated);
  };

  const handleDeleteGoal = (id: string) => {
    const updated = goals.filter(g => g.id !== id);
    setGoals(updated);
    saveGoals(username, updated);
  };

  const achievements: Achievement[] = ACHIEVEMENT_DEFS.map(def => ({
    ...def,
    unlockedAt: unlocked[def.id] || null,
  }));

  const unlockedCount = achievements.filter(a => a.unlockedAt).length;
  const totalKm = history.reduce((s, e) => s + e.result.ejercicio.distancia_estimada_km, 0);
  const totalKcal = history.reduce((s, e) => s + e.result.informacion_nutricional.calorias_totales, 0);

  return (
    <motion.div
      key="goals-tab"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      {/* Summary ring stats — iOS Fitness style */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Platos registrados", value: history.length, unit: "", icon: <Utensils className="w-5 h-5 text-orange-500" />, color: "bg-orange-50 border-orange-100", textColor: "text-orange-600" },
          { label: "km acumulados", value: totalKm.toFixed(1), unit: "km", icon: <Activity className="w-5 h-5 text-emerald-600" />, color: "bg-emerald-50 border-emerald-100", textColor: "text-emerald-600" },
          { label: "Logros obtenidos", value: `${unlockedCount}/${achievements.length}`, unit: "", icon: <Trophy className="w-5 h-5 text-amber-500" />, color: "bg-amber-50 border-amber-100", textColor: "text-amber-600" },
        ].map((stat, i) => (
          <div key={i} className={`${stat.color} border rounded-2xl p-4 flex flex-col items-center text-center`}>
            <div className="mb-1">{stat.icon}</div>
            <p className={`text-xl font-black ${stat.textColor}`}>{stat.value}</p>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Section tabs */}
      <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 border border-slate-200/50">
        <button onClick={() => setActiveSection("metas")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${activeSection === "metas" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
          <Target className="w-4 h-4 text-emerald-600" /> Metas
        </button>
        <button onClick={() => setActiveSection("logros")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${activeSection === "logros" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
          <Trophy className="w-4 h-4 text-amber-500" /> Logros
          {unlockedCount > 0 && <span className="bg-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">{unlockedCount}</span>}
        </button>
      </div>

      <AnimatePresence mode="wait">

        {/* ── METAS ── */}
        {activeSection === "metas" && (
          <motion.div key="metas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">

            {/* Suggested goals */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600" /> Metas Sugeridas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SUGGESTED_GOALS.map((s, i) => {
                  const alreadyAdded = goals.some(g => g.title === s.title);
                  return (
                    <button key={i} onClick={() => !alreadyAdded && handleAddSuggested(s)} disabled={alreadyAdded}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${alreadyAdded ? "bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default" : "bg-slate-50 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-slate-700"}`}>
                      <span>{s.title}</span>
                      {alreadyAdded ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <Plus className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* My goals */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-600" /> Mis Metas
                </h3>
                <button onClick={() => setShowAddGoal(!showAddGoal)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all">
                  <Plus className="w-3.5 h-3.5" /> Nueva Meta
                </button>
              </div>

              {/* Add goal form */}
              <AnimatePresence>
                {showAddGoal && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Nueva Meta Personalizada</span>
                      <button onClick={() => setShowAddGoal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
                    </div>
                    <input type="text" placeholder="Ej. Correr todos los días" value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-500 transition-all" />
                    <div className="grid grid-cols-3 gap-2">
                      <input type="number" placeholder="Meta" value={newTarget} onChange={e => setNewTarget(e.target.value !== "" ? Number(e.target.value) : "")}
                        className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-500 transition-all" />
                      <input type="text" placeholder="unidad (km, kcal...)" value={newUnit} onChange={e => setNewUnit(e.target.value)}
                        className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-500 transition-all" />
                      <select value={newPeriod} onChange={e => setNewPeriod(e.target.value as "daily" | "weekly")}
                        className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-500 cursor-pointer">
                        <option value="daily">Diaria</option>
                        <option value="weekly">Semanal</option>
                      </select>
                    </div>
                    <button onClick={handleAddGoal}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all">
                      Añadir Meta
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Goals list */}
              {goals.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
                  <Target className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Aún no tienes metas. Añade una sugerida o crea la tuya.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {goals.map(goal => {
                    const progress = getGoalProgress(goal, history);
                    const pct = goal.type === "custom" ? 0 : Math.min(100, Math.round((progress / goal.target) * 100));
                    const done = pct >= 100;
                    return (
                      <div key={goal.id} className={`rounded-xl border p-4 space-y-2.5 ${done ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {done ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />}
                            <span className="text-xs font-bold text-slate-800">{goal.title}</span>
                          </div>
                          <button onClick={() => handleDeleteGoal(goal.id)} className="text-slate-300 hover:text-rose-500 cursor-pointer flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${goal.period === "daily" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                            {goal.period === "daily" ? "DIARIA" : "SEMANAL"}
                          </span>
                          {goal.type !== "custom" ? (
                            <span>{progress.toFixed(goal.type === "running" ? 1 : 0)} / {goal.target} {goal.unit} ({pct}%)</span>
                          ) : (
                            <span>Meta: {goal.target} {goal.unit} · Manual</span>
                          )}
                        </div>
                        {goal.type !== "custom" && (
                          <div className="w-full bg-white h-2 rounded-full overflow-hidden border border-slate-200">
                            <div className={`h-full rounded-full transition-all duration-700 ${done ? "bg-emerald-500" : "bg-emerald-400"}`}
                              style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── LOGROS ── */}
        {activeSection === "logros" && (
          <motion.div key="logros" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" /> Logros
                <span className="text-xs font-semibold text-slate-400 ml-1">{unlockedCount} de {achievements.length} obtenidos</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {achievements.map(a => (
                  <div key={a.id} className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${a.unlockedAt ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200 opacity-60"}`}>
                    <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 ${!a.unlockedAt && "opacity-40 grayscale"}`}>{a.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${a.unlockedAt ? "text-amber-800" : "text-slate-600"}`}>{a.title}</p>
                      <p className="text-[10px] text-slate-400 leading-snug">{a.description}</p>
                      {a.unlockedAt && <p className="text-[9px] text-amber-600 font-semibold mt-0.5">✓ {a.unlockedAt}</p>}
                    </div>
                    {a.unlockedAt && <Star className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
}
