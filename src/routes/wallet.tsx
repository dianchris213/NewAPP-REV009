import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, TopBar } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { TransactionList } from "@/components/TransactionList";
import { formatIDR, useApp } from "@/lib/app-store";

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

const actions = [
  { icon: "swap_horiz", label: "Transfer" },
  { icon: "account_balance_wallet", label: "Isi Saldo" },
  { icon: "add_circle", label: "Tambah" },
];

const filters = ["Semua Akun", "Pemasukan", "Pengeluaran"] as const;

function Wallet() {
  const { transactions, balance, setAddTxOpen } = useApp();
  const [filter, setFilter] = useState<(typeof filters)[number]>("Semua Akun");

  const visible = useMemo(() => {
    if (filter === "Pemasukan") return transactions.filter((t) => t.type === "income");
    if (filter === "Pengeluaran") return transactions.filter((t) => t.type === "expense");
    return transactions;
  }, [transactions, filter]);

  return (
    <AppShell topBar={<TopBar eyebrow="Keuangan Anda" title="Dompet" />}>
      <div className="gradient-hero relative overflow-hidden rounded-[24px] p-[20px]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary-container/20 blur-2xl" />
        <span className="text-label uppercase text-primary/80">Saldo Gabungan</span>
        <p className="mt-1 text-display text-on-surface">{formatIDR(balance)}</p>
        <p className="text-body text-on-surface-variant">Dari 3 akun aktif</p>
        <button
          onClick={() => setAddTxOpen(true)}
          className="gradient-primary mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-on-primary-container shadow-glow"
        >
          <Icon name="add" className="text-[20px]" /> Tambah Transaksi
        </button>
      </div>

      <div className="mt-stack-md grid grid-cols-3 gap-3">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={() => setAddTxOpen(true)}
            aria-label={a.label}
            className="glass-card flex flex-col items-center gap-2 rounded-[16px] py-4"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-variant text-primary">
              <Icon name={a.icon} className="text-[20px]" />
            </span>
            <span className="text-xs font-semibold text-on-surface">{a.label}</span>
          </button>
        ))}
      </div>

      <section className="mt-stack-lg">
        <h2 className="mb-3 text-section text-on-surface">Akun Anda</h2>
        <div className="glass-card rounded-[16px] px-4">
          {[
            { name: "Tunai", icon: "payments", share: 0.25 },
            { name: "Bank Utama", icon: "account_balance", share: 0.6 },
            { name: "E-Wallet", icon: "wallet", share: 0.15 },
          ].map((a) => (
            <div
              key={a.name}
              className="flex items-center gap-3 border-b border-outline-variant/20 py-3 last:border-0"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-variant text-primary">
                <Icon name={a.icon} className="text-[20px]" />
              </span>
              <span className="flex-1 text-body font-medium text-on-surface">{a.name}</span>
              <span className="text-body font-semibold text-on-surface">
                {formatIDR(balance * a.share)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-stack-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-section text-on-surface">Aktivitas Dompet</h2>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-variant text-on-surface-variant">
            <Icon name="filter_list" className="text-[18px]" />
          </span>
        </div>
        <div className="mb-3 flex gap-2 swipe-x" role="group" aria-label="Filter aktivitas">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-xs transition-colors ${
                filter === f
                  ? "border-primary bg-primary-container/25 text-primary"
                  : "border-outline-variant/30 text-on-surface-variant"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        {visible.length ? (
          <TransactionList items={visible} />
        ) : (
          <EmptyState icon="history" title="Belum ada aktivitas" />
        )}
      </section>
    </AppShell>
  );
}
