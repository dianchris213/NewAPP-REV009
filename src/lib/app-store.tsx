import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type TxType = "income" | "expense";

export type Transaction = {
  id: string;
  type: TxType;
  amount: number;
  category: string;
  note: string;
  date: string; // ISO
  pending?: boolean;
};

export type User = {
  name: string;
  handle: string;
  provider: "telegram" | "google";
  avatar?: string;
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
};

export const defaultNotifications: AppNotification[] = [
  {
    id: "n1",
    title: "Transaksi tersimpan",
    body: "Pengeluaran Rp 45.000 (Transport) berhasil dicatat.",
    time: "5 menit lalu",
  },
  {
    id: "n2",
    title: "Ringkasan mingguan siap",
    body: "Pengeluaran minggu ini 12% lebih rendah dari minggu lalu.",
    time: "Kemarin",
  },
];

export type TxFilters = {
  month: string;
  week: string; // "all" | "this" | "last"
  type: "all" | "income" | "expense";
  category: string;
  keyword: string;
};

export const defaultTxFilters: TxFilters = {
  month: "all",
  week: "all",
  type: "all",
  category: "all",
  keyword: "",
};

export type Settings = {
  darkTheme: boolean;
  pushNotifications: boolean;
  biometricLock: boolean;
  cloudSync: boolean;
};

const STORAGE_KEY = "tmab-state-v1";

const defaultSettings: Settings = {
  darkTheme: true,
  pushNotifications: false,
  biometricLock: false,
  cloudSync: false,
};

const seedTransactions = (): Transaction[] => {
  const now = Date.now();
  const day = 86_400_000;
  const mk = (
    id: string,
    type: TxType,
    amount: number,
    category: string,
    note: string,
    daysAgo: number,
  ): Transaction => ({
    id,
    type,
    amount,
    category,
    note,
    date: new Date(now - daysAgo * day).toISOString(),
  });
  return [
    mk("s1", "income", 7500000, "Gaji", "Gaji bulanan", 2),
    mk("s2", "expense", 185000, "Makanan", "Belanja mingguan", 0),
    mk("s3", "expense", 45000, "Transport", "Ojek online", 0),
    mk("s4", "expense", 320000, "Tagihan", "Listrik", 5),
    mk("s5", "income", 1200000, "Freelance", "Proyek desain", 12),
    mk("s6", "expense", 890000, "Belanja", "Sepatu lari", 40),
    mk("s7", "expense", 250000, "Hiburan", "Langganan streaming", 120),
    mk("s8", "income", 2000000, "Bonus", "Bonus kuartal", 200),
    // Mock test transaction with a short note (Catatan Singkat)
    mk("s9", "expense", 75000, "Makanan", "Catatan singkat: makan siang tim di kantor", 1),
  ];
};

type AppState = {
  hydrated: boolean;
  user: User | null;
  authLoading: null | "telegram" | "google";
  transactions: Transaction[];
  settings: Settings;
  addTxOpen: boolean;
  allTxOpen: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  markNotificationsRead: () => void;
  updateProfile: (update: { name?: string; avatar?: string }) => void;
  txFilters: TxFilters;
  setTxFilters: (update: Partial<TxFilters>) => void;
  resetTxFilters: () => void;
  setAllTxOpen: (open: boolean) => void;
  openCurrentMonth: () => void;
  login: (provider: "telegram" | "google", name?: string) => Promise<void>;
  logout: () => void;
  addTransaction: (
    input: Omit<Transaction, "id" | "date" | "pending"> & { date?: string },
  ) => void;
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, "id">>) => void;
  deleteTransaction: (id: string) => void;
  toggleSetting: (key: keyof Settings) => void;
  setAddTxOpen: (open: boolean) => void;
  balance: number;
  totalIncome: number;
  totalExpense: number;
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<null | "telegram" | "google">(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [addTxOpen, setAddTxOpen] = useState(false);
  const [allTxOpen, setAllTxOpen] = useState(false);
  const [txFilters, setTxFiltersState] = useState<TxFilters>(defaultTxFilters);
  const [notifications] = useState<AppNotification[]>(defaultNotifications);
  const [unreadCount, setUnreadCount] = useState(defaultNotifications.length);

  const markNotificationsRead = useCallback(() => setUnreadCount(0), []);

  const updateProfile = useCallback((update: { name?: string; avatar?: string }) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next: User = { ...prev };
      if (update.name?.trim()) next.name = update.name.trim();
      if (update.avatar?.trim()) next.avatar = update.avatar.trim();
      else delete next.avatar;
      return next;
    });
  }, []);

  const setTxFilters = useCallback((update: Partial<TxFilters>) => {
    setTxFiltersState((prev) => ({ ...prev, ...update }));
  }, []);

  const resetTxFilters = useCallback(() => setTxFiltersState(defaultTxFilters), []);

  const openCurrentMonth = useCallback(() => {
    setTxFiltersState({
      ...defaultTxFilters,
      month: String(new Date().getMonth()),
    });
    setAllTxOpen(true);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          user?: User | null;
          transactions?: Transaction[];
          settings?: Settings;
        };
        setUser(parsed.user ?? null);
        if (parsed.transactions?.length) {
          // Keep existing data; only add the mock note transaction if missing.
          const mock = seedTransactions().find((t) => t.id === "s9")!;
          const hasMock = parsed.transactions.some((t) => t.id === "s9");
          setTransactions(hasMock ? parsed.transactions : [mock, ...parsed.transactions]);
        } else {
          setTransactions(seedTransactions());
        }
        setSettings({ ...defaultSettings, ...(parsed.settings ?? {}) });
      } else {
        setTransactions(seedTransactions());
      }
    } catch {
      setTransactions(seedTransactions());
    }
    setHydrated(true);
  }, []);

  // Persist off the render path and coalesced, so rapid state updates never
  // block the UI with repeated JSON serialization.
  useEffect(() => {
    if (!hydrated) return;
    const id = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ user, transactions, settings }),
        );
      } catch {
        /* ignore quota errors */
      }
    }, 250);
    return () => window.clearTimeout(id);
  }, [hydrated, user, transactions, settings]);

  // Apply the theme switch to the document so the toggle is visually real.
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.classList.toggle("theme-light", !settings.darkTheme);
    root.classList.toggle("dark", settings.darkTheme);
  }, [hydrated, settings.darkTheme]);

  const login = useCallback(async (provider: "telegram" | "google", name?: string) => {
    setAuthLoading(provider);
    await new Promise((r) => setTimeout(r, 1200));
    const tgUser = (globalThis as any)?.Telegram?.WebApp?.initDataUnsafe?.user;
    setUser({
      name:
        name ||
        (provider === "telegram"
          ? [tgUser?.first_name, tgUser?.last_name].filter(Boolean).join(" ") || "Pengguna Telegram"
          : "Pengguna Google"),
      handle:
        provider === "telegram"
          ? tgUser?.username
            ? `@${tgUser.username}`
            : "@telegram_user"
          : "google@gmail.com",
      provider,
    });
    setAuthLoading(null);
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const addTransaction = useCallback(
    (input: Omit<Transaction, "id" | "date" | "pending"> & { date?: string }) => {
      const id = `t${Date.now()}`;
      const { date, ...rest } = input;
      const iso = (() => {
        if (!date) return new Date().toISOString();
        const d = new Date(date);
        return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      })();
      // Optimistic insert: list + balance update instantly, then confirm.
      setTransactions((prev) => [{ ...rest, id, date: iso, pending: true }, ...prev]);
      setTimeout(() => {
        setTransactions((prev) =>
          prev.map((t) => (t.id === id ? { ...t, pending: false } : t)),
        );
      }, 700);
    },
    [],
  );

  const updateTransaction = useCallback(
    (id: string, patch: Partial<Omit<Transaction, "id">>) => {
      if (!id) return;
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...patch, id: t.id } : t)),
      );
    },
    [],
  );

  const deleteTransaction = useCallback((id: string) => {
    if (!id) return;
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleSetting = useCallback((key: keyof Settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const { totalIncome, totalExpense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    return { totalIncome: income, totalExpense: expense };
  }, [transactions]);

  // Stable context value: consumers only re-render when real data changes.
  const value = useMemo<AppState>(
    () => ({
      hydrated,
      user,
      authLoading,
      transactions,
      settings,
      addTxOpen,
      allTxOpen,
      notifications,
      unreadCount,
      markNotificationsRead,
      updateProfile,
      txFilters,
      setTxFilters,
      resetTxFilters,
      setAllTxOpen,
      openCurrentMonth,
      login,
      logout,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      toggleSetting,
      setAddTxOpen,
      balance: totalIncome - totalExpense,
      totalIncome,
      totalExpense,
    }),
    [
      hydrated,
      user,
      authLoading,
      transactions,
      settings,
      addTxOpen,
      allTxOpen,
      notifications,
      unreadCount,
      markNotificationsRead,
      updateProfile,
      txFilters,
      setTxFilters,
      resetTxFilters,
      openCurrentMonth,
      login,
      logout,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      toggleSetting,
      totalIncome,
      totalExpense,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export function formatIDR(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}Rp ${Math.abs(Math.round(value)).toLocaleString("id-ID")}`;
}
