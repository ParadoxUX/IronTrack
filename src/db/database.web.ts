export interface ExerciseDef {
  id: string;
  day_id: string;
  name: string;
  target_muscle: string;
  default_weight: number;
  weight_step: number;
  target_min_reps: number;
  target_max_reps: number;
  tempo: string;
  order_index: number;
}

export interface UserProfile {
  username: string;
  avatar_uri: string | null;
  body_weight: number;
  height: number;
  rest_seconds: number;
  max_bench: number;
}

export interface PastSet {
  weight: number;
  reps: number;
  rir: number;
  created_at: string;
}

const DEFAULT_DAYS = [
  { id: 'push', title: 'День 1: Жим (Грудь / Дельты)' },
  { id: 'pull', title: 'День 2: Тяга (Спина / Руки)' },
  { id: 'legs', title: 'День 3: Ноги (Жим платформы / Икры)' },
  { id: 'upper', title: 'День 4: Верх тела (Симметрия)' },
];

const DEFAULT_EXERCISES: ExerciseDef[] = [
  // PUSH
  { id: 'p1', day_id: 'push', name: 'Жим гантелей на наклонной скамье 30°', target_muscle: 'chest', default_weight: 22, weight_step: 2, target_min_reps: 8, target_max_reps: 12, tempo: '3-1-1', order_index: 1 },
  { id: 'p2', day_id: 'push', name: 'Отжимания на брусьях / гравитроне', target_muscle: 'chest', default_weight: 0, weight_step: 2.5, target_min_reps: 8, target_max_reps: 12, tempo: '3-1-1', order_index: 2 },
  { id: 'p3', day_id: 'push', name: 'Махи с гантелями в стороны стоя', target_muscle: 'shoulders', default_weight: 10, weight_step: 1, target_min_reps: 12, target_max_reps: 15, tempo: '2-1-2', order_index: 3 },
  { id: 'p4', day_id: 'push', name: 'Французский жим с гантелями лёжа', target_muscle: 'arms', default_weight: 12, weight_step: 2, target_min_reps: 10, target_max_reps: 12, tempo: '3-1-1', order_index: 4 },

  // PULL
  { id: 'pl1', day_id: 'pull', name: 'Тяга верхнего блока к груди', target_muscle: 'back', default_weight: 55, weight_step: 5, target_min_reps: 8, target_max_reps: 12, tempo: '3-1-1', order_index: 1 },
  { id: 'pl2', day_id: 'pull', name: 'Горизонтальная тяга блока к поясу', target_muscle: 'back', default_weight: 50, weight_step: 5, target_min_reps: 8, target_max_reps: 12, tempo: '3-1-1', order_index: 2 },
  { id: 'pl3', day_id: 'pull', name: 'Face Pulls (Тяга каната к лицу)', target_muscle: 'shoulders', default_weight: 25, weight_step: 2.5, target_min_reps: 12, target_max_reps: 15, tempo: '2-1-2', order_index: 3 },
  { id: 'pl4', day_id: 'pull', name: 'Сгибания рук с гантелями сидя', target_muscle: 'arms', default_weight: 14, weight_step: 2, target_min_reps: 10, target_max_reps: 12, tempo: '3-1-1', order_index: 4 },

  // LEGS
  { id: 'l1', day_id: 'legs', name: 'Жим ногами в тренажере', target_muscle: 'legs', default_weight: 120, weight_step: 10, target_min_reps: 10, target_max_reps: 15, tempo: '3-1-1', order_index: 1 },
  { id: 'l2', day_id: 'legs', name: 'Сгибания ног лежа в тренажере', target_muscle: 'legs', default_weight: 40, weight_step: 5, target_min_reps: 10, target_max_reps: 12, tempo: '3-1-1', order_index: 2 },
  { id: 'l3', day_id: 'legs', name: 'Разгибания ног в тренажере', target_muscle: 'legs', default_weight: 45, weight_step: 5, target_min_reps: 12, target_max_reps: 15, tempo: '2-1-2', order_index: 3 },
  { id: 'l4', day_id: 'legs', name: 'Подъемы на носки в тренажере', target_muscle: 'legs', default_weight: 50, weight_step: 5, target_min_reps: 12, target_max_reps: 15, tempo: '2-2-1', order_index: 4 },

  // UPPER
  { id: 'u1', day_id: 'upper', name: 'Жим гантелей сидя на скамье 75°', target_muscle: 'shoulders', default_weight: 18, weight_step: 2, target_min_reps: 8, target_max_reps: 12, tempo: '3-1-1', order_index: 1 },
  { id: 'u2', day_id: 'upper', name: 'Тяга гантели одной рукой в упоре', target_muscle: 'back', default_weight: 24, weight_step: 2, target_min_reps: 8, target_max_reps: 12, tempo: '3-1-1', order_index: 2 },
  { id: 'u3', day_id: 'upper', name: 'Сведения в тренажере Бабочка', target_muscle: 'chest', default_weight: 45, weight_step: 5, target_min_reps: 10, target_max_reps: 15, tempo: '3-1-1', order_index: 3 },
  { id: 'u4', day_id: 'upper', name: 'Молотковые сгибания с гантелями', target_muscle: 'arms', default_weight: 14, weight_step: 2, target_min_reps: 10, target_max_reps: 12, tempo: '3-1-1', order_index: 4 },
];

const STORAGE_KEYS = {
  PROFILE: 'irontrack_profile',
  SETS: 'irontrack_sets',
  TARGETS: 'irontrack_targets',
  PROTEIN: 'irontrack_protein',
  WEIGHT_LOGS: 'irontrack_weight_logs'
};

export function initDatabase() {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem(STORAGE_KEYS.PROFILE)) {
    const defaultProfile: UserProfile = {
      username: 'chuvak',
      avatar_uri: null,
      body_weight: 75.0,
      height: 180,
      rest_seconds: 90,
      max_bench: 60.0
    };
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(defaultProfile));
  }
}

export function getAllWorkoutDays() {
  return DEFAULT_DAYS;
}

export function getExercisesForDay(dayId: string): ExerciseDef[] {
  return DEFAULT_EXERCISES.filter(e => e.day_id === dayId);
}

export function getUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { username: 'chuvak', avatar_uri: null, body_weight: 75.0, height: 180, rest_seconds: 90, max_bench: 60.0 };
}

export function updateUserProfile(data: Partial<UserProfile>) {
  try {
    const current = getUserProfile();
    const next = { ...current, ...data };
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(next));
  } catch {}
}

export function getWorkoutStats(): { count: number; tonnageKg: number } {
  try {
    const sets = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETS) || '[]');
    const workoutIds = new Set(sets.map((s: any) => s.workout_id));
    const tonnage = sets.reduce((acc: number, s: any) => acc + (s.weight * s.reps), 0);
    return { count: workoutIds.size, tonnageKg: tonnage };
  } catch {
    return { count: 0, tonnageKg: 0 };
  }
}

export function saveCompletedSet(workoutId: string, exerciseId: string, weight: number, reps: number, rir: number) {
  try {
    const sets = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETS) || '[]');
    sets.push({
      workout_id: workoutId,
      exercise_id: exerciseId,
      weight,
      reps,
      rir,
      created_at: new Date().toISOString()
    });
    localStorage.setItem(STORAGE_KEYS.SETS, JSON.stringify(sets));
  } catch {}
}

export function saveNextTarget(exerciseId: string, weight: number, reps: string, cue: string) {
  try {
    const targets = JSON.parse(localStorage.getItem(STORAGE_KEYS.TARGETS) || '{}');
    targets[exerciseId] = { weight, targetReps: reps, cue };
    localStorage.setItem(STORAGE_KEYS.TARGETS, JSON.stringify(targets));
  } catch {}
}

export function getNextTarget(exerciseId: string): { weight: number; targetReps: string; cue: string } | null {
  try {
    const targets = JSON.parse(localStorage.getItem(STORAGE_KEYS.TARGETS) || '{}');
    return targets[exerciseId] || null;
  } catch {
    return null;
  }
}

export function getPastWorkoutSets(exerciseId: string, currentWorkoutId: string): PastSet[] {
  try {
    const sets = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETS) || '[]');
    return sets
      .filter((s: any) => s.exercise_id === exerciseId && s.workout_id !== currentWorkoutId)
      .slice(-3)
      .map((s: any) => ({ weight: s.weight, reps: s.reps, rir: s.rir, created_at: s.created_at }));
  } catch {
    return [];
  }
}

export function getWeeklyVolumeByMuscle(): Record<string, number> {
  const result: Record<string, number> = { chest: 0, back: 0, legs: 0, shoulders: 0, arms: 0 };
  try {
    const sets = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETS) || '[]');
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    sets.forEach((s: any) => {
      if (new Date(s.created_at).getTime() >= oneWeekAgo) {
        const def = DEFAULT_EXERCISES.find(e => e.id === s.exercise_id);
        if (def && result[def.target_muscle] !== undefined) {
          result[def.target_muscle] += 1;
        }
      }
    });
  } catch {}
  return result;
}

export function getTodayProteinStatus(): boolean {
  try {
    const record = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROTEIN) || '{}');
    const today = new Date().toISOString().split('T')[0];
    return record.date === today && !!record.status;
  } catch {
    return false;
  }
}

export function toggleTodayProtein(): boolean {
  try {
    const today = new Date().toISOString().split('T')[0];
    const current = getTodayProteinStatus();
    const next = !current;
    localStorage.setItem(STORAGE_KEYS.PROTEIN, JSON.stringify({ date: today, status: next }));
    return next;
  } catch {
    return false;
  }
}

export function logBodyWeightEntry(w: number) {
  try {
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.WEIGHT_LOGS) || '[]');
    logs.push({ date: new Date().toISOString().split('T')[0], weight: w });
    localStorage.setItem(STORAGE_KEYS.WEIGHT_LOGS, JSON.stringify(logs));
  } catch {}
}