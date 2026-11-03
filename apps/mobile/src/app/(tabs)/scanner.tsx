// Skaner tabi — tugma `/scan` ni ochadi (tab_layout.tsx); bu ekran ko'rinmaydi.
import { Redirect } from 'expo-router';

export default function ScannerTab() {
  return <Redirect href="/scan" />;
}
