// Juftlash: 6 raqam (raqamli klaviatura, avto-yuborish). Kontrakt 4: POST /mobile/pair.
import { router } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError, errorMessage } from '../api/errors';
import { ERROR } from '../api/types';
import { Button, Spinner, T } from '../components/ui';
import { uz } from '../i18n/uz';
import { illustrations } from '../ui/generated';
import { useSession } from '../session/SessionProvider';
import { colors, fontSize, fonts, hit, radius, size, space } from '../theme';

const PairScan = illustrations['pair-scan'];

const CODE_LENGTH = 6;

/** Kontrakt 4: mantiq `error` kodiga (410 pair_code_expired, 429 rate_limited — server `message` i bilan). */
function pairErrorText(e: unknown): string {
  if (e instanceof ApiError && e.kind === 'http') {
    // Kontrakt 1.4: noto'g'ri kod — 400 pair_code_invalid (401 faqat token uchun).
    if (e.code === ERROR.pairCodeInvalid) return uz.pair.invalidCode;
    // /mobile/pair yo'q — manzil boshqa serverga qaraydi.
    if (e.status === 404) return uz.errors.serverNotFound;
  }
  return errorMessage(e);
}

export default function PairScreen() {
  const { pair, apiUrl, setApiUrl } = useSession();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [server, setServer] = useState(apiUrl ?? '');
  const [editServer, setEditServer] = useState(!apiUrl);

  const submit = async (value: string) => {
    setBusy(true);
    setError(null);
    try {
      await pair(value);
      // muvaffaqiyat: guard o'zi loyihalarga o'tkazadi
    } catch (e) {
      setError(pairErrorText(e));
      setCode('');
      input.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  const onChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (error) setError(null);
    if (digits.length === CODE_LENGTH) void submit(digits);
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          <PairScan size={size.illustration} style={styles.art} />
          <T style={styles.title}>{uz.pair.title}</T>
          <Button label={uz.pair.scanQr} primary onPress={() => router.push('/scan')} icon="scan-qr-code" />
          <T muted style={styles.hint}>
            {uz.pair.scanHint}
          </T>
          <Button label={uz.files.serverless} onPress={() => router.push('/files')} icon="folder-open" />
          <T style={styles.manual}>{uz.pair.manual}</T>
          <T muted style={styles.hint}>
            {uz.pair.hint}
          </T>

          <Pressable
            onPress={() => input.current?.focus()}
            style={styles.cells}
            accessibilityLabel={uz.pair.title}
          >
            {Array.from({ length: CODE_LENGTH }, (_, i) => (
              <View key={i} style={[styles.cell, i === code.length && !busy && styles.cellActive]}>
                <T mono style={styles.cellText}>
                  {code[i] ?? ''}
                </T>
              </View>
            ))}
          </Pressable>
          <TextInput
            ref={input}
            value={code}
            onChangeText={onChange}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={CODE_LENGTH}
            editable={!busy}
            autoFocus
            caretHidden
            style={styles.hidden}
          />

          <View style={styles.status}>
            {busy && (
              <View style={styles.row}>
                <Spinner />
                <T muted>{uz.pair.sending}</T>
              </View>
            )}
            {error && <T style={styles.error}>{error}</T>}
          </View>
        </View>

        <View style={styles.server}>
          <T muted>{uz.pair.server}</T>
          {editServer ? (
            <View style={styles.row}>
              <TextInput
                value={server}
                onChangeText={setServer}
                placeholder={uz.pair.serverHint}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={styles.serverInput}
              />
              <Button
                label={uz.pair.serverSave}
                disabled={!server.trim()}
                onPress={() => {
                  void setApiUrl(server);
                  setEditServer(false);
                }}
              />
            </View>
          ) : (
            <Pressable onPress={() => setEditServer(true)} style={styles.serverValue}>
              <T mono>{apiUrl}</T>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, justifyContent: 'center', padding: space.xl, gap: space.lg },
  title: { fontFamily: fonts.semibold, fontSize: fontSize.title },
  art: { alignSelf: 'center' },
  hint: { fontSize: fontSize.md },
  manual: { fontFamily: fonts.semibold, fontSize: fontSize.lg, marginTop: space.lg },
  cells: { flexDirection: 'row', gap: space.sm, justifyContent: 'center', marginTop: space.lg },
  cell: {
    width: size.pinCell,
    height: size.pinCell + space.md,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellActive: { backgroundColor: colors.border },
  cellText: { fontSize: fontSize.title, color: colors.white },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  status: { minHeight: hit, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  error: { color: colors.yellow, textAlign: 'center' },
  server: { padding: space.xl, gap: space.xs },
  serverValue: { minHeight: hit, justifyContent: 'center' },
  serverInput: {
    flex: 1,
    minHeight: hit,
    backgroundColor: colors.panel,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
  },
});
