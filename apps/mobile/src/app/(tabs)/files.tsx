// Fayllar tabi — tugma `/files` ni ochadi (tab _layout.tsx, `tabPress`); bu ekran ko'rinmaydi.
import { Redirect } from 'expo-router';

export default function FilesTab() {
  return <Redirect href="/files" />;
}
