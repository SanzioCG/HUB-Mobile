// Kontrakt 1.2 (6.8): muvaffaqiyatli o'qish — qisqa bitta tebranish; xato — xato signali.
// TODO(contract-1.2): haptic qoidasi qoralamadan.
import * as Haptics from 'expo-haptics';

export const hapticSuccess = () =>
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);

export const hapticError = () =>
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
