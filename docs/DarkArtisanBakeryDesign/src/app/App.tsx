import {
  useState, useEffect, useCallback, useContext, createContext,
  useReducer, useMemo, type Dispatch,
} from "react";
import {
  Heart, Home, ShoppingBag, Bookmark, User, ChevronLeft, MapPin,
  Bell, Minus, Plus, Clock, Calendar, Wallet, ChevronRight,
  Check, Trash2, Phone, X, RotateCcw, Zap,
} from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import imgDujaengku    from "@/imports/___.png";
import imgSogeumButter from "@/imports/____.png";
import imgMuhwaGwa     from "@/imports/____2.png";

const DROP_IMAGES: Record<number, string> = {
  1: imgDujaengku,
  2: imgSogeumButter,
  3: imgMuhwaGwa,
};

// ── Brand tokens ───────────────────────────────────────────────────────────────
const C = {
  bg: "#121212", surface: "#1E1B18", deep: "#0A0908",
  border: "#332E28", text: "#F2EDE6", muted: "#8F857A",
  accent: "#F5A524", accentSoft: "#2A2118",
  info: "#5B9BD5", disabled: "#4A443C",
  green: "#6DBF67", greenSoft: "#1A2A18",
} as const;
const SERIF = "'Playfair Display', serif";
const MONO  = "'JetBrains Mono', monospace";
const SANS  = "'Inter', -apple-system, sans-serif";

// ── Types ──────────────────────────────────────────────────────────────────────
type DropStatus  = "SCHEDULED" | "ON_SALE" | "SOLD_OUT" | "CLOSED";
type OrderStatus = "픽업대기" | "구매확정" | "취소";
type Screen =
  | "login" | "home"
  | "drop-detail" | "order" | "order-complete"
  | "order-list" | "order-detail"
  | "wishlist" | "wallet" | "charge"
  | "mypage" | "seller-register" | "seller-dashboard" | "admin";
type Tab = "home" | "wishlist" | "orders" | "my";

interface Drop {
  id: number; name: string; bakery: string; price: number;
  stock: number; totalStock: number; limitPerPerson: number;
  dropAt: string; saleEndAt: string;
  pickupStart: string; pickupEnd: string;
  pickupOpenTime: string; pickupCloseTime: string;
  closedDays: string[];
}
interface Order {
  id: number; dropId: number; dropName: string; bakery: string;
  pricePerItem: number; qty: number; total: number;
  pickupDate: string; paidAt: string; status: OrderStatus;
  saleEndAt: string; pickupEnd: string;
}
interface Transaction {
  id: number; date: string; type: "결제" | "충전" | "환불";
  label: string; amount: number; balanceAfter: number;
}
interface AppState {
  virtualOffset: number;
  user: { name: string; balance: number };
  drops: Drop[]; orders: Order[]; wishlist: number[];
  transactions: Transaction[];
  lastOrderId: number | null;
  nextId: { order: number; tx: number };
}
type Action =
  | { type: "SET_OFFSET"; offset: number }
  | { type: "PURCHASE"; dropId: number; qty: number; pickupDate: string }
  | { type: "CANCEL_ORDER"; orderId: number }
  | { type: "TOGGLE_WISHLIST"; dropId: number }
  | { type: "CHARGE"; amount: number }
  | { type: "FORCE_STOCK"; dropId: number; stock: number }
  | { type: "FORCE_BALANCE"; balance: number }
  | { type: "RESET" };

// ── Initial data ───────────────────────────────────────────────────────────────
const INITIAL_DROPS: Drop[] = [
  {
    id: 1, name: "두쫀쿠", bakery: "어니언베이커리", price: 3000,
    stock: 22, totalStock: 30, limitPerPerson: 5,
    dropAt: "2026-07-17T14:00:00", saleEndAt: "2026-07-17T16:00:00",
    pickupStart: "2026-07-17", pickupEnd: "2026-07-23",
    pickupOpenTime: "09:00", pickupCloseTime: "18:00",
    closedDays: ["SAT", "SUN"],
  },
  {
    id: 2, name: "소금버터롤", bakery: "밀도", price: 4500,
    stock: 20, totalStock: 20, limitPerPerson: 3,
    dropAt: "2026-07-17T17:00:00", saleEndAt: "2026-07-17T19:00:00",
    pickupStart: "2026-07-18", pickupEnd: "2026-07-24",
    pickupOpenTime: "10:00", pickupCloseTime: "19:00",
    closedDays: ["SUN"],
  },
  {
    id: 3, name: "무화과캄파뉴", bakery: "브레드랩", price: 8000,
    stock: 0, totalStock: 15, limitPerPerson: 2,
    dropAt: "2026-07-17T11:00:00", saleEndAt: "2026-07-17T13:00:00",
    pickupStart: "2026-07-17", pickupEnd: "2026-07-20",
    pickupOpenTime: "09:00", pickupCloseTime: "17:00",
    closedDays: ["SAT", "SUN"],
  },
];
const DEMO_START = new Date("2026-07-17T13:59:00");
const INITIAL_STATE: AppState = {
  virtualOffset: DEMO_START.getTime() - Date.now(),
  user: { name: "김민준", balance: 50000 },
  drops: INITIAL_DROPS, orders: [], wishlist: [],
  transactions: [
    { id: 1, date: "2026-07-10T09:00:00", type: "충전", label: "카드 충전", amount: 50000, balanceAfter: 50000 },
  ],
  lastOrderId: null,
  nextId: { order: 1, tx: 2 },
};

// ── Reducer ────────────────────────────────────────────────────────────────────
function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {

    case "SET_OFFSET":
      return { ...state, virtualOffset: action.offset };

    case "PURCHASE": {
      const drop = state.drops.find(d => d.id === action.dropId);
      if (!drop) return state;
      const total = drop.price * action.qty;
      if (state.user.balance < total || drop.stock < action.qty) return state;
      const newBalance = state.user.balance - total;
      const newStock   = drop.stock - action.qty;
      const oid = state.nextId.order;
      const tid = state.nextId.tx;
      const now = new Date(Date.now() + state.virtualOffset).toISOString();
      const newOrder: Order = {
        id: oid, dropId: drop.id, dropName: drop.name, bakery: drop.bakery,
        pricePerItem: drop.price, qty: action.qty, total,
        pickupDate: action.pickupDate, paidAt: now, status: "픽업대기",
        saleEndAt: drop.saleEndAt, pickupEnd: drop.pickupEnd,
      };
      const newTx: Transaction = {
        id: tid, date: now, type: "결제",
        label: `${drop.name} ${action.qty}개`, amount: -total, balanceAfter: newBalance,
      };
      return {
        ...state,
        user: { ...state.user, balance: newBalance },
        drops: state.drops.map(d => d.id === drop.id ? { ...d, stock: newStock } : d),
        orders: [newOrder, ...state.orders],
        transactions: [newTx, ...state.transactions],
        lastOrderId: oid,
        nextId: { order: oid + 1, tx: tid + 1 },
      };
    }

    case "CANCEL_ORDER": {
      const order = state.orders.find(o => o.id === action.orderId);
      if (!order || order.status !== "픽업대기") return state;
      const newBalance = state.user.balance + order.total;
      const tid = state.nextId.tx;
      const now = new Date(Date.now() + state.virtualOffset).toISOString();
      const newTx: Transaction = {
        id: tid, date: now, type: "환불",
        label: `${order.dropName} 취소 환불`, amount: order.total, balanceAfter: newBalance,
      };
      return {
        ...state,
        user: { ...state.user, balance: newBalance },
        drops: state.drops.map(d => d.id === order.dropId ? { ...d, stock: d.stock + order.qty } : d),
        orders: state.orders.map(o => o.id === action.orderId ? { ...o, status: "취소" } : o),
        transactions: [newTx, ...state.transactions],
        nextId: { ...state.nextId, tx: tid + 1 },
      };
    }

    case "TOGGLE_WISHLIST": {
      const has = state.wishlist.includes(action.dropId);
      return { ...state, wishlist: has ? state.wishlist.filter(id => id !== action.dropId) : [...state.wishlist, action.dropId] };
    }

    case "CHARGE": {
      const newBalance = state.user.balance + action.amount;
      const tid = state.nextId.tx;
      const now = new Date(Date.now() + state.virtualOffset).toISOString();
      const newTx: Transaction = {
        id: tid, date: now, type: "충전", label: "앱 충전", amount: action.amount, balanceAfter: newBalance,
      };
      return {
        ...state,
        user: { ...state.user, balance: newBalance },
        transactions: [newTx, ...state.transactions],
        nextId: { ...state.nextId, tx: tid + 1 },
      };
    }

    case "FORCE_STOCK":
      return { ...state, drops: state.drops.map(d => d.id === action.dropId ? { ...d, stock: action.stock } : d) };

    case "FORCE_BALANCE":
      return { ...state, user: { ...state.user, balance: action.balance } };

    case "RESET":
      return { ...INITIAL_STATE, virtualOffset: DEMO_START.getTime() - Date.now() };

    default: return state;
  }
}

// ── Context ────────────────────────────────────────────────────────────────────
interface Ctx { state: AppState; dispatch: Dispatch<Action>; virtualNow: Date }
const AppContext = createContext<Ctx | null>(null);

function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id); }, []);
  const virtualNow = useMemo(() => new Date(Date.now() + state.virtualOffset), [state.virtualOffset, tick]);
  return <AppContext.Provider value={{ state, dispatch, virtualNow }}>{children}</AppContext.Provider>;
}
function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp outside provider");
  return ctx;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const DOW: Record<number, string> = { 0:"SUN",1:"MON",2:"TUE",3:"WED",4:"THU",5:"FRI",6:"SAT" };
const DAY_KR = ["일","월","화","수","목","금","토"];
function pad(n: number) { return String(n).padStart(2, "0"); }

function getDropStatus(drop: Drop, now: Date): DropStatus {
  if (drop.stock === 0) return "SOLD_OUT";
  if (now < new Date(drop.dropAt)) return "SCHEDULED";
  if (now < new Date(drop.saleEndAt)) return "ON_SALE";
  return "CLOSED";
}
function getOrderEffectiveStatus(order: Order, now: Date): OrderStatus {
  if (order.status === "취소") return "취소";
  if (now >= new Date(order.pickupEnd + "T18:00:00")) return "구매확정";
  return order.status;
}
function canCancelOrder(order: Order, now: Date) {
  return order.status === "픽업대기" && now < new Date(order.saleEndAt);
}
function msToHMS(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { h: Math.floor(s/3600), m: Math.floor((s%3600)/60), s: s%60 };
}
function getDDay(dateStr: string, now: Date) {
  const pd = new Date(dateStr + "T00:00:00");
  const nd = new Date(now); nd.setHours(0,0,0,0);
  return Math.round((pd.getTime() - nd.getTime()) / 86400000);
}

interface PickupDay { dateStr: string; day: string; date: number; disabled: boolean }
function generatePickupDays(drop: Drop, virtualNow: Date): PickupDay[] {
  const start = new Date(drop.pickupStart + "T00:00:00");
  const end   = new Date(drop.pickupEnd   + "T00:00:00");
  const today = new Date(virtualNow); today.setHours(0,0,0,0);
  const result: PickupDay[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    result.push({
      dateStr: cur.toISOString().split("T")[0],
      day: DAY_KR[dow], date: cur.getDate(),
      disabled: drop.closedDays.includes(DOW[dow]) || cur < today,
    });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}
function fmtVirtualNow(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function toInputVal(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtPickup(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth()+1}/${d.getDate()} (${DAY_KR[d.getDay()]})`;
}
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth()+1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Reusable components ────────────────────────────────────────────────────────
function BreadBox({ label = "", className = "", src, dim }: { label?: string; className?: string; src?: string; dim?: boolean }) {
  if (src) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <ImageWithFallback src={src} alt={label} className={`w-full h-full object-cover ${dim ? "brightness-50 grayscale" : ""}`} />
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden flex items-center justify-center ${className}`}
      style={{ background: "radial-gradient(ellipse at 38% 35%, #2A2118 0%, #161210 55%, #0D0B08 100%)" }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 40% 40%, rgba(245,165,36,0.07) 0%, transparent 65%)" }} />
      {label && <span className="text-[11px] font-medium tracking-wide text-center px-2 z-10" style={{ color: C.muted }}>{label}</span>}
    </div>
  );
}

function DropBadge({ status }: { status: DropStatus }) {
  const map: Record<DropStatus, { label: string; bg: string; fg: string }> = {
    SCHEDULED: { label: "오픈 예정", bg: C.info,     fg: "#fff" },
    ON_SALE:   { label: "판매중",   bg: C.accent,   fg: C.bg },
    SOLD_OUT:  { label: "품절",     bg: C.disabled, fg: C.muted },
    CLOSED:    { label: "판매 종료", bg: C.disabled, fg: C.muted },
  };
  const { label, bg, fg } = map[status];
  return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[4px] leading-none" style={{ background: bg, color: fg, fontFamily: SANS }}>{label}</span>;
}

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, { bg: string; fg: string }> = {
    "픽업대기": { bg: C.accentSoft, fg: C.accent },
    "구매확정": { bg: C.greenSoft,  fg: C.green  },
    "취소":     { bg: "#1a1a1a",    fg: C.muted  },
  };
  const { bg, fg } = map[status];
  return <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: bg, color: fg }}>{status}</span>;
}

function TabBar({ active, onNav }: { active: Tab; onNav: (s: Screen, t: Tab) => void }) {
  const tabs = [
    { id: "home" as Tab,     label: "홈",     screen: "home" as Screen,       icon: <Home size={20} /> },
    { id: "wishlist" as Tab, label: "찜",     screen: "wishlist" as Screen,   icon: <Bookmark size={20} /> },
    { id: "orders" as Tab,   label: "주문내역", screen: "order-list" as Screen, icon: <ShoppingBag size={20} /> },
    { id: "my" as Tab,       label: "마이",   screen: "mypage" as Screen,     icon: <User size={20} /> },
  ];
  return (
    <div className="flex flex-shrink-0" style={{ background: C.surface, borderTop: `1px solid ${C.border}`, fontFamily: SANS }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onNav(t.screen, t.id)}
          className="flex-1 flex flex-col items-center gap-0.5 py-3"
          style={{ color: active === t.id ? C.accent : C.muted }}>
          {t.icon}
          <span className="text-[11px]">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 pt-12 pb-4 flex-shrink-0"
      style={{ borderBottom: `1px solid ${C.border}`, fontFamily: SANS }}>
      <button onClick={onBack}><ChevronLeft size={24} color={C.text} /></button>
      <span className="text-[15px] font-semibold" style={{ color: C.text }}>{title}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN: LOGIN
// ═══════════════════════════════════════════════════════════════════════════════
function LoginScreen({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div className="flex flex-col h-full items-center justify-center px-8 gap-10"
      style={{ background: C.bg, fontFamily: SANS }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
          style={{ background: C.accentSoft, border: `1px solid ${C.border}` }}>🍞</div>
        <div className="text-center">
          <h1 className="text-[32px] font-bold tracking-tight" style={{ fontFamily: SERIF, color: C.text }}>오픈베이크</h1>
          <p className="text-sm mt-2" style={{ color: C.muted }}>매일 오후 2시, 동네 빵집의 한정판</p>
        </div>
      </div>
      <div className="w-full flex flex-col gap-3">
        <button onClick={() => navigate("home")} className="w-full py-3.5 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold"
          style={{ background: "#FEE500", color: "#191919" }}>
          <span>💬</span> 카카오로 시작하기
        </button>
        <button onClick={() => navigate("home")} className="w-full py-3.5 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold"
          style={{ background: C.text, color: "#191919" }}>
          <span className="font-bold">G</span> Google로 시작하기
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN: HOME
// ═══════════════════════════════════════════════════════════════════════════════
function HomeScreen({
  navigate, activeTab,
}: { navigate: (s: Screen, opts?: { dropId?: number }, tab?: Tab) => void; activeTab: Tab }) {
  const { state, virtualNow } = useApp();

  // Group drops by slot hour
  type SlotGroup = { dropAt: string; slotLabel: string; drops: Drop[] };
  const groups = useMemo<SlotGroup[]>(() => {
    const map = new Map<string, SlotGroup>();
    for (const d of state.drops) {
      const key = d.dropAt.substring(0, 16);
      if (!map.has(key)) {
        const dt = new Date(d.dropAt);
        map.set(key, { dropAt: d.dropAt, slotLabel: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`, drops: [] });
      }
      map.get(key)!.drops.push(d);
    }
    return Array.from(map.values()).sort((a, b) => a.dropAt.localeCompare(b.dropAt));
  }, [state.drops]);

  // Next scheduled drop
  const nextScheduled = useMemo(() => {
    return state.drops
      .filter(d => getDropStatus(d, virtualNow) === "SCHEDULED")
      .map(d => ({ drop: d, ms: new Date(d.dropAt).getTime() - virtualNow.getTime() }))
      .sort((a, b) => a.ms - b.ms)[0] ?? null;
  }, [state.drops, virtualNow]);

  const heroHMS = nextScheduled ? msToHMS(nextScheduled.ms) : null;

  return (
    <div className="flex flex-col h-full" style={{ background: C.bg, fontFamily: SANS }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-3 flex-shrink-0">
        <span className="text-2xl font-bold" style={{ fontFamily: SERIF, color: C.text }}>오픈베이크</span>
        <button onClick={() => navigate("wallet")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
          style={{ background: C.accentSoft, color: C.accent, border: `1px solid ${C.border}` }}>
          <Wallet size={13} /> {state.user.balance.toLocaleString()}원
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hero countdown */}
        {heroHMS ? (
          <div className="mx-4 mb-5 rounded-2xl px-5 py-4 text-center"
            style={{ background: C.accentSoft, border: `1px solid ${C.border}` }}>
            <p className="text-xs mb-2" style={{ color: C.muted }}>다음 드롭까지</p>
            <div className="flex items-end justify-center gap-1">
              {[heroHMS.h, heroHMS.m, heroHMS.s].map((v, i) => (
                <div key={i} className="flex items-end">
                  {i > 0 && <span className="text-3xl font-bold mb-3 mx-0.5" style={{ fontFamily: MONO, color: C.muted }}>:</span>}
                  <div className="flex flex-col items-center">
                    <span className="text-5xl font-bold tabular-nums leading-none" style={{ fontFamily: MONO, color: C.text }}>{pad(v)}</span>
                    <span className="text-[11px] mt-1" style={{ color: C.muted }}>{["시","분","초"][i]}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs mt-3" style={{ color: C.muted }}>{nextScheduled!.drop.dropAt.slice(11,16)} 오픈 · {nextScheduled!.drop.name}</p>
          </div>
        ) : (
          <div className="mx-4 mb-5 rounded-2xl px-5 py-4 text-center" style={{ background: C.accentSoft, border: `1px solid ${C.border}` }}>
            <p className="text-sm" style={{ color: C.muted }}>오늘 예정된 드롭이 모두 종료되었습니다</p>
          </div>
        )}

        {/* Drop slots */}
        {groups.map(group => {
          const allStatuses = group.drops.map(d => getDropStatus(d, virtualNow));
          const isEnded = allStatuses.every(s => s === "SOLD_OUT" || s === "CLOSED");
          const onSaleNow = allStatuses.some(s => s === "ON_SALE");
          const msUntilOpen = new Date(group.dropAt).getTime() - virtualNow.getTime();
          const slotHMS = isEnded ? null : msToHMS(onSaleNow
            ? Math.max(0, new Date(group.drops[0].saleEndAt).getTime() - virtualNow.getTime())
            : Math.max(0, msUntilOpen));

          return (
            <div key={group.dropAt} className="mb-6">
              <div className="flex items-center justify-between px-4 mb-3">
                <span className="text-sm font-semibold" style={{ color: isEnded ? C.muted : C.text }}>
                  {group.slotLabel} 드롭
                  {onSaleNow && <span className="ml-2 text-[11px] font-semibold px-1.5 py-0.5 rounded" style={{ background: C.accentSoft, color: C.accent }}>판매중</span>}
                </span>
                {slotHMS && (
                  <span className="text-sm tabular-nums" style={{ fontFamily: MONO, color: onSaleNow ? C.accent : C.muted }}>
                    {pad(slotHMS.h)}:{pad(slotHMS.m)}:{pad(slotHMS.s)}
                  </span>
                )}
                {isEnded && <span className="text-xs" style={{ color: C.disabled }}>종료</span>}
              </div>
              <div className="flex gap-3 px-4 overflow-x-auto pb-1">
                {group.drops.map(drop => {
                  const status = getDropStatus(drop, virtualNow);
                  const ended = status === "SOLD_OUT" || status === "CLOSED";
                  return (
                    <button key={drop.id}
                      onClick={() => navigate("drop-detail", { dropId: drop.id })}
                      className={`flex-shrink-0 w-[148px] rounded-xl overflow-hidden text-left ${ended ? "opacity-60 grayscale" : ""}`}
                      style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                      <div className="relative">
                        <BreadBox label={drop.name} className="w-full h-[148px]" src={DROP_IMAGES[drop.id]} />
                        <div className="absolute top-2 left-2"><DropBadge status={status} /></div>
                      </div>
                      <div className="p-2.5">
                        <p className="text-[11px]" style={{ color: C.muted }}>{drop.bakery}</p>
                        <p className="text-sm font-semibold mt-0.5" style={{ color: C.text }}>{drop.name}</p>
                        <p className="text-sm" style={{ color: C.text }}>{drop.price.toLocaleString()}원</p>
                        {status === "ON_SALE" && (
                          <p className="text-[11px] mt-1 font-semibold" style={{ color: C.accent }}>{drop.stock}개 남음</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="h-4" />
      </div>

      <TabBar active={activeTab} onNav={(s, t) => navigate(s, undefined, t)} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN: DROP DETAIL
// ═══════════════════════════════════════════════════════════════════════════════
function DropDetailScreen({
  dropId, navigate, back,
}: { dropId: number; navigate: (s: Screen, opts?: { dropId?: number }) => void; back: () => void }) {
  const { state, dispatch, virtualNow } = useApp();
  const drop = state.drops.find(d => d.id === dropId);
  if (!drop) return <div className="flex h-full items-center justify-center" style={{ background: C.bg }}><span style={{ color: C.muted }}>드롭을 찾을 수 없습니다</span></div>;

  const status = getDropStatus(drop, virtualNow);
  const isHearted = state.wishlist.includes(drop.id);
  const pct = (drop.stock / drop.totalStock) * 100;

  // Countdown
  const msTarget = status === "SCHEDULED"
    ? new Date(drop.dropAt).getTime() - virtualNow.getTime()
    : new Date(drop.saleEndAt).getTime() - virtualNow.getTime();
  const cd = msToHMS(msTarget);

  return (
    <div className="flex flex-col h-full" style={{ background: C.bg, fontFamily: SANS }}>
      {/* Hero */}
      <div className="relative flex-shrink-0" style={{ height: 300 }}>
        <BreadBox
          label={drop.name}
          className="absolute inset-0"
          src={DROP_IMAGES[drop.id]}
          dim={status === "SOLD_OUT" || status === "CLOSED"}
        />

        {status === "SCHEDULED" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{ background: "rgba(0,0,0,0.58)" }}>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>오픈까지</p>
            <span className="text-5xl font-bold tabular-nums" style={{ fontFamily: MONO, color: "#fff" }}>
              {pad(cd.h)}:{pad(cd.m)}:{pad(cd.s)}
            </span>
          </div>
        )}
        {status === "ON_SALE" && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center px-4 py-2.5"
            style={{ background: "rgba(0,0,0,0.62)" }}>
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.75)" }}>판매 마감까지</span>
            <span className="text-sm font-bold tabular-nums" style={{ fontFamily: MONO, color: C.accent }}>
              {pad(cd.h)}:{pad(cd.m)}:{pad(cd.s)}
            </span>
          </div>
        )}
        {(status === "SOLD_OUT" || status === "CLOSED") && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.68)" }}>
            <div style={{ transform: "rotate(-12deg)" }}>
              <span className="text-2xl font-black tracking-[0.18em]"
                style={{ color: C.disabled, border: `3px solid ${C.disabled}`, padding: "8px 14px", display: "block" }}>
                {status === "SOLD_OUT" ? "SOLD OUT" : "판매 종료"}
              </span>
            </div>
          </div>
        )}

        <button onClick={back} className="absolute top-12 left-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.14)", backdropFilter: "blur(6px)" }}>
          <ChevronLeft size={20} color="#fff" />
        </button>
        <button onClick={() => dispatch({ type: "TOGGLE_WISHLIST", dropId: drop.id })}
          className="absolute top-12 right-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.14)", backdropFilter: "blur(6px)" }}>
          <Heart size={18} color={isHearted ? C.accent : "#fff"} fill={isHearted ? C.accent : "none"} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-3">
          <DropBadge status={status} />
          <p className="text-[11px] mt-3 mb-0.5" style={{ color: C.muted }}>{drop.bakery}</p>
          <h1 className="text-2xl font-bold mb-1 leading-tight" style={{ fontFamily: SERIF, color: C.text }}>{drop.name}</h1>
          <p className="text-lg font-semibold mb-2" style={{ color: C.text }}>{drop.price.toLocaleString()}원</p>
          <p className="text-sm leading-relaxed" style={{ color: C.muted }}>
            엄선한 재료로 매일 소량만 굽는 {drop.bakery}의 시그니처입니다.
          </p>
        </div>

        {/* Drop info */}
        <div className="mx-4 mb-3 rounded-xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          {[
            ["판매 오픈", fmtDateTime(drop.dropAt)],
            ["판매 마감", fmtDateTime(drop.saleEndAt)],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between items-center px-4 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
              <span className="text-sm" style={{ color: C.muted }}>{l}</span>
              <span className="text-sm font-medium" style={{ color: C.text }}>{v}</span>
            </div>
          ))}

          {status !== "CLOSED" && (
            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm" style={{ color: C.muted }}>남은 재고</span>
                {status === "SCHEDULED" ? (
                  <span className="text-xl font-bold" style={{ color: C.accent, fontFamily: SERIF }}>{drop.totalStock}개 한정</span>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold" style={{ color: C.accent }}>{drop.stock}</span>
                    <span className="text-xs" style={{ color: C.muted }}>/ {drop.totalStock}</span>
                  </div>
                )}
              </div>
              {status !== "SCHEDULED" && (
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.border }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: C.accent }} />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center px-4 py-3">
            <span className="text-sm" style={{ color: C.muted }}>1인 구매 제한</span>
            <span className="text-sm font-medium" style={{ color: C.text }}>{drop.limitPerPerson}개 (1회 주문만)</span>
          </div>
        </div>

        {/* Pickup */}
        <div className="mx-4 mb-4 rounded-xl p-4" style={{ background: C.accentSoft, border: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={15} color={C.accent} />
            <span className="text-base font-semibold" style={{ color: C.text }}>픽업 안내</span>
          </div>
          {[
            ["픽업 기간", `${fmtPickup(drop.pickupStart)} ~ ${fmtPickup(drop.pickupEnd)}`],
            ["픽업 시간", `평일 ${drop.pickupOpenTime} ~ ${drop.pickupCloseTime}`],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between items-start py-1.5">
              <span className="text-sm" style={{ color: C.muted }}>{l}</span>
              <span className="text-sm font-medium text-right" style={{ color: C.text }}>{v}</span>
            </div>
          ))}
          <div className="flex justify-between items-start py-1.5">
            <span className="text-sm" style={{ color: C.muted }}>픽업 장소</span>
            <div className="text-right">
              <p className="text-sm font-medium" style={{ color: C.text }}>{drop.bakery}</p>
              <button className="text-xs mt-0.5" style={{ color: C.info }}>지도 보기 →</button>
            </div>
          </div>
          <p className="text-xs mt-3 pt-3" style={{ color: C.muted, borderTop: `1px solid ${C.border}` }}>
            ⚠️ {drop.closedDays.map(d => ({ SAT:"토", SUN:"일", MON:"월", TUE:"화", WED:"수", THU:"목", FRI:"금" }[d] ?? d)).join("·")} 휴무 · 배송 없음, 매장 방문 수령만 가능
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 py-3 flex-shrink-0" style={{ background: C.surface, borderTop: `1px solid ${C.border}` }}>
        {status === "SCHEDULED" && (
          <button onClick={() => dispatch({ type: "TOGGLE_WISHLIST", dropId: drop.id })}
            className="w-full py-3.5 rounded-lg text-sm font-semibold"
            style={{ border: `1.5px solid ${isHearted ? C.accent : C.border}`, color: isHearted ? C.accent : C.text, background: "transparent" }}>
            {isHearted ? "♥ 찜 완료" : "찜하고 알림받기"}
          </button>
        )}
        {status === "ON_SALE" && (
          <button onClick={() => navigate("order", { dropId: drop.id })}
            className="w-full py-3.5 rounded-lg text-sm font-bold" style={{ background: C.accent, color: C.bg }}>
            구매하기
          </button>
        )}
        {(status === "SOLD_OUT" || status === "CLOSED") && (
          <button disabled className="w-full py-3.5 rounded-lg text-sm font-semibold cursor-not-allowed"
            style={{ background: C.disabled, color: C.muted }}>
            {status === "SOLD_OUT" ? "품절" : "종료된 드롭입니다"}
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN: ORDER
// ═══════════════════════════════════════════════════════════════════════════════
function OrderScreen({
  dropId, navigate, back,
}: { dropId: number; navigate: (s: Screen) => void; back: () => void }) {
  const { state, dispatch, virtualNow } = useApp();
  const drop = state.drops.find(d => d.id === dropId);
  if (!drop) return null;

  const maxQty = Math.min(drop.limitPerPerson, drop.stock);
  const [qty, setQty] = useState(Math.min(1, maxQty));
  const days = useMemo(() => generatePickupDays(drop, virtualNow), [drop, virtualNow]);
  const firstAvail = days.findIndex(d => !d.disabled);
  const [selectedIdx, setSelectedIdx] = useState(firstAvail >= 0 ? firstAvail : 0);

  const total = drop.price * qty;
  const balance = state.user.balance;
  const insufficient = balance < total;
  const afterBalance = balance - total;
  const selDay = days[selectedIdx];
  const noValidDate = !selDay || selDay.disabled;

  const handlePurchase = () => {
    if (insufficient) { navigate("charge"); return; }
    if (noValidDate) return;
    dispatch({ type: "PURCHASE", dropId: drop.id, qty, pickupDate: selDay.dateStr });
    navigate("order-complete");
  };

  return (
    <div className="flex flex-col h-full" style={{ background: C.bg, fontFamily: SANS }}>
      <BackHeader title="주문/결제" onBack={back} />

      <div className="flex-1 overflow-y-auto">
        {/* Product */}
        <div className="mx-4 mt-4 p-3 rounded-xl flex gap-3 items-center"
          style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <BreadBox className="w-[72px] h-[72px] rounded-lg flex-shrink-0" src={DROP_IMAGES[drop.id]} />
          <div className="flex-1">
            <p className="text-[11px]" style={{ color: C.muted }}>{drop.bakery}</p>
            <p className="text-sm font-semibold" style={{ color: C.text }}>{drop.name}</p>
            <p className="text-sm" style={{ color: C.text }}>{drop.price.toLocaleString()}원</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: C.border, color: C.text }}><Minus size={13} /></button>
            <span className="text-sm font-semibold w-4 text-center" style={{ color: C.text }}>{qty}</span>
            <button onClick={() => setQty(q => Math.min(maxQty, q + 1))}
              disabled={qty >= maxQty}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: qty >= maxQty ? C.surface : C.accentSoft, color: qty >= maxQty ? C.disabled : C.text }}>
              <Plus size={13} />
            </button>
          </div>
        </div>
        {qty >= maxQty && <p className="text-xs text-center mt-1" style={{ color: C.muted }}>최대 {maxQty}개 (1인 구매 제한)</p>}

        {/* Pickup date */}
        <div className="px-4 mt-5">
          <h2 className="text-base font-semibold mb-0.5" style={{ color: C.text }}>픽업 날짜를 선택해주세요</h2>
          <p className="text-xs mb-4" style={{ color: C.muted }}>선택한 날짜에 매장에서 수령합니다</p>

          <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
            {days.map((d, i) => {
              const isSel = selectedIdx === i && !d.disabled;
              return (
                <button key={i} onClick={() => !d.disabled && setSelectedIdx(i)} disabled={d.disabled}
                  className="flex flex-col items-center justify-center gap-0.5 relative overflow-hidden flex-shrink-0"
                  style={{
                    width: 42, height: 68, borderRadius: 10,
                    background: isSel ? C.accent : d.disabled ? C.surface : "transparent",
                    border: isSel ? "none" : `1.5px solid ${C.border}`,
                    transform: isSel ? "scale(1.05)" : "scale(1)",
                    boxShadow: isSel ? `0 4px 14px rgba(245,165,36,0.3)` : "none",
                    transition: "all 0.15s ease",
                  }}>
                  {d.disabled && (
                    <div className="absolute inset-0 pointer-events-none">
                      <svg width="42" height="68" viewBox="0 0 42 68"><line x1="0" y1="0" x2="42" y2="68" stroke={C.disabled} strokeWidth="1.2" /></svg>
                    </div>
                  )}
                  <span className="text-[10px]" style={{ color: isSel ? C.bg : d.disabled ? C.disabled : C.muted, fontWeight: 500 }}>{d.day}</span>
                  <span className="text-lg font-bold leading-tight" style={{ color: isSel ? C.bg : d.disabled ? C.disabled : C.text }}>{d.date}</span>
                  {d.disabled && <span className="text-[9px]" style={{ color: C.disabled }}>휴무</span>}
                </button>
              );
            })}
          </div>

          {selDay && !selDay.disabled && (
            <div className="p-3 rounded-xl" style={{ background: C.accentSoft, border: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-2 mb-1">
                <Check size={13} color={C.accent} />
                <span className="text-sm font-medium" style={{ color: C.text }}>
                  {selDay.dateStr.slice(5,7).replace(/^0/,"")}월 {selDay.date}일 ({selDay.day}) 방문
                </span>
              </div>
              <p className="text-xs ml-5" style={{ color: C.muted }}>{drop.pickupOpenTime} ~ {drop.pickupCloseTime} 사이 아무 때나 오시면 됩니다</p>
              <p className="text-xs ml-5" style={{ color: C.muted }}>{drop.bakery}</p>
            </div>
          )}
        </div>

        {/* Payment summary */}
        <div className="mx-4 mt-4 p-4 rounded-xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="flex justify-between py-1.5">
            <span className="text-sm" style={{ color: C.muted }}>상품 금액</span>
            <span className="text-sm" style={{ color: C.text }}>{total.toLocaleString()}원</span>
          </div>
          <div className="my-2" style={{ borderTop: `1px solid ${C.border}` }} />
          <div className="flex justify-between items-center py-1">
            <span className="text-sm font-semibold" style={{ color: C.text }}>총 결제 금액</span>
            <span className="text-xl font-bold" style={{ color: C.text }}>{total.toLocaleString()}원</span>
          </div>
        </div>

        {/* Wallet — auto switches style on insufficient */}
        <div className="mx-4 mt-3 mb-24 p-4 rounded-xl"
          style={{ background: C.accentSoft, border: `1.5px solid ${insufficient ? C.accent : C.border}` }}>
          <div className="flex items-center gap-2 mb-3">
            <span>💰</span>
            <span className="text-sm font-semibold" style={{ color: C.text }}>예치금 결제</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-sm" style={{ color: C.muted }}>현재 잔액</span>
            <span className="text-sm font-semibold" style={{ color: insufficient ? C.accent : C.text }}>{balance.toLocaleString()}원</span>
          </div>
          {insufficient ? (
            <div className="flex justify-between py-1">
              <span className="text-sm font-semibold" style={{ color: C.accent }}>{(total - balance).toLocaleString()}원 부족</span>
            </div>
          ) : (
            <div className="flex justify-between py-1">
              <span className="text-sm" style={{ color: C.muted }}>결제 후 잔액</span>
              <span className="text-sm" style={{ color: C.muted }}>{afterBalance.toLocaleString()}원</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-3 flex-shrink-0" style={{ background: C.surface, borderTop: `1px solid ${C.border}` }}>
        <button onClick={handlePurchase}
          disabled={noValidDate && !insufficient}
          className="w-full py-3.5 rounded-lg text-sm font-bold"
          style={{
            background: noValidDate && !insufficient ? C.disabled : C.accent,
            color: noValidDate && !insufficient ? C.muted : C.bg,
          }}>
          {insufficient ? "충전하고 결제하기" : noValidDate ? "픽업 날짜를 선택해주세요" : `${total.toLocaleString()}원 결제하기`}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN: ORDER COMPLETE
// ═══════════════════════════════════════════════════════════════════════════════
function OrderCompleteScreen({ navigate }: { navigate: (s: Screen, opts?: object, tab?: Tab) => void }) {
  const { state } = useApp();
  const order = state.orders.find(o => o.id === state.lastOrderId);

  return (
    <div className="flex flex-col h-full items-center justify-center px-6 gap-6"
      style={{ background: C.bg, fontFamily: SANS }}>
      <div className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: C.greenSoft, border: `2px solid ${C.green}` }}>
        <Check size={28} color={C.green} />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: SERIF, color: C.text }}>결제 완료!</h1>
        <p className="text-sm" style={{ color: C.muted }}>주문이 성공적으로 접수되었습니다</p>
      </div>

      {order && (
        <div className="w-full p-4 rounded-xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="flex gap-3 mb-3">
            <BreadBox className="w-14 h-14 rounded-lg flex-shrink-0" src={DROP_IMAGES[order.dropId]} />
            <div>
              <p className="text-xs" style={{ color: C.muted }}>{order.bakery}</p>
              <p className="text-sm font-semibold" style={{ color: C.text }}>{order.dropName} {order.qty}개</p>
              <p className="text-sm" style={{ color: C.text }}>{order.total.toLocaleString()}원</p>
            </div>
          </div>
          <div className="pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-2">
              <MapPin size={13} color={C.accent} />
              <span className="text-sm font-semibold" style={{ color: C.text }}>
                {fmtPickup(order.pickupDate)} 픽업
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="w-full flex flex-col gap-2">
        <button onClick={() => navigate("order-list", undefined, "orders")}
          className="w-full py-3.5 rounded-lg text-sm font-bold" style={{ background: C.accent, color: C.bg }}>
          주문 내역 보기
        </button>
        <button onClick={() => navigate("home", undefined, "home")}
          className="w-full py-3 rounded-lg text-sm" style={{ border: `1px solid ${C.border}`, color: C.text }}>
          홈으로
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN: ORDER LIST
// ═══════════════════════════════════════════════════════════════════════════════
function OrderListScreen({
  navigate, activeTab,
}: { navigate: (s: Screen, opts?: { orderId?: number }, tab?: Tab) => void; activeTab: Tab }) {
  const { state, virtualNow } = useApp();
  const [filter, setFilter] = useState<"전체" | OrderStatus>("전체");
  const FILTERS: ("전체" | OrderStatus)[] = ["전체", "픽업대기", "구매확정", "취소"];

  const displayed = useMemo(() => state.orders.filter(o => {
    const eff = getOrderEffectiveStatus(o, virtualNow);
    return filter === "전체" || eff === filter;
  }), [state.orders, filter, virtualNow]);

  return (
    <div className="flex flex-col h-full" style={{ background: C.bg, fontFamily: SANS }}>
      <div className="px-4 pt-12 pb-4 flex-shrink-0">
        <h1 className="text-xl font-bold" style={{ color: C.text }}>주문 내역</h1>
      </div>

      <div className="flex gap-2 px-4 mb-4 overflow-x-auto pb-0.5 flex-shrink-0">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full text-sm whitespace-nowrap"
            style={{
              background: filter === f ? C.accent : C.surface,
              color: filter === f ? C.bg : C.muted,
              border: filter === f ? "none" : `1px solid ${C.border}`,
              fontWeight: filter === f ? 600 : 400,
            }}>{f}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-3 pb-4">
        {displayed.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-sm" style={{ color: C.muted }}>주문 내역이 없습니다</p>
          </div>
        )}
        {displayed.map(order => {
          const eff = getOrderEffectiveStatus(order, virtualNow);
          const dDay = getDDay(order.pickupDate, virtualNow);
          return (
            <button key={order.id} onClick={() => navigate("order-detail", { orderId: order.id })}
              className="w-full text-left rounded-xl p-4" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <div className="flex justify-between items-center mb-2.5">
                <OrderStatusBadge status={eff} />
                <span className="text-xs" style={{ color: C.muted }}>{fmtDateTime(order.paidAt)} 결제</span>
              </div>
              <div className="flex gap-3 items-center mb-3">
                <BreadBox className="w-12 h-12 rounded-lg flex-shrink-0" src={DROP_IMAGES[order.dropId]} />
                <div>
                  <p className="text-xs" style={{ color: C.muted }}>{order.bakery}</p>
                  <p className="text-sm font-semibold" style={{ color: C.text }}>{order.dropName} {order.qty}개</p>
                  <p className="text-sm" style={{ color: C.text }}>{order.total.toLocaleString()}원</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
                <div className="flex items-center gap-1.5">
                  <MapPin size={13} color={C.muted} />
                  <span className="text-xs" style={{ color: C.muted }}>{fmtPickup(order.pickupDate)} 픽업</span>
                </div>
                {eff !== "취소" && (
                  <span className="text-xl font-bold" style={{ color: dDay === 0 ? C.accent : C.text }}>
                    {dDay < 0 ? "픽업완료" : dDay === 0 ? "오늘 픽업!" : `D-${dDay}`}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <TabBar active={activeTab} onNav={(s, t) => navigate(s, undefined, t)} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN: ORDER DETAIL
// ═══════════════════════════════════════════════════════════════════════════════
function OrderDetailScreen({ orderId, back }: { orderId: number; back: () => void }) {
  const { state, dispatch, virtualNow } = useApp();
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return null;

  const eff     = getOrderEffectiveStatus(order, virtualNow);
  const canCancel = canCancelOrder(order, virtualNow);
  const dDay    = getDDay(order.pickupDate, virtualNow);
  const steps: OrderStatus[] = ["픽업대기", "구매확정"];
  const currentStepIdx = eff === "구매확정" ? 1 : 0;

  return (
    <div className="flex flex-col h-full" style={{ background: C.bg, fontFamily: SANS }}>
      <BackHeader title="주문 상세" onBack={back} />

      {eff !== "취소" && (
        <div className="flex items-center px-6 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
          {steps.map((step, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: i <= currentStepIdx ? C.accent : C.border, color: i <= currentStepIdx ? C.bg : C.disabled }}>
                  {i < currentStepIdx ? "✓" : ""}
                </div>
                <span className="text-[11px] mt-1" style={{ color: i <= currentStepIdx ? C.accent : C.disabled }}>{step}</span>
              </div>
              {i < steps.length - 1 && <div className="flex-1 h-px mx-2" style={{ background: i < currentStepIdx ? C.accent : C.border }} />}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Pickup highlight */}
        {eff !== "취소" && (
          <div className="mx-4 mt-4 p-4 rounded-xl" style={{ background: C.accentSoft, border: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={15} color={C.accent} />
              <span className="font-semibold" style={{ color: C.text }}>{fmtPickup(order.pickupDate)} 픽업</span>
            </div>
            <div className="text-center py-3">
              <span className="text-6xl font-bold" style={{ fontFamily: SERIF, color: dDay < 0 ? C.muted : dDay === 0 ? C.green : C.accent }}>
                {dDay < 0 ? "픽업완료" : dDay === 0 ? "오늘!" : `D-${dDay}`}
              </span>
            </div>
            <p className="text-sm text-center mb-0.5" style={{ color: C.text }}>09:00 ~ 18:00</p>
            <p className="text-sm text-center font-semibold mb-4" style={{ color: C.text }}>{order.bakery}</p>
            <div className="flex gap-2">
              <button className="flex-1 py-2.5 rounded-lg text-sm flex items-center justify-center gap-1.5"
                style={{ border: `1.5px solid ${C.border}`, color: C.text }}>
                <MapPin size={13} /> 지도 보기
              </button>
              <button className="flex-1 py-2.5 rounded-lg text-sm flex items-center justify-center gap-1.5"
                style={{ border: `1.5px solid ${C.border}`, color: C.text }}>
                <Phone size={13} /> 전화하기
              </button>
            </div>
          </div>
        )}

        {/* Product */}
        <div className="mx-4 mt-3 p-4 rounded-xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <p className="text-sm font-semibold mb-3" style={{ color: C.text }}>주문 상품</p>
          <div className="flex gap-3">
            <BreadBox className="w-14 h-14 rounded-lg flex-shrink-0" src={DROP_IMAGES[order.dropId]} />
            <div>
              <p className="text-xs" style={{ color: C.muted }}>{order.bakery}</p>
              <p className="text-sm font-semibold" style={{ color: C.text }}>{order.dropName} {order.qty}개</p>
              <p className="text-sm" style={{ color: C.text }}>{order.total.toLocaleString()}원</p>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="mx-4 mt-3 p-4 rounded-xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <p className="text-sm font-semibold mb-3" style={{ color: C.text }}>결제 정보</p>
          {[
            ["결제 금액", `${order.total.toLocaleString()}원`],
            ["결제 수단", "예치금"],
            ["결제 일시", fmtDateTime(order.paidAt)],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between py-1.5">
              <span className="text-sm" style={{ color: C.muted }}>{l}</span>
              <span className="text-sm" style={{ color: C.text }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Notice */}
        {eff !== "취소" && (
          <div className="mx-4 mt-3 mb-4 p-4 rounded-xl" style={{ background: "#1A1A1A", border: `1px solid ${C.border}` }}>
            {[
              ["취소 가능", `${fmtDateTime(order.saleEndAt)}까지 (드롭 마감 시)`],
              ["구매 확정", `${order.pickupEnd} 18:00 자동 확정 예정`],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between items-start gap-4 py-1.5">
                <span className="text-xs flex-shrink-0 font-medium" style={{ color: C.muted }}>{l}</span>
                <span className="text-xs text-right" style={{ color: C.text }}>{v}</span>
              </div>
            ))}
            <div className="mt-3 pt-3 flex flex-col gap-1" style={{ borderTop: `1px solid ${C.border}` }}>
              <p className="text-[11px]" style={{ color: C.disabled }}>※ 드롭 마감 이후에는 취소가 불가능합니다</p>
              <p className="text-[11px]" style={{ color: C.disabled }}>※ 픽업 후 별도 조작 없이 자동으로 구매확정됩니다</p>
            </div>
          </div>
        )}

        {eff === "취소" && (
          <div className="mx-4 mt-3 mb-4 p-4 rounded-xl text-center" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <p className="text-sm" style={{ color: C.muted }}>취소된 주문입니다. 예치금이 환불되었습니다.</p>
          </div>
        )}
      </div>

      <div className="px-4 py-3 flex gap-2 flex-shrink-0" style={{ background: C.surface, borderTop: `1px solid ${C.border}` }}>
        {canCancel && (
          <button onClick={() => { dispatch({ type: "CANCEL_ORDER", orderId: order.id }); back(); }}
            className="flex-1 py-3 rounded-lg text-sm font-medium"
            style={{ border: `1.5px solid ${C.border}`, color: C.text }}>
            주문 취소
          </button>
        )}
        {eff === "픽업대기" && (
          <button className="flex-1 py-3 rounded-lg text-sm font-medium"
            style={{ background: C.accentSoft, color: C.muted }}>
            구매 확정
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN: WISHLIST
// ═══════════════════════════════════════════════════════════════════════════════
function WishlistScreen({
  navigate, activeTab,
}: { navigate: (s: Screen, opts?: { dropId?: number }, tab?: Tab) => void; activeTab: Tab }) {
  const { state, dispatch, virtualNow } = useApp();
  const items = state.drops.filter(d => state.wishlist.includes(d.id));

  // per-item countdown (use first SCHEDULED drop's time for hero)
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick(t => t+1), 1000); return () => clearInterval(id); }, []);

  return (
    <div className="flex flex-col h-full" style={{ background: C.bg, fontFamily: SANS }}>
      <div className="flex items-center justify-between px-4 pt-12 pb-4 flex-shrink-0">
        <span className="text-xl font-bold" style={{ color: C.text }}>찜</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-3 pb-4">
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-56 gap-4">
            <div className="text-4xl">🫙</div>
            <p className="text-sm" style={{ color: C.muted }}>찜한 드롭이 없어요</p>
            <button onClick={() => navigate("home", undefined, "home")}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: C.accentSoft, color: C.accent, border: `1px solid ${C.border}` }}>
              드롭 둘러보기
            </button>
          </div>
        )}
        {items.map(drop => {
          const status = getDropStatus(drop, virtualNow);
          const ended = status === "SOLD_OUT" || status === "CLOSED";
          const msUntil = new Date(drop.dropAt).getTime() - virtualNow.getTime();
          const cd = msToHMS(msUntil);
          return (
            <div key={drop.id} className={`rounded-xl p-4 ${ended ? "opacity-50 grayscale" : ""}`}
              style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <div className="flex gap-3">
                <BreadBox className="w-16 h-16 rounded-lg flex-shrink-0" src={DROP_IMAGES[drop.id]} />
                <div className="flex-1">
                  <p className="text-xs" style={{ color: C.muted }}>{drop.bakery}</p>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: C.text }}>{drop.name}</p>
                  <p className="text-sm" style={{ color: C.text }}>{drop.price.toLocaleString()}원</p>
                  <p className="text-xs mt-1" style={{ color: C.muted }}>{fmtDateTime(drop.dropAt)} 오픈</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
                {status === "SCHEDULED" && (
                  <>
                    <span className="flex-1 text-sm text-center font-bold" style={{ fontFamily: MONO, color: C.accent }}>
                      {pad(cd.h)}:{pad(cd.m)}:{pad(cd.s)}
                    </span>
                    <button className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full"
                      style={{ background: C.accentSoft, color: C.accent }}>
                      <Bell size={11} /> 알림
                    </button>
                  </>
                )}
                {status === "ON_SALE" && (
                  <button onClick={() => navigate("drop-detail", { dropId: drop.id })}
                    className="flex-1 py-2 rounded-lg text-sm font-bold" style={{ background: C.accent, color: C.bg }}>
                    구매하기
                  </button>
                )}
                {ended && (
                  <button onClick={() => dispatch({ type: "TOGGLE_WISHLIST", dropId: drop.id })}
                    className="flex-1 py-2 rounded-lg text-sm flex items-center justify-center gap-1.5"
                    style={{ background: C.accentSoft, color: C.muted }}>
                    <Trash2 size={13} /> 삭제
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <TabBar active={activeTab} onNav={(s, t) => navigate(s, undefined, t)} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN: WALLET
// ═══════════════════════════════════════════════════════════════════════════════
function WalletScreen({ navigate, back }: { navigate: (s: Screen) => void; back: () => void }) {
  const { state } = useApp();
  return (
    <div className="flex flex-col h-full" style={{ background: C.bg, fontFamily: SANS }}>
      <BackHeader title="예치금" onBack={back} />
      <div className="mx-4 my-4 p-5 rounded-2xl flex-shrink-0"
        style={{ background: C.accentSoft, border: `1px solid ${C.accent}40` }}>
        <p className="text-sm mb-2" style={{ color: C.muted }}>내 예치금</p>
        <p className="text-5xl font-bold mb-4" style={{ fontFamily: SERIF, color: C.accent }}>
          {state.user.balance.toLocaleString()}원
        </p>
        <button onClick={() => navigate("charge")} className="px-5 py-2 rounded-lg text-sm font-semibold"
          style={{ background: C.text, color: C.bg }}>충전하기</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        <p className="text-sm font-semibold mb-3" style={{ color: C.text }}>거래 내역</p>
        {state.transactions.map((t, i) => (
          <div key={t.id}>
            <div className="py-3 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded mt-0.5"
                  style={{
                    background: t.type === "충전" ? "#0D2035" : t.type === "환불" ? C.greenSoft : C.accentSoft,
                    color: t.type === "충전" ? C.info : t.type === "환불" ? C.green : C.accent,
                  }}>{t.type}</span>
                <div>
                  <p className="text-sm font-medium" style={{ color: C.text }}>{t.label}</p>
                  <p className="text-xs" style={{ color: C.muted }}>{fmtDateTime(t.date)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold"
                  style={{ color: t.amount > 0 ? C.info : C.accent }}>
                  {t.amount > 0 ? "+" : ""}{t.amount.toLocaleString()}
                </p>
                <p className="text-xs" style={{ color: C.muted }}>잔액 {t.balanceAfter.toLocaleString()}</p>
              </div>
            </div>
            {i < state.transactions.length - 1 && <div style={{ height: 1, background: C.border }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN: CHARGE
// ═══════════════════════════════════════════════════════════════════════════════
function ChargeScreen({ navigate, back }: { navigate: (s: Screen) => void; back: () => void }) {
  const { state, dispatch } = useApp();
  const [selected, setSelected] = useState(50000);
  const [custom, setCustom] = useState("");
  const AMOUNTS = [10000, 30000, 50000, 100000];
  const finalAmt = custom ? (parseInt(custom) || 0) : selected;

  const handleCharge = () => {
    if (finalAmt <= 0) return;
    dispatch({ type: "CHARGE", amount: finalAmt });
    navigate("wallet");
  };

  return (
    <div className="flex flex-col h-full" style={{ background: C.bg, fontFamily: SANS }}>
      <BackHeader title="충전" onBack={back} />
      <div className="flex-1 overflow-y-auto px-4 pt-5">
        <div className="p-4 rounded-xl mb-5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <p className="text-xs mb-1" style={{ color: C.muted }}>현재 잔액</p>
          <p className="text-2xl font-bold" style={{ color: C.text }}>{state.user.balance.toLocaleString()}원</p>
        </div>
        <p className="text-sm font-semibold mb-3" style={{ color: C.text }}>충전 금액 선택</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {AMOUNTS.map(a => (
            <button key={a} onClick={() => { setSelected(a); setCustom(""); }}
              className="py-3 rounded-xl text-sm font-semibold"
              style={{
                background: selected === a && !custom ? C.accent : C.surface,
                color: selected === a && !custom ? C.bg : C.text,
                border: selected === a && !custom ? "none" : `1px solid ${C.border}`,
              }}>{a.toLocaleString()}원</button>
          ))}
        </div>
        <input type="number" placeholder="직접 입력" value={custom}
          onChange={e => { setCustom(e.target.value); setSelected(0); }}
          className="w-full py-3 px-4 rounded-xl text-sm outline-none"
          style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }} />
        {finalAmt > 0 && (
          <div className="mt-4 p-3 rounded-xl" style={{ background: C.accentSoft, border: `1px solid ${C.border}` }}>
            <p className="text-xs mb-1" style={{ color: C.muted }}>충전 후 잔액</p>
            <p className="text-xl font-bold" style={{ color: C.text }}>{(state.user.balance + finalAmt).toLocaleString()}원</p>
          </div>
        )}
      </div>
      <div className="px-4 py-3 flex-shrink-0" style={{ background: C.surface, borderTop: `1px solid ${C.border}` }}>
        <button onClick={handleCharge} className="w-full py-3.5 rounded-lg text-sm font-bold"
          style={{ background: C.accent, color: C.bg }}>
          {finalAmt.toLocaleString()}원 충전하기
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN: MYPAGE
// ═══════════════════════════════════════════════════════════════════════════════
function MyPageScreen({
  navigate, activeTab,
}: { navigate: (s: Screen, opts?: object, tab?: Tab) => void; activeTab: Tab }) {
  const { state } = useApp();
  const MENUS: { label: string; screen?: Screen; danger?: boolean }[] = [
    { label: "주문 내역",    screen: "order-list" },
    { label: "찜",          screen: "wishlist" },
    { label: "판매자 페이지", screen: "seller-dashboard" },
    { label: "로그아웃" },
    { label: "탈퇴", danger: true },
  ];
  return (
    <div className="flex flex-col h-full" style={{ background: C.bg, fontFamily: SANS }}>
      <div className="px-4 pt-12 pb-4 flex-shrink-0">
        <h1 className="text-xl font-bold" style={{ color: C.text }}>마이페이지</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-4 mx-4 px-4 py-4 rounded-xl mb-4"
          style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{ background: C.accentSoft }}>👤</div>
          <div>
            <p className="font-semibold" style={{ color: C.text }}>{state.user.name}</p>
            <p className="text-xs" style={{ color: C.muted }}>openbake@email.com</p>
          </div>
        </div>
        <div className="mx-4 mb-4 p-4 rounded-xl flex items-center justify-between"
          style={{ background: C.accentSoft, border: `1px solid ${C.border}` }}>
          <div>
            <p className="text-xs mb-1" style={{ color: C.muted }}>예치금</p>
            <p className="text-2xl font-bold" style={{ color: C.accent }}>{state.user.balance.toLocaleString()}원</p>
          </div>
          <button onClick={() => navigate("charge")} className="px-4 py-2 rounded-lg text-sm font-bold"
            style={{ background: C.accent, color: C.bg }}>충전</button>
        </div>
        <div className="mx-4 rounded-xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          {MENUS.map((m, i) => (
            <button key={i} onClick={() => m.screen && navigate(m.screen)}
              className="w-full flex items-center justify-between px-4 py-4"
              style={{ borderBottom: i < MENUS.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <span className="text-sm" style={{ color: m.danger ? C.accent : C.text }}>{m.label}</span>
              {!m.danger && <ChevronRight size={16} color={C.disabled} />}
            </button>
          ))}
        </div>
      </div>
      <TabBar active={activeTab} onNav={(s, t) => navigate(s, undefined, t)} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN: SELLER REGISTER (static form)
// ═══════════════════════════════════════════════════════════════════════════════
function SellerRegisterScreen({ back }: { back: () => void }) {
  const [dropTime, setDropTime] = useState("14:00");
  const [offDays, setOffDays] = useState(["토","일"]);
  const TIMES = ["11:00","14:00","17:00","20:00"];
  const WDAYS = ["월","화","수","목","금","토","일"];
  const toggle = (d: string) => setOffDays(p => p.includes(d) ? p.filter(x=>x!==d) : [...p,d]);
  return (
    <div className="flex flex-col h-full" style={{ background: C.bg, fontFamily: SANS }}>
      <BackHeader title="드롭 등록" onBack={back} />
      <div className="flex-1 overflow-y-auto pb-36">
        <div className="px-4 pt-5">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: C.muted }}>상품 정보</p>
          <div className="w-full h-28 rounded-xl flex items-center justify-center mb-4 cursor-pointer"
            style={{ border: `1.5px dashed ${C.border}`, background: C.surface }}>
            <p className="text-sm" style={{ color: C.disabled }}>+ 이미지 업로드</p>
          </div>
          {[["상품명","두쫀쿠",""],["가격","3,000","원"],["수량","30","개"],["1인 구매 제한","5","개"]].map(([l,v,s]) => (
            <div key={l} className="mb-3">
              <label className="text-xs mb-1 block" style={{ color: C.muted }}>{l}</label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                <input className="flex-1 text-sm bg-transparent outline-none" style={{ color: C.text }} defaultValue={v} />
                {s && <span className="text-sm flex-shrink-0" style={{ color: C.muted }}>{s}</span>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: 8, background: C.deep, margin: "8px 0 16px" }} />
        <div className="px-4">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: C.muted }}>판매 일정</p>
          <div className="mb-3">
            <label className="text-xs mb-2 block" style={{ color: C.muted }}>드롭 시각</label>
            <div className="flex gap-2">
              {TIMES.map(t => (
                <button key={t} onClick={() => setDropTime(t)} className="flex-1 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: dropTime===t ? C.accent : C.surface, color: dropTime===t ? C.bg : C.muted, border: dropTime===t ? "none" : `1px solid ${C.border}` }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ height: 8, background: C.deep, margin: "8px 0 16px" }} />
        <div className="mx-4 p-4 rounded-xl" style={{ background: C.accentSoft, border: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2 mb-4"><MapPin size={15} color={C.accent} /><p className="text-sm font-semibold" style={{ color: C.text }}>픽업 일정</p></div>
          <div className="mb-3">
            <label className="text-xs mb-2 block" style={{ color: C.muted }}>휴무일</label>
            <div className="flex gap-1.5">
              {WDAYS.map(d => (
                <button key={d} onClick={() => toggle(d)} className="flex-1 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: offDays.includes(d) ? C.accent : C.surface, color: offDays.includes(d) ? C.bg : C.muted, border: offDays.includes(d) ? "none" : `1px solid ${C.border}` }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 py-3 flex-shrink-0" style={{ background: C.surface, borderTop: `1px solid ${C.border}` }}>
        <div className="p-3 rounded-xl mb-2" style={{ background: C.accentSoft, border: `1px solid ${C.border}` }}>
          <p className="text-xs font-semibold mb-1" style={{ color: C.muted }}>미리보기</p>
          <p className="text-xs" style={{ color: C.text }}>7/17(금) {dropTime} 오픈 · 두쫀쿠 30개 · 3,000원</p>
          <p className="text-xs" style={{ color: C.muted }}>픽업 7/17~7/23 · 평일 09:00-18:00 ({offDays.join("·")} 휴무)</p>
        </div>
        <button className="w-full py-3.5 rounded-lg text-sm font-bold" style={{ background: C.accent, color: C.bg }}>드롭 등록하기</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN: SELLER DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function SellerDashboardScreen({ navigate, back }: { navigate: (s: Screen) => void; back: () => void }) {
  const { state, virtualNow } = useApp();
  const [dropTab, setDropTab] = useState("진행중");

  // Compute today pickups from real orders
  const todayStr = virtualNow.toISOString().split("T")[0];
  const todayOrders = state.orders.filter(o => o.pickupDate === todayStr && o.status !== "취소");
  const todayQty   = todayOrders.reduce((s,o) => s + o.qty, 0);

  const pickupData = ["7/17","7/18","7/19","7/20","7/21","7/22","7/23"].map((label, i) => {
    const dateStr = `2026-07-${pad(17+i)}`;
    const cnt = state.orders.filter(o => o.pickupDate === dateStr && o.status !== "취소").reduce((s,o) => s+o.qty, 0);
    const isToday = dateStr === todayStr;
    const isOff = [1, 2].includes(i); // 7/18, 7/19 = SAT, SUN
    return { label, cnt, isToday, isOff };
  });
  const maxCnt = Math.max(...pickupData.map(d => d.cnt), 1);

  return (
    <div className="flex flex-col h-full" style={{ background: C.bg, fontFamily: SANS }}>
      <BackHeader title="판매자 대시보드" onBack={back} />
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="mx-4 mt-4 rounded-xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
            <Calendar size={15} color={C.accent} />
            <span className="text-sm font-semibold" style={{ color: C.text }}>오늘 픽업 예정 · {fmtPickup(todayStr)}</span>
          </div>
          {todayQty === 0 ? (
            <p className="px-4 py-3 text-sm" style={{ color: C.muted }}>오늘 픽업 예정 주문이 없습니다</p>
          ) : (
            todayOrders.map((o, i) => (
              <div key={o.id} className="flex justify-between items-center px-4 py-3" style={{ borderTop: `1px solid ${C.border}` }}>
                <span className="text-sm" style={{ color: C.text }}>{o.dropName}</span>
                <span className="text-sm font-semibold" style={{ color: C.accent }}>{o.qty}개 · 주문 1건</span>
              </div>
            ))
          )}
          <div className="flex justify-between items-center px-4 py-3" style={{ borderTop: `1px solid ${C.border}` }}>
            <span className="text-sm font-semibold" style={{ color: C.text }}>총</span>
            <span className="text-2xl font-bold" style={{ color: C.text }}>{todayQty}개</span>
          </div>
        </div>

        <div className="mx-4 mt-4 p-4 rounded-xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <p className="text-sm font-semibold mb-4" style={{ color: C.text }}>날짜별 픽업 집계</p>
          <div className="flex items-end gap-2" style={{ height: 80 }}>
            {pickupData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <span className="text-[10px]" style={{ color: d.isToday ? C.accent : C.disabled }}>{d.cnt > 0 ? d.cnt : ""}</span>
                <div className="w-full rounded-t-sm"
                  style={{ height: d.isOff ? 4 : d.cnt > 0 ? `${(d.cnt / maxCnt) * 52}px` : 4, background: d.isOff ? C.border : d.isToday ? C.accent : C.accentSoft, minHeight: 4 }} />
                <span className="text-[10px]" style={{ color: d.isToday ? C.accent : C.disabled }}>{d.label}</span>
                {d.isOff && <span className="text-[9px]" style={{ color: C.disabled }}>휴무</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="mx-4 mt-4">
          <div className="flex gap-2 mb-3">
            {["예정","진행중","종료"].map(t => (
              <button key={t} onClick={() => setDropTab(t)} className="px-3 py-1.5 rounded-full text-sm"
                style={{ background: dropTab===t ? C.accent : C.surface, color: dropTab===t ? C.bg : C.muted, border: dropTab===t ? "none" : `1px solid ${C.border}`, fontWeight: dropTab===t ? 600 : 400 }}>
                {t}
              </button>
            ))}
          </div>
          <div className="p-4 rounded-xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <p className="text-sm font-semibold" style={{ color: C.text }}>두쫀쿠 · 3,000원</p>
            <p className="text-xs mt-0.5 mb-3" style={{ color: C.muted }}>7/17 14:00 오픈</p>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.border }}>
              <div className="h-full rounded-full" style={{ width: `${Math.round(((30 - (state.drops[0]?.stock ?? 22)) / 30) * 100)}%`, background: C.accent }} />
            </div>
            <p className="text-xs mt-1" style={{ color: C.muted }}>{Math.round(((30 - (state.drops[0]?.stock ?? 22)) / 30) * 100)}% 판매</p>
          </div>
        </div>
      </div>
      <button onClick={() => navigate("seller-register")}
        className="absolute bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: C.accent, boxShadow: `0 4px 20px rgba(245,165,36,0.4)` }}>
        <Plus size={22} color={C.bg} />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN: ADMIN APPROVAL
// ═══════════════════════════════════════════════════════════════════════════════
type ApprovalStatus = "대기" | "승인" | "반려";
const APPLICANTS = [
  { id:1, name:"어니언베이커리", appliedAt:"2026-07-14", biz:"123-45-67890", addr:"서울 마포구 연남로 12",    hours:"평일 09:00~18:00 (토·일 휴무)" },
  { id:2, name:"밀도",          appliedAt:"2026-07-15", biz:"234-56-78901", addr:"서울 성동구 왕십리로 54",  hours:"매일 10:00~20:00" },
  { id:3, name:"브레드랩",      appliedAt:"2026-07-15", biz:"345-67-89012", addr:"서울 마포구 독막로 88",    hours:"평일 08:00~17:00 (주말 휴무)" },
  { id:4, name:"봉주르베이커리", appliedAt:"2026-07-16", biz:"456-78-90123", addr:"서울 용산구 이태원로 200", hours:"매일 11:00~21:00" },
];
function ApprovalBadge({ s }: { s: ApprovalStatus }) {
  const map: Record<ApprovalStatus, { bg: string; fg: string }> = {
    대기: { bg: "#0D2035", fg: C.info },
    승인: { bg: C.greenSoft, fg: C.green },
    반려: { bg: C.accentSoft, fg: C.accent },
  };
  return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[4px]" style={{ ...map[s] }}>{s}</span>;
}
function AdminApprovalScreen({ back }: { back: () => void }) {
  const [statuses, setStatuses] = useState<Record<number, ApprovalStatus>>({ 1:"승인",2:"대기",3:"대기",4:"반려" });
  const [sel, setSel] = useState<number | null>(null);
  const detail = APPLICANTS.find(a => a.id === sel);
  const decide = (id: number, next: ApprovalStatus) => { setStatuses(p => ({...p, [id]: next})); setSel(null); };
  return (
    <div className="flex flex-col h-full" style={{ background: C.bg, fontFamily: SANS }}>
      <BackHeader title="판매자 승인" onBack={back} />
      <div className="flex-1 overflow-y-auto px-4 pt-4 flex flex-col gap-2 pb-6">
        {APPLICANTS.map(a => (
          <button key={a.id} onClick={() => setSel(a.id)}
            className="w-full text-left rounded-xl px-4 py-3.5 flex items-center justify-between"
            style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: C.text }}>{a.name}</p>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>신청일 {a.appliedAt}</p>
            </div>
            <ApprovalBadge s={statuses[a.id]} />
          </button>
        ))}
      </div>
      {detail && (
        <div className="absolute inset-0 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setSel(null)}>
          <div className="rounded-t-2xl overflow-hidden" style={{ background: C.surface }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-8 h-1 rounded-full" style={{ background: C.border }} /></div>
            <div className="px-5 pt-2 pb-4" style={{ borderBottom: `1px solid ${C.border}` }}>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold" style={{ fontFamily: SERIF, color: C.text }}>{detail.name}</h2>
                <ApprovalBadge s={statuses[detail.id]} />
              </div>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3" style={{ borderBottom: `1px solid ${C.border}` }}>
              {[["사업자등록번호", detail.biz], ["매장 주소", detail.addr], ["영업시간", detail.hours]].map(([l,v]) => (
                <div key={l} className="flex justify-between items-start gap-4">
                  <span className="text-xs flex-shrink-0" style={{ color: C.muted }}>{l}</span>
                  <span className="text-xs text-right font-medium" style={{ color: C.text }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 flex gap-3">
              <button onClick={() => decide(detail.id, "반려")} className="flex-1 py-3 rounded-lg text-sm font-semibold"
                style={{ border: `1.5px solid ${C.border}`, color: C.muted }}>반려</button>
              <button onClick={() => decide(detail.id, "승인")} className="flex-1 py-3 rounded-lg text-sm font-bold"
                style={{ background: C.accent, color: C.bg }}>승인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEMO PANEL
// ═══════════════════════════════════════════════════════════════════════════════
const JUMPS = [
  { label: "드롭 오픈 직전", iso: "2026-07-17T13:59:00" },
  { label: "드롭 오픈",      iso: "2026-07-17T14:00:00" },
  { label: "판매 마감",      iso: "2026-07-17T16:00:00" },
  { label: "픽업 시작",      iso: "2026-07-20T09:00:00" },
  { label: "픽업 마감",      iso: "2026-07-20T18:00:00" },
  { label: "자동 구매확정",  iso: "2026-07-23T18:00:00" },
];

function DemoPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { state, dispatch, virtualNow } = useApp();
  const [inputVal, setInputVal] = useState(toInputVal(virtualNow));

  useEffect(() => { setInputVal(toInputVal(virtualNow)); }, [Math.floor(virtualNow.getTime() / 60000)]);

  const jumpTo = (iso: string) => {
    const t = new Date(iso);
    dispatch({ type: "SET_OFFSET", offset: t.getTime() - Date.now() });
  };
  const applyInput = () => {
    const t = new Date(inputVal);
    if (!isNaN(t.getTime())) dispatch({ type: "SET_OFFSET", offset: t.getTime() - Date.now() });
  };

  return (
    <div className="absolute inset-0 flex justify-end pointer-events-none" style={{ zIndex: 100 }}>
      {/* Backdrop */}
      {isOpen && <div className="absolute inset-0 pointer-events-auto" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />}

      {/* Panel */}
      <div className="relative h-full overflow-y-auto pointer-events-auto transition-transform duration-300 flex flex-col"
        style={{
          width: 280, background: "#0F0E0C",
          borderLeft: `1px solid ${C.border}`,
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          fontFamily: SANS,
        }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-12 pb-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2">
            <Zap size={14} color={C.accent} />
            <span className="text-sm font-bold" style={{ color: C.text }}>데모 컨트롤</span>
          </div>
          <button onClick={onClose}><X size={18} color={C.muted} /></button>
        </div>

        {/* Virtual time */}
        <div className="px-4 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: C.muted }}>가상 현재 시각</p>
          <p className="text-xs font-mono mb-2" style={{ fontFamily: MONO, color: C.accent }}>{fmtVirtualNow(virtualNow)}</p>
          <input type="datetime-local" value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onBlur={applyInput}
            onKeyDown={e => e.key === "Enter" && applyInput()}
            className="w-full text-xs px-2 py-1.5 rounded-lg outline-none mb-1"
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }} />
          <p className="text-[10px]" style={{ color: C.disabled }}>Enter 또는 포커스 해제 시 적용</p>
        </div>

        {/* Time jumps */}
        <div className="px-4 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: C.muted }}>시간 점프</p>
          <div className="flex flex-col gap-1.5">
            {JUMPS.map(j => (
              <button key={j.iso} onClick={() => jumpTo(j.iso)}
                className="text-left px-3 py-2 rounded-lg text-xs"
                style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}` }}>
                <span className="font-medium">{j.label}</span>
                <span className="ml-2" style={{ color: C.muted }}>{j.iso.slice(5,16).replace("T"," ")}</span>
              </button>
            ))}
          </div>
        </div>

        {/* State manipulation */}
        <div className="px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: C.muted }}>상태 조작</p>
          <div className="flex flex-col gap-1.5">
            <button onClick={() => dispatch({ type: "FORCE_STOCK", dropId: 1, stock: 1 })}
              className="text-left px-3 py-2 rounded-lg text-xs"
              style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}` }}>
              재고 1개로 만들기 (두쫀쿠)
            </button>
            <button onClick={() => dispatch({ type: "FORCE_STOCK", dropId: 1, stock: 0 })}
              className="text-left px-3 py-2 rounded-lg text-xs"
              style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}` }}>
              매진시키기 → SOLD_OUT
            </button>
            <button onClick={() => dispatch({ type: "FORCE_BALANCE", balance: 8000 })}
              className="text-left px-3 py-2 rounded-lg text-xs"
              style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}` }}>
              잔액 8,000원으로 (부족 테스트)
            </button>
            <button onClick={() => dispatch({ type: "RESET" })}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
              style={{ background: C.accentSoft, color: C.accent, border: `1px solid ${C.border}` }}>
              <RotateCcw size={12} /> 전체 초기화
            </button>
          </div>

          {/* Live state summary */}
          <div className="mt-4 p-3 rounded-lg" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: C.muted }}>현재 상태</p>
            <p className="text-xs" style={{ color: C.text }}>잔액: <span style={{ color: C.accent }}>{state.user.balance.toLocaleString()}원</span></p>
            {state.drops.map(d => (
              <p key={d.id} className="text-xs" style={{ color: C.text }}>
                {d.name}: <span style={{ color: C.accent }}>{d.stock}/{d.totalStock}</span>
                {" "}<span style={{ color: C.muted }}>({getDropStatus(d, virtualNow)})</span>
              </p>
            ))}
            <p className="text-xs" style={{ color: C.text }}>주문: <span style={{ color: C.accent }}>{state.orders.length}건</span></p>
            <p className="text-xs" style={{ color: C.text }}>찜: <span style={{ color: C.accent }}>{state.wishlist.length}개</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEFT NAVIGATOR (desktop sidebar)
// ═══════════════════════════════════════════════════════════════════════════════
const NAV_ITEMS: { label: string; screen: Screen; dropId?: number; orderId?: number }[] = [
  { label: "🔐 로그인",          screen: "login" },
  { label: "🏠 홈",             screen: "home" },
  { label: "🍞 드롭: 두쫀쿠",    screen: "drop-detail", dropId: 1 },
  { label: "🥐 드롭: 소금버터롤", screen: "drop-detail", dropId: 2 },
  { label: "🌿 드롭: 무화과캄파뉴",screen:"drop-detail", dropId: 3 },
  { label: "🛒 주문 페이지",      screen: "order",       dropId: 1 },
  { label: "✅ 주문 완료",        screen: "order-complete" },
  { label: "📦 주문 내역",        screen: "order-list" },
  { label: "❤️ 찜",             screen: "wishlist" },
  { label: "💰 예치금",          screen: "wallet" },
  { label: "⚡ 충전",            screen: "charge" },
  { label: "👤 마이페이지",       screen: "mypage" },
  { label: "📝 드롭 등록",        screen: "seller-register" },
  { label: "📊 판매자 대시보드",   screen: "seller-dashboard" },
  { label: "🛡️ 판매자 승인",     screen: "admin" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════════
function AppInner() {
  const [screen, setScreen]           = useState<Screen>("home");
  const [history, setHistory]         = useState<{ screen: Screen; dropId: number; orderId: number | null }[]>([]);
  const [activeTab, setActiveTab]     = useState<Tab>("home");
  const [selectedDropId, setDropId]   = useState<number>(1);
  const [selectedOrderId, setOrderId] = useState<number | null>(null);
  const [demoOpen, setDemoOpen]       = useState(false);

  const navigate = useCallback((
    s: Screen,
    opts?: { dropId?: number; orderId?: number },
    tab?: Tab,
  ) => {
    setHistory(h => [...h, { screen, dropId: selectedDropId, orderId: selectedOrderId }]);
    if (opts?.dropId   !== undefined) setDropId(opts.dropId);
    if (opts?.orderId  !== undefined) setOrderId(opts.orderId);
    setScreen(s);
    if (tab) setActiveTab(tab);
  }, [screen, selectedDropId, selectedOrderId]);

  const goBack = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setScreen(prev.screen);
    setDropId(prev.dropId);
    setOrderId(prev.orderId);
    setHistory(h => h.slice(0, -1));
  }, [history]);

  const jumpTo = (item: typeof NAV_ITEMS[0]) => {
    setHistory([]);
    if (item.dropId  !== undefined) setDropId(item.dropId);
    if (item.orderId !== undefined) setOrderId(item.orderId);
    setScreen(item.screen);
  };

  const sp = { navigate, back: goBack, activeTab };

  return (
    <div className="flex items-center justify-center min-h-screen gap-6" style={{ background: "#080706", fontFamily: SANS }}>
      {/* Left navigator */}
      <div className="hidden lg:flex flex-col gap-1 max-h-[90vh] overflow-y-auto pr-1" style={{ width: 224 }}>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: C.muted }}>화면 목록</p>
        {NAV_ITEMS.map(item => (
          <button key={`${item.screen}-${item.dropId}`} onClick={() => jumpTo(item)}
            className="text-left text-xs px-3 py-2 rounded-lg"
            style={{
              background: screen === item.screen && (item.dropId === undefined || item.dropId === selectedDropId) ? C.accentSoft : "transparent",
              color: screen === item.screen && (item.dropId === undefined || item.dropId === selectedDropId) ? C.accent : C.muted,
              border: screen === item.screen && (item.dropId === undefined || item.dropId === selectedDropId) ? `1px solid ${C.border}` : "1px solid transparent",
            }}>
            {item.label}
          </button>
        ))}
      </div>

      {/* Phone frame */}
      <div className="relative overflow-hidden flex-shrink-0"
        style={{ width: 375, height: 812, background: C.bg, borderRadius: 40, boxShadow: "0 0 0 1px #2A2118, 0 32px 80px rgba(0,0,0,0.9)" }}>

        {screen === "login"          && <LoginScreen navigate={navigate} />}
        {screen === "home"           && <HomeScreen navigate={navigate} activeTab={activeTab} />}
        {screen === "drop-detail"    && <DropDetailScreen dropId={selectedDropId} navigate={navigate} back={goBack} />}
        {screen === "order"          && <OrderScreen dropId={selectedDropId} navigate={navigate} back={goBack} />}
        {screen === "order-complete" && <OrderCompleteScreen navigate={navigate} />}
        {screen === "order-list"     && <OrderListScreen navigate={(s, opts, tab) => navigate(s, opts, tab)} activeTab={activeTab} />}
        {screen === "order-detail"   && selectedOrderId !== null && <OrderDetailScreen orderId={selectedOrderId} back={goBack} />}
        {screen === "wishlist"       && <WishlistScreen navigate={navigate} activeTab={activeTab} />}
        {screen === "wallet"         && <WalletScreen navigate={navigate} back={goBack} />}
        {screen === "charge"         && <ChargeScreen navigate={navigate} back={goBack} />}
        {screen === "mypage"         && <MyPageScreen navigate={navigate} activeTab={activeTab} />}
        {screen === "seller-register"   && <SellerRegisterScreen back={goBack} />}
        {screen === "seller-dashboard"  && <SellerDashboardScreen navigate={navigate} back={goBack} />}
        {screen === "admin"          && <AdminApprovalScreen back={goBack} />}

        {/* Demo panel */}
        <DemoPanel isOpen={demoOpen} onClose={() => setDemoOpen(false)} />

        {/* Demo toggle button */}
        <button onClick={() => setDemoOpen(o => !o)}
          className="absolute top-3 right-4 z-[101] flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold"
          style={{ background: demoOpen ? C.accent : C.accentSoft, color: demoOpen ? C.bg : C.accent, border: `1px solid ${C.border}` }}>
          <Zap size={11} /> 데모
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
