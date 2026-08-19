import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, TopBar } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import {
  formatIDR,
  useApp,
  WALLET_PROVIDERS,
  WALLET_TYPE_LABEL,
  type WalletActivity,
  type WalletActivityKind,
  type WalletType,
} from "@/lib/app-store";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Dompet - Catatan Keuangan Mini App" },
      {
        name: "description",
        content: "Kelola akun dompet, isi saldo, transfer, dan lihat aktivitas dompet Anda.",
      },
      { property: "og:title", content: "Dompet - Catatan Keuangan Mini App" },
      {
        property: "og:description",
        content: "Kelola akun dompet dan aktivitas saldo Anda.",
      },
    ],
  }),
  component: Wallet,
});

const WALLET_TYPES: { value: WalletType; icon: string; hint: string }[] = [
  { value: "cash", icon: "payments", hint: "Uang fisik di dompet atau kas" },
  { value: "bank", icon: "account_balance", hint: "Rekening bank utama Anda" },
  { value: "ewallet", icon: "wallet", hint: "Saldo aplikasi pembayaran digital" },
];

const ACTIVITY_FILTERS: { value: "all" | WalletActivityKind; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "topup", label: "Isi Saldo" },
  { value: "transfer", label: "Transfer" },
];

const ACTIVITY_META: Record<WalletActivityKind, { icon: string; tone: string }> = {
  topup: { icon: "account_balance_wallet", tone: "bg-success/15 text-success" },
  transfer: { icon: "swap_horiz", tone: "bg-primary-container/25 text-primary" },
  create: { icon: "add_circle", tone: "bg-surface-variant text-on-surface-variant" },
};

const WALLET_ICON: Record<WalletType, string> = {
  cash: "payments",
  bank: "account_balance",
  ewallet: "wallet",
};

const AMOUNT_MAX = 1_000_000_000_000;

function Wallet() {
  const { wallets, walletActivity, addWallet } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState<"all" | WalletActivityKind>("all");

  const combined = useMemo(() => wallets.reduce((sum, w) => sum + w.balance, 0), [wallets]);

  const visibleActivity = useMemo(
    () =>
      activityFilter === "all"
        ? walletActivity
        : walletActivity.filter((a) => a.kind === activityFilter),
    [walletActivity, activityFilter],
  );

  const openAdd = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setAddOpen(true);
  }, []);

  return (
    <AppShell topBar={<TopBar eyebrow="Keuangan Anda" title="Dompet" />}>
      <div className="gradient-hero relative overflow-hidden rounded-[24px] p-[20px]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary-container/20 blur-2xl" />
        <span className="text-label uppercase text-primary/80">Saldo Gabungan</span>
        <p className="mt-1 text-display text-on-surface">{formatIDR(combined)}</p>
        <p className="text-body text-on-surface-variant">{`Dari ${wallets.length} akun aktif`}</p>
      </div>

      <section className="mt-stack-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-section text-on-surface">Akun Anda</h2>
          <button
            type="button"
            data-testid="wallet-add-trigger"
            aria-haspopup="dialog"
            onClick={openAdd}
            className="flex h-9 items-center gap-1 rounded-full border border-outline-variant/30 px-3 text-[12px] font-semibold text-on-surface-variant transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <Icon name="add" className="text-[16px]" />
            Tambah Kantong
          </button>
        </div>
        <div className="glass-card rounded-[16px] px-4">
          {wallets.map((w) => (
            <div
              key={w.id}
              className="flex items-center gap-3 border-b border-outline-variant/20 py-3 last:border-0"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-variant text-primary">
                <Icon name={WALLET_ICON[w.type]} className="text-[20px]" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-medium text-on-surface">{w.name}</span>
                <span className="truncate text-meta text-on-surface-variant/80">
                  {w.provider ? `${WALLET_TYPE_LABEL[w.type]} · ${w.provider}` : WALLET_TYPE_LABEL[w.type]}
                </span>
              </div>
              <span className="shrink-0 text-body font-semibold text-on-surface">
                {formatIDR(w.balance)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-stack-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-section text-on-surface">Aktivitas Dompet</h2>
          <button
            type="button"
            data-testid="wallet-activity-filter"
            aria-expanded={filterOpen}
            aria-controls="wallet-activity-filters"
            aria-label="Filter jenis aktivitas"
            onClick={(e) => {
              e.stopPropagation();
              setFilterOpen((v) => !v);
            }}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 ${
              activityFilter === "all"
                ? "bg-surface-variant text-on-surface-variant"
                : "bg-primary-container/30 text-primary"
            }`}
          >
            <Icon name="filter_list" className="text-[18px]" />
          </button>
        </div>

        <div
          id="wallet-activity-filters"
          aria-hidden={!filterOpen}
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
            filterOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="swipe-x mb-3 flex gap-2" role="group" aria-label="Filter aktivitas">
              {ACTIVITY_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={activityFilter === f.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivityFilter(f.value);
                  }}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                    activityFilter === f.value
                      ? "border-primary bg-primary-container/25 text-primary"
                      : "border-outline-variant/30 text-on-surface-variant"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {visibleActivity.length ? (
          <ul className="glass-card rounded-[16px] px-4">
            {visibleActivity.map((a) => (
              <ActivityRow key={a.id} activity={a} />
            ))}
          </ul>
        ) : (
          <EmptyState icon="history" title="Belum ada aktivitas" />
        )}
      </section>

      {addOpen ? (
        <AddWalletSheet
          onClose={() => setAddOpen(false)}
          onSubmit={(payload) => {
            addWallet(payload);
            setAddOpen(false);
            toast.success("Kantong ditambahkan", {
              description: `${payload.name} · ${formatIDR(payload.balance)}`,
            });
          }}
        />
      ) : null}
    </AppShell>
  );
}

function ActivityRow({ activity }: { activity: WalletActivity }) {
  const meta = ACTIVITY_META[activity.kind];
  return (
    <li className="flex items-center gap-3 border-b border-outline-variant/20 py-3 last:border-0">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${meta.tone}`}>
        <Icon name={meta.icon} className="text-[18px]" fill={1} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-medium text-on-surface">{activity.title}</span>
        <span className="truncate text-meta text-on-surface-variant/80">{activity.detail}</span>
        <span className="truncate text-meta text-on-surface-variant/60">
          {new Date(activity.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
        </span>
      </div>
      {activity.amount > 0 ? (
        <span className="shrink-0 text-body font-semibold text-on-surface">
          {formatIDR(activity.amount)}
        </span>
      ) : null}
    </li>
  );
}

/** Bottom sheet to create a wallet: type selection + provider sub-menu. */
function AddWalletSheet({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    type: WalletType;
    provider?: string;
    balance: number;
  }) => void;
}) {
  const ref = useModalA11y<HTMLDivElement>(true, onClose);
  const [type, setType] = useState<WalletType | null>(null);
  const [provider, setProvider] = useState("");
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) return setError("Pilih jenis kantong terlebih dahulu.");
    if (!provider) return setError("Pilih penyedia kantong.");
    const trimmed = name.trim();
    if (trimmed.length < 2) return setError("Nama kantong minimal 2 karakter.");
    if (trimmed.length > 30) return setError("Nama kantong maksimal 30 karakter.");
    const numeric = Number(balance.replace(/\D/g, "")) || 0;
    if (numeric > AMOUNT_MAX) return setError("Saldo awal terlalu besar.");
    setError(undefined);
    onSubmit({ name: trimmed, type, provider, balance: numeric });
  };

  return (
    <div
      className="fixed inset-0 z-[180] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Tambah kantong"
        data-testid="wallet-add-sheet"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-[26px] border-t border-outline-variant/20 bg-surface-container-high p-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] shadow-2xl"
      >
        <span
          aria-hidden="true"
          className="mx-auto mb-3 block h-1 w-10 rounded-full bg-outline-variant/60"
        />
        <h3 className="m-0 text-title text-on-surface">Tambah Kantong</h3>
        <p className="mt-1 text-[12px] text-on-surface-variant/80">
          Pilih jenis kantong, lalu lengkapi detailnya.
        </p>

        <form className="mt-4 flex flex-col gap-4" onSubmit={submit} noValidate>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Jenis kantong">
            {WALLET_TYPES.map((t) => {
              const active = type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  data-testid={`wallet-type-${t.value}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setType(t.value);
                    setProvider("");
                    setError(undefined);
                  }}
                  className={`flex h-24 flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 text-center transition-colors ${
                    active
                      ? "border-primary bg-primary-container/25 text-primary"
                      : "border-outline-variant/30 text-on-surface-variant"
                  }`}
                >
                  <Icon name={t.icon} className="text-[22px]" fill={active ? 1 : 0} />
                  <span className="text-[12px] font-semibold leading-tight">
                    {WALLET_TYPE_LABEL[t.value]}
                  </span>
                </button>
              );
            })}
          </div>

          {type ? (
            <p className="m-0 text-[11px] text-on-surface-variant/70">
              {WALLET_TYPES.find((t) => t.value === type)?.hint}
            </p>
          ) : null}

          {/* Sub-menu: provider list per selected type. */}
          {type ? (
            <label className="flex flex-col gap-1">
              <span className="text-meta text-on-surface-variant/80">
                {type === "cash" ? "Sumber Dana" : type === "bank" ? "Nama Bank" : "Penyedia E-Wallet"}
              </span>
              <select
                data-testid="wallet-provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="h-12 rounded-2xl border border-outline-variant/30 bg-surface-container px-4 text-[14px] text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <option value="">Pilih...</option>
                {WALLET_PROVIDERS[type].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="flex flex-col gap-1">
            <span className="text-meta text-on-surface-variant/80">Nama Kantong</span>
            <input
              data-testid="wallet-name"
              value={name}
              maxLength={30}
              placeholder="Contoh: Tabungan Liburan"
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-2xl border border-outline-variant/30 bg-surface-container px-4 text-[14px] text-on-surface outline-none placeholder:text-on-surface-variant/50 focus-visible:ring-2 focus-visible:ring-primary/60"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-meta text-on-surface-variant/80">Saldo Awal</span>
            <input
              inputMode="numeric"
              data-testid="wallet-balance"
              value={(Number(balance.replace(/\D/g, "")) || 0).toLocaleString("id-ID")}
              onChange={(e) => setBalance(e.target.value.replace(/\D/g, "").slice(0, 15))}
              className="h-12 rounded-2xl border border-outline-variant/30 bg-surface-container px-4 text-[14px] text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            />
          </label>

          {error ? (
            <p role="alert" className="m-0 text-[11px] font-semibold text-error">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="h-12 flex-1 rounded-full bg-surface-variant text-[13px] font-semibold text-on-surface-variant transition-transform active:scale-95"
            >
              Batal
            </button>
            <button
              type="submit"
              data-testid="wallet-submit"
              className="gradient-primary h-12 flex-1 rounded-full text-[13px] font-bold text-on-primary-container transition-transform active:scale-95"
            >
              Simpan Kantong
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
