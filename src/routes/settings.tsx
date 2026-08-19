import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, TopBar } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useApp, type Settings as SettingsState } from "@/lib/app-store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Pengaturan - Catatan Keuangan Mini App" },
      {
        name: "description",
        content: "Atur bahasa, mata uang, tema, notifikasi, keamanan, dan ekspor data keuangan.",
      },
      { property: "og:title", content: "Pengaturan - Catatan Keuangan Mini App" },
      {
        property: "og:description",
        content: "Preferensi aplikasi, keamanan, dan pengelolaan data.",
      },
    ],
  }),
  component: SettingsPage,
});

function Row({
  icon,
  title,
  subtitle,
  trailing,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  trailing: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-outline-variant/20 py-3 last:border-0">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-variant text-primary">
        <Icon name={icon} className="text-[20px]" />
      </span>
      <div className="flex flex-1 flex-col">
        <span className="text-sm font-medium text-on-surface">{title}</span>
        {subtitle ? <span className="text-xs text-on-surface-variant">{subtitle}</span> : null}
      </div>
      {trailing}
    </div>
  );
}

function Toggle({ id, label }: { id: keyof SettingsState; label: string }) {
  const { settings, toggleSetting } = useApp();
  const on = settings[id];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => toggleSetting(id)}
      className={`h-6 w-11 rounded-full border p-0.5 transition-colors ${
        on ? "border-primary bg-primary-container/60" : "border-outline-variant/40 bg-surface-variant"
      }`}
    >
      <span
        className={`block h-5 w-5 rounded-full transition-transform ${
          on ? "translate-x-5 bg-primary" : "translate-x-0 bg-outline"
        }`}
      />
    </button>
  );
}

const Chevron = <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />;

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-stack-lg">
      <h2 className="mb-2 text-label uppercase text-primary">{label}</h2>
      <div className="glass-card rounded-[16px] px-4">{children}</div>
    </section>
  );
}

function SettingsPage() {
  const { user, logout, settings } = useApp();
  const navigate = useNavigate();

  return (
    <AppShell topBar={<TopBar eyebrow="Konfigurasi" title="Pengaturan" />}>
      <div className="gradient-hero flex items-center gap-3 rounded-[24px] p-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-variant text-on-surface-variant">
          <Icon name="person" />
        </span>
        <div className="flex flex-1 flex-col">
          <span className="text-base font-semibold text-on-surface">
            {user?.name ?? "Belum masuk"}
          </span>
          <span className="text-xs text-on-surface-variant">
            {user ? `Masuk via ${user.provider === "telegram" ? "Telegram" : "Google"}` : "Profil belum tersambung"}
          </span>
        </div>
        <span className="rounded-full bg-surface-container-high px-4 py-1.5 text-xs font-semibold text-on-surface">
          {user?.handle ?? "-"}
        </span>
      </div>

      <Group label="App Preferences">
        <Row
          icon="language"
          title="Bahasa & Mata Uang"
          trailing={<span className="text-xs text-on-surface-variant">IDR / Indonesia</span>}
        />
        <Row
          icon="dark_mode"
          title="Tema Tampilan"
          subtitle={settings.darkTheme ? "Mode gelap aktif" : "Mode terang aktif"}
          trailing={<Toggle id="darkTheme" label="Tema gelap" />}
        />
        <Row
          icon="notifications"
          title="Notifikasi Push"
          subtitle={settings.pushNotifications ? "Aktif" : "Nonaktif"}
          trailing={<Toggle id="pushNotifications" label="Notifikasi push" />}
        />
      </Group>

      <Group label="Security">
        <Row
          icon="fingerprint"
          title="Kunci Aplikasi / Biometrik"
          subtitle={settings.biometricLock ? "Terkunci dengan biometrik" : "Nonaktif"}
          trailing={<Toggle id="biometricLock" label="Kunci biometrik" />}
        />
        <Row
          icon="cloud_sync"
          title="Status Sinkronisasi Cloud"
          subtitle={settings.cloudSync ? "Tersinkronisasi" : "Belum tersinkronisasi"}
          trailing={<Toggle id="cloudSync" label="Sinkronisasi cloud" />}
        />
      </Group>

      <Group label="Data">
        <Row
          icon="category"
          title="Kategori Transaksi"
          subtitle="Kelola kategori"
          trailing={Chevron}
        />
        <Row
          icon="download"
          title="Ekspor Data Keuangan"
          subtitle="Unduh laporan"
          trailing={Chevron}
        />
      </Group>

      <button
        onClick={() => {
          logout();
          navigate({ to: "/login" });
        }}
        className="mt-stack-lg flex w-full items-center justify-center gap-2 rounded-[16px] bg-surface-container-high py-4 text-base font-semibold text-on-surface"
      >
        <Icon name="logout" className="text-[20px]" /> Keluar Akun
      </button>
      <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-[16px] border border-error/30 py-4 text-base font-semibold text-error">
        <Icon name="delete" className="text-[20px]" /> Hapus Akun & Data
      </button>
    </AppShell>
  );
}
