import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { 
  getAllWorkoutDays, 
  getExercisesForDay, 
  getUserProfile,
  updateUserProfile,
  getWorkoutStats,
  saveCompletedSet, 
  saveNextTarget, 
  getNextTarget, 
  getPastWorkoutSets,
  getWeeklyVolumeByMuscle,
  getTodayProteinStatus,
  toggleTodayProtein,
  logBodyWeightEntry,
  ExerciseDef,
  UserProfile,
  PastSet 
} from '../db/database';
import { computeNextTarget } from '../engine/progression';
import { consultAiCoach, CoachInsight } from '../services/aiCoach';

export interface WorkoutSet {
  id: number;
  weight: number;
  reps: number;
  rir: number;
  isCompleted: boolean;
}

export interface ExerciseSession {
  def: ExerciseDef;
  sets: WorkoutSet[];
  pastSets: PastSet[];
  nextTarget: { weight: number; targetReps: string; cue: string } | null;
  aiInsight?: CoachInsight | null;
  isFinished: boolean;
}

interface WorkoutState {
  availableDays: { id: string; title: string }[];
  currentDayId: string;
  workoutId: string;
  exercises: ExerciseSession[];
  activeExerciseIndex: number;
  timerSeconds: number;
  isTimerActive: boolean;
  isAiLoading: boolean;

  user: User | null;
  session: Session | null;

  profile: UserProfile;
  stats: { count: number; tonnageKg: number };
  weeklyVolume: Record<string, number>;
  isProteinReachedToday: boolean;

  bootstrap: () => void;
  checkSession: () => Promise<void>;
  signOut: () => Promise<void>;
  switchDay: (dayId: string) => void;
  selectExercise: (index: number) => void;
  updateSet: (setId: number, field: 'weight' | 'reps' | 'rir', delta: number) => void;
  addSet: () => void;
  removeSet: (setId: number) => void;
  toggleCompleteSet: (setId: number) => void;
  finishCurrentExercise: () => void;
  askAiCoachForActiveExercise: (note?: string) => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => void;
  toggleProtein: () => void;
  addWeightLog: (w: number) => void;
  tickTimer: () => void;
  resetTimer: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  availableDays: [],
  currentDayId: 'push',
  workoutId: `wo_${Date.now()}`,
  exercises: [],
  activeExerciseIndex: 0,
  timerSeconds: 0,
  isTimerActive: false,
  isAiLoading: false,

  user: null,
  session: null,

  profile: {
    username: 'chuvak',
    avatar_uri: null,
    body_weight: 75.0,
    height: 180,
    rest_seconds: 90,
    max_bench: 60.0,
  },
  stats: { count: 0, tonnageKg: 0 },
  weeklyVolume: { chest: 0, back: 0, legs: 0, shoulders: 0, arms: 0 },
  isProteinReachedToday: false,

  bootstrap: () => {
    const days = getAllWorkoutDays();
    const prof = getUserProfile();
    const st = getWorkoutStats();
    const vol = getWeeklyVolumeByMuscle();
    const protein = getTodayProteinStatus();

    set({ 
      availableDays: days,
      profile: prof,
      stats: st,
      weeklyVolume: vol,
      isProteinReachedToday: protein
    });
    get().switchDay(days[0]?.id || 'push');
  },

  checkSession: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, user: session?.user || null });

      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user || null });
      });
    } catch (e) {
      console.log('Supabase session check error:', e);
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ session: null, user: null });
    } catch (e) {
      console.log('SignOut error:', e);
    }
  },

  switchDay: (dayId: string) => {
    const defs = getExercisesForDay(dayId);
    const newWorkoutId = `wo_${Date.now()}`;

    const sessions: ExerciseSession[] = defs.map(def => {
      const cached = getNextTarget(def.id);
      const past = getPastWorkoutSets(def.id, newWorkoutId);
      const startWeight = cached ? cached.weight : (past[0]?.weight || def.default_weight);

      return {
        def,
        nextTarget: cached || null,
        pastSets: past,
        isFinished: false,
        sets: [
          { id: 1, weight: startWeight, reps: def.target_min_reps, rir: 2, isCompleted: false },
          { id: 2, weight: startWeight, reps: def.target_min_reps, rir: 1, isCompleted: false },
          { id: 3, weight: startWeight, reps: def.target_min_reps, rir: 0, isCompleted: false },
        ]
      };
    });

    set({
      currentDayId: dayId,
      workoutId: newWorkoutId,
      exercises: sessions,
      activeExerciseIndex: 0,
      isTimerActive: false,
      timerSeconds: 0
    });
  },

  selectExercise: (index) => {
    set({ activeExerciseIndex: index });
  },

  updateSet: (setId, field, delta) => {
    set(state => {
      const updated = [...state.exercises];
      const active = updated[state.activeExerciseIndex];
      if (!active) return state;

      active.sets = active.sets.map(s => {
        if (s.id !== setId) return s;
        const val = Math.max(0, s[field] + delta);
        return { ...s, [field]: Number(val.toFixed(2)) };
      });

      return { exercises: updated };
    });
  },

  addSet: () => {
    set(state => {
      const updated = [...state.exercises];
      const active = updated[state.activeExerciseIndex];
      if (!active) return state;

      const lastSet = active.sets[active.sets.length - 1];
      const newSet: WorkoutSet = {
        id: (lastSet ? lastSet.id : 0) + 1,
        weight: lastSet ? lastSet.weight : active.def.default_weight,
        reps: lastSet ? lastSet.reps : active.def.target_min_reps,
        rir: 1,
        isCompleted: false,
      };

      active.sets.push(newSet);
      return { exercises: updated };
    });
  },

  removeSet: (setId: number) => {
    set(state => {
      const updated = [...state.exercises];
      const active = updated[state.activeExerciseIndex];
      if (!active || active.sets.length <= 1) return state;

      active.sets = active.sets.filter(s => s.id !== setId);
      return { exercises: updated };
    });
  },

  toggleCompleteSet: (setId) => {
    const { workoutId, exercises, activeExerciseIndex, profile } = get();
    const currentEx = exercises[activeExerciseIndex];
    if (!currentEx) return;

    const targetSet = currentEx.sets.find(s => s.id === setId);
    if (!targetSet) return;

    const nextState = !targetSet.isCompleted;

    set(state => {
      const updated = [...state.exercises];
      const ex = updated[state.activeExerciseIndex];
      ex.sets = ex.sets.map(s => s.id === setId ? { ...s, isCompleted: nextState } : s);

      if (nextState) {
        saveCompletedSet(workoutId, currentEx.def.id, targetSet.weight, targetSet.reps, targetSet.rir);
        const st = getWorkoutStats();
        const vol = getWeeklyVolumeByMuscle();

        // Персональный интервал отдыха для конкретного упражнения
        const restDuration = currentEx.def.rest_seconds || profile.rest_seconds || 90;

        return { 
          exercises: updated, 
          stats: st, 
          weeklyVolume: vol, 
          isTimerActive: true, 
          timerSeconds: restDuration 
        };
      }
      return { exercises: updated };
    });
  },

  finishCurrentExercise: () => {
    const { exercises, activeExerciseIndex } = get();
    const current = exercises[activeExerciseIndex];
    if (!current || current.sets.length === 0) return;

    const completed = current.sets.filter(s => s.isCompleted);
    const setsToAnalyze = completed.length > 0 ? completed : current.sets;

    const res = computeNextTarget(
      setsToAnalyze, 
      current.def.target_min_reps, 
      current.def.target_max_reps, 
      current.def.weight_step
    );

    saveNextTarget(current.def.id, res.nextWeight, res.targetReps, res.cue);

    set(state => {
      const updated = [...state.exercises];
      updated[state.activeExerciseIndex] = {
        ...current,
        isFinished: true,
        nextTarget: {
          weight: res.nextWeight,
          targetReps: res.targetReps,
          cue: res.cue
        }
      };

      const nextIndex = (state.activeExerciseIndex + 1) < updated.length 
        ? state.activeExerciseIndex + 1 
        : state.activeExerciseIndex;

      return { exercises: updated, activeExerciseIndex: nextIndex, isTimerActive: false };
    });
  },

  askAiCoachForActiveExercise: async (note = "") => {
    const { exercises, activeExerciseIndex } = get();
    const current = exercises[activeExerciseIndex];
    if (!current) return;

    set({ isAiLoading: true });

    const insight = await consultAiCoach(
      current.def.name,
      current.sets.map(s => ({ weight: s.weight, reps: s.reps, rir: s.rir })),
      note
    );

    if (insight) {
      saveNextTarget(current.def.id, insight.nextWeight, insight.nextReps, insight.techniqueCues[0]);
    }

    set(state => {
      const updated = [...state.exercises];
      const active = updated[state.activeExerciseIndex];
      if (active && insight) {
        active.aiInsight = insight;
        active.nextTarget = {
          weight: insight.nextWeight,
          targetReps: insight.nextReps,
          cue: insight.techniqueCues[0]
        };
      }
      return { exercises: updated, isAiLoading: false };
    });
  },

  updateProfileData: (data) => {
    updateUserProfile(data);
    set(state => ({ profile: { ...state.profile, ...data } }));
  },

  toggleProtein: () => {
    const status = toggleTodayProtein();
    set({ isProteinReachedToday: status });
  },

  addWeightLog: (w: number) => {
    logBodyWeightEntry(w);
    set(state => ({ profile: { ...state.profile, body_weight: w } }));
  },

  tickTimer: () => {
    set(state => {
      if (state.timerSeconds <= 1) return { timerSeconds: 0, isTimerActive: false };
      return { timerSeconds: state.timerSeconds - 1 };
    });
  },

  resetTimer: () => {
    set({ timerSeconds: 0, isTimerActive: false });
  }
}));