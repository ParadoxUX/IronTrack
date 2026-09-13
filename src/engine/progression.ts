export interface SetEntry {
  weight: number;
  reps: number;
  rir: number;
}

export interface ProgressionResult {
  nextWeight: number;
  targetReps: string;
  cue: string;
  tonnage: number;
  status: 'increase_weight' | 'increase_reps' | 'maintain';
}

export function computeNextTarget(
  sets: SetEntry[],
  minReps = 8,
  maxReps = 10,
  weightStep = 2.5
): ProgressionResult {
  if (sets.length === 0) {
    return {
      nextWeight: 60,
      targetReps: `${minReps}-${maxReps}`,
      cue: "Начни с разминки и зафиксируй стартовый рабочий вес",
      tonnage: 0,
      status: 'maintain'
    };
  }

  // 1. Тоннаж и ключевые показатели по ВСЕМ 3 подходам
  const tonnage = sets.reduce((acc, s) => acc + (s.weight * s.reps), 0);
  const minRepsDone = Math.min(...sets.map(s => s.reps));
  const avgRir = sets.reduce((acc, s) => acc + s.rir, 0) / sets.length;
  const baseWeight = sets[0].weight;
  const dropOff = sets[0].reps - sets[sets.length - 1].reps;

  // 2. ВСЕ подходы закрыты на максимум (например: 10, 10, 10)
  const allHitMax = sets.every(s => s.reps >= maxReps);
  if (allHitMax && avgRir >= 1) {
    return {
      nextWeight: baseWeight + weightStep,
      targetReps: `${minReps}`,
      cue: `Все 3 подхода закрыты по максимуму! Тоннаж: ${tonnage} кг. Добавляем +${weightStep} кг на ${minReps} повт.`,
      tonnage,
      status: 'increase_weight'
    };
  }

  // 3. Максимум закрыт, но в полный отказ (RIR 0)
  if (allHitMax && avgRir === 0) {
    return {
      nextWeight: baseWeight,
      targetReps: `${maxReps}`,
      cue: `Все 3 подхода сделаны в отказ. Закрепляем вес ${baseWeight} кг с запасом сил (RIR 1-2).`,
      tonnage,
      status: 'maintain'
    };
  }

  // 4. Сильный спад к 3-му подходу (например: 10 -> 8 -> 6)
  if (dropOff >= 3 || minRepsDone < minReps) {
    return {
      nextWeight: baseWeight,
      targetReps: `${minReps}`,
      cue: `Просадка к 3-му сету на ${dropOff} повт (утомление). Вес держим, цель — подтянуть 3-й сет минимум до ${minReps}.`,
      tonnage,
      status: 'maintain'
    };
  }

  // 5. Рабочий коридор (например: 10, 9, 8). Подтягиваем отстающие сеты
  return {
    nextWeight: baseWeight,
    targetReps: `${minRepsDone + 1}`,
    cue: `Тоннаж: ${tonnage} кг. 1-й подход в норме, цель на следующий раз: дожать 2-й и 3-й сеты до ${minRepsDone + 1} повт.`,
    tonnage,
    status: 'increase_reps'
  };
}