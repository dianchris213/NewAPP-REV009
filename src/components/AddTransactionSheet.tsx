import { useCallback, useMemo, useState } from "react";
import { useApp, type TxType } from "@/lib/app-store";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import { Icon } from "./Icon";

const categories: Record<TxType, string[]> = {
  income: ["Gaji", "Freelance", "Bonus", "Hadiah", "Lainnya"],
  expense: ["Makanan", "Transport", "Tagihan", "Belanja", "Hiburan", "Lainnya"],
};

const NOTE_MAX = 80;
const AMOUNT_MAX = 1_000_000_000_000;

const todayInput = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

type Errors = { amount?: string; category?: string; date?: string; note?: string };

export function AddTransactionSheet() {
  const { addTxOpen, setAddTxOpen, addTransaction } = useApp();
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(todayInput);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);

  const close = useCallback(() => setAddTxOpen(false), [setAddTxOpen]);
  const containerRef = useModalA11y<HTMLFormElement>(addTxOpen, close);

  const numeric = Number(amount.replace(/\D/g, "")) || 0;
  const trimmedNote = note.trim();

  const validate = useCallback((): Errors => {
    const next: Errors = {};
    if (!amount.replace(/\D/g, "")) next.amount = "Nominal wajib diisi.";
    else if (numeric <= 0) next.amount = "Nominal harus lebih besar dari 0.";
    else if (numeric > AMOUNT_MAX) next.amount = "Nominal terlalu besar.";
    if (!category) next.category = "Kategori wajib dipilih.";
    if (!date) next.date = "Tanggal wajib diisi.";
    else if (Number.isNaN(new Date(date).getTime())) next.date = "Tanggal tidak valid.";
    if (!trimmedNote) next.note = "Catatan singkat wajib diisi.";
    return next;
  }, [amount, numeric, category, date, trimmedNote]);

  const liveErrors = useMemo(
    () => (submitted ? validate() : errors),
    [submitted, validate, errors],
  );

  const reset = () => {
    setAmount("");
    setNote("");
    setCategory("");
    setDate(todayInput());
    setType("expense");
    setErrors({});
    setSubmitted(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = validate();
    setSubmitted(true);
    setErrors(next);
    if (Object.keys(next).length) return;
    addTransaction({
      type,
      amount: numeric,
      category,
      note: trimmedNote.slice(0, NOTE_MAX),
      date: new Date(date).toISOString(),
    });
    reset();
    setAddTxOpen(false);
  };

  const pickType = (next: TxType) => {
    setType(next);
    setCategory("");
  };

  if (!addTxOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Tambah transaksi"
      onClick={close}
    >
      <form
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        noValidate
        className="glass-card no-scrollbar max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[28px] px-margin-main pb-8 pt-4"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-outline/50" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-title text-on-surface">Tambah Transaksi</h2>
          <button
            type="button"
            aria-label="Tutup"
            data-testid="add-tx-close"
            onClick={close}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-variant text-on-surface-variant"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>

        <div
          className="mb-4 grid grid-cols-2 gap-2 rounded-full bg-surface-container p-1"
          role="tablist"
          aria-label="Jenis transaksi"
        >
          {(["income", "expense"] as TxType[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={type === t}
              onClick={() => pickType(t)}
              className={`rounded-full py-2 text-sm font-semibold transition-colors ${
                type === t
                  ? t === "income"
                    ? "bg-success/20 text-success"
                    : "bg-error/20 text-error"
                  : "text-on-surface-variant"
              }`}
            >
              {t === "income" ? "Pemasukan" : "Pengeluaran"}
            </button>
          ))}
        </div>

        <label className="text-label uppercase text-on-surface-variant" htmlFor="tx-amount">
          Nominal
        </label>
        <div
          className={`mt-1 flex items-center gap-2 rounded-[16px] border bg-surface-container-low px-4 py-3 ${
            liveErrors.amount ? "border-error" : "border-outline-variant/30"
          }`}
        >
          <span className="text-on-surface-variant">Rp</span>
          <input
            id="tx-amount"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            data-testid="tx-amount-input"
            aria-invalid={!!liveErrors.amount}
            aria-describedby="tx-amount-error"
            value={numeric ? numeric.toLocaleString("id-ID") : ""}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 15))}
            className="w-full bg-transparent text-xl font-bold text-on-surface outline-none placeholder:text-outline"
          />
        </div>
        <InlineError id="tx-amount-error" message={liveErrors.amount} />

        <span className="mt-4 block text-label uppercase text-on-surface-variant">Kategori</span>
        <div
          className="mt-2 flex gap-2 swipe-x"
          role="group"
          aria-label="Kategori"
          aria-invalid={!!liveErrors.category}
        >
          {categories[type].map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                category === c
                  ? "border-primary bg-primary-container/25 text-primary"
                  : liveErrors.category
                    ? "border-error/60 text-on-surface-variant"
                    : "border-outline-variant/30 text-on-surface-variant"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <InlineError id="tx-category-error" message={liveErrors.category} />

        <label className="mt-4 block text-label uppercase text-on-surface-variant" htmlFor="tx-date">
          Tanggal
        </label>
        <input
          id="tx-date"
          type="date"
          value={date}
          data-testid="tx-date-input"
          aria-invalid={!!liveErrors.date}
          aria-describedby="tx-date-error"
          onChange={(e) => setDate(e.target.value)}
          className={`mt-1 w-full rounded-[16px] border bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none ${
            liveErrors.date ? "border-error" : "border-outline-variant/30"
          }`}
        />
        <InlineError id="tx-date-error" message={liveErrors.date} />

        <label className="mt-4 block text-label uppercase text-on-surface-variant" htmlFor="tx-note">
          Catatan Singkat
        </label>
        <input
          id="tx-note"
          value={note}
          maxLength={NOTE_MAX}
          data-testid="tx-note-input"
          aria-invalid={!!liveErrors.note}
          aria-describedby="tx-note-error"
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            type === "income" ? "Contoh: Gaji bulan ini" : "Contoh: Bensin motor harian"
          }
          className={`mt-1 w-full rounded-[16px] border bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none placeholder:text-outline ${
            liveErrors.note ? "border-error" : "border-outline-variant/30"
          }`}
        />
        {liveErrors.note ? (
          <InlineError id="tx-note-error" message={liveErrors.note} />
        ) : (
          <p id="tx-note-error" className="mt-1 text-[11px] text-on-surface-variant/70">
            {`Wajib: alasan ${type === "income" ? "pemasukan" : "pengeluaran"} ini.`}
          </p>
        )}

        <button
          type="submit"
          data-testid="tx-submit"
          className="gradient-primary mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-on-primary-container shadow-glow"
        >
          <Icon name="check" className="text-[20px]" /> Simpan Transaksi
        </button>
      </form>
    </div>
  );
}

function InlineError({ id, message }: { id: string; message?: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-[11px] font-semibold text-error">
      {message}
    </p>
  );
}
