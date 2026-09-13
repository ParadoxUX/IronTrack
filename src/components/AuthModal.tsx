import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import {
  X,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react-native';
import { supabase } from '../services/supabase';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AuthModal({ visible, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setEmail('');
    setPassword('');
    setUsername('');
  };

  const handleToggleMode = (signUpMode: boolean) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSignUp(signUpMode);
  };

  const handleAuth = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMessage('Заполни все обязательные поля');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Пароль должен содержать от 6 символов');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              username: username.trim() || cleanEmail.split('@')[0],
            }
          }
        });

        if (error) throw error;

        if (data.session) {
          // Если email confirmation отключен, пользователь логинится сразу
          onClose();
          resetForm();
        } else {
          setSuccessMessage('Аккаунт успешно создан! Теперь выполни вход.');
          setIsSignUp(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Неверный email или пароль');
          }
          throw error;
        }

        onClose();
        resetForm();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
          >
            <View style={styles.card}>
              {/* Верхняя декоративная линия */}
              <View style={styles.accentGlowLine} />

              {/* Хедер с кнопкой закрытия */}
              <View style={styles.header}>
                <View style={styles.logoBadge}>
                  <Sparkles size={16} color="#2DD4BF" />
                  <Text style={styles.logoBadgeText}>IRON CLOUD</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    resetForm();
                    onClose();
                  }}
                  style={styles.closeBtn}
                >
                  <X size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Заголовок */}
              <Text style={styles.title}>
                {isSignUp ? 'Создать профиль' : 'Вход в систему'}
              </Text>
              <Text style={styles.subtitle}>
                {isSignUp
                  ? 'Сохраняй тоннаж и синхронизируй данные между устройствами'
                  : 'Твои силовые показатели и прогрессия тренировок в облаке'}
              </Text>

              {/* Сегментированный переключатель (Вход / Регистрация) */}
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[styles.segmentBtn, !isSignUp && styles.segmentBtnActive]}
                  onPress={() => handleToggleMode(false)}
                >
                  <Text style={[styles.segmentText, !isSignUp && styles.segmentTextActive]}>
                    Вход
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.segmentBtn, isSignUp && styles.segmentBtnActive]}
                  onPress={() => handleToggleMode(true)}
                >
                  <Text style={[styles.segmentText, isSignUp && styles.segmentTextActive]}>
                    Регистрация
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Ошибки / Уведомления */}
              {errorMessage && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠ {errorMessage}</Text>
                </View>
              )}

              {successMessage && (
                <View style={styles.successBox}>
                  <ShieldCheck size={14} color="#10B981" />
                  <Text style={styles.successText}>{successMessage}</Text>
                </View>
              )}

              {/* Поле Имя пользователя (только при регистрации) */}
              {isSignUp && (
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>ПОЗЫВНОЙ АТЛЕТА</Text>
                  <View style={styles.inputBox}>
                    <User size={16} color="#5EEAD4" />
                    <TextInput
                      style={styles.input}
                      placeholder="Например: paradox"
                      placeholderTextColor="#475569"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              )}

              {/* Поле Email */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>EMAIL</Text>
                <View style={styles.inputBox}>
                  <Mail size={16} color="#5EEAD4" />
                  <TextInput
                    style={styles.input}
                    placeholder="athlete@irontrack.app"
                    placeholderTextColor="#475569"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              {/* Поле Пароль */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>ПАРОЛЬ</Text>
                <View style={styles.inputBox}>
                  <Lock size={16} color="#5EEAD4" />
                  <TextInput
                    style={styles.input}
                    placeholder="Минимум 6 символов"
                    placeholderTextColor="#475569"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                  >
                    {showPassword ? (
                      <EyeOff size={16} color="#94A3B8" />
                    ) : (
                      <Eye size={16} color="#94A3B8" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Главная кнопка Submit */}
              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleAuth}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#022C22" />
                ) : (
                  <View style={styles.submitBtnContent}>
                    <Text style={styles.submitBtnText}>
                      {isSignUp ? 'Зарегистрироваться' : 'Войти в аккаунт'}
                    </Text>
                    <ArrowRight size={16} color="#022C22" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Подвал с безопасностью */}
              <View style={styles.footerRow}>
                <ShieldCheck size={12} color="#64748B" />
                <Text style={styles.footerText}>Шифрование PostgreSQL & RLS Supabase</Text>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 8, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  container: {
    width: '100%',
    maxWidth: 400,
  },
  card: {
    backgroundColor: '#061316',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.22)',
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#2DD4BF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 10,
  },
  accentGlowLine: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: '#2DD4BF',
    shadowColor: '#2DD4BF',
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  logoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.25)',
  },
  logoBadgeText: {
    color: '#2DD4BF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  closeBtn: {
    backgroundColor: 'rgba(15, 32, 35, 0.8)',
    padding: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F0FDFA',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    marginBottom: 18,
    lineHeight: 17,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#030A0C',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(20, 54, 58, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.35)',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#F0FDFA',
    fontWeight: '800',
  },
  inputWrapper: {
    marginBottom: 12,
  },
  inputLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#030A0C',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#132B2E',
    paddingHorizontal: 12,
    height: 46,
    gap: 10,
  },
  input: {
    flex: 1,
    color: '#F0FDFA',
    fontSize: 14,
  },
  eyeBtn: {
    padding: 4,
  },
  submitBtn: {
    backgroundColor: '#2DD4BF',
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#2DD4BF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#022C22',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '600',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  successText: {
    color: '#6EE7B7',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
  },
  footerText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
});