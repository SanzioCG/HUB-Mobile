// packages/viewer bundle'i WebView ichida. Host ↔ viewer xabarlari `bridge.ts` tiplari bo'yicha.
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentType,
  type RefAttributes,
} from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView as RNWebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';
import type { Delivery } from '../config';
import { colors } from '../theme';
import type { HostMessage, ViewerMessage } from './bridge';
import { prepare, type Prepared } from './delivery';

// react-native-webview 14 tiplari: `WebView<P = undefined>` → props `& undefined` = never (TS strict). Aniq tip bilan.
interface WebViewRef {
  postMessage(data: string): void;
}
const WebView = RNWebView as unknown as ComponentType<WebViewProps & RefAttributes<WebViewRef>>;

export type ViewerPhase = 'preparing' | 'loading' | 'loaded' | 'error';

export interface ViewerTimings {
  delivery: Delivery;
  /** B: yuklab olish (ms); A yoki keshdan — null. */
  downloadMs: number | null;
  cacheHit: boolean;
  /** `load` yuborilgandan `loaded` gacha (ms). */
  viewerMs: number | null;
  /** Tayyorlashdan `loaded` gacha (ms). */
  totalMs: number | null;
}

export interface ViewerHandle {
  send(msg: HostMessage): void;
}

interface Props {
  glbUrl: string;
  revisionId: string;
  token: string;
  delivery: Delivery;
  onMessage?: (msg: ViewerMessage) => void;
  onPhase?: (phase: ViewerPhase, error?: string) => void;
  onTimings?: (t: ViewerTimings) => void;
  style?: StyleProp<ViewStyle>;
}

export const ViewerView = forwardRef<ViewerHandle, Props>(function ViewerView(
  { glbUrl, revisionId, token, delivery, onMessage, onPhase, onTimings, style },
  ref,
) {
  const web = useRef<WebViewRef>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const t = useRef({ start: 0, loadSent: 0 });
  // Callback'lar o'zgarsa WebView qayta yaratilmasin.
  const cb = useRef({ onMessage, onPhase, onTimings });
  cb.current = { onMessage, onPhase, onTimings };

  const send = useCallback((msg: HostMessage) => web.current?.postMessage(JSON.stringify(msg)), []);
  useImperativeHandle(ref, () => ({ send }), [send]);

  useEffect(() => {
    let alive = true;
    setPrepared(null);
    t.current.start = Date.now();
    cb.current.onPhase?.('preparing');
    prepare(delivery, glbUrl, revisionId, token).then(
      (p) => alive && setPrepared(p),
      (e: unknown) => alive && cb.current.onPhase?.('error', e instanceof Error ? e.message : String(e)),
    );
    return () => {
      alive = false;
    };
  }, [delivery, glbUrl, revisionId, token]);

  const onWebMessage = (e: WebViewMessageEvent) => {
    let msg: ViewerMessage;
    try {
      msg = JSON.parse(e.nativeEvent.data) as ViewerMessage;
    } catch {
      return;
    }
    if (!prepared) return;
    if (msg.type === 'ready') {
      t.current.loadSent = Date.now();
      cb.current.onPhase?.('loading');
      send({ type: 'load', glbUrl: prepared.glbUrl, token: prepared.token });
    } else if (msg.type === 'loaded') {
      const now = Date.now();
      cb.current.onPhase?.('loaded');
      cb.current.onTimings?.({
        delivery: prepared.delivery,
        downloadMs: prepared.downloadMs,
        cacheHit: prepared.cacheHit,
        viewerMs: now - t.current.loadSent,
        totalMs: now - t.current.start,
      });
    } else if (msg.type === 'error' && msg.code === 'load_failed') {
      cb.current.onPhase?.('error', msg.message);
    }
    cb.current.onMessage?.(msg);
  };

  return (
    <View style={[styles.root, style]}>
      {prepared && (
        <WebView
          ref={web}
          source={prepared.source}
          originWhitelist={['*']}
          onMessage={onWebMessage}
          onError={(e) => cb.current.onPhase?.('error', e.nativeEvent.description)}
          // B: file:// sahifa va nisbiy GLB. Android: allowFileAccess(+FromFileURLs); iOS: allowingReadAccessToURL.
          allowFileAccess={prepared.fileAccess}
          allowFileAccessFromFileURLs={prepared.fileAccess}
          allowingReadAccessToURL={prepared.readAccessUrl}
          style={styles.web}
          containerStyle={styles.web}
          bounces={false}
          overScrollMode="never"
          scrollEnabled={false}
          setSupportMultipleWindows={false}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  web: { flex: 1, backgroundColor: colors.bg },
});
