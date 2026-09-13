import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  ImageBackground,
  Image,
  Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Check,
  Plus,
  Minus,
  X,
  Trash2,
  ChevronLeft,
  Flame,
  Sparkles,
  WifiOff,
  Camera,
  Activity,
  History,
  LogIn,
  LogOut,
  UserCheck
} from 'lucide-react-native';
import { initDatabase } from './src/db/database';
import { useWorkoutStore } from './src/store/workoutStore';
import { AuthModal } from './src/components/AuthModal';

const ASSETS = {
  bgSplash: require('./assets/custom/bg-splash.jpg'),
  bgMain: require('./assets/custom/bg-main.jpg'),
  defaultAvatar: require('./assets/custom/avatar.jpg'),
  card1: require('./assets/custom/card1.jpg'),
  card2: require('./assets/custom/card2.jpg'),
  card3: require('./assets/custom/card3.jpg'),
};

const TRACK_LIST = [
  { id: 1, title: 'Gym Phonk / Hypertrophy', artist: 'IronTrack Audio' },
  { id: 2, title: 'Deep Focus Synthwave', artist: 'Dark Electronic' },
  { id: 3, title: 'Heavy Duty Motivation', artist: 'Hardstyle Records' },
];

export default function App() {
  const store = useWorkoutStore();
  const [screen, setScreen] = useState<'welcome' | 'workout'>('welcome');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDayPickerOpen, setIsDayPickerOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isVolumeModalOpen, setIsVolumeModalOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [aiNote, setAiNote] = useState('');

  // Поля ввода параметров атлета
  const [weightInput, setWeightInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [benchInput, setBenchInput] = useState('');
  const [restInput, setRestInput] = useState('');

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);

  useEffect(() => {
    initDatabase();
    store.bootstrap();

    // Автоматический вызов формы авторизации, если пользователь не авторизован
    store.checkSession().then(() => {
      const state = useWorkoutStore.getState();
      if (!state.user) {
        setIsAuthOpen(true);
      }
    });
  }, []);

  // Синхронизация полей ввода профиля с состоянием хранилища
  useEffect(() => {
    if (store.profile) {
      setWeightInput(String(store.profile.body_weight ?? 75));
      setHeightInput(String(store.profile.height ?? 180));
      setBenchInput(String(store.profile.max_bench ?? 60));
      setRestInput(String(store.profile.rest_seconds ?? 90));
    }
  }, [store.profile, isProfileOpen]);

  useEffect(() => {
    let interval: any;
    if (store.isTimerActive) {
      interval = setInterval(() => store.tickTimer(), 1000);
    }
    return () => clearInterval(interval);
  }, [store.isTimerActive]);

  const activeDay = store.availableDays?.find(d => d.id === store.currentDayId);
  const activeExercise = store.exercises?.[store.activeExerciseIndex];
  const currentTrack = TRACK_LIST[currentTrackIndex];

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleConsultAi = async () => {
    await store.askAiCoachForActiveExercise(aiNote);
    setIsAiModalOpen(false);
    setAiNote('');
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Доступ закрыт', 'Разреши доступ к фото в настройках iPhone.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      store.updateProfileData({ avatar_uri: result.assets[0].uri });
    }
  };

  const saveUpdatedParams = () => {
    const w = parseFloat(weightInput) || store.profile.body_weight;
    const h = parseFloat(heightInput) || store.profile.height;
    const b = parseFloat(benchInput) || store.profile.max_bench;
    const r = parseInt(restInput, 10) || store.profile.rest_seconds;

    store.addWeightLog(w);
    store.updateProfileData({
      body_weight: w,
      height: h,
      max_bench: b,
      rest_seconds: r,
    });
    Alert.alert('Успешно', 'Параметры атлета обновлены!');
  };

  const avatarSource = store.profile.avatar_uri 
    ? { uri: store.profile.avatar_uri } 
    : ASSETS.defaultAvatar;

  // 1. СТАРТОВЫЙ ЭКРАН
  if (screen === 'welcome') {
    return (
      <ImageBackground source={ASSETS.bgSplash} style={styles.splashBg} resizeMode="cover">
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.splashOverlay}>
          <View style={{ flex: 1 }} />
          <View style={styles.splashContent}>
            <Text style={styles.splashTitle}>IronTracker</Text>

            {store.user ? (
              <>
                <Text style={styles.welcomeUserText}>
                  Атлет: {store.user.email?.split('@')[0]} ✓
                </Text>
                <TouchableOpacity style={styles.splashBtn} onPress={() => setScreen('workout')}>
                  <Text style={styles.splashBtnText}>Продолжить тренировки</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.splashBtn} onPress={() => setIsAuthOpen(true)}>
                <Text style={styles.splashBtnText}>Войти / Создать аккаунт</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.splashBtnSecondary} onPress={() => setIsProfileOpen(true)}>
              <Text style={styles.splashBtnSecondaryText}>Параметры атлета</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        {renderProfileModal()}
        <AuthModal visible={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      </ImageBackground>
    );
  }

  // 2. РАБОЧИЙ ЭКРАН ТРЕНИРОВКИ
  return (
    <ImageBackground source={ASSETS.bgMain} style={styles.mainBg} resizeMode="cover">
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>

        {/* Навбар */}
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.navBackBtn} onPress={() => setScreen('welcome')}>
            <ChevronLeft size={16} color="#A7F3D0" />
            <Text style={styles.navBackText}>Назад</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity style={styles.navVolumeBtn} onPress={() => setIsVolumeModalOpen(true)}>
              <Activity size={14} color="#38BDF8" />
              <Text style={styles.navVolumeText}>Объем</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navProfileBtn} onPress={() => setIsProfileOpen(true)}>
              <Text style={styles.navProfileName}>
                {store.user ? (store.user.email?.split('@')[0] || store.profile.username) : store.profile.username}
              </Text>
              <Image source={avatarSource} style={styles.navAvatar} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Панель виджетов */}
          <View style={styles.dashboardCard}>
            <View style={styles.dashTopRow}>
              <View style={styles.calendarBox}>
                <Text style={styles.calMonthTitle}>September</Text>
                <Text style={styles.calDaysHeader}>S M T W T F S</Text>
                <View style={styles.calGrid}>
                  {Array.from({ length: 30 }).map((_, i) => (
                    <Text key={i} style={[styles.calDayText, i + 1 === 13 && styles.calDayPicked]}>
                      {i + 1}
                    </Text>
                  ))}
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardsScroll}>
                <Image source={ASSETS.card1} style={styles.posterThumb} resizeMode="cover" />
                <Image source={ASSETS.card2} style={styles.posterThumb} resizeMode="cover" />
                <Image source={ASSETS.card3} style={styles.posterThumb} resizeMode="cover" />
              </ScrollView>
            </View>

            {/* Аудиоплеер */}
            <View style={styles.dashBottomBar}>
              <View style={styles.trackInfoBlock}>
                <Image source={avatarSource} style={styles.miniAvatar} />
                <View style={{ marginLeft: 6, maxWidth: 120 }}>
                  <Text style={styles.trackTitleText} numberOfLines={1}>
                    {isPlayingMusic ? currentTrack.title : 'Плеер готов'}
                  </Text>
                  <Text style={styles.trackArtistText} numberOfLines={1}>
                    {isPlayingMusic ? currentTrack.artist : 'IronTrack Audio'}
                  </Text>
                </View>
              </View>

              <View style={styles.mediaControls}>
                <TouchableOpacity onPress={() => setCurrentTrackIndex((currentTrackIndex - 1 + TRACK_LIST.length) % TRACK_LIST.length)}>
                  <Text style={styles.controlIcon}>⏮</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => setIsPlayingMusic(!isPlayingMusic)} 
                  style={[styles.playBtnCircle, isPlayingMusic && styles.playBtnCircleActive]}
                >
                  <Text style={[styles.controlIconPlay, isPlayingMusic && { color: '#042F2E' }]}>
                    {isPlayingMusic ? '⏸' : '▶'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setCurrentTrackIndex((currentTrackIndex + 1) % TRACK_LIST.length)}>
                  <Text style={styles.controlIcon}>⏭</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.offlineStatus}>
                <View style={[styles.statusDot, isPlayingMusic && styles.statusDotActive]} />
                <WifiOff size={11} color="#64748B" />
                <Text style={styles.offlineText}>{isPlayingMusic ? 'Play' : 'Offline'}</Text>
              </View>
            </View>
          </View>

          {/* Плашка белкового якоря */}
          <TouchableOpacity 
            style={[styles.proteinBanner, store.isProteinReachedToday && styles.proteinBannerDone]}
            onPress={store.toggleProtein}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.proteinDot, store.isProteinReachedToday && { backgroundColor: '#10B981' }]} />
              <Text style={styles.proteinText}>
                {store.isProteinReachedToday 
                  ? 'Белок закрыт: ~150г (Анаболическое окно активно) ✓' 
                  : 'Белок на день: нажми, когда съешь норму (140-160г)'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Селектор дня */}
          <View style={styles.daySelectorWrapper}>
            <TouchableOpacity style={styles.dayPillBtn} onPress={() => setIsDayPickerOpen(true)}>
              <View style={styles.dayPillDot} />
              <Text style={styles.dayPillText}>{activeDay?.title || 'Выбрать день'}</Text>
              <Text style={{ color: '#86EFAC', fontSize: 11 }}>▾</Text>
            </TouchableOpacity>
          </View>

          {/* Табы упражнений */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exTabsScroll}>
            {(store.exercises || []).map((item, idx) => {
              const isActive = idx === store.activeExerciseIndex;
              return (
                <TouchableOpacity
                  key={item?.def?.id || idx}
                  onPress={() => store.selectExercise(idx)}
                  style={[
                    styles.exTab,
                    isActive && styles.exTabActive,
                    item?.isFinished && styles.exTabFinished
                  ]}
                >
                  {item?.isFinished && <Check size={11} color="#22C55E" style={{ marginRight: 3 }} />}
                  <Text style={[styles.exTabText, isActive && styles.exTabTextActive]}>
                    {idx + 1}. {item?.def?.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Карточка текущего упражнения */}
          {activeExercise && (
            <View style={styles.exerciseCard}>
              <View style={styles.exHeader}>
                <Text style={styles.exTitle}>{activeExercise.def.name}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  <View style={styles.tempoBadge}>
                    <Text style={styles.tempoBadgeText}>⚡ ТЕМП: {activeExercise.def.tempo}</Text>
                  </View>
                  <View style={styles.muscleBadge}>
                    <Text style={styles.muscleBadgeText}>Фокус: {activeExercise.def.target_muscle.toUpperCase()}</Text>
                  </View>
                  <View style={[styles.tempoBadge, { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <Text style={[styles.tempoBadgeText, { color: '#6EE7B7' }]}>
                      ⏱ ОТДЫХ: {Math.floor((activeExercise.def.rest_seconds || 90) / 60)} мин {((activeExercise.def.rest_seconds || 90) % 60) > 0 ? `${(activeExercise.def.rest_seconds || 90) % 60}с` : ''}
                    </Text>
                  </View>
                </View>
              </View>

              {/* План прогрессии / Gemini */}
              {activeExercise.aiInsight ? (
                <View style={styles.aiInsightBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} color="#38BDF8" />
                    <Text style={styles.aiInsightTitle}>ПЛАН GEMINI COACH</Text>
                  </View>
                  <Text style={styles.aiInsightVerdict}>{activeExercise.aiInsight.verdict}</Text>
                  {(activeExercise.aiInsight.techniqueCues || []).map((cue, i) => (
                    <Text key={i} style={styles.aiInsightCue}>• {cue}</Text>
                  ))}
                </View>
              ) : activeExercise.nextTarget ? (
                <View style={styles.progressionBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Flame size={14} color="#EAB308" />
                    <Text style={styles.progressionTitle}>ЦЕЛЬ НА СЛЕДУЮЩИЙ ШАГ</Text>
                  </View>
                  <Text style={styles.progressionMain}>
                    {activeExercise.nextTarget.weight} кг × {activeExercise.nextTarget.targetReps} повт
                  </Text>
                  <Text style={styles.progressionCue}>{activeExercise.nextTarget.cue}</Text>
                </View>
              ) : null}

              {/* Таблица сетов */}
              <View style={styles.tableHead}>
                <Text style={[styles.th, { width: 24 }]}>№</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>ВЕС (КГ)</Text>
                <Text style={[styles.th, { width: 70, textAlign: 'center' }]}>ПОВТ</Text>
                <Text style={[styles.th, { width: 44, textAlign: 'center' }]}>RIR</Text>
                <Text style={[styles.th, { width: 34 }]}></Text>
                <Text style={[styles.th, { width: 24 }]}></Text>
              </View>

              {(activeExercise.sets || []).map((set, idx) => {
                const past = activeExercise.pastSets[idx];

                return (
                  <View key={set.id} style={{ marginBottom: 6 }}>
                    <View style={styles.pastGhostRow}>
                      <History size={10} color="#64748B" />
                      <Text style={styles.pastGhostText}>
                        {past ? `Прошлый раз: ${past.weight} кг × ${past.reps} повт` : 'Новый сет (первая запись)'}
                      </Text>
                    </View>

                    <View style={[styles.setRow, set.isCompleted && styles.setRowDone]}>
                      <Text style={styles.setNum}>{idx + 1}</Text>

                      <View style={styles.valBox}>
                        <TouchableOpacity onPress={() => store.updateSet(set.id, 'weight', -activeExercise.def.weight_step)} style={styles.stepBtn}>
                          <Minus size={11} color="#CBD5E1" />
                        </TouchableOpacity>
                        <Text style={styles.valNumber}>{set.weight}</Text>
                        <TouchableOpacity onPress={() => store.updateSet(set.id, 'weight', activeExercise.def.weight_step)} style={styles.stepBtn}>
                          <Plus size={11} color="#CBD5E1" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.valBoxSmall}>
                        <TouchableOpacity onPress={() => store.updateSet(set.id, 'reps', -1)} style={styles.stepBtn}>
                          <Minus size={11} color="#CBD5E1" />
                        </TouchableOpacity>
                        <Text style={styles.valNumber}>{set.reps}</Text>
                        <TouchableOpacity onPress={() => store.updateSet(set.id, 'reps', 1)} style={styles.stepBtn}>
                          <Plus size={11} color="#CBD5E1" />
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        onPress={() => store.updateSet(set.id, 'rir', set.rir >= 3 ? -3 : 1)}
                        style={styles.rirChip}
                      >
                        <Text style={styles.rirNum}>{set.rir}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => store.toggleCompleteSet(set.id)}
                        style={[styles.checkBtn, set.isCompleted && styles.checkBtnDone]}
                      >
                        <Check size={16} color={set.isCompleted ? "#064E3B" : "#475569"} />
                      </TouchableOpacity>

                      {(activeExercise.sets.length > 1) ? (
                        <TouchableOpacity onPress={() => store.removeSet(set.id)} style={{ marginLeft: 4 }}>
                          <Trash2 size={14} color="#64748B" />
                        </TouchableOpacity>
                      ) : <View style={{ width: 18 }} />}
                    </View>
                  </View>
                );
              })}

              <View style={styles.exActionsRow}>
                <TouchableOpacity style={styles.addSetOutlineBtn} onPress={store.addSet}>
                  <Plus size={14} color="#94A3B8" />
                  <Text style={styles.addSetOutlineText}>Подход</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.aiConsultBtn} onPress={() => setIsAiModalOpen(true)}>
                  <Sparkles size={14} color="#38BDF8" />
                  <Text style={styles.aiConsultText}>Gemini</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.finishExBtn, activeExercise.isFinished && styles.finishExBtnDone]}
                onPress={store.finishCurrentExercise}
              >
                <Text style={styles.finishExBtnText}>
                  {activeExercise.isFinished ? "Упражнение рассчитано ✓" : "Завершить и рассчитать"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.watermark}>IronTracker • Hypertrophy Engine</Text>
        </ScrollView>

        {/* Плавающий таймер отдыха */}
        {store.isTimerActive && (
          <View style={styles.floatingTimer}>
            <Text style={styles.floatingTimerLabel}>ОТДЫХ МЕЖДУ СЕТАМИ</Text>
            <Text style={styles.floatingTimerDigits}>{formatTimer(store.timerSeconds)}</Text>
            <TouchableOpacity onPress={store.resetTimer} style={styles.timerCloseBtn}>
              <X size={14} color="#6EE7B7" />
            </TouchableOpacity>
          </View>
        )}

        {renderProfileModal()}
        {renderVolumeModal()}
        {renderDayPickerModal()}
        {renderAiModal()}
        <AuthModal visible={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      </SafeAreaView>
    </ImageBackground>
  );

  // Модальное окно профиля с полями для ввода
  function renderProfileModal() {
    const tonnageTons = (store.stats.tonnageKg / 1000).toFixed(1);

    return (
      <Modal visible={isProfileOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.profileSheet}>
            <View style={styles.profileSheetHeader}>
              <Text style={styles.profileSheetTitle}>Профиль атлета</Text>
              <TouchableOpacity onPress={() => setIsProfileOpen(false)} style={styles.profileCloseBtn}>
                <X size={20} color="#18181B" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileUserBlock}>
              <TouchableOpacity onPress={pickImage} style={styles.avatarPickerWrapper}>
                <Image source={avatarSource} style={styles.profileLargeAvatar} />
                <View style={styles.avatarCameraBadge}>
                  <Camera size={12} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <Text style={styles.profileUsername}>
                {store.user ? (store.user.email?.split('@')[0] || store.profile.username) : store.profile.username}
              </Text>
            </View>

            <View style={styles.accountCard}>
              {store.user ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <UserCheck size={16} color="#10B981" />
                    <Text style={styles.accountEmailText} numberOfLines={1}>{store.user.email}</Text>
                  </View>
                  <TouchableOpacity onPress={() => store.signOut()} style={styles.logoutBtn}>
                    <LogOut size={13} color="#EF4444" />
                    <Text style={styles.logoutBtnText}>Выйти</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => { setIsProfileOpen(false); setIsAuthOpen(true); }} style={styles.loginBannerBtn}>
                  <LogIn size={15} color="#0D9488" />
                  <Text style={styles.loginBannerText}>Войти / Зарегистрироваться</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.profileStatsRow}>
              <View style={styles.profileStatCol}>
                <Text style={styles.profileStatNumber}>{store.stats.count}</Text>
                <Text style={styles.profileStatLabel}>Тренировок</Text>
              </View>
              <View style={styles.profileStatCol}>
                <Text style={styles.profileStatNumber}>{tonnageTons} т</Text>
                <Text style={styles.profileStatLabel}>Тоннаж</Text>
              </View>
              <View style={styles.profileStatCol}>
                <Text style={styles.profileStatNumber}>{store.stats.count > 0 ? '1 день' : '0 дней'}</Text>
                <Text style={styles.profileStatLabel}>Стрик</Text>
              </View>
            </View>

            <Text style={styles.profileParamsHeading}>Параметры атлета (нажми для изменения)</Text>

            <View style={styles.profileParamsTable}>
              <View style={styles.paramRow}>
                <Text style={styles.paramLabel}>Вес тела (кг)</Text>
                <TextInput
                  style={styles.inlineInput}
                  keyboardType="numeric"
                  value={weightInput}
                  onChangeText={setWeightInput}
                  placeholder="75.0"
                  placeholderTextColor="#71717A"
                />
              </View>

              <View style={styles.paramRow}>
                <Text style={styles.paramLabel}>Рост (см)</Text>
                <TextInput
                  style={styles.inlineInput}
                  keyboardType="numeric"
                  value={heightInput}
                  onChangeText={setHeightInput}
                  placeholder="180"
                  placeholderTextColor="#71717A"
                />
              </View>

              <View style={styles.paramRow}>
                <Text style={styles.paramLabel}>Отдых по умолч. (сек)</Text>
                <TextInput
                  style={styles.inlineInput}
                  keyboardType="numeric"
                  value={restInput}
                  onChangeText={setRestInput}
                  placeholder="90"
                  placeholderTextColor="#71717A"
                />
              </View>

              <View style={[styles.paramRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.paramLabel}>Лучший жим (кг)</Text>
                <TextInput
                  style={styles.inlineInput}
                  keyboardType="numeric"
                  value={benchInput}
                  onChangeText={setBenchInput}
                  placeholder="60.0"
                  placeholderTextColor="#71717A"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveParamsButton} onPress={saveUpdatedParams}>
              <Text style={styles.saveParamsButtonText}>Сохранить изменения</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function renderVolumeModal() {
    const muscles = [
      { key: 'chest', label: 'Грудь', count: store.weeklyVolume.chest || 0 },
      { key: 'back', label: 'Спина', count: store.weeklyVolume.back || 0 },
      { key: 'legs', label: 'Ноги', count: store.weeklyVolume.legs || 0 },
      { key: 'shoulders', label: 'Дельты', count: store.weeklyVolume.shoulders || 0 },
      { key: 'arms', label: 'Руки', count: store.weeklyVolume.arms || 0 },
    ];

    return (
      <Modal visible={isVolumeModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalDarkCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Activity size={18} color="#38BDF8" />
                <Text style={styles.modalDarkTitle}>Объем за 7 дней (Сетов)</Text>
              </View>
              <TouchableOpacity onPress={() => setIsVolumeModalOpen(false)}>
                <X size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={{ color: '#94A3B8', fontSize: 11, marginBottom: 12 }}>
              Оптимальная зона гипертрофии: <Text style={{ color: '#34D399', fontWeight: '800' }}>10–18 рабочих сетов</Text> на мышцу в неделю.
            </Text>

            {muscles.map(m => {
              const progress = Math.min(1, m.count / 16);
              const isOptimal = m.count >= 10 && m.count <= 18;

              return (
                <View key={m.key} style={{ marginVertical: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: '#F1F5F9', fontSize: 12, fontWeight: '700' }}>{m.label}</Text>
                    <Text style={{ color: isOptimal ? '#34D399' : '#94A3B8', fontSize: 12, fontWeight: '800' }}>
                      {m.count} / 16 сетов {isOptimal && '✓'}
                    </Text>
                  </View>
                  <View style={styles.volTrackBg}>
                    <View style={[styles.volTrackFill, { width: `${progress * 100}%`, backgroundColor: isOptimal ? '#10B981' : '#38BDF8' }]} />
                  </View>
                </View>
              );
            })}

            <TouchableOpacity style={styles.modalDarkClose} onPress={() => setIsVolumeModalOpen(false)}>
              <Text style={{ color: '#94A3B8', fontWeight: '600' }}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function renderDayPickerModal() {
    return (
      <Modal visible={isDayPickerOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalDarkCard}>
            <Text style={styles.modalDarkTitle}>Выбери день сплита</Text>
            {(store.availableDays || []).map(d => (
              <TouchableOpacity
                key={d.id}
                style={[styles.dayChoiceBtn, d.id === store.currentDayId && styles.dayChoiceBtnActive]}
                onPress={() => {
                  store.switchDay(d.id);
                  setIsDayPickerOpen(false);
                }}
              >
                <Text style={[styles.dayChoiceText, d.id === store.currentDayId && styles.dayChoiceTextActive]}>
                  {d.title}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalDarkClose} onPress={() => setIsDayPickerOpen(false)}>
              <Text style={{ color: '#94A3B8', fontWeight: '600' }}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function renderAiModal() {
    return (
      <Modal visible={isAiModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalDarkCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Sparkles size={18} color="#38BDF8" />
              <Text style={styles.modalDarkTitle}>Спросить ИИ-тренера</Text>
            </View>
            <TextInput
              style={styles.aiInput}
              placeholder="Как ощущения? (тяжело жать, как чувствует себя поясница...)"
              placeholderTextColor="#64748B"
              multiline
              value={aiNote}
              onChangeText={setAiNote}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <TouchableOpacity onPress={() => setIsAiModalOpen(false)} style={{ padding: 10 }}>
                <Text style={{ color: '#94A3B8' }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.aiSubmitBtn} onPress={handleConsultAi}>
                <Text style={{ color: '#000', fontWeight: '700' }}>Анализ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  splashBg: { flex: 1, width: '100%', height: '100%' },
  splashOverlay: { flex: 1, backgroundColor: 'rgba(5, 15, 18, 0.4)', justifyContent: 'space-between', padding: 24 },
  splashContent: { width: '100%', alignItems: 'center', paddingBottom: 40 },
  splashTitle: { fontSize: 36, fontWeight: '800', color: '#6EE7B7', letterSpacing: 1.5, marginBottom: 20, textShadowColor: '#000', textShadowRadius: 10 },
  welcomeUserText: { color: '#5EEAD4', fontSize: 14, fontWeight: '800', marginBottom: 14 },
  splashBtn: { width: '100%', backgroundColor: 'rgba(16, 44, 46, 0.85)', borderWidth: 1, borderColor: '#2DD4BF', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  splashBtnText: { color: '#E6FFFA', fontSize: 16, fontWeight: '700' },
  splashBtnSecondary: { width: '100%', backgroundColor: 'rgba(10, 25, 28, 0.75)', borderWidth: 1, borderColor: '#1F4B4E', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  splashBtnSecondaryText: { color: '#99F6E4', fontSize: 15, fontWeight: '600' },

  mainBg: { flex: 1, width: '100%', height: '100%' },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  navBackBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(18, 38, 42, 0.75)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(94, 234, 212, 0.3)' },
  navBackText: { color: '#CCFBF1', fontSize: 12, fontWeight: '700' },
  navVolumeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(14, 42, 55, 0.75)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#38BDF866' },
  navVolumeText: { color: '#38BDF8', fontSize: 12, fontWeight: '700' },
  navProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(18, 38, 42, 0.75)', paddingLeft: 10, paddingRight: 4, paddingVertical: 4, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(94, 234, 212, 0.3)' },
  navProfileName: { color: '#F0FDFA', fontSize: 12, fontWeight: '700', maxWidth: 100 },
  navAvatar: { width: 26, height: 26, borderRadius: 13 },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },

  dashboardCard: { backgroundColor: 'rgba(12, 26, 28, 0.85)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(45, 212, 191, 0.25)', padding: 10, marginVertical: 10 },
  dashTopRow: { flexDirection: 'row', gap: 10 },
  calendarBox: { width: 140, backgroundColor: '#071011', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#132B2E' },
  calMonthTitle: { color: '#E2E8F0', fontSize: 11, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  calDaysHeader: { color: '#5EEAD4', fontSize: 8, fontWeight: '800', textAlign: 'center', letterSpacing: 2, marginBottom: 4 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  calDayText: { width: 16, textAlign: 'center', color: '#94A3B8', fontSize: 8, marginVertical: 1 },
  calDayPicked: { backgroundColor: '#10B981', color: '#000', borderRadius: 3, fontWeight: '800' },

  cardsScroll: { flex: 1 },
  posterThumb: { width: 70, height: 95, borderRadius: 6, marginRight: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#132B2E' },

  dashBottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  miniAvatar: { width: 22, height: 22, borderRadius: 11 },
  trackInfoBlock: { flexDirection: 'row', alignItems: 'center' },
  trackTitleText: { color: '#F0FDFA', fontSize: 10, fontWeight: '700' },
  trackArtistText: { color: '#5EEAD4', fontSize: 8, marginTop: 1 },

  mediaControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  controlIcon: { color: '#94A3B8', fontSize: 12, paddingHorizontal: 2 },
  playBtnCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#132B2E', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(94, 234, 212, 0.3)' },
  playBtnCircleActive: { backgroundColor: '#2DD4BF', borderColor: '#5EEAD4' },
  controlIconPlay: { color: '#E2E8F0', fontSize: 10, fontWeight: '800' },

  offlineStatus: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#64748B' },
  statusDotActive: { backgroundColor: '#10B981' },
  offlineText: { color: '#64748B', fontSize: 9, fontWeight: '600' },

  proteinBanner: { backgroundColor: 'rgba(10, 30, 32, 0.85)', borderWidth: 1, borderColor: '#1F4B4E', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  proteinBannerDone: { borderColor: '#10B981', backgroundColor: 'rgba(6, 44, 34, 0.85)' },
  proteinDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EAB308' },
  proteinText: { color: '#E2E8F0', fontSize: 11, fontWeight: '700' },

  daySelectorWrapper: { alignItems: 'center', marginVertical: 6 },
  dayPillBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(6, 78, 59, 0.85)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#10B981' },
  dayPillDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34D399' },
  dayPillText: { color: '#ECFDF5', fontSize: 12, fontWeight: '800' },

  exTabsScroll: { gap: 6, paddingVertical: 6 },
  exTab: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15, 32, 35, 0.8)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(94, 234, 212, 0.15)' },
  exTabActive: { backgroundColor: 'rgba(20, 54, 58, 0.95)', borderColor: '#2DD4BF' },
  exTabFinished: { borderColor: '#10B981' },
  exTabText: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  exTabTextActive: { color: '#F0FDFA', fontWeight: '800' },

  exerciseCard: { backgroundColor: 'rgba(8, 20, 22, 0.88)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(45, 212, 191, 0.2)', padding: 12, marginTop: 10 },
  exHeader: { marginBottom: 10 },
  exTitle: { color: '#F0FDFA', fontSize: 18, fontWeight: '800' },
  tempoBadge: { backgroundColor: 'rgba(234, 179, 8, 0.15)', borderWidth: 1, borderColor: '#EAB308', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  tempoBadgeText: { color: '#FEF08A', fontSize: 10, fontWeight: '800' },
  muscleBadge: { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderWidth: 1, borderColor: '#38BDF8', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  muscleBadgeText: { color: '#38BDF8', fontSize: 10, fontWeight: '800' },

  aiInsightBox: { backgroundColor: 'rgba(14, 38, 55, 0.7)', borderRadius: 8, borderWidth: 1, borderColor: '#38BDF866', padding: 10, marginBottom: 10 },
  aiInsightTitle: { color: '#38BDF8', fontSize: 10, fontWeight: '800' },
  aiInsightVerdict: { color: '#F1F5F9', fontSize: 12, fontWeight: '600', marginTop: 3 },
  aiInsightCue: { color: '#94A3B8', fontSize: 11, marginTop: 2 },

  progressionBox: { backgroundColor: 'rgba(30, 27, 10, 0.7)', borderRadius: 8, borderWidth: 1, borderColor: '#EAB30844', padding: 10, marginBottom: 10 },
  progressionTitle: { color: '#EAB308', fontSize: 10, fontWeight: '800' },
  progressionMain: { color: '#FEF08A', fontSize: 14, fontWeight: '800', marginTop: 2 },
  progressionCue: { color: '#CBD5E1', fontSize: 11, marginTop: 2 },

  pastGhostRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, marginBottom: 2 },
  pastGhostText: { color: '#64748B', fontSize: 10, fontWeight: '600' },

  tableHead: { flexDirection: 'row', paddingHorizontal: 4, marginBottom: 6 },
  th: { color: '#64748B', fontSize: 9, fontWeight: '800' },
  setRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(13, 29, 32, 0.7)', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', paddingVertical: 6, paddingHorizontal: 6 },
  setRowDone: { backgroundColor: 'rgba(6, 44, 34, 0.75)', borderColor: '#10B98166' },
  setNum: { width: 20, color: '#94A3B8', fontSize: 11, fontWeight: '700' },

  valBox: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  valBoxSmall: { width: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  stepBtn: { backgroundColor: '#132B2E', width: 20, height: 20, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  valNumber: { color: '#F8FAFC', fontSize: 13, fontWeight: '700', minWidth: 26, textAlign: 'center' },

  rirChip: { width: 32, height: 22, backgroundColor: '#132B2E', borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4 },
  rirNum: { color: '#5EEAD4', fontSize: 11, fontWeight: '700' },

  checkBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#132B2E', alignItems: 'center', justifyContent: 'center' },
  checkBtnDone: { backgroundColor: '#10B981' },

  exActionsRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  addSetOutlineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#1E3E42', borderStyle: 'dashed' },
  addSetOutlineText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  aiConsultBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 6, backgroundColor: 'rgba(14, 42, 55, 0.8)', borderWidth: 1, borderColor: '#38BDF855' },
  aiConsultText: { color: '#38BDF8', fontSize: 11, fontWeight: '800' },

  finishExBtn: { backgroundColor: '#10B981', paddingVertical: 10, borderRadius: 6, alignItems: 'center', marginTop: 4 },
  finishExBtnDone: { backgroundColor: '#064E3B', borderWidth: 1, borderColor: '#10B981' },
  finishExBtnText: { color: '#022C22', fontSize: 12, fontWeight: '800' },

  watermark: { color: 'rgba(94, 234, 212, 0.25)', fontSize: 11, fontWeight: '800', textAlign: 'center', marginVertical: 18, letterSpacing: 1 },

  floatingTimer: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: '#06282B', borderWidth: 1, borderColor: '#10B981', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center' },
  floatingTimerLabel: { color: '#6EE7B7', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  floatingTimerDigits: { color: '#F0FDFA', fontSize: 20, fontWeight: '800' },
  timerCloseBtn: { position: 'absolute', right: 12, top: 12 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 18 },
  profileSheet: { backgroundColor: '#09090B', borderRadius: 16, padding: 20, width: '100%', borderWidth: 1, borderColor: '#27272A' },
  profileSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  profileSheetTitle: { fontSize: 18, fontWeight: '800', color: '#F4F4F5' },
  profileCloseBtn: { padding: 4 },

  profileUserBlock: { alignItems: 'center', marginBottom: 12 },
  avatarPickerWrapper: { position: 'relative' },
  profileLargeAvatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: '#27272A' },
  avatarCameraBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#10B981', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#09090B' },
  profileUsername: { fontSize: 16, fontWeight: '800', color: '#F4F4F5', marginTop: 6 },

  accountCard: { backgroundColor: '#18181B', borderRadius: 8, padding: 10, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#27272A' },
  accountEmailText: { fontSize: 12, fontWeight: '700', color: '#F4F4F5', maxWidth: 170 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(239, 68, 68, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  logoutBtnText: { fontSize: 11, fontWeight: '700', color: '#EF4444' },
  loginBannerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  loginBannerText: { fontSize: 12, fontWeight: '800', color: '#2DD4BF' },

  profileStatsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#27272A', marginBottom: 14 },
  profileStatCol: { alignItems: 'center' },
  profileStatNumber: { fontSize: 16, fontWeight: '800', color: '#F4F4F5' },
  profileStatLabel: { fontSize: 11, color: '#A1A1AA', marginTop: 2 },

  profileParamsHeading: { fontSize: 12, fontWeight: '800', color: '#A1A1AA', marginBottom: 8 },
  profileParamsTable: { backgroundColor: '#18181B', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#27272A' },
  paramRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#27272A' },
  paramLabel: { color: '#D4D4D8', fontSize: 13, fontWeight: '500' },
  inlineInput: { backgroundColor: '#09090B', borderWidth: 1, borderColor: '#2DD4BF', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, color: '#F4F4F5', fontSize: 13, fontWeight: '700', textAlign: 'right', width: 90 },

  saveParamsButton: { backgroundColor: '#2DD4BF', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  saveParamsButtonText: { color: '#042F2E', fontSize: 13, fontWeight: '800' },

  modalDarkCard: { backgroundColor: '#0B1B1E', borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#1F4B4E' },
  modalDarkTitle: { color: '#F0FDFA', fontSize: 16, fontWeight: '700' },
  volTrackBg: { height: 8, backgroundColor: '#132B2E', borderRadius: 4, overflow: 'hidden' },
  volTrackFill: { height: '100%', borderRadius: 4 },

  dayChoiceBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#071315', marginVertical: 4 },
  dayChoiceBtnActive: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: '#10B981' },
  dayChoiceText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  dayChoiceTextActive: { color: '#34D399', fontWeight: '800' },
  modalDarkClose: { alignItems: 'center', marginTop: 14, paddingVertical: 6 },

  aiInput: { backgroundColor: '#071315', borderRadius: 8, borderWidth: 1, borderColor: '#1F4B4E', padding: 10, color: '#F0FDFA', minHeight: 70, textAlignVertical: 'top', marginVertical: 10 },
  aiSubmitBtn: { backgroundColor: '#38BDF8', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6 }
});