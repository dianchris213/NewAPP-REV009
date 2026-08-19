import { memo, useCallback, useState } from "react";
import { toast } from "sonner";
import { Icon } from "./Icon";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import { formatIDR, useApp, type Transaction } from "@/lib/app-store";

const NOTE_MAX = 80;
const AMOUNT_MAX = 1_000_000_000_000;

type PendingAction =
  | { kind: "delete"; tx: Transaction }
  | { kind: "edit"; tx: Transaction; patch: { amount: number; category: string; note: string } };

const TransactionRow = memo(function TransactionRow({
  t,
  onEdit,
  onDelete,
  actions,
}: {
  t: Transaction;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
  actions: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-3 border-b border-outline-variant/20 py-3 last:border-0 transition-opacity ${
        t.pending ? "opacity-60" : "opacity-100"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          t.type === "income" ? "bg-success/15 text-success" : "bg-error/15 text-error"
        }`}
      >
        <Icon
          name={t.type === "income" ? "south_west" : "north_east"}
          className="text-[18px]"
          fill={1}
        />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-medium text-on-surface">{t.category}</span>
        {t.note ? (
          <span className="truncate text-meta text-on-surface-variant">{t.note}</span>
        ) : null}
        <span className="truncate text-meta text-on-surface-variant/60">
          {new Date(t.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
          {t.pending ? " · menyimpan..." : ""}
        </span>
      </div>
      <span
        className={`shrink-0 text-body font-semibold ${
          t.type === "income" ? "text-success" : "text-error"
        }`}
      >
        {t.type === "income" ? "+" : "-"}
        {formatIDR(t.amount)}
      </span>
      {actions ? (
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            data-testid={`tx-edit-${t.id}`}
            aria-label={`Ubah transaksi ${t.category} ${formatIDR(t.amount)}`}
            disabled={!!t.pending}
            onClick={() => onEdit(t)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-variant/50 text-on-surface-variant transition-colors hover:bg-primary-container/40 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-40"
          >
            <Icon name="edit_square" className="text-[17px]" />
          </button>
          <button
            type="button"
            data-testid={`tx-delete-${t.id}`}
            aria-label={`Hapus transaksi ${t.category} ${formatIDR(t.amount)}`}
            disabled={!!t.pending}
            onClick={() => onDelete(t)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-error/10 text-error transition-colors hover:bg-error/20 focus-visible:ring-2 focus-visible:ring-error/60 disabled:opacity-40"
          >
            <Icon name="delete_outline" className="text-[17px]" />
          </button>
        </span>
      ) : null}
    </li>
  );
});

/**
 * Transaction list with strict two-step confirmation:
 * step 1 opens the edit form / delete warning, step 2 requires an explicit
 * final confirmation before the store is mutated.
 */
export const TransactionList = memo(function TransactionList({
  items,
  actions = false,
}: {
  items: Transaction[];
  /** Edit/delete controls are opt-in: only the full transaction overlay uses them. */
  actions?: boolean;
}) {
  const { updateTransaction, deleteTransaction } = useApp();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const startEdit = useCallback((t: Transaction) => {
    setPending(null);
    setEditing(t);
  }, []);

  const startDelete = useCallback((t: Transaction) => {
    setEditing(null);
    setPending({ kind: "delete", tx: t });
  }, []);

  const confirm = useCallback(() => {
    if (!pending) return;
    if (pending.kind === "delete") {
      deleteTransaction(pending.tx.id);
      toast.success("Transaksi dihapus", {
        description: `${pending.tx.category} · ${formatIDR(pending.tx.amount)}`,
      });
    } else {
      updateTransaction(pending.tx.id, pending.patch);
      toast.success("Perubahan tersimpan", {
        description: `${pending.patch.category} · ${formatIDR(pending.patch.amount)}`,
      });
    }
    setPending(null);
    setEditing(null);
  }, [pending, deleteTransaction, updateTransaction]);

  return (
    <>
      <ul className="glass-card rounded-[18px] px-4">
        {items.map((t) => (
          <TransactionRow
            key={t.id}
            t={t}
            actions={actions}
            onEdit={startEdit}
            onDelete={startDelete}
          />
        ))}
      </ul>

      {editing ? (
        <EditDialog
          tx={editing}
          onCancel={() => setEditing(null)}
          onRequestConfirm={(patch) => setPending({ kind: "edit", tx: editing, patch })}
        />
      ) : null}

      {pending ? (
        <ConfirmDialog
          title={pending.kind === "delete" ? "Hapus transaksi?" : "Simpan perubahan?"}
          description={
            pending.kind === "delete"
              ? `Transaksi ${pending.tx.category} sebesar ${formatIDR(pending.tx.amount)} akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`
              : `Nominal menjadi ${formatIDR(pending.patch.amount)} pada kategori ${pending.patch.category}. Lanjutkan?`
          }
          confirmLabel={pending.kind === "delete" ? "Ya, hapus" : "Ya, simpan"}
          destructive={pending.kind === "delete"}
          onCancel={() => setPending(null)}
          onConfirm={confirm}
        />
      ) : null}
    </>
  );
});

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  destructive,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  destructive: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useModalA11y<HTMLDivElement>(true, onCancel);
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        data-testid="tx-confirm-dialog"
        onClick={(e) => e.stopPropagation()}
        className="glass-card w-full max-w-sm rounded-[22px] p-5"
      >
        <h3 className="m-0 text-title text-on-surface">{title}</h3>
        <p className="mt-2 text-[13px] leading-snug text-on-surface-variant">{description}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            autoFocus
            data-testid="tx-confirm-cancel"
            onClick={onCancel}
            className="h-11 flex-1 rounded-full bg-surface-variant text-[13px] font-semibold text-on-surface-variant transition-transform active:scale-95"
          >
            Batal
          </button>
          <button
            type="button"
            data-testid="tx-confirm-accept"
            onClick={onConfirm}
            className={`h-11 flex-1 rounded-full text-[13px] font-bold transition-transform active:scale-95 ${
              destructive ? "bg-error text-on-error" : "gradient-primary text-on-primary-container"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditDialog({
  tx,
  onRequestConfirm,
  onCancel,
}: {
  tx: Transaction;
  onRequestConfirm: (patch: { amount: number; category: string; note: string }) => void;
  onCancel: () => void;
}) {
  const ref = useModalA11y<HTMLDivElement>(true, onCancel);
  const [amount, setAmount] = useState(String(tx.amount));
  const [category, setCategory] = useState(tx.category);
  const [note, setNote] = useState(tx.note ?? "");
  const [error, setError] = useState<string | undefined>(undefined);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(amount.replace(/\D/g, "")) || 0;
    if (numeric <= 0) return setError("Nominal harus lebih besar dari 0.");
    if (numeric > AMOUNT_MAX) return setError("Nominal terlalu besar.");
    if (!category.trim()) return setError("Kategori wajib diisi.");
    setError(undefined);
    onRequestConfirm({
      amount: numeric,
      category: category.trim(),
      note: note.trim().slice(0, NOTE_MAX),
    });
  };

  return (
    <div
      className="fixed inset-0 z-[190] flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Ubah transaksi"
        data-testid="tx-edit-dialog"
        onClick={(e) => e.stopPropagation()}
        className="glass-card w-full max-w-sm rounded-[22px] p-5"
      >
        <h3 className="m-0 text-title text-on-surface">Ubah Transaksi</h3>
        <form className="mt-4 flex flex-col gap-3" onSubmit={submit} noValidate>
          <label className="flex flex-col gap-1">
            <span className="text-meta text-on-surface-variant/80">Nominal</span>
            <input
              inputMode="numeric"
              autoFocus
              data-testid="tx-edit-amount"
              aria-invalid={!!error}
              value={(Number(amount.replace(/\D/g, "")) || 0).toLocaleString("id-ID")}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 15))}
              className="h-11 rounded-2xl border border-outline-variant/30 bg-surface-container-high px-4 text-[14px] text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-meta text-on-surface-variant/80">Kategori</span>
            <input
              data-testid="tx-edit-category"
              value={category}
              maxLength={40}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 rounded-2xl border border-outline-variant/30 bg-surface-container-high px-4 text-[14px] text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-meta text-on-surface-variant/80">Catatan</span>
            <input
              data-testid="tx-edit-note"
              value={note}
              maxLength={NOTE_MAX}
              onChange={(e) => setNote(e.target.value)}
              className="h-11 rounded-2xl border border-outline-variant/30 bg-surface-container-high px-4 text-[14px] text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            />
          </label>
          {error ? (
            <p role="alert" className="m-0 text-[11px] font-semibold text-error">
              {error}
            </p>
          ) : null}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-11 flex-1 rounded-full bg-surface-variant text-[13px] font-semibold text-on-surface-variant transition-transform active:scale-95"
            >
              Batal
            </button>
            <button
              type="submit"
              data-testid="tx-edit-continue"
              className="gradient-primary h-11 flex-1 rounded-full text-[13px] font-bold text-on-primary-container transition-transform active:scale-95"
            >
              Lanjut
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
