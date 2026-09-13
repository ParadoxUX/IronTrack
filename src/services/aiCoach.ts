const GEMINI_API_KEY = "AQ.Ab8RN6KkZP_j3MyhJpgp41dSigzl4sgnoJWiECbcC_R0uJtfSQ";

export interface CoachInsight {
  nextWeight: number;
  nextReps: string;
  verdict: string;
  techniqueCues: string[];
  fatigueWarning: boolean;
}

export async function consultAiCoach(
  exerciseName: string,
  sets: { weight: number; reps: number; rir: number }[],
  athleteNote = ""
): Promise<CoachInsight> {
  const totalTonnage = sets.reduce((acc, s) => acc + (s.weight * s.reps), 0);
  const safeSets = sets.length > 0 ? sets : [{ weight: 60, reps: 8, rir: 1 }];

  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes("ВСТАВЬ")) {
    const all10 = safeSets.every(s => s.reps >= 10);
    return {
      nextWeight: all10 ? safeSets[0].weight + 2.5 : safeSets[0].weight,
      nextReps: all10 ? "8" : "8-10",
      verdict: all10 
        ? `Все подходы закрыты. Тоннаж ${totalTonnage} кг. Добавляем вес.` 
        : `Подтягивай объем на 2-м и 3-м подходах. Тоннаж: ${totalTonnage} кг.`,
      techniqueCues: [
        "Не повышай вес, пока 2-й и 3-й сеты не сравняются с 1-м",
        "Держи паузу 2-3 минуты между тяжелыми подходами"
      ],
      fatigueWarning: (safeSets[0].reps - safeSets[safeSets.length - 1].reps) >= 3
    };
  }

  const prompt = `
Ты — элитный методист по силовой подготовке.
Упражнение: ${exerciseName}
Подходы: ${JSON.stringify(safeSets)}
Суммарный тоннаж: ${totalTonnage} кг
Заметка атлета: "${athleteNote || 'Норма'}"

Оцени утомление и динамику всех подходов. Ответ выдай строго в JSON:
{
  "nextWeight": number,
  "nextReps": "8-10",
  "verdict": "краткий вывод",
  "techniqueCues": ["совет 1", "совет 2"],
  "fatigueWarning": boolean
}
`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      }
    );

    const data = await res.json();
    const raw = JSON.parse(data.candidates[0].content.parts[0].text);

    return {
      nextWeight: Number(raw.nextWeight) || safeSets[0].weight,
      nextReps: String(raw.nextReps || "8-10"),
      verdict: String(raw.verdict || "Анализ завершен"),
      techniqueCues: Array.isArray(raw.techniqueCues) 
        ? raw.techniqueCues 
        : Array.isArray(raw.technique_cues) 
        ? raw.technique_cues 
        : ["Контролируй траекторию и скорость опускания снаряда"],
      fatigueWarning: Boolean(raw.fatigueWarning)
    };
  } catch (e: any) {
    console.warn("Сбой сети/API:", e.message);
    const all10 = safeSets.every(s => s.reps >= 10);
    return {
      nextWeight: all10 ? safeSets[0].weight + 2.5 : safeSets[0].weight,
      nextReps: all10 ? "8" : "8-10",
      verdict: `Оффлайн-расчет: суммарный тоннаж ${totalTonnage} кг.`,
      techniqueCues: [
        "Фокусируйся на стабильности повторений от первого к последнему подходу",
        "Контролируй эксцентрическую фазу движения"
      ],
      fatigueWarning: false
    };
  }
}