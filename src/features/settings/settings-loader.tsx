import type { UserSettings } from "@/lib/tryout/types";
import { SettingsScreen } from "./settings-screen";

/** Halaman pengaturan dengan nilai tersimpan dari server sebagai draf awal. */
export function SettingsLoader({ settings }: { settings: UserSettings }) {
  return <SettingsScreen settings={settings} />;
}
