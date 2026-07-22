import {
  Bell,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Heart,
  Home,
  IceCreamBowl,
  Info,
  LocateFixed,
  MapPin,
  Minus,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Soup,
  Star,
  Store,
  Smartphone,
  Trash2,
  User,
  Wallet,
  Wine,
  X
} from 'lucide-react';
import clsx from 'clsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { EmptyState } from '../components/EmptyState.jsx';
import { Loading } from '../components/Loading.jsx';
import { endpoints } from '../services/api.js';
import { currency } from '../utils/format.js';
import { useApi } from '../hooks/useApi.js';
import { useSettings } from '../context/SettingsContext.jsx';

const fallbackImage = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80';
const chopasapLogo = '/chopasap-logo.png';
const brandRed = '#d71920';
const tabs = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'shops', label: 'Restaurants', icon: ShoppingBag },
  { id: 'find', label: 'Find', icon: Search },
  { id: 'favorites', label: 'Favorite', icon: Heart },
  { id: 'orders', label: 'Orders', icon: ClipboardList }
];
const categoryTiles = [
  { label: 'African', icon: Soup },
  { label: 'Grocery', icon: Package, badge: 'Promo' },
  { label: 'Sweet Drinks', icon: Wine },
  { label: 'Alcohol', icon: Wine },
  { label: 'Ice Cream', icon: IceCreamBowl },
  { label: 'More', icon: MoreHorizontal }
];

const emptyOrderForm = {
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  deliveryAddress: '',
  deliveryNote: '',
  latitude: '',
  longitude: ''
};

const emptyReservationForm = {
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  partySize: 2,
  reservationAt: '',
  mealPreference: '',
  note: ''
};

const emptyPromotionForm = {
  businessName: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  title: '',
  description: '',
  imageUrl: '',
  ctaUrl: ''
};

const paymentMethods = [
  { id: 'wallet', label: 'My Wallet Balance', icon: CreditCard, iconClass: 'bg-white text-[#ef4444]' },
  { id: 'mtn', label: 'Mobile Money', icon: Smartphone, iconClass: 'bg-[#ffd600] text-black' },
  { id: 'orange', label: 'Orange Money', icon: Wallet, iconClass: 'bg-orange-500 text-white' }
];

const activeOrdersStorageKey = 'chopasap_active_orders';
const statusLabel = (status = 'PENDING') => status.replaceAll('_', ' ').toLowerCase();
const cartKeyFor = (menuItemId, variationName) => `${menuItemId}:${variationName || 'base'}`;
const mealVariations = (item) => (Array.isArray(item?.variations) ? item.variations.filter((variation) => variation?.name) : []);
const mealPrice = (item, variationName) => {
  const variation = mealVariations(item).find((entry) => entry.name === variationName);
  return Number(variation?.price || item?.price || 0);
};

function RedButton({ children, className, ...props }) {
  return (
    <button
      className={clsx(
        'inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-extrabold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      style={{ backgroundColor: brandRed, boxShadow: '0 12px 24px rgba(215, 25, 32, 0.18)' }}
      {...props}
    >
      {children}
    </button>
  );
}

function TabButton({ tab, active, onClick, desktop = false }) {
  const Icon = tab.icon;
  return (
    <button
      className={clsx(
        desktop
          ? 'flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-extrabold transition'
          : 'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-black transition',
        active ? (desktop ? 'text-white shadow-lg' : 'text-[#d71920]') : 'text-[#42495a] hover:text-[#d71920]'
      )}
      style={active && desktop ? { backgroundColor: brandRed, boxShadow: '0 14px 28px rgba(215, 25, 32, 0.16)' } : undefined}
      onClick={onClick}
    >
      <Icon size={desktop ? 20 : 21} fill={tab.id === 'favorites' && active ? 'currentColor' : 'none'} />
      {tab.label}
    </button>
  );
}

function Modal({ title, open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-0 sm:place-items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-[2rem]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">{title}</h2>
          <button className="grid h-10 w-10 place-items-center rounded-full bg-stone-100 text-stone-700" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function InstallAppPrompt({ canInstall, onInstall, onDismiss }) {
  return (
    <div className="fixed left-4 right-4 top-4 z-[70] mx-auto max-w-md rounded-xl border border-[#ffd5d7] bg-white p-3 shadow-[0_16px_40px_rgba(17,24,39,0.18)]">
      <div className="flex items-center gap-3">
        <img className="h-11 w-11 rounded-xl object-cover" src={chopasapLogo} alt="ChopASAP" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-[#151923]">Add ChopASAP to your phone</p>
          <p className="mt-0.5 text-xs font-semibold text-[#6d6f76]">{canInstall ? 'Install the app for faster meal ordering.' : 'Use your browser menu to add ChopASAP to your home screen.'}</p>
        </div>
        <button className="grid h-8 w-8 place-items-center rounded-full bg-stone-100 text-[#29384d]" onClick={onDismiss} aria-label="Dismiss install prompt">
          <X size={16} />
        </button>
      </div>
      {canInstall ? (
        <button className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#d71920] text-sm font-black text-white" onClick={onInstall}>
          <Smartphone size={17} /> Add app
        </button>
      ) : null}
    </div>
  );
}

function CheckoutShell({ title, onBack, children }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#eef8fa] text-[#07142a] sm:grid sm:place-items-center sm:bg-black/45 sm:p-4">
      <div className="min-h-screen w-full bg-[#eef8fa] sm:min-h-0 sm:max-h-[92vh] sm:max-w-[390px] sm:overflow-y-auto sm:rounded-[1.7rem]">
        <header className="sticky top-0 z-10 flex h-28 items-center justify-center bg-[#eef8fa] px-6">
          <button className="absolute left-6 grid h-10 w-10 place-items-center text-[#07142a]" onClick={onBack} aria-label="Go back">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-xl font-medium tracking-normal">{title}</h2>
        </header>
        {children}
      </div>
    </div>
  );
}

function CheckoutItem({ item, address, onChangeQty, onRemove }) {
  return (
    <div className="relative flex items-center gap-3 border-b border-[#dbe5e8] bg-white px-4 py-3 last:border-b-0">
      <img className="h-[74px] w-[74px] shrink-0 rounded-full object-cover" src={item.imageUrl || fallbackImage} alt={item.name} />
      <div className="min-w-0 flex-1 pr-7">
        <p className="truncate text-[15px] font-medium text-[#111827]">{item.name}</p>
        {item.variationName ? <p className="mt-0.5 text-xs font-medium text-[#d71920]">{item.variationName}</p> : null}
        <p className="mt-0.5 text-sm text-[#6d6f76]">{item.quantity} item • {currency(item.price * item.quantity)}</p>
        <p className="mt-0.5 truncate text-sm text-[#6d6f76]">Deliver to {address || 'Bonanjo Biyamassi'}</p>
      </div>
      <button className="absolute right-4 top-3 text-[#d71920]" type="button" onClick={() => onRemove(item.cartItemId)} aria-label={`Remove ${item.name}`}>
        <Trash2 size={16} />
      </button>
      <ChevronRight className="absolute right-4 top-12 text-[#07142a]" size={20} />
      <div className="absolute bottom-2 right-3 flex h-7 w-[84px] items-center justify-between rounded-md border border-[#818892] bg-white px-2 text-[#5f646b]">
        <button type="button" onClick={() => onChangeQty(item.cartItemId, -1)} aria-label={`Decrease ${item.name}`}><Minus size={18} /></button>
        <span className="text-sm font-medium text-[#07142a]">{item.quantity}</span>
        <button type="button" onClick={() => onChangeQty(item.cartItemId, 1)} aria-label={`Increase ${item.name}`}><Plus size={18} /></button>
      </div>
    </div>
  );
}

function PriceRows({ subtotal, deliveryFee, serviceFee = 0, total, showService = false }) {
  return (
    <div className="space-y-3 px-6 text-[16px]">
      <div className="flex items-center justify-between">
        <span className="text-[#6d6f76]">Subtotal</span>
        <span className="font-medium">{currency(subtotal)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[#6d6f76]">Promotion</span>
        <span className="font-medium text-[#00a35b]">-{currency(0)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[#6d6f76]">Delivery fee <Info size={16} className="rounded-full bg-[#a6abb0] text-white" /></span>
        <span className="font-medium">{currency(deliveryFee)}</span>
      </div>
      {showService ? (
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[#6d6f76]">Taxes & Other fees <Info size={16} className="rounded-full bg-[#a6abb0] text-white" /></span>
          <span className="font-medium">{currency(serviceFee)}</span>
        </div>
      ) : null}
      <div className="flex items-center justify-between pt-1">
        <span>Total</span>
        <span className="font-medium">{currency(total)}</span>
      </div>
    </div>
  );
}

function MealCard({ item, favorite, onFavorite, onOpen }) {
  return (
    <article
      className="cursor-pointer overflow-hidden rounded-xl border border-[#f5c45d] bg-white text-left shadow-[0_14px_30px_rgba(75,45,10,0.10)] transition hover:-translate-y-0.5 hover:border-[#d71920]"
      onClick={() => onOpen(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onOpen(item);
      }}
    >
      <div className="relative">
        <img className="h-36 w-full object-cover sm:h-40" src={item.imageUrl || fallbackImage} alt={item.name} />
        <button
          className={clsx('absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white shadow-md', favorite ? 'text-[#d71920]' : 'text-stone-500')}
          onClick={(event) => {
            event.stopPropagation();
            onFavorite(item.id);
          }}
          aria-label="Save favorite"
        >
          <Heart size={18} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-black text-stone-950">{item.name}</h3>
            <p className="mt-1 text-xs font-bold text-stone-500">{item.category?.name || 'Kitchen'}</p>
          </div>
          <p className="shrink-0 font-black text-[#d71920]">{currency(item.price)}</p>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-600">
            <Star size={14} className="text-amber-500" fill="currentColor" />
            4.8
            <span className="h-1 w-1 rounded-full bg-stone-300" />
            25 min
          </div>
          <button
            className="grid h-10 w-10 place-items-center rounded-full text-white shadow-md"
            style={{ backgroundColor: brandRed, boxShadow: '0 10px 18px rgba(215, 25, 32, 0.18)' }}
            onClick={(event) => {
              event.stopPropagation();
              onOpen(item);
            }}
            aria-label="View meal details"
          >
            <Plus size={19} />
          </button>
        </div>
      </div>
    </article>
  );
}

function CategoryTile({ tile, onClick }) {
  const Icon = tile.icon;
  return (
    <button className="relative min-h-20 rounded-lg bg-[#eef5f6] p-3 text-left shadow-sm" onClick={onClick}>
      {tile.badge ? <span className="absolute right-2 top-[-10px] rounded-full bg-[#19b567] px-3 py-1 text-[11px] font-black text-white">{tile.badge}</span> : null}
      <div className="flex h-full flex-col justify-between">
        <Icon className="ml-auto text-[#d71920]" size={30} />
        <span className="text-xs font-black text-[#292f3d]">{tile.label}</span>
      </div>
    </button>
  );
}

function MobileMealRow({ item, onAdd }) {
  return (
    <button className="flex w-full items-center gap-3 border-b border-[#dbe5e8] bg-white py-3 text-left" onClick={() => onAdd(item)}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-black text-[#151923]">{item.name}</p>
        <p className="mt-1 line-clamp-2 text-xs font-semibold leading-4 text-[#8a8f98]">{item.description || 'Hot meal available with fresh ingredients and fast preparation.'}</p>
        <p className="mt-1 text-xs font-black text-[#151923]">From {currency(item.price)}</p>
      </div>
      <img className="h-16 w-20 rounded-lg object-cover" src={item.imageUrl || fallbackImage} alt={item.name} />
      <ChevronRight className="shrink-0 text-[#29384d]" size={18} />
    </button>
  );
}

function MealDetail({ item, quantity, selectedVariation, onVariationChange, onQuantityChange, onClose, onAdd }) {
  if (!item) return null;
  const variations = mealVariations(item);
  const price = mealPrice(item, selectedVariation);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#eef8fa] text-[#111827] sm:grid sm:place-items-center sm:bg-black/45 sm:p-4">
      <div className="min-h-screen w-full bg-white sm:min-h-0 sm:max-h-[92vh] sm:max-w-[390px] sm:overflow-y-auto sm:rounded-[1.7rem]">
        <div className="h-24 bg-[#eef8fa]" />
        <div className="relative">
          <img className="h-[245px] w-full rounded-t-[1.6rem] object-cover" src={item.imageUrl || fallbackImage} alt={item.name} />
          <button className="absolute right-5 top-4 grid h-9 w-9 place-items-center rounded-md bg-white text-[#07142a] shadow-sm" onClick={onClose} aria-label="Close meal details">
            <X size={22} />
          </button>
        </div>
        <div className="px-6 pb-28 pt-3">
          <div className="flex justify-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-[#d71920]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffc15b]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffc15b]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffc15b]" />
          </div>
          <div className="mt-2 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-lg font-black tracking-normal">{item.name}</h1>
              <p className="text-xs text-[#6d6f76]">Delivery Free&nbsp;&nbsp;&nbsp; 10-25 min</p>
            </div>
            <p className="shrink-0 pt-5 text-base font-black text-[#777]">{currency(price)}</p>
          </div>
          <p className="mt-4 text-[13px] font-medium leading-5 text-[#5f646b]">
            {item.description || 'Freshly prepared ChopASAP meal made with quality ingredients and served hot for pickup or delivery.'}
          </p>

          {variations.length ? (
            <section className="mt-7">
              <h2 className="font-medium">Chose variation</h2>
              <div className="mt-3 grid gap-3">
                {variations.map((variation) => (
                  <label key={variation.name} className="flex items-center gap-2 text-sm text-[#6d6f76]">
                    <input
                      className="h-3 w-3 accent-[#d71920]"
                      type="checkbox"
                      checked={selectedVariation === variation.name}
                      onChange={() => onVariationChange(selectedVariation === variation.name ? '' : variation.name)}
                    />
                    <span>{variation.name}</span>
                  </label>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-7">
            <h2 className="font-medium">Seller information</h2>
            <div className="mt-4 flex items-center gap-3">
              <img className="h-12 w-12 rounded-full object-cover" src={chopasapLogo} alt="ChopASAP" />
              <div className="min-w-0 flex-1">
                <p className="font-black">ChopASAP</p>
                <p className="text-xs text-[#6d6f76]">Restaurant kitchen</p>
              </div>
              <span className="text-xs font-medium text-[#44d18b]">Open Now</span>
              <ChevronRight size={24} />
            </div>
          </section>
        </div>
        <div className="fixed bottom-0 left-0 right-0 z-10 bg-white px-6 py-5 sm:absolute sm:left-auto sm:right-auto sm:w-full sm:max-w-[390px]">
          <div className="grid grid-cols-[86px_1fr] gap-5">
            <div className="flex h-10 items-center justify-between rounded-md border border-[#d71920] px-3 text-sm">
              <button type="button" onClick={() => onQuantityChange(-1)} aria-label="Decrease quantity"><Minus size={16} /></button>
              <span>{quantity}</span>
              <button type="button" onClick={() => onQuantityChange(1)} aria-label="Increase quantity"><Plus size={16} /></button>
            </div>
            <RedButton className="rounded-md" onClick={() => onAdd(item, quantity, selectedVariation)}>Add To Cart {currency(price * quantity)}</RedButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 grid h-[72px] grid-cols-5 border-t border-[#dde7ea] bg-white px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_25px_rgba(40,50,60,0.08)] md:hidden">
      {tabs.map((tab) => (
        <TabButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
      ))}
    </nav>
  );
}

export default function PublicPortal() {
  const { data, loading, error, refetch } = useApi(() => endpoints.publicMenu(), []);
  const promotions = useApi(() => endpoints.publicPromotions(), []);
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState('home');
  const [favorites, setFavorites] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState('');
  const [activeOrders, setActiveOrders] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(activeOrdersStorageKey) || '[]');
    } catch {
      return [];
    }
  });
  const [search, setSearch] = useState('');
  const [orderOpen, setOrderOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('cart');
  const [fulfillment, setFulfillment] = useState('delivery');
  const [paymentMethod, setPaymentMethod] = useState('mtn');
  const [reservationOpen, setReservationOpen] = useState(false);
  const [promotionOpen, setPromotionOpen] = useState(false);
  const [orderForm, setOrderForm] = useState(emptyOrderForm);
  const [reservation, setReservation] = useState(emptyReservationForm);
  const [promotionForm, setPromotionForm] = useState(emptyPromotionForm);
  const [submitting, setSubmitting] = useState(false);
  const [promotionImageUploading, setPromotionImageUploading] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 'welcome', title: 'Welcome', body: 'Fresh meals are ready for delivery.' }
  ]);
  const activeOrdersRef = useRef(activeOrders);

  const items = data?.items || [];
  const categories = [...new Set(items.map((item) => item.category?.name).filter(Boolean))];
  const filteredItems = items.filter((item) => `${item.name} ${item.category?.name || ''}`.toLowerCase().includes(search.toLowerCase()));
  const favoriteItems = items.filter((item) => favorites.includes(item.id));
  const promotionSlides = [
    ...(promotions.data?.items || []),
    {
      id: 'request-promotion',
      title: 'Promote with us and reach more customers',
      description: 'Submit your brand, service, or store for admin approval and placement on ChopASAP.',
      ctaLabel: 'Request promotion',
      requestSlide: true
    }
  ];
  const [promotionIndex, setPromotionIndex] = useState(0);
  const featuredPromotion = promotionSlides[promotionIndex] || promotionSlides[0];
  const visibleCategoryTiles = categoryTiles.map((tile, index) => ({
    ...tile,
    label: categories[index] || tile.label,
    filter: categories[index] || tile.label
  }));
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const deliveryFee = fulfillment === 'delivery' ? Number(settings.deliveryFee || 0) : 0;
  const serviceFee = 0;
  const grandTotal = subtotal + deliveryFee + serviceFee;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addNotification = (title, body) => setNotifications((current) => [{ id: `${Date.now()}`, title, body }, ...current].slice(0, 5));
  const toggleFavorite = (id) => setFavorites((current) => (current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]));

  useEffect(() => {
    if (promotionIndex < promotionSlides.length) return;
    setPromotionIndex(0);
  }, [promotionIndex, promotionSlides.length]);

  useEffect(() => {
    if (promotionSlides.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setPromotionIndex((current) => (current + 1) % promotionSlides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [promotionSlides.length]);
  const requestOrderNotificationPermission = async () => {
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    try {
      await Notification.requestPermission();
    } catch {
      // Browsers can reject permission prompts outside supported contexts.
    }
  };
  const showOrderStatusNotification = async (order) => {
    const title = `Order ${order.orderNo} update`;
    const body = `Your order is now ${statusLabel(order.status)}.`;

    addNotification(title, body);

    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({ type: 'ORDER_STATUS_NOTIFICATION', title, body });
      return;
    }
    new Notification(title, { body, icon: chopasapLogo });
  };

  useEffect(() => {
    activeOrdersRef.current = activeOrders;
    localStorage.setItem(activeOrdersStorageKey, JSON.stringify(activeOrders.slice(0, 10)));
  }, [activeOrders]);

  useEffect(() => {
    const refreshOrderStatuses = async () => {
      const trackableOrders = activeOrdersRef.current.filter((order) => order.id && !['DELIVERED', 'CANCELLED'].includes(order.status));
      if (!trackableOrders.length) return;

      const refreshed = await Promise.all(
        trackableOrders.map(async (order) => {
          try {
            const response = await endpoints.publicOnlineOrder(order.id);
            return response.data;
          } catch {
            return order;
          }
        })
      );

      const nextOrders = activeOrdersRef.current.map((order) => {
        const latest = refreshed.find((item) => item.id === order.id);
        if (!latest) return order;

        if (latest.status && latest.status !== order.status) {
          showOrderStatusNotification({ ...order, ...latest });
        }

        return { ...order, ...latest };
      });

      activeOrdersRef.current = nextOrders;
      setActiveOrders(nextOrders);
    };

    refreshOrderStatuses();
    const timer = window.setInterval(refreshOrderStatuses, 20000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone || localStorage.getItem('chopasap_install_dismissed') === 'true') return undefined;

    const showTimer = window.setTimeout(() => setShowInstallPrompt(true), 1200);
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.clearTimeout(showTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const dismissInstallPrompt = () => {
    localStorage.setItem('chopasap_install_dismissed', 'true');
    setShowInstallPrompt(false);
  };

  const installApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    dismissInstallPrompt();
  };

  const openMealDetail = (item) => {
    const variations = mealVariations(item);
    setSelectedMeal(item);
    setDetailQuantity(1);
    setSelectedVariation(variations[0]?.name || '');
  };

  const closeMealDetail = () => {
    setSelectedMeal(null);
    setDetailQuantity(1);
    setSelectedVariation('');
  };

  const add = (item, quantity = 1, variationName = '') => {
    const cartItemId = cartKeyFor(item.id, variationName);
    const price = mealPrice(item, variationName);
    setCart((current) => {
      const existing = current.find((entry) => entry.cartItemId === cartItemId);
      if (existing) return current.map((entry) => (entry.cartItemId === cartItemId ? { ...entry, quantity: entry.quantity + quantity } : entry));
      return [...current, { cartItemId, menuItemId: item.id, variationName, name: item.name, price, quantity, imageUrl: item.imageUrl }];
    });
    toast.success(`${item.name} added`);
    closeMealDetail();
  };

  const openCheckout = (step = 'cart') => {
    setCheckoutStep(step);
    setOrderOpen(true);
  };

  const closeCheckout = () => {
    setOrderOpen(false);
    setCheckoutStep('cart');
  };

  const updateQty = (id, delta) => {
    setCart((current) =>
      current
        .map((item) => (item.cartItemId === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const useLocation = () => {
    if (!navigator.geolocation) return toast.error('Location is not available on this device');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrderForm((current) => ({ ...current, latitude: position.coords.latitude, longitude: position.coords.longitude }));
        toast.success('Location added');
      },
      () => toast.error('Could not read location')
    );
  };

  const submitOrder = async (event) => {
    event?.preventDefault();
    if (!settings.publicOrdering) return toast.error('Online ordering is currently unavailable');
    if (!cart.length) return toast.error('Add at least one meal');
    setSubmitting(true);
    try {
      const response = await endpoints.createOnlineOrder({
        ...orderForm,
        deliveryFee,
        items: cart.map(({ menuItemId, quantity, variationName }) => ({ menuItemId, quantity, variationName }))
      });
      requestOrderNotificationPermission();
      toast.success(`Order ${response.data.orderNo} received`);
      addNotification('Order placed', `${response.data.orderNo} is pending confirmation.`);
      setActiveOrders((current) => [
        {
          id: response.data.id,
          orderNo: response.data.orderNo,
          total: response.data.total,
          status: response.data.status,
          items: response.data.items || cart
        },
        ...current
      ]);
      setCart([]);
      setCheckoutStep('success');
      setOrderForm(emptyOrderForm);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not place order');
    } finally {
      setSubmitting(false);
    }
  };

  const goBackCheckout = () => {
    if (checkoutStep === 'success') {
      closeCheckout();
      setActiveTab('home');
      return;
    }
    if (checkoutStep === 'payment') {
      setCheckoutStep('details');
      return;
    }
    if (checkoutStep === 'details') {
      setCheckoutStep('cart');
      return;
    }
    closeCheckout();
  };

  const submitReservation = async (event) => {
    event.preventDefault();
    if (!settings.reservations) return toast.error('Reservations are currently unavailable');
    setSubmitting(true);
    try {
      const response = await endpoints.createReservation(reservation);
      toast.success(`Reservation ${response.data.reservationNo} requested`);
      addNotification('Reservation sent', `${response.data.reservationNo} is waiting for confirmation.`);
      setReservation(emptyReservationForm);
      setReservationOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not request reservation');
    } finally {
      setSubmitting(false);
    }
  };

  const submitPromotion = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await endpoints.submitPromotionRequest(promotionForm);
      toast.success('Promotion request submitted');
      addNotification('Promotion submitted', `${response.data.title} is waiting for admin approval.`);
      setPromotionForm(emptyPromotionForm);
      setPromotionOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit promotion request');
    } finally {
      setSubmitting(false);
    }
  };

  const uploadPromotionImage = async (file) => {
    if (!file) return;
    setPromotionImageUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('image', file);
      const response = await endpoints.uploadPublicPromotionImage(uploadData);
      setPromotionForm((current) => ({ ...current, imageUrl: response.data.url }));
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not upload image');
    } finally {
      setPromotionImageUploading(false);
    }
  };

  const handlePromotionCta = (promotion = featuredPromotion) => {
    if (promotion?.ctaUrl && !promotion.requestSlide) {
      window.open(promotion.ctaUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    setPromotionOpen(true);
  };

  if (loading) return <Loading label="Loading menu" />;
  if (error || !data) return <EmptyState title="Menu unavailable" message="The ordering portal could not load the menu." onRetry={refetch} />;

  const renderMeals = (list) => (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {list.map((item) => (
        <MealCard key={item.id} item={item} favorite={favorites.includes(item.id)} onFavorite={toggleFavorite} onOpen={openMealDetail} />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#eaf5f8] text-stone-950">
      <div className="mx-auto min-h-screen max-w-7xl bg-[#eef8fa]">
        {showInstallPrompt ? <InstallAppPrompt canInstall={Boolean(installPrompt)} onInstall={installApp} onDismiss={dismissInstallPrompt} /> : null}
        <header className="sticky top-0 z-30 bg-[#eef8fa]/95 px-4 pb-3 pt-4 backdrop-blur md:border-b md:border-[#dbe5e8] md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <img className="h-8 w-8 rounded-lg object-cover md:h-12 md:w-12" src={chopasapLogo} alt="ChopASAP" />
              <div className="min-w-0">
                <p className="text-xl font-black uppercase tracking-normal text-[#d71920]">CHOP ASAP</p>
                <p className="hidden items-center gap-1 truncate text-sm font-black text-stone-950 md:flex">
                  <MapPin size={15} className="text-[#d71920]" />
                  {orderForm.deliveryAddress || 'Choose delivery location'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="relative grid h-9 w-9 place-items-center rounded-full bg-[#f7fbfc] text-[#29384d] shadow-sm" onClick={() => openCheckout('cart')} aria-label="Basket">
                <ShoppingBag size={19} />
                {cartCount ? <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#d71920] px-1 text-[9px] font-black text-white">{cartCount}</span> : null}
              </button>
              <button className="relative grid h-9 w-9 place-items-center rounded-full bg-[#f7fbfc] text-[#29384d] shadow-sm" onClick={() => setActiveTab('orders')} aria-label="Notifications">
                <Bell size={19} />
                {notifications.length ? <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#d71920] px-1 text-[9px] font-black text-white">{notifications.length}</span> : null}
              </button>
              <button className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#29384d] shadow-sm" onClick={() => setActiveTab('profile')} aria-label="Profile">
                <User size={19} />
              </button>
            </div>
          </div>
          <div className="mt-4 flex h-10 items-center gap-2 rounded-xl border border-[#f15b66] bg-white px-3">
            <input
              className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#29384d] outline-none placeholder:text-[#9aa4ad]"
              placeholder="Search ...."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Search size={21} className="text-[#f15b66]" />
          </div>
        </header>

        <div className="grid gap-5 px-4 pb-24 pt-3 md:grid-cols-[220px_1fr] md:px-6 lg:grid-cols-[220px_1fr_330px] lg:pb-8">
          <aside className="hidden self-start rounded-3xl bg-white p-3 shadow-md md:sticky md:top-24 md:block">
            <div className="mb-3 flex items-center gap-3 rounded-2xl bg-[#fff3cf] p-3">
              <img className="h-10 w-10 rounded-xl object-cover" src={chopasapLogo} alt="ChopASAP" />
              <div>
                <p className="text-xs font-black uppercase text-[#d71920]">ChopASAP</p>
                <p className="text-xs font-bold text-stone-600">Restaurant module</p>
              </div>
            </div>
            <nav className="grid gap-2">
              {tabs.map((tab) => (
                <TabButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} desktop />
              ))}
            </nav>
            <button className="mt-4 flex h-11 w-full items-center justify-center rounded-2xl bg-[#fff1ca] text-sm font-black text-[#d71920] disabled:opacity-50" disabled={!settings.reservations} onClick={() => setReservationOpen(true)}>
              <CalendarClock size={17} /> Reserve
            </button>
            <a className="mt-2 flex h-11 w-full items-center justify-center rounded-2xl bg-stone-50 text-sm font-black text-stone-700" href="/login">Login</a>
          </aside>

          <main className="min-w-0">
            {activeTab === 'home' ? (
              <>
                <div className="flex justify-center gap-2">
                  {['Food', 'Restaurants', 'Rides'].map((pill, index) => (
                    <button
                      key={pill}
                      className={clsx(
                        'rounded-full px-3 py-1.5 text-xs font-black shadow-sm',
                        index === 0 ? 'bg-[#ffd071] text-white' : 'bg-[#e5e3da] text-[#7f7767]'
                      )}
                    >
                      {pill}
                    </button>
                  ))}
                </div>

                <section className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {visibleCategoryTiles.map((tile) => (
                    <CategoryTile key={tile.label} tile={tile} onClick={() => setSearch(tile.icon === MoreHorizontal ? '' : tile.filter)} />
                  ))}
                </section>

                <section className="mt-5 overflow-hidden rounded-xl bg-white shadow-sm" aria-label="Promotions">
                  <div className="relative min-h-[142px] bg-[#ffd071]">
                    <div className="grid min-h-[142px] grid-cols-[1.25fr_0.75fr]">
                      <div className="p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8b5f00]">
                          {featuredPromotion?.requestSlide ? 'Advertise on ChopASAP' : featuredPromotion?.businessName || 'Featured'}
                        </p>
                        <p className="mt-1 text-base font-bold leading-5 text-[#151923]">{featuredPromotion?.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs font-medium leading-4 text-[#6c6250]">{featuredPromotion?.description}</p>
                        <button
                          className="mt-3 inline-flex h-8 items-center gap-1 rounded-full bg-white px-3 text-xs font-semibold text-[#6c6250] shadow-sm"
                          onClick={() => handlePromotionCta(featuredPromotion)}
                        >
                          {featuredPromotion?.ctaLabel || 'Contact our Team'} <ChevronRight size={14} />
                        </button>
                      </div>
                      <div className="flex items-center justify-center bg-[#ffe6a3] p-3">
                        {featuredPromotion?.imageUrl ? (
                          <img className="h-full max-h-28 w-full rounded-lg object-cover" src={featuredPromotion.imageUrl} alt={featuredPromotion.title} />
                        ) : (
                          <div className="grid h-20 w-20 place-items-center rounded-2xl bg-white/70 text-[#d71920]">
                            <ShoppingBag size={44} />
                          </div>
                        )}
                      </div>
                    </div>

                    {promotionSlides.length > 1 ? (
                      <>
                        <button
                          className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#29384d] shadow-sm"
                          onClick={() => setPromotionIndex((current) => (current - 1 + promotionSlides.length) % promotionSlides.length)}
                          aria-label="Previous promotion"
                        >
                          <ChevronLeft size={17} />
                        </button>
                        <button
                          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#29384d] shadow-sm"
                          onClick={() => setPromotionIndex((current) => (current + 1) % promotionSlides.length)}
                          aria-label="Next promotion"
                        >
                          <ChevronRight size={17} />
                        </button>
                      </>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between gap-3 px-4 py-2">
                    <div className="flex gap-1.5" aria-label="Promotion slides">
                      {promotionSlides.map((slide, index) => (
                        <button
                          key={slide.id}
                          className={clsx('h-2 rounded-full transition-all', index === promotionIndex ? 'w-5 bg-[#d71920]' : 'w-2 bg-[#e1e6e8]')}
                          onClick={() => setPromotionIndex(index)}
                          aria-label={`Show promotion ${index + 1}`}
                          aria-current={index === promotionIndex}
                        />
                      ))}
                    </div>
                    <button className="text-xs font-semibold text-[#d71920]" onClick={() => setPromotionOpen(true)}>
                      Promote here
                    </button>
                  </div>
                </section>

                <section className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-xl font-black tracking-normal text-[#151923]">Today's Menu</h2>
                    <ChevronRight size={22} className="text-[#29384d]" />
                  </div>
                  <div className="rounded-xl bg-white px-3 shadow-sm md:hidden">
                    {filteredItems.length ? (
                      filteredItems.slice(0, 8).map((item) => (
                        <MobileMealRow key={item.id} item={item} onAdd={openMealDetail} />
                      ))
                    ) : items.length ? (
                      <p className="py-4 text-sm font-semibold text-[#8a8f98]">No meals match your search.</p>
                    ) : (
                      <p className="py-4 text-sm font-semibold text-[#8a8f98]">No meals are available yet.</p>
                    )}
                  </div>
                  <div className="hidden md:block">
                    {filteredItems.length ? renderMeals(filteredItems) : <div className="rounded-3xl bg-white p-8 text-center font-semibold text-stone-500 shadow-md">{items.length ? 'No meals match your search.' : 'No meals are available yet.'}</div>}
                  </div>
                </section>

                <section className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-xl font-black tracking-normal text-[#151923]">Active Orders</h2>
                    <ChevronRight size={22} className="text-[#29384d]" />
                  </div>
                  <div className="rounded-xl bg-white px-3 shadow-sm">
                    {activeOrders.length ? activeOrders.slice(0, 3).map((order) => (
                      <div key={order.id || order.orderNo} className="flex items-center gap-3 border-b border-[#dbe5e8] py-3 last:border-b-0">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-[#151923]">{order.orderNo}</p>
                          <p className="mt-1 text-xs font-semibold text-[#8a8f98]">{order.items?.length || 0} item{(order.items?.length || 0) === 1 ? '' : 's'} • {currency(order.total)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-[#19b567]">{order.status || 'PENDING'}</p>
                          <p className="mt-1 text-[11px] font-semibold text-[#8a8f98]">Time 30mins</p>
                        </div>
                        <ChevronRight size={18} className="text-[#29384d]" />
                      </div>
                    )) : (
                      <p className="py-4 text-sm font-semibold text-[#8a8f98]">No active orders yet.</p>
                    )}
                  </div>
                </section>
              </>
            ) : null}

            {activeTab === 'favorites' ? (
              <section>
                <h1 className="text-2xl font-black">Favorites</h1>
                <p className="mt-1 text-sm font-semibold text-stone-600">Meals you saved for quick ordering.</p>
                <div className="mt-5">
                  {favoriteItems.length ? renderMeals(favoriteItems) : (
                    <div className="rounded-3xl bg-white p-8 text-center shadow-md">
                      <Heart className="mx-auto text-[#d71920]" size={34} />
                      <p className="mt-3 font-black">No favorites yet</p>
                      <p className="mt-1 text-sm font-semibold text-stone-500">Tap a heart on any meal to save it.</p>
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            {activeTab === 'shops' ? (
              <section>
                <h1 className="text-2xl font-black">Shops available</h1>
                <p className="mt-1 text-sm font-semibold text-stone-600">Browse available kitchens and categories.</p>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {(categories.length ? categories : ['Main Kitchen']).map((category) => {
                    const count = items.filter((item) => item.category?.name === category).length || items.length;
                    return (
                      <button key={category} className="flex items-center justify-between rounded-3xl bg-white p-4 text-left shadow-md" onClick={() => { setSearch(category); setActiveTab('home'); }}>
                        <div className="flex items-center gap-3">
                        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#fff1ca] text-[#d71920]"><Store size={24} /></div>
                          <div>
                            <p className="font-black">{category}</p>
                            <p className="text-sm font-semibold text-stone-600">{count} meals available</p>
                            <p className="text-xs font-black text-green-600">Open now</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {activeTab === 'find' ? (
              <section>
                <h1 className="text-2xl font-black">Find meals</h1>
                <p className="mt-1 text-sm font-semibold text-stone-600">Search and add meals to your basket.</p>
                <div className="mt-5 rounded-xl bg-white px-3 shadow-sm md:hidden">
                  {filteredItems.length ? filteredItems.map((item) => <MobileMealRow key={item.id} item={item} onAdd={openMealDetail} />) : <p className="py-4 text-sm font-semibold text-[#8a8f98]">No meals found.</p>}
                </div>
                <div className="mt-5 hidden md:block">{filteredItems.length ? renderMeals(filteredItems) : <div className="rounded-3xl bg-white p-8 text-center font-semibold text-stone-500 shadow-md">No meals found.</div>}</div>
              </section>
            ) : null}

            {activeTab === 'orders' ? (
              <section>
                <h1 className="text-2xl font-black">Orders</h1>
                <p className="mt-1 text-sm font-semibold text-stone-600">Track orders placed during this session.</p>
                <div className="mt-5 rounded-xl bg-white px-3 shadow-sm">
                  {activeOrders.length ? activeOrders.map((order) => (
                    <div key={order.id || order.orderNo} className="flex items-center gap-3 border-b border-[#dbe5e8] py-4 last:border-b-0">
                      <ClipboardList size={22} className="text-[#d71920]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-[#151923]">{order.orderNo}</p>
                        <p className="mt-1 text-xs font-semibold text-[#8a8f98]">{order.items?.length || 0} item{(order.items?.length || 0) === 1 ? '' : 's'} • {currency(order.total)}</p>
                      </div>
                      <span className="rounded-full bg-[#e7f8ef] px-3 py-1 text-xs font-black text-[#19b567]">{order.status || 'PENDING'}</span>
                    </div>
                  )) : (
                    <div className="py-8 text-center">
                      <ClipboardList className="mx-auto text-[#d71920]" size={34} />
                      <p className="mt-3 font-black">No orders yet</p>
                      <p className="mt-1 text-sm font-semibold text-[#8a8f98]">Orders you place from this portal will appear here.</p>
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            {activeTab === 'profile' ? (
              <section className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-3xl bg-white p-5 shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="grid h-16 w-16 place-items-center rounded-3xl bg-[#fff1ca] text-[#d71920]"><User size={28} /></div>
                    <div>
                      <h1 className="font-black">{orderForm.customerName || reservation.customerName || 'Guest customer'}</h1>
                      <p className="text-sm font-semibold text-stone-600">Anonymous checkout enabled</p>
                    </div>
                  </div>
                  <RedButton className="mt-5 w-full" disabled={!settings.reservations} onClick={() => setReservationOpen(true)}><CalendarClock size={17} /> Reserve a meal</RedButton>
                  <a className="mt-3 flex h-11 items-center justify-center rounded-xl bg-[#fff1ca] text-sm font-black text-[#d71920]" href="/login">Login</a>
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-md">
                  <h2 className="font-black">Notifications</h2>
                  <div className="mt-3 space-y-3">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="rounded-2xl bg-[#fff4d7] p-3">
                        <p className="text-sm font-black">{notification.title}</p>
                        <p className="mt-1 text-xs font-semibold text-stone-700">{notification.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}
          </main>

          <aside className="sticky top-24 hidden self-start rounded-3xl bg-white p-4 shadow-md lg:block">
            <div className="flex items-center justify-between">
              <h2 className="font-black">Basket</h2>
              <span className="rounded-full bg-[#fff1ca] px-3 py-1 text-xs font-black text-[#d71920]">{cartCount} items</span>
            </div>
            <div className="mt-4 space-y-3">
              {cart.length ? cart.slice(0, 3).map((item) => (
                <div key={item.cartItemId} className="flex gap-3 rounded-2xl bg-[#fff4d7] p-3">
                  <img className="h-12 w-12 rounded-xl object-cover" src={item.imageUrl || fallbackImage} alt={item.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">{item.name}</p>
                    {item.variationName ? <p className="truncate text-xs font-bold text-stone-600">{item.variationName}</p> : null}
                    <p className="text-sm font-black text-[#d71920]">{currency(item.price * item.quantity)}</p>
                  </div>
                </div>
              )) : <p className="rounded-2xl bg-stone-50 p-4 text-sm font-semibold text-stone-600">Your basket is empty.</p>}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4 text-lg font-black">
              <span>Total</span>
              <span className="text-[#d71920]">{currency(grandTotal)}</span>
            </div>
            <RedButton className="mt-4 w-full" disabled={!settings.publicOrdering} onClick={() => openCheckout('cart')}>Checkout</RedButton>
          </aside>
        </div>

        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {selectedMeal ? (
        <MealDetail
          item={selectedMeal}
          quantity={detailQuantity}
          selectedVariation={selectedVariation}
          onVariationChange={setSelectedVariation}
          onQuantityChange={(delta) => setDetailQuantity((current) => Math.max(1, current + delta))}
          onClose={closeMealDetail}
          onAdd={add}
        />
      ) : null}

      {orderOpen ? (
        <CheckoutShell
          title={checkoutStep === 'details' ? 'Delivery Details' : checkoutStep === 'payment' ? 'Payment Details' : checkoutStep === 'success' ? '' : cart.length ? 'Carts Details' : 'Carts'}
          onBack={goBackCheckout}
        >
          {checkoutStep === 'cart' ? (
            cart.length ? (
              <div className="pb-8">
                <div className="bg-white">
                  {cart.map((item) => (
                    <CheckoutItem key={item.cartItemId} item={item} address={orderForm.deliveryAddress} onChangeQty={updateQty} onRemove={(id) => updateQty(id, -999)} />
                  ))}
                </div>
                <div className="mt-5 border-t border-[#dbe5e8] px-6 pt-4">
                  <div className="flex items-center justify-between text-[16px]">
                    <span>Items Total</span>
                    <span>{currency(subtotal)}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[16px]">
                    <span>Delivery</span>
                    <span>{currency(deliveryFee)}</span>
                  </div>
                  <div className="mt-10 flex items-center justify-between border-t border-[#dbe5e8] pt-4 text-[16px]">
                    <span>Total</span>
                    <span>{currency(grandTotal)}</span>
                  </div>
                </div>
                <div className="mt-44 px-6 sm:mt-12">
                  <RedButton className="w-full rounded-md" disabled={!settings.publicOrdering} onClick={() => setCheckoutStep('details')}>Proceed to Check out</RedButton>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[calc(100vh-7rem)] flex-col items-center px-6 text-center sm:min-h-[600px]">
                <div className="mt-28 grid h-28 w-36 place-items-center">
                  <div className="relative">
                    <ShoppingBag size={82} className="text-[#df382f]" />
                    <span className="absolute -right-3 top-1 h-4 w-4 rounded-full bg-[#65d0a9]" />
                    <span className="absolute left-4 top-[-18px] h-3 w-3 rounded-full bg-[#00a35b]" />
                  </div>
                </div>
                <h2 className="mt-3 text-xl font-medium">Add items to start a basket</h2>
                <p className="mt-3 max-w-xs text-[16px] leading-7 text-[#5f646b]">OOPPSS your cart is empty to view items try adding an item to cart</p>
                <RedButton className="mt-10 rounded-md px-8" onClick={closeCheckout}>Start Shopping</RedButton>
              </div>
            )
          ) : null}

          {checkoutStep === 'details' ? (
            <form className="pb-8" onSubmit={(event) => { event.preventDefault(); setCheckoutStep('payment'); }}>
              <div className="px-5">
                <div className="grid h-[52px] grid-cols-2 rounded-full bg-[#e9e9e9] p-1">
                  {['delivery', 'pickup'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={clsx('rounded-full text-sm font-medium capitalize', fulfillment === option ? 'bg-white text-black' : 'text-black')}
                      onClick={() => setFulfillment(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-3 bg-white">
                <div className="flex w-full items-center gap-4 border-b border-[#edf0f2] px-6 py-4 text-left">
                  <MapPin className="shrink-0 text-black" size={29} fill="currentColor" />
                  <span className="min-w-0 flex-1">
                    <input
                      className="w-full bg-transparent text-[16px] font-medium outline-none"
                      placeholder={fulfillment === 'delivery' ? 'Delivery address' : 'Pickup location'}
                      value={orderForm.deliveryAddress}
                      onChange={(e) => setOrderForm({ ...orderForm, deliveryAddress: e.target.value })}
                      required
                    />
                    <span className="block text-sm text-[#6d6f76]">{fulfillment === 'delivery' ? 'CA' : 'Pickup'}</span>
                  </span>
                  <button type="button" className="grid h-9 w-9 place-items-center" onClick={useLocation} aria-label="Use current location">
                    <ChevronRight className="text-[#07142a]" size={22} />
                  </button>
                </div>
                <label className="flex w-full items-center gap-4 px-6 py-4">
                  <User className="shrink-0 text-black" size={25} fill="currentColor" />
                  <input
                    className="min-w-0 flex-1 bg-transparent text-[16px] font-medium outline-none"
                    placeholder="Your name"
                    value={orderForm.customerName}
                    onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })}
                    required
                  />
                  <ChevronRight className="text-[#07142a]" size={22} />
                </label>
              </div>
              <div className="flex items-center justify-between px-4 py-4 text-[16px]">
                <span>Delivery time</span>
                <span>15-30 min(s)</span>
              </div>
              <div className="px-6">
                <label className="text-[16px] leading-5 text-[#07142a]">Leave message for the restaurant (option)</label>
                <textarea
                  className="mt-2 h-28 w-full rounded-md border border-[#aeb6bd] bg-transparent px-3 py-2 text-sm outline-none"
                  placeholder="add notes to your order"
                  value={orderForm.deliveryNote}
                  onChange={(e) => setOrderForm({ ...orderForm, deliveryNote: e.target.value })}
                />
              </div>
              <div className="mt-6 flex items-center justify-between px-4">
                <h3 className="text-[16px]">Your items</h3>
                <button type="button" className="text-sm font-medium text-[#00a35b]" onClick={closeCheckout}>see menu</button>
              </div>
              <div className="mt-3 bg-white">
                {cart.map((item) => (
                  <CheckoutItem key={item.cartItemId} item={item} address={orderForm.deliveryAddress} onChangeQty={updateQty} onRemove={(id) => updateQty(id, -999)} />
                ))}
              </div>
              <div className="px-4 py-4">
                <button type="button" className="inline-flex h-9 items-center gap-2 rounded-full bg-[#e9e9e9] px-3 text-sm font-medium" onClick={closeCheckout}>
                  <Plus size={16} /> Add more items
                </button>
              </div>
              <PriceRows subtotal={subtotal} deliveryFee={deliveryFee} serviceFee={serviceFee} total={grandTotal} showService />
              <div className="mt-7 px-6">
                <input
                  className="mb-3 h-11 w-full rounded-md border border-[#aeb6bd] bg-transparent px-3 text-sm outline-none"
                  placeholder="Phone number"
                  value={orderForm.customerPhone}
                  onChange={(e) => setOrderForm({ ...orderForm, customerPhone: e.target.value })}
                  required
                />
                <input
                  className="mb-3 h-11 w-full rounded-md border border-[#aeb6bd] bg-transparent px-3 text-sm outline-none"
                  placeholder="Email optional"
                  type="email"
                  value={orderForm.customerEmail}
                  onChange={(e) => setOrderForm({ ...orderForm, customerEmail: e.target.value })}
                />
                <RedButton className="w-full rounded-md">Proceed to Check out</RedButton>
              </div>
            </form>
          ) : null}

          {checkoutStep === 'payment' ? (
            <form className="pb-8" onSubmit={submitOrder}>
              <PriceRows subtotal={subtotal} deliveryFee={deliveryFee} serviceFee={serviceFee} total={grandTotal} showService />
              <div className="mt-14 space-y-4 px-6">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      className={clsx('flex h-[68px] w-full items-center gap-4 rounded-xl border px-4 text-left', paymentMethod === method.id ? 'border-[#07142a]' : 'border-[#b9c0c8]')}
                      onClick={() => setPaymentMethod(method.id)}
                    >
                      <span className={clsx('grid h-9 w-11 place-items-center rounded-md text-xs font-black', method.iconClass)}>
                        <Icon size={20} />
                      </span>
                      <span className="min-w-0 flex-1 text-[16px]">{method.label}</span>
                      <ChevronRight className="rotate-90 text-[#07142a]" size={19} />
                    </button>
                  );
                })}
                <RedButton className="w-full rounded-md" disabled={submitting || !settings.publicOrdering || !cart.length}>{submitting ? 'Processing...' : 'Pay Now'}</RedButton>
              </div>
            </form>
          ) : null}

          {checkoutStep === 'success' ? (
            <div className="flex min-h-[calc(100vh-7rem)] items-start px-0 pt-16 sm:min-h-[600px]">
              <div className="w-full rounded-t-lg bg-white px-5 py-14 text-center">
                <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[#33c85a] text-white">
                  <Check size={52} />
                </div>
                <h2 className="mt-8 text-lg font-black text-[#33c85a]">Payment Was Successful!</h2>
                <div className="mt-6">
                  <p className="text-sm font-semibold text-[#5f646b]">Rate your order</p>
                  <div className="mt-3 flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        className="grid h-10 w-10 place-items-center rounded-full bg-[#fff1ca] text-[#f5a400] transition hover:bg-[#ffe2a0]"
                        onClick={() => toast.success(`Thanks for rating ${rating} star${rating === 1 ? '' : 's'}`)}
                        aria-label={`Rate ${rating} star${rating === 1 ? '' : 's'}`}
                      >
                        <Star size={22} fill="currentColor" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="my-9 border-t border-dashed border-[#c9cdd1]" />
                <RedButton className="w-3/4 rounded-md" onClick={goBackCheckout}>Back TO Home</RedButton>
              </div>
            </div>
          ) : null}
        </CheckoutShell>
      ) : null}

      <Modal title="Reserve a meal" open={reservationOpen} onClose={() => setReservationOpen(false)}>
        <form onSubmit={submitReservation}>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input focus:border-red-500 focus:ring-red-100" placeholder="Your name" value={reservation.customerName} onChange={(e) => setReservation({ ...reservation, customerName: e.target.value })} required />
            <input className="input focus:border-red-500 focus:ring-red-100" placeholder="Phone number" value={reservation.customerPhone} onChange={(e) => setReservation({ ...reservation, customerPhone: e.target.value })} required />
            <input className="input focus:border-red-500 focus:ring-red-100" placeholder="Email optional" type="email" value={reservation.customerEmail} onChange={(e) => setReservation({ ...reservation, customerEmail: e.target.value })} />
            <input className="input focus:border-red-500 focus:ring-red-100" type="number" min="1" value={reservation.partySize} onChange={(e) => setReservation({ ...reservation, partySize: e.target.value })} required />
            <input className="input focus:border-red-500 focus:ring-red-100" type="datetime-local" value={reservation.reservationAt} onChange={(e) => setReservation({ ...reservation, reservationAt: e.target.value })} required />
            <input className="input focus:border-red-500 focus:ring-red-100" placeholder="Meal preference optional" value={reservation.mealPreference} onChange={(e) => setReservation({ ...reservation, mealPreference: e.target.value })} />
            <textarea className="input h-20 py-3 focus:border-red-500 focus:ring-red-100 sm:col-span-2" placeholder="Reservation note optional" value={reservation.note} onChange={(e) => setReservation({ ...reservation, note: e.target.value })} />
          </div>
          <RedButton className="mt-4 w-full" disabled={submitting || !settings.reservations}>{submitting ? 'Submitting...' : 'Request reservation'}</RedButton>
        </form>
      </Modal>

      <Modal title="Promote on ChopASAP" open={promotionOpen} onClose={() => setPromotionOpen(false)}>
        <form onSubmit={submitPromotion}>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input focus:border-red-500 focus:ring-red-100" placeholder="Business name" value={promotionForm.businessName} onChange={(e) => setPromotionForm({ ...promotionForm, businessName: e.target.value })} required />
            <input className="input focus:border-red-500 focus:ring-red-100" placeholder="Contact name" value={promotionForm.contactName} onChange={(e) => setPromotionForm({ ...promotionForm, contactName: e.target.value })} required />
            <input className="input focus:border-red-500 focus:ring-red-100" placeholder="Phone number" value={promotionForm.contactPhone} onChange={(e) => setPromotionForm({ ...promotionForm, contactPhone: e.target.value })} required />
            <input className="input focus:border-red-500 focus:ring-red-100" type="email" placeholder="Email optional" value={promotionForm.contactEmail} onChange={(e) => setPromotionForm({ ...promotionForm, contactEmail: e.target.value })} />
            <input className="input focus:border-red-500 focus:ring-red-100 sm:col-span-2" placeholder="Promotion title" value={promotionForm.title} onChange={(e) => setPromotionForm({ ...promotionForm, title: e.target.value })} required />
            <textarea className="input h-24 py-3 focus:border-red-500 focus:ring-red-100 sm:col-span-2" placeholder="Tell us what you want to promote" value={promotionForm.description} onChange={(e) => setPromotionForm({ ...promotionForm, description: e.target.value })} required />
            <div className="sm:col-span-2">
              <label className="label">Promotion image</label>
              <div className="mt-1 grid gap-3 sm:grid-cols-[96px_1fr]">
                <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-xl border border-[#dbe5e8] bg-[#fff1ca]">
                  {promotionForm.imageUrl ? <img className="h-full w-full object-cover" src={promotionForm.imageUrl} alt="Promotion preview" /> : <ShoppingBag className="text-[#d71920]" size={24} />}
                </div>
                <label className="flex min-h-24 cursor-pointer flex-col justify-center rounded-xl border border-dashed border-[#dbe5e8] bg-white px-4 text-sm font-semibold text-[#6f7a86]">
                  <span className="font-black text-[#151923]">{promotionImageUploading ? 'Uploading...' : 'Upload image'}</span>
                  <span className="mt-1 text-xs">PNG, JPG, or WEBP up to 5MB.</span>
                  <input className="hidden" type="file" accept="image/*" disabled={promotionImageUploading} onChange={(e) => uploadPromotionImage(e.target.files?.[0])} />
                </label>
              </div>
            </div>
            <input className="input focus:border-red-500 focus:ring-red-100 sm:col-span-2" placeholder="Website or social link optional" value={promotionForm.ctaUrl} onChange={(e) => setPromotionForm({ ...promotionForm, ctaUrl: e.target.value })} />
          </div>
          <RedButton className="mt-4 w-full" disabled={submitting || promotionImageUploading}>{submitting ? 'Submitting...' : 'Submit request'}</RedButton>
        </form>
      </Modal>
    </div>
  );
}
