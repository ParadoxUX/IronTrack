import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('irontrack_v4.db');

export interface ExerciseDef {
  id: string;
  workout_day: string;
  name: string;
  target_muscle: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms';
  tempo: string;
  target_min_reps: number;
  target_max_reps: number;
  weight_step: number;
  default_weight: number;
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
}

export function initDatabase() {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY NOT NULL,
      username TEXT DEFAULT 'chuvak',
      avatar_uri TEXT,
      body_weight REAL DEFAULT 75.0,
      height REAL DEFAULT 180,
      rest_seconds INTEGER DEFAULT 90,
      max_bench REAL DEFAULT 60.0
    );

    CREATE TABLE IF NOT EXISTS workout_days (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      order_idx INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY NOT NULL,
      workout_day_id TEXT NOT NULL,
      name TEXT NOT NULL,
      target_muscle TEXT NOT NULL,
      tempo TEXT NOT NULL DEFAULT '3-0-1',
      target_min_reps INTEGER DEFAULT 8,
      target_max_reps INTEGER DEFAULT 10,
      weight_step REAL DEFAULT 2.5,
      default_weight REAL DEFAULT 20.0
    );

    CREATE TABLE IF NOT EXISTS sets_history (
      id TEXT PRIMARY KEY NOT NULL,
      workout_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      weight REAL NOT NULL,
      reps INTEGER NOT NULL,
      rir INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS next_session_targets (
      exercise_id TEXT PRIMARY KEY NOT NULL,
      weight REAL NOT NULL,
      target_reps TEXT NOT NULL,
      cue TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS weight_logs (
      id TEXT PRIMARY KEY NOT NULL,
      weight REAL NOT NULL,
      logged_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_protein (
      date_str TEXT PRIMARY KEY NOT NULL,
      is_done INTEGER DEFAULT 0
    );

    INSERT OR IGNORE INTO user_profile (id, username, body_weight, height, rest_seconds, max_bench)
    VALUES ('me', 'chuvak', 75.0, 180, 90, 60.0);

    INSERT OR IGNORE INTO workout_days (id, title, order_idx) VALUES
    ('push', 'День 1: Push (Грудь / Дельты / Трицепс)', 1),
    ('pull', 'День 2: Pull (Широчайшие / Бицепс)', 2),
    ('legs', 'День 3: Legs (Квадрицепс / Бицепс бедра)', 3),
    ('upper', 'День 4: Upper Body (Верх тела с упором)', 4);

    -- План 1: Push
    INSERT OR IGNORE INTO exercises (id, workout_day_id, name, target_muscle, tempo, target_min_reps, target_max_reps, weight_step, default_weight) VALUES
    ('bench_press', 'push', 'Жим штанги лежа', 'chest', '3-1-1', 6, 8, 2.5, 60.0),
    ('incline_db_press', 'push', 'Жим гантелей под углом 30°', 'chest', '3-0-1', 8, 10, 2.0, 22.0),
    ('chest_press_machine', 'push', 'Жим в хаммере сидя', 'chest', '3-1-1', 8, 10, 2.5, 45.0),
    ('lateral_raises_seated', 'push', 'Махи сидя с упором груди', 'shoulders', '2-1-1', 12, 15, 1.0, 10.0),
    ('rope_pushdown', 'push', 'Разгибания на трицепс с канатом', 'arms', '3-0-1', 10, 12, 2.5, 25.0);

    -- План 2: Pull (Без осевой нагрузки)
    INSERT OR IGNORE INTO exercises (id, workout_day_id, name, target_muscle, tempo, target_min_reps, target_max_reps, weight_step, default_weight) VALUES
    ('lat_pulldown_neutral', 'pull', 'Тяга верхнего блока (нейтральный хват)', 'back', '3-1-1', 8, 10, 2.5, 55.0),
    ('chest_supported_row', 'pull', 'Тяга гантелей с упором грудью в скамью', 'back', '3-1-1', 8, 10, 2.0, 22.0),
    ('seated_cable_row', 'pull', 'Горизонтальная тяга блока к поясу', 'back', '3-1-1', 10, 12, 2.5, 50.0),
    ('peck_deck_rear', 'pull', 'Разведения на заднюю дельту (Peck-Deck)', 'shoulders', '2-1-1', 12, 15, 2.5, 40.0),
    ('scott_curl', 'pull', 'Сгибания на скамье Скотта', 'arms', '3-0-1', 10, 12, 2.0, 25.0),
    ('incline_db_curl', 'pull', 'Сгибания сидя на наклонной скамье', 'arms', '3-0-1', 10, 12, 2.0, 12.0);

    -- План 3: Legs (Безопасно для поясницы)
    INSERT OR IGNORE INTO exercises (id, workout_day_id, name, target_muscle, tempo, target_min_reps, target_max_reps, weight_step, default_weight) VALUES
    ('leg_press_safe', 'legs', 'Жим ногами (спина и таз прижаты)', 'legs', '3-1-1', 8, 10, 10.0, 120.0),
    ('lying_leg_curl', 'legs', 'Сгибания ног лежа в тренажере', 'legs', '3-1-1', 10, 12, 2.5, 35.0),
    ('leg_extensions', 'legs', 'Разгибания ног сидя в тренажере', 'legs', '3-1-1', 10, 12, 2.5, 40.0),
    ('seated_leg_curl', 'legs', 'Сгибания ног сидя в тренажере', 'legs', '3-1-1', 10, 12, 2.5, 35.0),
    ('seated_calf_raise', 'legs', 'Подъемы на носки сидя', 'legs', '3-2-1', 12, 15, 2.5, 40.0);

    -- План 4: Upper Body (Упор корпуса)
    INSERT OR IGNORE INTO exercises (id, workout_day_id, name, target_muscle, tempo, target_min_reps, target_max_reps, weight_step, default_weight) VALUES
    ('seated_db_press', 'upper', 'Жим гантелей сидя со спинкой 75°', 'shoulders', '3-0-1', 6, 8, 2.0, 20.0),
    ('lat_pulldown_wide', 'upper', 'Тяга верхнего блока широким хватом', 'back', '3-1-1', 8, 10, 2.5, 50.0),
    ('incline_smith_press', 'upper', 'Жим в Смите под углом 30°', 'chest', '3-0-1', 8, 10, 2.5, 50.0),
    ('chest_supported_tbar', 'upper', 'Тяга Т-грифа с упором груди', 'back', '3-1-1', 10, 12, 2.5, 35.0),
    ('cable_overhead_triceps', 'upper', 'Французский жим на блоке из-за головы', 'arms', '3-0-1', 10, 12, 2.5, 20.0),
    ('hammer_curl_seated', 'upper', 'Молоты с гантелями сидя с опорой спины', 'arms', '3-0-1', 10, 12, 2.0, 14.0);
  `);
}

export function getUserProfile(): UserProfile {
  const row = db.getFirstSync<UserProfile>(`SELECT username, avatar_uri, body_weight, height, rest_seconds, max_bench FROM user_profile WHERE id = 'me'`);
  return row || { username: 'chuvak', avatar_uri: null, body_weight: 75.0, height: 180, rest_seconds: 90, max_bench: 60.0 };
}

export function updateUserProfile(profile: Partial<UserProfile>) {
  const current = getUserProfile();
  const updated = { ...current, ...profile };
  db.runSync(
    `UPDATE user_profile SET username = ?, avatar_uri = ?, body_weight = ?, height = ?, rest_seconds = ?, max_bench = ? WHERE id = 'me'`,
    [updated.username, updated.avatar_uri, updated.body_weight, updated.height, updated.rest_seconds, updated.max_bench]
  );
}

export function getWorkoutStats(): { count: number; tonnageKg: number } {
  const countRow = db.getFirstSync<{ cnt: number }>(`SELECT COUNT(DISTINCT workout_id) as cnt FROM sets_history`);
  const tonnageRow = db.getFirstSync<{ total: number }>(`SELECT SUM(weight * reps) as total FROM sets_history`);
  return {
    count: countRow?.cnt || 0,
    tonnageKg: tonnageRow?.total || 0,
  };
}

export function getAllWorkoutDays(): { id: string; title: string }[] {
  return db.getAllSync<{ id: string; title: string }>(`SELECT id, title FROM workout_days ORDER BY order_idx ASC`);
}

export function getExercisesForDay(dayId: string): ExerciseDef[] {
  return db.getAllSync<ExerciseDef>(
    `SELECT id, workout_day_id AS workout_day, name, target_muscle, tempo, target_min_reps, target_max_reps, weight_step, default_weight 
     FROM exercises WHERE workout_day_id = ? ORDER BY rowid ASC`,
    [dayId]
  );
}

// Получить сеты прошлой тренировки для этого же упражнения (Призрак)
export function getPastWorkoutSets(exerciseId: string, currentWorkoutId: string): PastSet[] {
  const lastWorkout = db.getFirstSync<{ workout_id: string }>(
    `SELECT workout_id FROM sets_history 
     WHERE exercise_id = ? AND workout_id != ? 
     ORDER BY created_at DESC LIMIT 1`,
    [exerciseId, currentWorkoutId]
  );

  if (!lastWorkout) return [];

  return db.getAllSync<PastSet>(
    `SELECT weight, reps FROM sets_history 
     WHERE exercise_id = ? AND workout_id = ? 
     ORDER BY created_at ASC`,
    [exerciseId, lastWorkout.workout_id]
  );
}

// Подсчет недельного объема (тяжелые рабочие сеты за последние 7 дней)
export function getWeeklyVolumeByMuscle(): Record<string, number> {
  const result: Record<string, number> = {
    chest: 0,
    back: 0,
    legs: 0,
    shoulders: 0,
    arms: 0
  };

  const rows = db.getAllSync<{ target_muscle: string; cnt: number }>(`
    SELECT e.target_muscle, COUNT(s.id) as cnt
    FROM sets_history s
    JOIN exercises e ON s.exercise_id = e.id
    WHERE datetime(s.created_at) >= datetime('now', '-7 days')
    GROUP BY e.target_muscle
  `);

  rows.forEach(r => {
    if (result[r.target_muscle] !== undefined) {
      result[r.target_muscle] = r.cnt;
    }
  });

  return result;
}

export function saveCompletedSet(workoutId: string, exerciseId: string, weight: number, reps: number, rir: number) {
  const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  db.runSync(
    `INSERT INTO sets_history (id, workout_id, exercise_id, weight, reps, rir, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, workoutId, exerciseId, weight, reps, rir, now]
  );
}

export function saveNextTarget(exerciseId: string, weight: number, targetReps: string, cue: string) {
  const now = new Date().toISOString();
  db.runSync(
    `INSERT OR REPLACE INTO next_session_targets (exercise_id, weight, target_reps, cue, updated_at) 
     VALUES (?, ?, ?, ?, ?)`,
    [exerciseId, weight, targetReps, cue, now]
  );
}

export function getNextTarget(exerciseId: string) {
  return db.getFirstSync<{ weight: number; target_reps: string; cue: string }>(
    `SELECT weight, target_reps, cue FROM next_session_targets WHERE exercise_id = ?`,
    [exerciseId]
  );
}

// Трекер белка на сегодня
export function getTodayProteinStatus(): boolean {
  const today = new Date().toISOString().split('T')[0];
  const row = db.getFirstSync<{ is_done: number }>(`SELECT is_done FROM daily_protein WHERE date_str = ?`, [today]);
  return row ? row.is_done === 1 : false;
}

export function toggleTodayProtein(): boolean {
  const today = new Date().toISOString().split('T')[0];
  const current = getTodayProteinStatus();
  const next = current ? 0 : 1;
  db.runSync(`INSERT OR REPLACE INTO daily_protein (date_str, is_done) VALUES (?, ?)`, [today, next]);
  return next === 1;
}

// Логи веса тела
export function logBodyWeightEntry(weight: number) {
  const id = `w_${Date.now()}`;
  const now = new Date().toISOString();
  db.runSync(`INSERT INTO weight_logs (id, weight, logged_at) VALUES (?, ?, ?)`, [id, weight, now]);
  updateUserProfile({ body_weight: weight });
}