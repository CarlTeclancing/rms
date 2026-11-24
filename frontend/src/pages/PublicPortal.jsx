import { BuyerSkeleton } from '../components/BuyerSkeleton.jsx';
import { orderWhatsAppUrl, newOrderRequestId, orderStatusLabels, fcfa } from '../../../shared/orderExperience.js';
import tokens from '../../../shared/designTokens.json';
import '../buyer-design.css';
import {
  Bell,
  CalendarClock,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  Gift,
  Heart,
  Home,
  Info,
  Languages,
  MapPin,
  MessageCircle,
  Minus,
  Percent,
  Phone,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Smartphone,
  Trash2,
  Truck,
  Trophy,
  User,
  Volume2,
  X
} from 'lucide-react';
import clsx from 'clsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import BuyerAuth, { BuyerSplash } from '../components/BuyerAuth.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { Loading } from '../components/Loading.jsx';
import { apiBaseUrl, endpoints } from '../services/api.js';
const currency = fcfa;
import { useApi } from '../hooks/useApi.js';
import { useSettings } from '../context/SettingsContext.jsx';

const fallbackImage = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80';
const chopasapLogo = '/chopasap-logo.png';
const brandRed = tokens.colors.primary;
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const splashMessages = [
  'Fresh meals from restaurants near you.',
  'Fast delivery to your doorstep.',
  'Discover local favorites.',
  'Order in minutes.'
];
const splashLoadingMessages = [
  'Loading nearby restaurants...',
  "Preparing today's recommendations...",
  'Finding the fastest delivery routes...',
  'Checking available offers...',
  'Personalizing your experience...'
];
const defaultSplashProducts = [
  {
    name: 'Achu and Yellow Soup',
    imageUrl: 'https://res.cloudinary.com/dpzzy5erq/image/upload/v1784715469/restaurant-system/menu/mctj24atiwjqcnp2dtqh.jpg'
  },
  {
    name: 'Crispy Chicken',
    imageUrl: 'https://res.cloudinary.com/dpzzy5erq/image/upload/v1785500852/restaurant-system/menu/asughecgnf37zm4qryrb.jpg'
  },
  {
    name: 'Fried Chicken and Fries',
    imageUrl: 'https://res.cloudinary.com/dpzzy5erq/image/upload/v1785501135/restaurant-system/menu/dm5eqrmritukxx2pqusy.jpg'
  },
  {
    name: 'Fried Rice',
    imageUrl: 'https://res.cloudinary.com/dpzzy5erq/image/upload/v1784717286/restaurant-system/menu/kiy3vwg2ljhhvhtno2sf.jpg'
  },
  {
    name: 'Fufu Corn and Khati Khati',
    imageUrl: 'https://res.cloudinary.com/dpzzy5erq/image/upload/v1784716934/restaurant-system/menu/jtlesye5zt0rafyvivw6.jpg'
  },
  {
    name: 'Garri and Eru',
    imageUrl: 'https://res.cloudinary.com/dpzzy5erq/image/upload/v1784717535/restaurant-system/menu/jwf2opr0ekzpkwjlcpeg.jpg'
  },
  {
    name: 'Grilled Chicken and Fries',
    imageUrl: 'https://res.cloudinary.com/dpzzy5erq/image/upload/v1785501641/restaurant-system/menu/qwo4qemgzxc0kgaoo0cs.jpg'
  },
  {
    name: 'Rice and Tomato Stew',
    imageUrl: 'https://res.cloudinary.com/dpzzy5erq/image/upload/v1784718445/restaurant-system/menu/sr1ug42pkfw6bs9bqsnj.jpg'
  },
  {
    name: 'Roasted Fish and Plantain',
    imageUrl: 'https://res.cloudinary.com/dpzzy5erq/image/upload/v1785500945/restaurant-system/menu/ngfdzwbdnmajumeybx6a.jpg'
  }
];
const splashProductsStorageKey = 'chopasap_splash_products';
const tabs = [
  { id: 'home', label: { en: 'Home', fr: 'Accueil' }, icon: Home },
  { id: 'meals', label: { en: 'Meals', fr: 'Repas' }, icon: ShoppingBag },
  { id: 'cart', label: { en: 'Cart', fr: 'Panier' }, icon: ShoppingBag },
  { id: 'orders', label: { en: 'Orders', fr: 'Commandes' }, icon: ClipboardList },
  { id: 'profile', label: { en: 'Account', fr: 'Compte' }, icon: User }
];
const translations = {
  en: {
    chooseLanguage: 'Choose your language',
    chooseLanguageHint: 'You can change this later in your profile.',
    english: 'English',
    french: 'French',
    continue: 'Continue',
    welcome: 'Welcome to ChopASAP',
    enterDetails: 'Enter your details to continue.',
    name: 'Name',
    phone: 'Phone',
    addressOptional: 'Address optional',
    referralActive: 'Referral bonus active',
    checking: 'Checking...',
    enterNamePhone: 'Enter name and phone',
    profile: 'Profile',
    orderDetails: 'Order details',
    totalOrders: 'Orders',
    points: 'Points',
    referrals: 'Referrals',
    currentRank: 'Current rank',
    all: 'All',
    noOrdersForStatus: 'No orders match this status.',
    shareReferralLink: 'Share referral link',
    accountDetails: 'Account details',
    referralRewards: 'Referral rewards',
    inviteFriends: 'Invite friends and earn points',
    referralHelp: 'They get 10 welcome points after joining with your link. You also earn 10 points.',
    yourReferralLink: 'Your referral link',
    referralPending: 'Referral code will appear after your account is ready.',
    successfulReferral: 'successful referral',
    successfulReferrals: 'successful referrals',
    share: 'Share',
    language: 'Language',
    updateInfo: 'Update your basic information for faster checkout.',
    emailOptional: 'Email optional',
    defaultAddress: 'Default address',
    saveProfile: 'Save profile',
    saving: 'Saving...',
    uploading: 'Uploading...',
    changeCustomer: 'Change customer',
    search: 'Search ....'
  },
  fr: {
    chooseLanguage: 'Choisissez votre langue',
    chooseLanguageHint: 'Vous pourrez la modifier plus tard dans votre profil.',
    english: 'Anglais',
    french: 'Français',
    continue: 'Continuer',
    welcome: 'Bienvenue sur ChopASAP',
    enterDetails: 'Entrez vos informations pour continuer.',
    name: 'Nom',
    phone: 'Téléphone',
    addressOptional: 'Adresse facultative',
    referralActive: 'Bonus de parrainage actif',
    checking: 'Vérification...',
    enterNamePhone: 'Entrez nom et téléphone',
    profile: 'Profil',
    orderDetails: 'Détails de commande',
    totalOrders: 'Commandes',
    points: 'Points',
    referrals: 'Parrainages',
    currentRank: 'Rang actuel',
    all: 'Toutes',
    noOrdersForStatus: 'Aucune commande avec ce statut.',
    shareReferralLink: 'Partager le lien',
    accountDetails: 'Compte',
    referralRewards: 'Récompenses de parrainage',
    inviteFriends: 'Invitez vos proches et gagnez des points',
    referralHelp: 'Ils reçoivent 10 points de bienvenue après leur inscription. Vous gagnez aussi 10 points.',
    yourReferralLink: 'Votre lien de parrainage',
    referralPending: 'Le code apparaîtra quand votre compte sera prêt.',
    successfulReferral: 'parrainage réussi',
    successfulReferrals: 'parrainages réussis',
    share: 'Partager',
    language: 'Langue',
    updateInfo: 'Mettez à jour vos informations pour commander plus vite.',
    emailOptional: 'Email facultatif',
    defaultAddress: 'Adresse par défaut',
    saveProfile: 'Enregistrer',
    saving: 'Enregistrement...',
    uploading: 'Téléversement...',
    changeCustomer: 'Changer de client',
    search: 'Rechercher ....'
  }
};
const textFor = (value, language) => (typeof value === 'object' ? value[language] || value.en : value);
const tr = (language, key) => translations[language]?.[key] || translations.en[key] || key;
const validProductImage = (item) => item?.name && /^https?:\/\//i.test(String(item.imageUrl || ''));
const freshSplashProducts = (products = defaultSplashProducts, count = 3) => {
  const pool = (products.length ? products : defaultSplashProducts).filter(validProductImage);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return [...shuffled, ...defaultSplashProducts].filter(validProductImage).slice(0, count);
};
const menuSplashProducts = (items = []) => items.filter(validProductImage).map((item) => ({ name: item.name, imageUrl: item.imageUrl }));
const storedSplashProducts = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(splashProductsStorageKey) || '[]');
    return Array.isArray(parsed) && parsed.some(validProductImage) ? parsed : defaultSplashProducts;
  } catch {
    return defaultSplashProducts;
  }
};
const supportFaqs = [
  {
    question: 'How does ChopASAP ordering work?',
    answer: 'Choose your meals, confirm your order details, then send the prepared WhatsApp message to the restaurant so the team can process it quickly.'
  },
  {
    question: 'Do I pay inside the app?',
    answer: 'No. ChopASAP sends your order to the restaurant first. The restaurant confirms payment or reserve details with you directly.'
  },
  {
    question: 'Can I reserve a meal or table?',
    answer: 'Yes. Use the reservation action on this page and the restaurant team will confirm your request.'
  },
  {
    question: 'How do flash sale codes work?',
    answer: 'Copy the code shown in the app and present it at the restaurant when you visit onsite, subject to the offer terms.'
  }
];

const emptyOrderForm = {
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  deliveryAddress: '',
  deliveryNote: '',
  isGift: false,
  recipientName: '',
  recipientPhone: '',
  recipientAddress: '',
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

const activeOrdersStorageKey = 'chopasap_active_orders';
const customerStorageKey = 'chopasap_customer_session';
const favoritesStorageKey = 'chopasap_favorite_meals';
const languageStorageKey = 'chopasap_language';
const statusLabel = (status = 'PENDING') => status.replaceAll('_', ' ').toLowerCase();
const cartKeyFor = (menuItemId, variationName) => `${menuItemId}:${variationName || 'base'}`;
const mealVariations = (item) => (Array.isArray(item?.variations) ? item.variations.filter((variation) => variation?.name) : []);
const mealPrice = (item, variationName) => {
  const variation = mealVariations(item).find((entry) => entry.name === variationName);
  return Number(variation?.price ?? item?.price ?? 0);
};
const whatsappPhone = (phone = '') => {
  const digits = String(phone).replace(/\D/g, '');
  return digits.startsWith('00') ? digits.slice(2) : digits;
};
const orderItemName = (item) => item.menuItem?.name || item.name || 'Menu item';
const orderItemTotal = (item) => Number(item.total ?? Number(item.price || item.unitPrice || 0) * Number(item.quantity || 0));
const buildWhatsappOrderMessage = ({ order, customer, cartItems, total, deliveryFee }) => {
  const items = (order.items?.length ? order.items : cartItems).map(
    (item) => `- ${item.quantity} x ${orderItemName(item)}${item.variationName ? ` (${item.variationName})` : ''}: ${currency(orderItemTotal(item))}`
  );

  return [
    `New order ${order.orderNo}`,
    `Customer: ${customer.customerName}`,
    `Phone: ${customer.customerPhone}`,
    `Address: ${customer.deliveryAddress}`,
    customer.isGift ? `For: ${customer.recipientName} (${customer.recipientPhone})` : '',
    customer.isGift && customer.recipientAddress ? `Recipient address: ${customer.recipientAddress}` : '',
    customer.deliveryNote ? `Note: ${customer.deliveryNote}` : '',
    '',
    'Items:',
    ...items,
    '',
    `Delivery fee: ${currency(deliveryFee)}`,
    `Total: ${currency(order.total || total)}`
  ]
    .filter(Boolean)
    .join('\n');
};
const emptyCustomerForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  profileImageUrl: '',
  referralCode: ''
};

const rewardRank = (points = 0) => {
  const value = Number(points || 0);
  if (value >= 150) return { title: 'ChopASAP Royalty', next: 'Top customer tier unlocked' };
  if (value >= 50) return { title: 'Taste Champion', next: `${150 - value} points to ChopASAP Royalty` };
  return { title: 'Food Explorer', next: `${50 - value} points to Taste Champion` };
};

const customerFacingMarketingTypes = ['HOMEPAGE_BANNER', 'CAMPAIGN', 'FLASH_DEAL', 'FEATURED_RESTAURANT', 'ANNOUNCEMENT', 'COUPON'];
const deliveryStatusLabels = {
  PENDING: 'Order received',
  ACCEPTED: 'Restaurant accepted',
  PREPARING: 'Preparing',
  READY: 'Meal ready',
  DRIVER_ASSIGNED: 'Driver assigned',
  DRIVER_TO_RESTAURANT: 'Driver to restaurant',
  DRIVER_ARRIVED: 'Driver arrived',
  PICKED_UP: 'Picked up',
  OUT_FOR_DELIVERY: 'On the way',
  DRIVER_NEARBY: 'Driver nearby',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled'
};
const deliveryMilestones = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'DRIVER_ASSIGNED', 'DRIVER_TO_RESTAURANT', 'DRIVER_ARRIVED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DRIVER_NEARBY', 'DELIVERED'];

const fallbackPromotionSlide = {
  id: 'default-home-offer',
  businessName: 'ChopASAP',
  title: 'Fresh meals, offers, and rewards will appear here',
  description: 'Check back for active campaigns, flash deals, and featured restaurant offers.',
  ctaLabel: 'Explore meals',
  ctaUrl: '#menu'
};

const trackingMapUrl = (order = {}) => {
  if (!googleMapsApiKey || !order.driverLatitude || !order.driverLongitude || !order.latitude || !order.longitude) return '';
  const driver = `${order.driverLatitude},${order.driverLongitude}`;
  const customer = `${order.latitude},${order.longitude}`;
  return `https://maps.googleapis.com/maps/api/staticmap?size=960x420&scale=2&maptype=roadmap&markers=color:red%7Clabel:D%7C${driver}&markers=color:green%7Clabel:H%7C${customer}&path=color:0xd71920ff%7Cweight:5%7C${driver}%7C${customer}&key=${googleMapsApiKey}`;
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

function TabButton({ tab, active, onClick, desktop = false, language = 'en', badge = 0 }) {
  const Icon = tab.icon;
  return (
    <button
      className={clsx(
        desktop
          ? 'flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-extrabold transition'
          : 'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-xs font-black transition',
        active ? (desktop ? 'text-white shadow-lg' : 'text-[#E51924]') : 'text-[#42495a] hover:text-[#E51924]'
      )}
      style={active && desktop ? { backgroundColor: brandRed, boxShadow: '0 14px 28px rgba(215, 25, 32, 0.16)' } : undefined}
      onClick={onClick}
    >
      <span className="relative">
        <Icon size={desktop ? 20 : 21} fill={tab.id === 'favorites' && active ? 'currentColor' : 'none'} />
        {badge ? (
          <span className="absolute -right-2 -top-2 grid h-4 min-w-4 animate-pulse place-items-center rounded-full bg-[#E51924] px-1 text-[10px] font-black leading-none text-white ring-2 ring-white">
            {badge}
          </span>
        ) : null}
      </span>
      {textFor(tab.label, language)}
    </button>
  );
}

function PromotionBanner({ promotion, slides, activeIndex, onPrevious, onNext, onSelect, onAction }) {
  if (!promotion || !slides.length) return null;
  const hasMultiple = slides.length > 1;
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5" aria-label="Promotions">
      <div className="relative min-h-[146px] bg-[#fff4d7] sm:min-h-[180px]">
        <div className="grid min-h-[146px] grid-cols-[1.15fr_0.85fr] sm:min-h-[180px]">
          <div className="flex flex-col justify-center p-4 sm:p-6">
            <p className="text-[11px] font-black uppercase tracking-wide text-[#8b5f00]">
              {promotion?.businessName || 'Featured campaign'}
            </p>
            <h2 className="mt-1 line-clamp-2 text-xl font-black leading-6 text-[#171B25] sm:text-3xl sm:leading-9">{promotion?.title}</h2>
            <p className="mt-2 max-w-xl text-xs font-semibold leading-5 text-[#6c6250] sm:text-sm">{promotion?.description}</p>
            <button
              className="mt-4 inline-flex h-9 w-fit items-center gap-2 rounded-full bg-[#171B25] px-4 text-xs font-black text-white shadow-sm"
              onClick={() => onAction(promotion)}
            >
              {promotion?.ctaLabel || 'View offer'} <ChevronRight size={15} />
            </button>
          </div>
          <div className="relative overflow-hidden bg-[#ffe6a3]">
            {promotion?.imageUrl ? (
              <img className="h-full min-h-[146px] w-full object-cover sm:min-h-[180px]" src={promotion.imageUrl} alt={promotion.title} />
            ) : (
              <div className="grid h-full min-h-[146px] place-items-center sm:min-h-[180px]">
                <div className="grid h-20 w-20 place-items-center rounded-2xl bg-white/80 text-[#E51924] shadow-sm">
                  <ShoppingBag size={42} />
                </div>
              </div>
            )}
          </div>
        </div>

        {hasMultiple ? (
          <>
            <button className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-[#171B25] shadow-sm" onClick={onPrevious} aria-label="Previous promotion">
              <ChevronLeft size={18} />
            </button>
            <button className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-[#171B25] shadow-sm" onClick={onNext} aria-label="Next promotion">
              <ChevronRight size={18} />
            </button>
          </>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex gap-1.5" aria-label="Promotion slides">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              className={clsx('h-2 rounded-full transition-all', index === activeIndex ? 'w-6 bg-[#E51924]' : 'w-2 bg-[#d8dee2]')}
              onClick={() => onSelect(index)}
              aria-label={`Show promotion ${index + 1}`}
              aria-current={index === activeIndex}
            />
          ))}
        </div>
        <p className="text-xs font-black uppercase tracking-wide text-[#E51924]">{hasMultiple ? `${activeIndex + 1}/${slides.length}` : 'Featured'}</p>
      </div>
    </section>
  );
}

function LanguagePrompt({ open, language, onChoose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-[#171B25]/65 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white p-5 text-center shadow-2xl">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#fff1ca] text-[#E51924]">
          <Languages size={28} />
        </span>
        <h2 className="mt-4 text-2xl font-black text-[#171B25]">{tr(language, 'chooseLanguage')}</h2>
        <p className="mt-2 text-sm font-semibold text-stone-500">{tr(language, 'chooseLanguageHint')}</p>
        <div className="mt-6 grid gap-3">
          {[
            { id: 'en', label: 'English' },
            { id: 'fr', label: 'Français' }
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              className={clsx('flex h-12 items-center justify-center rounded-2xl border text-sm font-black transition', language === option.id ? 'border-[#E51924] bg-[#E51924] text-white' : 'border-[#E5E7EB] bg-[#F8F9FB] text-[#171B25]')}
              onClick={() => onChoose(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
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
          <p className="text-sm font-black text-[#171B25]">Add ChopASAP to your phone</p>
          <p className="mt-0.5 text-xs font-semibold text-[#717680]">{canInstall ? 'Install the app for faster meal ordering.' : 'Use your browser menu to add ChopASAP to your home screen.'}</p>
        </div>
        <button className="grid h-8 w-8 place-items-center rounded-full bg-stone-100 text-[#171B25]" onClick={onDismiss} aria-label="Dismiss install prompt">
          <X size={16} />
        </button>
      </div>
      {canInstall ? (
        <button className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#E51924] text-sm font-black text-white" onClick={onInstall}>
          <Smartphone size={17} /> Add app
        </button>
      ) : null}
    </div>
  );
}

function CheckoutShell({ title, onBack, children }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F8F9FB] text-[#07142a] sm:grid sm:place-items-center sm:bg-black/45 sm:p-4">
      <div className="min-h-screen w-full bg-[#F8F9FB] sm:min-h-0 sm:max-h-[92vh] sm:max-w-[390px] sm:overflow-y-auto sm:rounded-[1.7rem]">
        <header className="relative z-10 flex h-28 items-center justify-center bg-[#F8F9FB] px-6">
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

function CheckoutItem({ item, onChangeQty, onRemove }) {
  return <article className="cart-item">
    <img src={item.imageUrl || fallbackImage} alt={item.name} loading="lazy" />
    <div className="cart-item-copy"><h3>{item.name}</h3>{item.variationName && <p>{item.variationName}</p>}{item.note && <p>Instructions: {item.note}</p>}<p>{fcfa(item.price)} each</p><strong>{fcfa(item.price * item.quantity)}</strong></div>
    <div className="cart-item-controls"><button type="button" onClick={() => onRemove(item.cartItemId)} aria-label={`Remove ${item.name}`}><Trash2 size={18} /></button><div><button type="button" aria-label="Decrease quantity" onClick={() => item.quantity === 1 ? onRemove(item.cartItemId) : onChangeQty(item.cartItemId, -1)}><Minus size={18} /></button><span>{item.quantity}</span><button type="button" aria-label="Increase quantity" disabled={item.quantity >= 99} onClick={() => onChangeQty(item.cartItemId, 1)}><Plus size={18} /></button></div></div>
  </article>;
}

function PriceRows({ subtotal, deliveryFee, serviceFee = 0, total, showService = false }) {
  return (
    <div className="space-y-3 px-6 text-[16px]">
      <div className="flex items-center justify-between">
        <span className="text-[#717680]">Subtotal</span>
        <span className="font-medium">{currency(subtotal)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[#717680]">Promotion</span>
        <span className="font-medium text-[#00a35b]">-{currency(0)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[#717680]">Delivery fee <Info size={16} className="rounded-full bg-[#a6abb0] text-white" /></span>
        <span className="font-medium">{currency(deliveryFee)}</span>
      </div>
      {showService ? (
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[#717680]">Taxes & Other fees <Info size={16} className="rounded-full bg-[#a6abb0] text-white" /></span>
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

function MealCard({ item, favorite, onFavorite, onOpen, onAdd }) {
  return <article className="buyer-meal-card">
    <div className="buyer-meal-image">
      <button onClick={() => onOpen(item)} aria-label={`View ${item.name}`}><img src={item.imageUrl || fallbackImage} alt={item.name} loading="lazy" /></button>
      <button className="favorite" onClick={() => onFavorite(item.id)} aria-label={favorite ? 'Remove from favourites' : 'Save favourite'} aria-pressed={favorite}><Heart size={20} fill={favorite ? 'currentColor' : 'none'} /></button>
    </div>
    <div className="buyer-meal-body"><button className="text-left" onClick={() => onOpen(item)}><h3>{item.name}</h3></button><p>{item.category?.name}</p>
      {Number(item.averageRating) > 0 && <p>? {Number(item.averageRating).toFixed(1)} ? {item.reviewCount || item._count?.reviews || ''} reviews</p>}
      {item.isAvailable === false && <p>Currently unavailable</p>}
      <div className="buyer-meal-footer"><strong>{fcfa(item.price)}</strong><button disabled={item.isAvailable === false} onClick={() => mealVariations(item).length ? onOpen(item) : onAdd(item)} aria-label={`Add ${item.name} to cart`}><Plus size={20} /></button></div>
    </div>
  </article>;
}

function FlashSalePopup({ code, open, onClose, onUse }) {
  if (!open || !code) return null;
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code.code);
      toast.success('Code copied');
    } catch {
      toast.success(`Use code ${code.code}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/45 px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="relative bg-[#E51924] px-5 pb-6 pt-5 text-white">
          <button className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/15" onClick={onClose} aria-label="Close flash sale">
            <X size={17} />
          </button>
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-[#E51924]">
            <Percent size={30} />
          </div>
          <p className="mt-4 text-xs font-black uppercase tracking-wide text-white/80">Flash sale</p>
          <h2 className="mt-1 text-2xl font-black leading-7">{code.title}</h2>
          <p className="mt-2 text-sm font-semibold text-white/85">{code.description || `Get ${code.discountPercent}% off when you redeem onsite.`}</p>
        </div>
        <div className="p-5">
          <div className="rounded-xl border border-dashed border-[#E51924] bg-[#fff4d7] px-4 py-3 text-center">
            <p className="text-xs font-black uppercase text-[#8b5f00]">Redeem code</p>
            <p className="mt-1 text-2xl font-black tracking-[0.18em] text-[#171B25]">{code.code}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#fff1ca] text-sm font-black text-[#E51924]" onClick={copyCode}>
              <Copy size={16} /> Copy
            </button>
            <button className="flex h-11 items-center justify-center rounded-xl bg-[#E51924] text-sm font-black text-white" onClick={onUse}>
              Order now
            </button>
          </div>
          <p className="mt-3 text-center text-xs font-semibold text-stone-500">Show this code at the restaurant when you visit onsite.</p>
        </div>
      </div>
    </div>
  );
}

function NotificationPanel({ open, notifications, soundEnabled, permission, onClose, onEnable, onToggleSound }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[75] bg-black/35 px-4 py-5 sm:grid sm:place-items-start sm:justify-items-end sm:p-6">
      <div className="ml-auto w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-[#171B25] p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-white/60">ChopASAP alerts</p>
              <h2 className="mt-1 text-xl font-black">Notifications</h2>
            </div>
            <button className="grid h-9 w-9 place-items-center rounded-full bg-white/10" onClick={onClose} aria-label="Close notifications">
              <X size={17} />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="flex h-10 items-center justify-center gap-2 rounded-xl bg-white text-xs font-black text-[#171B25]" onClick={onEnable}>
              <Bell size={15} /> {permission === 'granted' ? 'Enabled' : 'Enable'}
            </button>
            <button className="flex h-10 items-center justify-center gap-2 rounded-xl bg-white/10 text-xs font-black text-white" onClick={onToggleSound}>
              <Volume2 size={15} /> {soundEnabled ? 'Sound on' : 'Sound off'}
            </button>
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-3">
          {notifications.length ? notifications.map((item) => (
            <div key={item.id} className="mb-2 rounded-2xl border border-[#edf0f2] bg-[#F8F9FB] p-4 last:mb-0">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#fff1ca] text-[#E51924]">
                  <Bell size={17} />
                </span>
                <div className="min-w-0">
                  <p className="font-black text-[#171B25]">{item.title}</p>
                  <p className="mt-1 text-sm font-semibold leading-5 text-stone-600">{item.body}</p>
                  <p className="mt-2 text-xs font-semibold text-stone-400">{item.time || 'Just now'}</p>
                </div>
              </div>
            </div>
          )) : (
            <p className="rounded-2xl bg-[#F8F9FB] p-5 text-center text-sm font-semibold text-stone-500">No notifications yet.</p>
          )}
          </div>
      </div>
    </div>
  );
}

function RewardPanel({ open, rewards, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] bg-[#171B25]/45 px-4 py-6 backdrop-blur-sm">
      <div className="ml-auto flex h-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#edf0f2] p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#E51924]">Rewards</p>
            <h2 className="text-xl font-black">Growth hub</h2>
          </div>
          <button className="grid h-9 w-9 place-items-center rounded-full bg-[#F8F9FB]" onClick={onClose} aria-label="Close rewards">
            <X size={20} />
          </button>
        </div>
        <div className="grid gap-3 overflow-y-auto p-4">
          {rewards.length ? rewards.map((item) => (
            <article key={item.id} className="rounded-2xl bg-[#fff8e8] p-4">
              <p className="text-sm font-black text-[#171B25]">{item.title}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-stone-600">{item.description || 'Open this reward before it expires.'}</p>
              {item.ctaLabel ? <p className="mt-3 text-xs font-black text-[#E51924]">{item.ctaLabel}</p> : null}
            </article>
          )) : <p className="rounded-2xl bg-[#F8F9FB] p-5 text-sm font-semibold text-stone-500">No rewards are active right now.</p>}
        </div>
      </div>
    </div>
  );
}

function OrderReviewItem({ item, order }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const menuItemId = item.menuItemId || item.menuItem?.id;

  const submitReview = async () => {
    if (!menuItemId) return toast.error('This meal cannot be reviewed from this order');
    try {
      setSaving(true);
      await endpoints.createPublicMealReview(menuItemId, {
        customerName: order.customerName || 'Customer',
        customerPhone: order.customerPhone || '',
        rating,
        comment
      });
      setSubmitted(true);
      setComment('');
      toast.success('Review submitted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit review');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-[#ffd5d7] bg-white p-3">
      <p className="text-xs font-black uppercase text-[#8a6d2a]">Rate this meal</p>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            className={clsx('grid h-8 w-8 place-items-center rounded-full', value <= rating ? 'bg-[#E51924] text-white' : 'bg-[#fff8e8] text-[#c6a54b]')}
            disabled={submitted}
            onClick={() => setRating(value)}
            aria-label={`Rate ${value} stars`}
          >
            <Star size={15} fill="currentColor" />
          </button>
        ))}
      </div>
      <textarea
        className="mt-3 min-h-[70px] w-full rounded-2xl border border-[#ead9ae] bg-[#f8fbfc] px-3 py-2 text-sm font-semibold outline-none focus:border-[#E51924] disabled:opacity-60"
        value={comment}
        disabled={submitted}
        onChange={(event) => setComment(event.target.value)}
        placeholder={submitted ? 'Review submitted' : 'Share what you liked about this meal'}
      />
      <button
        type="button"
        className="mt-3 rounded-xl bg-[#171B25] px-4 py-2 text-xs font-black text-white disabled:opacity-50"
        disabled={saving || submitted}
        onClick={submitReview}
      >
        {submitted ? 'Reviewed' : saving ? 'Saving...' : 'Submit review'}
      </button>
    </div>
  );
}

function OrderTrackingPanel({ order }) {
  const events = order.trackingEvents || [];
  const status = order.status || 'PENDING';
  const statusIndex = Math.max(0, deliveryMilestones.indexOf(status));
  const progress = status === 'CANCELLED' ? 0 : Math.min(100, ((statusIndex + 1) / deliveryMilestones.length) * 100);
  const mapUrl = trackingMapUrl(order);
  return (
    <section className="mt-5 rounded-3xl border border-[#e2edf0] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-[#E51924]">Live tracking</p>
          <h3 className="mt-1 text-xl font-black text-[#171B25]">{deliveryStatusLabels[status] || status.replaceAll('_', ' ')}</h3>
        </div>
        <div className="rounded-full bg-[#fff4f4] px-3 py-1 text-xs font-black text-[#E51924]">
          {order.etaMinutes ? `${order.etaMinutes} min ETA` : 'ETA updating'}
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        {mapUrl ? (
          <img className="h-52 w-full rounded-2xl object-cover" src={mapUrl} alt="Live delivery route" />
        ) : (
          <div className="grid h-52 place-items-center rounded-2xl bg-[#F8F9FB] p-6 text-center text-sm text-stone-500">Live location is not available for this order. Status updates appear below.</div>
        )}
        <div className="grid content-start gap-3">
          <div className="grid grid-cols-3 gap-2">
            <p className="rounded-2xl bg-[#F8F9FB] p-3 text-center text-xs font-black text-stone-600">{order.distanceKm ? `${Number(order.distanceKm).toFixed(1)} km` : 'Distance'}</p>
            <p className="rounded-2xl bg-[#F8F9FB] p-3 text-center text-xs font-black text-stone-600">{order.driverSpeedKph ? `${Number(order.driverSpeedKph).toFixed(0)} km/h` : 'Speed'}</p>
            <p className="rounded-2xl bg-[#F8F9FB] p-3 text-center text-xs font-black text-stone-600">{order.trackingUpdatedAt ? new Date(order.trackingUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Waiting'}</p>
          </div>
          <div className="rounded-2xl bg-[#fff8e8] p-3">
            <p className="text-sm font-black text-[#171B25]">{order.driverName || 'Driver not assigned yet'}</p>
            <p className="mt-1 text-xs font-semibold text-stone-600">{order.vehicleInfo || 'Vehicle details will appear here'}</p>
            {order.driverPhone ? <p className="mt-1 text-xs font-black text-[#E51924]">{order.driverPhone}</p> : null}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#edf0f2]">
            <div className="h-full rounded-full bg-[#E51924]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        {(events.length ? events : [{ status, title: deliveryStatusLabels[status], createdAt: order.createdAt }]).map((event, index) => (
          <div key={event.id || `${event.status}-${index}`} className="flex gap-3">
            <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#E51924]" />
            <div>
              <p className="text-sm font-black text-[#171B25]">{event.title || deliveryStatusLabels[event.status] || event.status?.replaceAll('_', ' ')}</p>
              <p className="text-xs font-semibold text-stone-500">{event.createdAt ? new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}</p>
              {event.message ? <p className="mt-1 text-xs font-semibold text-stone-600">{event.message}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function OrderDetailView({ order, onBack }) {
  if (!order) return null;
  return (
    <div className="rounded-3xl bg-white p-5 shadow-md">
      <button className="mb-4 inline-flex items-center gap-2 text-sm font-black text-[#E51924]" onClick={onBack}>
        <ChevronLeft size={17} /> Back to orders
      </button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-stone-500">Order</p>
          <h2 className="mt-1 text-2xl font-black">{order.orderNo}</h2>
          <p className="mt-1 text-sm font-semibold text-stone-500">{order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Recent order'}</p>
        </div>
        <span className="rounded-full bg-[#e7f8ef] px-3 py-1 text-xs font-black text-[#19b567]">{orderStatusLabels[order.status] || order.status}</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-[#F8F9FB] p-4">
          <p className="text-xs font-black uppercase text-stone-500">Customer</p>
          <p className="mt-2 font-black">{order.customerName || 'Customer'}</p>
          <p className="mt-1 text-sm font-semibold text-stone-600">{order.customerPhone}</p>
        </div>
        <div className="rounded-2xl bg-[#F8F9FB] p-4">
          <p className="text-xs font-black uppercase text-stone-500">Address</p>
          <p className="mt-2 text-sm font-semibold text-stone-700">{order.deliveryAddress || 'Not provided'}</p>
        </div>
        {order.isGift ? (
          <div className="rounded-2xl bg-[#fff4d7] p-4 sm:col-span-2">
            <p className="text-xs font-black uppercase text-[#8b5f00]">Meal for a loved one</p>
            <p className="mt-2 font-black">{order.recipientName || 'Recipient'}</p>
            <p className="mt-1 text-sm font-semibold text-stone-600">{order.recipientPhone || 'No phone provided'}</p>
            {order.recipientAddress ? <p className="mt-1 text-sm font-semibold text-stone-600">{order.recipientAddress}</p> : null}
          </div>
        ) : null}
      </div>
      <OrderTrackingPanel order={order} />
      <div className="mt-5">
        <h3 className="font-black">Items</h3>
        <div className="mt-3 grid gap-2">
          {(order.items || []).map((item) => (
            <div key={item.id || `${item.menuItemId}:${item.variationName || 'base'}`} className="rounded-2xl bg-[#fff4d7] p-3">
              <div className="flex items-center justify-between gap-3">
                <img className="h-14 w-14 shrink-0 rounded-2xl object-cover" src={item.menuItem?.imageUrl || item.imageUrl || fallbackImage} alt={item.menuItem?.name || item.name || 'Menu item'} />
                <div className="min-w-0 flex-1">
                  <p className="font-black">{item.quantity} x {item.menuItem?.name || item.name || 'Menu item'}</p>
                  {item.variationName ? <p className="mt-0.5 text-xs font-semibold text-stone-600">{item.variationName}</p> : null}
                </div>
                <p className="shrink-0 font-black text-[#E51924]">{currency(orderItemTotal(item))}</p>
              </div>
              <OrderReviewItem item={item} order={order} />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 rounded-2xl bg-[#171B25] p-4 text-white">
        <div className="flex items-center justify-between text-sm font-semibold text-white/70">
          <span>Subtotal</span>
          <span>{currency(order.subtotal || 0)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm font-semibold text-white/70">
          <span>Delivery</span>
          <span>{currency(order.deliveryFee || 0)}</span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-3 text-lg font-black">
          <span>Total</span>
          <span>{currency(order.total || 0)}</span>
        </div>
      </div>
    </div>
  );
}

function MealDetail({
  item,
  quantity,
  selectedVariation,
  reviews = [],
  showAllReviews,
  onVariationChange,
  onQuantityChange,
  onClose,
  onAdd,
  onShare,
  onToggleReviews, favorite, onFavorite, note, onNoteChange, relatedItems = [], onOpenRelated
}) {
  if (!item) return null;
  const variations = mealVariations(item);
  const price = mealPrice(item, selectedVariation);
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 2);
  const averageRating = reviews.length ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1) : item.averageRating;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F8F9FB] text-[#111827] sm:grid sm:place-items-center sm:bg-black/45 sm:p-4">
      <div className="min-h-screen w-full bg-white sm:min-h-0 sm:max-h-[92vh] sm:max-w-[390px] sm:overflow-y-auto sm:rounded-[1.7rem]">
        <div className="h-24 bg-[#F8F9FB]" />
        <div className="relative">
          <img className="h-[245px] w-full rounded-t-[1.6rem] object-cover" src={item.imageUrl || fallbackImage} alt={item.name} />
          <button className="absolute left-5 top-4 grid h-9 w-9 place-items-center rounded-md bg-white text-[#07142a] shadow-sm" onClick={() => onShare(item)} aria-label="Share meal">
            <Share2 size={20} />
          </button>
          <button className="absolute right-5 top-4 grid h-9 w-9 place-items-center rounded-md bg-white text-[#07142a] shadow-sm" onClick={onClose} aria-label="Close meal details">
            <X size={22} />
          </button>
        </div>
        <div className="px-6 pb-28 pt-3">
          <div className="flex justify-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-[#E51924]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffc15b]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffc15b]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffc15b]" />
          </div>
          <div className="mt-2 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-lg font-black tracking-normal">{item.name}</h1>
              <p className="text-xs text-[#717680]">{item.isAvailable === false ? 'Currently unavailable' : 'Available to order'}</p>
            </div>
            <div className="shrink-0 pt-4 text-right">
              <p className="text-base font-black text-[#777]">{currency(price)}</p>
              {averageRating ? (
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                  <Star size={13} fill="currentColor" /> {averageRating}
                </p>
              ) : null}
            </div>
          </div>
          <p className="mt-4 text-[13px] font-medium leading-5 text-[#717680]">
            {item.description || 'Freshly prepared ChopASAP meal made with quality ingredients and served hot for reserve or delivery.'}
          </p>

          {variations.length ? (
            <section className="mt-7">
              <h2 className="font-medium">Extras and variations</h2>
              <p className="mt-1 text-xs font-semibold text-[#7a7f86]">Optional add-ons. Leave blank to order the standard meal.</p>
              <div className="mt-3 grid gap-2">
                {variations.map((variation) => (
                  <label
                    key={variation.name}
                    className={clsx(
                      'flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm transition',
                      selectedVariation === variation.name ? 'border-[#E51924] bg-[#fff4f4] text-[#171B25]' : 'border-[#e7edf0] bg-[#f8fbfc] text-[#717680]'
                    )}
                  >
                    <span className="font-bold">{variation.name}</span>
                    <span className="flex items-center gap-2 font-black text-[#E51924]">
                      {currency(Number(variation.price ?? item.price ?? 0))}
                    </span>
                    <input
                      className="h-4 w-4 accent-[#E51924]"
                      type="radio"
                      name={`meal-variation-${item.id}`}
                      checked={selectedVariation === variation.name}
                      onChange={() => onVariationChange(variation.name)}
                    />
                  </label>
                ))}
              </div>
            </section>
          ) : null}

          <button className="btn-secondary mt-4" onClick={() => onFavorite(item.id)} aria-pressed={favorite}><Heart size={18} />{favorite ? 'Saved to favourites' : 'Save to favourites'}</button>
          <label className="mt-5 block text-sm font-medium">Special preparation instructions<textarea className="input mt-2 h-24 w-full" maxLength={500} placeholder="Less pepper, no onions?" value={note} onChange={event => onNoteChange(event.target.value)} /></label>
          {relatedItems.length > 0 && <section className="mt-5"><h2>Related meals</h2><div className="buyer-categories">{relatedItems.map(meal => <button key={meal.id} onClick={() => onOpenRelated(meal)}>{meal.name} ? {fcfa(meal.price)}</button>)}</div></section>}
          <section className="mt-7 rounded-2xl bg-[#fff8e8] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-medium">Meal reviews</h2>
                <p className="mt-1 text-xs font-semibold text-[#717680]">
                  {reviews.length ? `${reviews.length} customer review${reviews.length === 1 ? '' : 's'}` : 'No reviews yet'}
                </p>
              </div>
              {reviews.length > 2 ? (
                <button className="text-xs font-black text-[#E51924]" type="button" onClick={onToggleReviews}>
                  {showAllReviews ? 'Show less' : 'See all reviews'}
                </button>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3">
              {visibleReviews.length ? visibleReviews.map((review) => (
                <div key={review.id} className="rounded-2xl bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-[#171B25]">{review.customerName}</p>
                    <span className="inline-flex items-center gap-1 text-xs font-black text-amber-600">
                      <Star size={13} fill="currentColor" /> {review.rating}
                    </span>
                  </div>
                  {review.comment ? <p className="mt-2 text-xs font-semibold leading-5 text-[#717680]">{review.comment}</p> : null}
                </div>
              )) : (
                <p className="rounded-2xl bg-white p-3 text-xs font-semibold text-[#717680]">No reviews yet. You can review ordered meals from your Orders page.</p>
              )}
            </div>
          </section>

          <section className="mt-7">
            <h2 className="font-medium">Seller information</h2>
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#f8fbfc] p-3 ring-1 ring-[#e7edf0]">
              <img className="h-12 w-12 rounded-full object-cover" src={chopasapLogo} alt="ChopASAP" />
              <div className="min-w-0 flex-1">
                <p className="font-black">ChopASAP</p>
                <p className="text-xs text-[#717680]">Restaurant kitchen</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-[#16894d]">Open Now</span>
              <ChevronRight size={24} />
            </div>
          </section>
        </div>
        <div className="fixed bottom-0 left-0 right-0 z-10 bg-white px-6 py-5 sm:absolute sm:left-auto sm:right-auto sm:w-full sm:max-w-[390px]">
          <div className="grid grid-cols-[72px_1fr] gap-3">
            <div className="flex h-10 items-center justify-between rounded-md border border-[#E51924] px-3 text-sm">
              <button type="button" onClick={() => onQuantityChange(-1)} aria-label="Decrease quantity"><Minus size={16} /></button>
              <span>{quantity}</span>
              <button type="button" onClick={() => onQuantityChange(1)} aria-label="Increase quantity"><Plus size={16} /></button>
            </div>
            <RedButton className="w-full rounded-md" disabled={item.isAvailable === false} onClick={() => onAdd(item, quantity, selectedVariation)}>
              Add To Cart {currency(price * quantity)}
            </RedButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function BottomNav({ activeTab, setActiveTab, language = 'en', activeOrderCount = 0, cartCount = 0 }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 grid h-[72px] grid-cols-5 border-t border-[#dde7ea] bg-white px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_25px_rgba(40,50,60,0.08)] md:hidden">
      {tabs.map((tab) => (
        <TabButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} language={language} badge={tab.id === 'cart' ? cartCount : tab.id === 'orders' ? activeOrderCount : 0} />
      ))}
    </nav>
  );
}

export default function PublicPortal() {
  const { data, loading, error, refetch } = useApi(() => endpoints.publicMenu(), []);
  const promotions = useApi(() => endpoints.publicPromotions(), []);
  const marketing = useApi(() => endpoints.publicMarketing(), []);
  const flashSale = useApi(() => endpoints.publicFlashSale(), []);
  const { settings } = useSettings();
  const [language, setLanguage] = useState(() => localStorage.getItem(languageStorageKey) || 'en');
  const [languagePromptOpen, setLanguagePromptOpen] = useState(() => !localStorage.getItem(languageStorageKey));
  const [activeTab, setActiveTab] = useState('home');
  const [confirmedOrder, setConfirmedOrder] = useState(() => { try { return JSON.parse(sessionStorage.getItem('chopasap_confirmed_order') || 'null'); } catch { return null; } });
  const orderSubmittingRef = useRef(false);
  const orderAttemptRef = useRef(null);
  const [customer, setCustomer] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(customerStorageKey) || 'null');
    } catch {
      return null;
    }
  });
  const [customerForm, setCustomerForm] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(customerStorageKey) || 'null');
      const referralCode = new URLSearchParams(window.location.search).get('ref') || '';
      return stored ? { ...emptyCustomerForm, ...stored } : { ...emptyCustomerForm, referralCode };
    } catch {
      return emptyCustomerForm;
    }
  });
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(favoritesStorageKey) || '[]');
    } catch {
      return [];
    }
  });
  const [cart, setCart] = useState([]);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [mealNote, setMealNote] = useState('');
  const [recentMealIds, setRecentMealIds] = useState(() => { try { return JSON.parse(localStorage.getItem('chopasap_recent_meals') || '[]'); } catch { return []; } });
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState('');
  const [mealReviews, setMealReviews] = useState([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [activeOrders, setActiveOrders] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(activeOrdersStorageKey) || '[]');
    } catch {
      return [];
    }
  });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Meals');
  const [orderOpen, setOrderOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('cart');
  const [fulfillment, setFulfillment] = useState('delivery');
  const [reservationOpen, setReservationOpen] = useState(false);
  const [promotionOpen, setPromotionOpen] = useState(false);
  const [orderForm, setOrderForm] = useState(emptyOrderForm);
  const [reservation, setReservation] = useState(emptyReservationForm);
  const [promotionForm, setPromotionForm] = useState(emptyPromotionForm);
  const [submitting, setSubmitting] = useState(false);
  const [promotionImageUploading, setPromotionImageUploading] = useState(false);
  const [promotionUploadProgress, setPromotionUploadProgress] = useState(0);
  const [promotionUploadStatus, setPromotionUploadStatus] = useState('');
  const [customerSaving, setCustomerSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [flashSaleOpen, setFlashSaleOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [rewardPanelOpen, setRewardPanelOpen] = useState(false);
  const [profileTab, setProfileTab] = useState('referral');
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('chopasap_sound_enabled') !== 'false');
  const [notificationPermission, setNotificationPermission] = useState(() => ('Notification' in window ? Notification.permission : 'unavailable'));
  const [notifications, setNotifications] = useState([
    { id: 'welcome', title: 'Welcome', body: 'Fresh meals are ready for delivery.', time: 'Now' }
  ]);
  const activeOrdersRef = useRef(activeOrders);
  const checkoutPromptTimerRef = useRef(null);
  const socketRef = useRef(null);

  const items = data?.items || [];
  const categories = [...new Set(items.map((item) => item.category?.name).filter(Boolean))];
  const filteredItems = items.filter((item) => (categoryFilter === 'All Meals' || item.category?.name === categoryFilter) && `${item.name} ${item.category?.name || ''}`.toLowerCase().includes(search.toLowerCase()));
  const favoriteItems = items.filter((item) => favorites.includes(item.id));
  const marketingBannerSource = [
    ...(marketing.data?.banners || []),
    ...(marketing.data?.hero ? [marketing.data.hero] : []),
    ...(marketing.data?.items || []).filter((item) => customerFacingMarketingTypes.includes(item.type))
  ].filter((item, index, source) => item?.id && source.findIndex((entry) => entry?.id === item.id) === index);
  const marketingSlides = marketingBannerSource.map((item) => ({
    ...item,
    id: `marketing-${item.id}`,
    businessName: item.type?.replaceAll('_', ' ') || 'Featured campaign',
    ctaLabel: item.ctaLabel || (item.type === 'FLASH_DEAL' ? 'View deal' : 'Order now'),
    ctaUrl: item.deepLink
  }));
  const promotionSlides = [
    ...marketingSlides,
    ...(promotions.data?.items || [])
  ];
  const visiblePromotionSlides = promotionSlides;
  const [promotionIndex, setPromotionIndex] = useState(0);
  const featuredPromotion = visiblePromotionSlides[promotionIndex] || visiblePromotionSlides[0];
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const deliveryFee = fulfillment === 'delivery' ? Number(settings.deliveryFee || 0) : 0;
  const serviceFee = 0;
  const grandTotal = subtotal + deliveryFee + serviceFee;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const activeOrderCount = activeOrders.filter((order) => !['DELIVERED', 'CANCELLED'].includes(order.status)).length;
  const orderStatusOptions = ['ALL', ...Array.from(new Set(activeOrders.map((order) => order.status || 'PENDING')))];
  const visibleOrders = orderStatusFilter === 'ALL' ? activeOrders : activeOrders.filter((order) => (order.status || 'PENDING') === orderStatusFilter);
  const focusedPageTitle = activeTab === 'profile' ? tr(language, 'profile') : activeTab === 'orders' && selectedOrder ? tr(language, 'orderDetails') : '';
  const isFocusedPage = Boolean(focusedPageTitle);
  const customerRank = rewardRank(customer?.points);
  const referralLink = customer?.referralCode ? `${window.location.origin}${window.location.pathname}?ref=${customer.referralCode}` : '';

  useEffect(() => {
    const products = menuSplashProducts(items);
    if (products.length) {
      localStorage.setItem(splashProductsStorageKey, JSON.stringify(products.slice(0, 24)));
    }
  }, [items]);

  const playNotificationSound = () => {
    if (!soundEnabled || !window.AudioContext) return;
    try {
      const context = new AudioContext();
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.14, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.42);
      gain.connect(context.destination);

      [660, 880].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, context.currentTime + index * 0.12);
        oscillator.connect(gain);
        oscillator.start(context.currentTime + index * 0.12);
        oscillator.stop(context.currentTime + index * 0.12 + 0.22);
      });
      window.setTimeout(() => context.close(), 700);
    } catch {
      // Audio can be blocked until the user interacts with the page.
    }
  };

  const chooseLanguage = (nextLanguage) => {
    localStorage.setItem(languageStorageKey, nextLanguage);
    setLanguage(nextLanguage);
    setLanguagePromptOpen(false);
  };

  const sendBrowserNotification = async (title, body, tag = 'chopasap-alert') => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({ type: 'CHOPASAP_NOTIFICATION', title, body, tag });
      return;
    }
    new Notification(title, { body, icon: chopasapLogo, tag });
  };

  const addNotification = (title, body, options = {}) => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      body,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: options.type || 'app'
    };
    setNotifications((current) => [entry, ...current].slice(0, 12));
    if (options.sound !== false) playNotificationSound();
    if (options.browser !== false) sendBrowserNotification(title, body, options.tag);
  };
  const toggleFavorite = (id) => setFavorites((current) => (current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]));

  useEffect(() => {
    localStorage.setItem(favoritesStorageKey, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('chopasap_sound_enabled', String(soundEnabled));
  }, [soundEnabled]);

  const saveCustomerSession = (nextCustomer) => {
    const saved = { sessionToken: customer?.sessionToken, ...nextCustomer, orderCount: nextCustomer.orderCount || 0 };
    localStorage.setItem(customerStorageKey, JSON.stringify(saved));
    setCustomer(saved);
    setCustomerForm({ ...emptyCustomerForm, ...saved });
    setOrderForm((current) => ({
      ...current,
      customerName: saved.name || current.customerName,
      customerPhone: saved.phone || current.customerPhone,
      customerEmail: saved.email || current.customerEmail,
      deliveryAddress: saved.address || current.deliveryAddress
    }));
  };

  const loadCustomerOrders = async (customerId = customer?.id) => {
    if (!customerId) return;
    try {
      const response = await endpoints.publicCustomerOrders(customerId);
      setActiveOrders(response.data.items || []);
    } catch {
      // Keep local order history if the customer order endpoint is unavailable.
    }
  };

  const refreshCustomerSession = async (currentCustomer = customer) => {
    if (!currentCustomer?.name || !currentCustomer?.phone) return null;
    const response = await endpoints.publicCustomerSession({
      name: currentCustomer.name,
      phone: currentCustomer.phone,
      email: currentCustomer.email || '',
      address: currentCustomer.address || '',
      referralCode: currentCustomer.referralCode || ''
    });
    saveCustomerSession(response.data);
    return response.data;
  };

  const submitCustomerSession = async (event) => {
    event.preventDefault();
    setCustomerSaving(true);
    try {
      const response = await endpoints.publicCustomerSession(customerForm);
      saveCustomerSession(response.data);
      await loadCustomerOrders(response.data.id);
      toast.success('Account ready');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create customer session');
    } finally {
      setCustomerSaving(false);
    }
  };

  const updateCustomerProfile = async (event) => {
    event.preventDefault();
    if (!customer?.id) return;
    setCustomerSaving(true);
    try {
      const response = await endpoints.updatePublicCustomer(customer.id, customerForm);
      saveCustomerSession(response.data);
      await loadCustomerOrders(response.data.id);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update profile');
    } finally {
      setCustomerSaving(false);
    }
  };

  const uploadCustomerAvatar = async (file) => {
    if (!file || !customer?.id) return;
    setAvatarUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('image', file);
      const uploadResponse = await endpoints.uploadPublicCustomerAvatar(uploadData);
      const response = await endpoints.updatePublicCustomer(customer.id, { profileImageUrl: uploadResponse.data.url });
      saveCustomerSession(response.data);
      toast.success('Profile image updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not upload profile image');
    } finally {
      setAvatarUploading(false);
    }
  };

  useEffect(() => {
    const code = flashSale.data?.item;
    if (!code) return;
    const dismissedCode = localStorage.getItem('chopasap_flash_sale_dismissed');
    if (dismissedCode === code.id) return;
    const timer = window.setTimeout(() => {
      setFlashSaleOpen(true);
      addNotification('Flash sale is live', `${code.discountPercent}% discount with code ${code.code}.`, { type: 'flash-sale', tag: 'chopasap-flash-sale' });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [flashSale.data?.item]);

  useEffect(() => {
    const promotion = featuredPromotion;
    if (!promotion || promotion.requestSlide) return;
    const key = `chopasap_promotion_notified_${promotion.id}`;
    if (localStorage.getItem(key) === 'true') return;
    const timer = window.setTimeout(() => {
      localStorage.setItem(key, 'true');
      addNotification('New promotion', promotion.title, { type: 'promotion', tag: 'chopasap-promotion' });
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [featuredPromotion?.id]);

  useEffect(() => {
    if (promotionIndex < visiblePromotionSlides.length) return;
    setPromotionIndex(0);
  }, [promotionIndex, visiblePromotionSlides.length]);

  useEffect(() => {
    if (visiblePromotionSlides.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setPromotionIndex((current) => (current + 1) % visiblePromotionSlides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [visiblePromotionSlides.length]);

  useEffect(() => {
    const mealId = new URLSearchParams(window.location.search).get('meal');
    if (!mealId || !items.length || selectedMeal) return;
    const sharedMeal = items.find((item) => item.id === mealId);
    if (sharedMeal) openMealDetail(sharedMeal);
  }, [items.length, selectedMeal?.id]);

  const requestOrderNotificationPermission = async () => {
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    } catch {
      // Browsers can reject permission prompts outside supported contexts.
    }
  };
  const enableNotifications = async () => {
    if (!('Notification' in window)) {
      toast.error('Browser notifications are not available here');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        addNotification('Notifications enabled', 'You will hear alerts for order updates and new offers.', { browser: false });
      }
    } catch {
      toast.error('Could not enable notifications');
    }
  };
  const showOrderStatusNotification = async (order) => {
    const title = `Order ${order.orderNo} update`;
    const body = `Your order is now ${statusLabel(order.status)}.`;

    addNotification(title, body, { type: 'order', tag: 'chopasap-order-status' });
  };

  useEffect(() => {
    activeOrdersRef.current = activeOrders;
    localStorage.setItem(activeOrdersStorageKey, JSON.stringify(activeOrders.slice(0, 10)));
  }, [activeOrders]);

  useEffect(() => {
    const socketUrl = apiBaseUrl.replace(/\/api\/?$/, '');
    const socket = io(socketUrl, { transports: ['websocket'], reconnection: true });
    socketRef.current = socket;
    socket.on('order:updated', (order) => {
      setSelectedOrder((current) => (current?.id === order.id ? { ...current, ...order } : current));
      setActiveOrders((current) => {
        const exists = current.some((entry) => entry.id === order.id);
        const next = exists ? current.map((entry) => (entry.id === order.id ? { ...entry, ...order } : entry)) : [order, ...current];
        return next.slice(0, 10);
      });
      showOrderStatusNotification(order);
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !selectedOrder?.id) return undefined;
    socket.emit('order:join', { id: selectedOrder.id, token: customer?.sessionToken });
    return () => socket.emit('order:leave', selectedOrder.id);
  }, [selectedOrder?.id, customer?.sessionToken]);

  useEffect(() => {
    if (!customer?.id) return;
    refreshCustomerSession(customer)
      .then((freshCustomer) => loadCustomerOrders(freshCustomer?.id || customer.id))
      .catch(() => loadCustomerOrders(customer.id));
  }, [customer?.id]);

  useEffect(() => () => {
    if (checkoutPromptTimerRef.current) window.clearTimeout(checkoutPromptTimerRef.current);
  }, []);

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
    setSelectedMeal(item);
    setMealNote('');
    setRecentMealIds(current => { const next = [item.id, ...current.filter(id => id !== item.id)].slice(0, 6); try { localStorage.setItem('chopasap_recent_meals', JSON.stringify(next)); } catch {} return next; });
    setDetailQuantity(1);
    setSelectedVariation('');
    setMealReviews(item.reviews || []);
    setShowAllReviews(false);
    endpoints.publicMealReviews(item.id)
      .then((response) => setMealReviews(response.data?.items || []))
      .catch(() => {});
  };

  const shareMeal = async (item) => {
    const url = `${window.location.origin}${window.location.pathname}?meal=${item.id}`;
    const text = `Order ${item.name} on ChopASAP`;
    try {
      if (navigator.share) {
        await navigator.share({ title: item.name, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Meal link copied');
      }
    } catch {
      // Sharing can be cancelled by the user.
    }
  };

  const shareReferral = async () => {
    if (!referralLink) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Join ChopASAP', text: 'Use my ChopASAP referral link and collect welcome points.', url: referralLink });
      } else {
        await navigator.clipboard.writeText(referralLink);
        toast.success('Referral link copied');
      }
    } catch {
      // Sharing can be cancelled by the user.
    }
  };

  const closeMealDetail = () => {
    setSelectedMeal(null);
    setDetailQuantity(1);
    setSelectedVariation('');
    setMealReviews([]);
    setShowAllReviews(false);
  };

  const add = (item, quantity = 1, variationName = '', note = '') => {
    if (item.isAvailable === false) return toast.error('This meal is unavailable');
    const cartItemId = `${cartKeyFor(item.id, variationName)}:${note.trim()}`;
    const price = mealPrice(item, variationName);
    setCart((current) => {
      const existing = current.find((entry) => entry.cartItemId === cartItemId);
      if (existing) return current.map((entry) => (entry.cartItemId === cartItemId ? { ...entry, quantity: Math.min(99, entry.quantity + quantity) } : entry));
      return [...current, { cartItemId, menuItemId: item.id, variationName, name: item.name, price, quantity, imageUrl: item.imageUrl, note: note.trim() }];
    });
    toast.success(`${item.name} added`);
    if (checkoutPromptTimerRef.current) window.clearTimeout(checkoutPromptTimerRef.current);
    checkoutPromptTimerRef.current = window.setTimeout(() => {
      toast.custom(
        (toastItem) => (
          <div className="w-[min(92vw,360px)] rounded-2xl bg-white p-4 shadow-[0_18px_45px_rgba(17,24,39,0.18)] ring-1 ring-black/5">
            <p className="text-sm font-black text-[#171B25]">Ready to checkout?</p>
            <p className="mt-1 text-xs font-semibold text-[#717680]">Your cart has {cartCount + quantity} item{cartCount + quantity === 1 ? '' : 's'} waiting.</p>
            <div className="mt-3 flex gap-2">
              <button className="flex-1 rounded-xl bg-[#E51924] px-3 py-2 text-xs font-black text-white" onClick={() => { toast.dismiss(toastItem.id); openCheckout('cart'); }}>
                Checkout cart
              </button>
              <button className="rounded-xl bg-stone-100 px-3 py-2 text-xs font-black text-stone-700" onClick={() => toast.dismiss(toastItem.id)}>
                Later
              </button>
            </div>
          </div>
        ),
        { duration: 7000 }
      );
    }, 2500);
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
        .map((item) => (item.cartItemId === id ? { ...item, quantity: Math.min(99, Math.max(0, item.quantity + delta)) } : item))
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
    if (orderSubmittingRef.current) return;
    if (!settings.publicOrdering) return toast.error('Online ordering is currently unavailable');
    if (!cart.length) return toast.error('Add at least one meal');
    if (fulfillment === 'delivery' && !orderForm.deliveryAddress.trim()) return toast.error('Enter your delivery address');
    if (orderForm.isGift && !orderForm.recipientName.trim()) return toast.error('Enter who the meal is for');
    if (orderForm.isGift && !orderForm.recipientPhone.trim()) return toast.error('Enter their phone number');
    if (orderForm.isGift && fulfillment === 'delivery' && !orderForm.recipientAddress.trim()) return toast.error('Enter their delivery address');
    const customerName = customer?.name || orderForm.customerName;
    const customerPhone = customer?.phone || orderForm.customerPhone;
    if (!customerName?.trim()) return toast.error('Enter your name');
    if (!customerPhone?.trim()) return toast.error('Enter your phone number');
    orderSubmittingRef.current = true;
    let savedOrder = null;
    setSubmitting(true);
    try {
      const submittedCart = cart;
      const submittedCustomer = {
        ...orderForm,
        customerName,
        customerPhone,
        deliveryNote: [orderForm.deliveryNote, ...cart.filter(item => item.note).map(item => `${item.name}: ${item.note}`)].filter(Boolean).join('\n'),
        deliveryAddress: fulfillment === 'delivery' ? orderForm.deliveryAddress : 'Reserve onsite'
      };
      const signature = JSON.stringify({ cart, submittedCustomer, fulfillment });
      if (!orderAttemptRef.current) { try { orderAttemptRef.current = JSON.parse(sessionStorage.getItem('chopasap_order_attempt')); } catch {} }
      if (orderAttemptRef.current?.signature !== signature) orderAttemptRef.current = { signature, requestId: newOrderRequestId() };
      try { sessionStorage.setItem('chopasap_order_attempt', JSON.stringify(orderAttemptRef.current)); } catch {}
      const response = await endpoints.createOnlineOrder({
        requestId: orderAttemptRef.current.requestId,
        fulfillment: fulfillment === 'delivery' ? 'delivery' : 'onsite',
        ...submittedCustomer,
        customerId: customer?.id,
        deliveryFee,
        items: cart.map(({ menuItemId, quantity, variationName }) => ({ menuItemId, quantity, variationName }))
      });
      savedOrder = response.data;
      setConfirmedOrder(response.data);
      try { sessionStorage.setItem('chopasap_confirmed_order', JSON.stringify(response.data)); } catch {}
      orderAttemptRef.current = null;
      try { sessionStorage.removeItem('chopasap_order_attempt'); } catch {}
      requestOrderNotificationPermission();
      toast.success(`Order ${response.data.orderNo} received`);
      addNotification('Order placed', `${response.data.orderNo} is pending confirmation.`);
      setActiveOrders((current) => [
        {
          id: response.data.id,
          orderNo: response.data.orderNo,
          total: response.data.total,
          status: response.data.status,
          isGift: response.data.isGift,
          recipientName: response.data.recipientName,
          recipientPhone: response.data.recipientPhone,
          recipientAddress: response.data.recipientAddress,
          items: response.data.items || cart
        },
        ...current
      ]);
      setCart([]);
      setCheckoutStep('success');
      setOrderForm((current) => ({
        ...emptyOrderForm,
        customerName: customer?.name || current.customerName,
        customerPhone: customer?.phone || current.customerPhone,
        customerEmail: customer?.email || current.customerEmail,
        deliveryAddress: customer?.address || current.deliveryAddress
      }));
      if (response.data.customer) {
        saveCustomerSession(response.data.customer);
        await loadCustomerOrders(response.data.customer.id);
      } else if (customer?.id) {
        const freshCustomer = await refreshCustomerSession(customer).catch(() => null);
        await loadCustomerOrders(freshCustomer?.id || customer.id);
      }
      refetch();
      const whatsappUrl = orderWhatsAppUrl(response.data, settings.supportPhone);
      if (whatsappUrl) {
        try { window.open(whatsappUrl, '_blank', 'noopener,noreferrer'); } catch { toast('Your order is saved. Use Continue to WhatsApp to reopen it.'); }
      }
    } catch (err) {
      toast.error(savedOrder ? 'Your order is saved. Open Orders or Continue to WhatsApp.' : err.response?.data?.message || 'Could not place order');
    } finally {
      orderSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  const goBackCheckout = () => {
    if (checkoutStep === 'success') {
      closeCheckout();
      setActiveTab('home');
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
    setPromotionUploadProgress(0);
    setPromotionUploadStatus('Uploading image...');
    try {
      const uploadData = new FormData();
      uploadData.append('image', file);
      const response = await endpoints.uploadPublicPromotionImage(uploadData, {
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setPromotionUploadProgress(progress);
          if (progress >= 100) setPromotionUploadStatus('Finishing upload...');
        }
      });
      setPromotionForm((current) => ({ ...current, imageUrl: response.data.url }));
      setPromotionUploadProgress(100);
      setPromotionUploadStatus('Image uploaded');
      toast.success('Image uploaded');
    } catch (err) {
      setPromotionUploadStatus('Upload failed');
      toast.error(err.response?.data?.message || 'Could not upload image');
    } finally {
      setPromotionImageUploading(false);
    }
  };

  const handlePromotionCta = (promotion = featuredPromotion) => {
    if (promotion?.ctaUrl && !promotion.requestSlide) {
      if (promotion.ctaUrl.startsWith('#')) {
        document.querySelector(promotion.ctaUrl)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      window.open(promotion.ctaUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    setPromotionOpen(true);
  };

  if (loading && !data) return customer ? <BuyerSkeleton /> : <BuyerSplash />;
  if (!customer) return <BuyerAuth form={customerForm} saving={customerSaving} onChange={setCustomerForm} onSubmit={submitCustomerSession} items={items} />;
  if (error || !data) return <EmptyState title="Menu unavailable" message="The ordering portal could not load the menu." onRetry={refetch} />;

  const renderMeals = (list) => (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
      {list.map((item) => (
        <MealCard key={item.id} item={item} favorite={favorites.includes(item.id)} onFavorite={toggleFavorite} onOpen={openMealDetail} onAdd={add} />
      ))}
    </div>
  );

  return (
    <div style={{ '--brand': tokens.colors.primary, '--background': tokens.colors.background, '--ink': tokens.colors.text, '--muted': tokens.colors.muted, '--border': tokens.colors.border }} className="buyer-platform min-h-screen bg-[#F8F9FB] text-stone-950">
      <div className="mx-auto min-h-screen max-w-7xl bg-[#F8F9FB]">
        <LanguagePrompt open={languagePromptOpen} language={language} onChoose={chooseLanguage} />
        {showInstallPrompt ? <InstallAppPrompt canInstall={Boolean(installPrompt)} onInstall={installApp} onDismiss={dismissInstallPrompt} /> : null}
        <header className="relative z-30 bg-[#F8F9FB]/95 px-4 pb-3 pt-4 backdrop-blur md:border-b md:border-[#E5E7EB] md:px-6">
          {isFocusedPage ? (
            <div className="grid h-12 grid-cols-[44px_1fr_44px] items-center">
              <button
                className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#171B25] shadow-sm"
                onClick={() => {
                  if (selectedOrder) {
                    setSelectedOrder(null);
                    return;
                  }
                  setActiveTab('home');
                }}
                aria-label="Go back"
              >
                <ChevronLeft size={22} />
              </button>
              <h1 className="text-center text-xl font-black text-[#171B25]">{focusedPageTitle}</h1>
              <span />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <img className="h-8 w-8 rounded-lg object-cover md:h-12 md:w-12" src={chopasapLogo} alt="ChopASAP" />
                  <div className="min-w-0">
                    <p className="text-xl font-black uppercase tracking-normal text-[#E51924]">CHOP ASAP</p>
                    <p className="flex items-center gap-1 truncate text-sm font-black text-stone-950 flex">
                      <MapPin size={15} className="text-[#E51924]" />
                      {orderForm.deliveryAddress || 'Choose delivery location'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="relative grid h-9 w-9 place-items-center rounded-full bg-[#F8F9FB] text-[#171B25] shadow-sm" onClick={() => openCheckout('cart')} aria-label="Basket">
                    <ShoppingBag size={19} />
                    {cartCount ? <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#E51924] px-1 text-[9px] font-black text-white">{cartCount}</span> : null}
                  </button>
                  <button className="relative grid h-9 w-9 place-items-center rounded-full bg-[#F8F9FB] text-[#171B25] shadow-sm" onClick={() => setNotificationPanelOpen(true)} aria-label="Notifications">
                    <Bell size={19} />
                    {notifications.length ? <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#E51924] px-1 text-[9px] font-black text-white">{Math.min(notifications.length, 9)}</span> : null}
                  </button>
                  <button className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-white text-[#171B25] shadow-sm" onClick={() => setActiveTab('profile')} aria-label="Profile">
                    {customer?.profileImageUrl ? <img className="h-full w-full object-cover" src={customer.profileImageUrl} alt={customer.name || 'Profile'} /> : <User size={19} />}
                  </button>
                </div>
              </div>
              {['home', 'meals', 'favorites'].includes(activeTab) && <>
                {activeTab === 'home' && <div className="buyer-welcome"><h1>What are you craving?</h1><p>Discover delicious meals freshly prepared for you{customer?.name ? ', ' + customer.name.split(' ')[0] : ''}.</p></div>}
                <div className="buyer-search"><Search size={20} /><input aria-label="Search meals" placeholder="Search meals, drinks and more." value={search} onChange={event => setSearch(event.target.value)} />
                  {search && <button aria-label="Clear search" onClick={() => setSearch('')}><X size={18} /></button>}
                  <label className="sr-only" htmlFor="category-filter">Filter by category</label><select id="category-filter" aria-label="Filter by category" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option>All Meals</option>{categories.map(name => <option key={name}>{name}</option>)}</select>
                </div>
              </>}
            </>
          )}
        </header>

        <div className={clsx('grid gap-5 px-4 pt-3 md:px-6', isFocusedPage ? 'pb-8 lg:grid-cols-1' : 'pb-24 md:grid-cols-[220px_1fr] lg:grid-cols-[220px_1fr_330px] lg:pb-8')}>
          {!isFocusedPage ? <aside className="hidden self-start rounded-3xl bg-white p-3 shadow-md md:block">
            <div className="mb-3 flex items-center gap-3 rounded-2xl bg-[#fff3cf] p-3">
              <img className="h-10 w-10 rounded-xl object-cover" src={chopasapLogo} alt="ChopASAP" />
              <div>
                <p className="text-xs font-black uppercase text-[#E51924]">ChopASAP</p>
                <p className="text-xs font-bold text-stone-600">Fresh meals, made for you</p>
              </div>
            </div>
            <nav className="grid gap-2">
                {tabs.map((tab) => (
                  <TabButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => tab.id === 'cart' ? openCheckout('cart') : setActiveTab(tab.id)} desktop language={language} badge={tab.id === 'cart' ? cartCount : tab.id === 'orders' ? activeOrderCount : 0} />
                ))}
            </nav>
            <button className="mt-4 flex h-11 w-full items-center justify-center rounded-2xl bg-[#fff1ca] text-sm font-black text-[#E51924] disabled:opacity-50" disabled={!settings.reservations} onClick={() => setReservationOpen(true)}>
              <CalendarClock size={17} /> Reserve
            </button>
            {activeTab === 'support' ? null : <a className="mt-2 flex h-11 w-full items-center justify-center rounded-2xl bg-stone-50 text-sm font-black text-stone-700" href="/login">Login</a>}
          </aside> : null}

          <main className="min-w-0">
            {activeTab === 'home' ? (
              <>
                <PromotionBanner
                  promotion={featuredPromotion}
                  slides={visiblePromotionSlides}
                  activeIndex={promotionIndex}
                  onPrevious={() => setPromotionIndex((current) => (current - 1 + visiblePromotionSlides.length) % visiblePromotionSlides.length)}
                  onNext={() => setPromotionIndex((current) => (current + 1) % visiblePromotionSlides.length)}
                  onSelect={setPromotionIndex}
                  onAction={handlePromotionCta}
                />

                <div className="buyer-categories" aria-label="Food categories">{['All Meals', ...categories].map(name => <button key={name} aria-pressed={categoryFilter === name} onClick={() => setCategoryFilter(name)}>{items.find(item => item.category?.name === name)?.imageUrl && <img src={items.find(item => item.category?.name === name).imageUrl} alt="" loading="lazy" />}{name}</button>)}</div>
                <section id="menu" className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-xl font-black tracking-normal text-[#171B25]">Today's Menu</h2>
                    <ChevronRight size={22} className="text-[#171B25]" />
                  </div>
                  <div>
                    {filteredItems.length ? renderMeals(filteredItems) : <div className="rounded-3xl bg-white p-8 text-center font-semibold text-stone-500 shadow-md">{items.length ? 'No meals match your search.' : 'No meals are available yet.'}</div>}
                  </div>
                </section>

                {recentMealIds.length > 0 && <section className="mt-6"><h2 className="mb-4">Recently viewed</h2>{renderMeals(recentMealIds.map(id => items.find(item => item.id === id)).filter(Boolean).slice(0, 4))}</section>}
                {false && (
                <section className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-xl font-black tracking-normal text-[#171B25]">Active Orders</h2>
                    <ChevronRight size={22} className="text-[#171B25]" />
                  </div>
                  <div className="rounded-xl bg-white px-3 shadow-sm">
                    {activeOrders.length ? activeOrders.slice(0, 3).map((order) => (
                      <div key={order.id || order.orderNo} className="flex items-center gap-3 border-b border-[#E5E7EB] py-3 last:border-b-0">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-[#171B25]">{order.orderNo}</p>
                          <p className="mt-1 text-xs font-semibold text-[#8a8f98]">{order.items?.length || 0} item{(order.items?.length || 0) === 1 ? '' : 's'} • {currency(order.total)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-[#19b567]">{order.status || 'PENDING'}</p>
                          <p className="mt-1 text-[11px] font-semibold text-[#8a8f98]">Time 30mins</p>
                        </div>
                        <ChevronRight size={18} className="text-[#171B25]" />
                      </div>
                    )) : (
                      <p className="py-4 text-sm font-semibold text-[#8a8f98]">No active orders yet.</p>
                    )}
                  </div>
                </section>
                )}
              </>
            ) : null}

            {activeTab === 'favorites' ? (
              <section>
                <h1 className="text-2xl font-black">Favourites</h1>
                <p className="mt-1 text-sm font-semibold text-stone-600">Meals you saved for quick ordering.</p>
                <div className="mt-5">
                  {favoriteItems.length ? renderMeals(favoriteItems) : (
                    <div className="rounded-3xl bg-white p-8 text-center shadow-md">
                      <Heart className="mx-auto text-[#E51924]" size={34} />
                      <p className="mt-3 font-black">No favorites yet</p>
                      <p className="mt-1 text-sm font-semibold text-stone-500">Tap a heart on any meal to save it.</p>
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            {activeTab === 'meals' ? (
              <section>
                <h1 className="text-2xl font-black">Meals</h1>
                <p className="mt-1 text-sm font-semibold text-stone-600">Browse meals and add your choices to the cart.</p>
                <div className="mt-5">{filteredItems.length ? renderMeals(filteredItems) : <div className="rounded-3xl bg-white p-8 text-center font-semibold text-stone-500 shadow-md">No meals found.</div>}</div>
              </section>
            ) : null}

            {activeTab === 'orders' ? (
              <section>
                {selectedOrder ? (
                  <><div className="buyer-account-links"><a className="btn-secondary" href={orderWhatsAppUrl(selectedOrder, settings.supportPhone) || undefined} target="_blank" rel="noreferrer">Contact ChopASAP</a><button onClick={() => { const available = selectedOrder.items.map(row => ({ row, meal: items.find(item => item.id === row.menuItemId && item.isAvailable !== false) })).filter(entry => entry.meal); if (!available.length) return toast.error('These meals are no longer available'); available.forEach(({ meal, row }) => add(meal, Math.min(99, row.quantity), mealVariations(meal).some(v => v.name === row.variationName) ? row.variationName : '')); openCheckout('cart'); }}>Reorder available meals</button></div><OrderDetailView order={selectedOrder} onBack={() => setSelectedOrder(null)} /></>
                ) : (
                  <>
                <h1 className="text-2xl font-black">Orders</h1>
                <p className="mt-1 text-sm font-semibold text-stone-600">Your active orders and order history.</p>
                {activeOrders.length ? (
                  <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                    {orderStatusOptions.map((status) => (
                      <button
                        key={status}
                        type="button"
                        className={clsx('shrink-0 rounded-full border px-4 py-2 text-xs font-black', orderStatusFilter === status ? 'border-[#E51924] bg-[#fff4f4] text-[#E51924]' : 'border-[#E5E7EB] bg-white text-stone-600')}
                        onClick={() => setOrderStatusFilter(status)}
                      >
                        {status === 'ALL' ? tr(language, 'all') : orderStatusLabels[status] || status}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="mt-5 rounded-xl bg-white px-3 shadow-sm">
                  {visibleOrders.length ? visibleOrders.map((order) => (
                    <button key={order.id || order.orderNo} className="flex w-full items-center gap-3 border-b border-[#E5E7EB] py-4 text-left last:border-b-0" onClick={() => setSelectedOrder(order)}>
                      <ClipboardList size={22} className="text-[#E51924]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-[#171B25]">{order.orderNo}</p>
                        <p className="mt-1 text-xs font-semibold text-[#8a8f98]">{order.items?.length || 0} item{(order.items?.length || 0) === 1 ? '' : 's'} • {currency(order.total)}</p>
                      </div>
                      <span className="rounded-full bg-[#e7f8ef] px-3 py-1 text-xs font-black text-[#19b567]">{order.status || 'PENDING'}</span>
                    </button>
                  )) : (
                    <div className="py-8 text-center">
                      <ClipboardList className="mx-auto text-[#E51924]" size={34} />
                      <p className="mt-3 font-black">{activeOrders.length ? tr(language, 'noOrdersForStatus') : 'No orders yet'}</p>
                      <p className="mt-1 text-sm font-semibold text-[#8a8f98]">{activeOrders.length ? '' : 'Orders you place from this portal will appear here.'}</p>
                    </div>
                  )}
                </div>
                  </>
                )}
              </section>
            ) : null}

            {activeTab === 'support' ? (
              <section>
                <div className="overflow-hidden rounded-3xl bg-white shadow-md">
                  <div className="bg-[#171B25] px-5 py-6 text-white sm:px-7">
                    <div className="flex items-start gap-4">
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-[#E51924]">
                        <MessageCircle size={27} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-wide text-white/65">ChopASAP Care</p>
                        <h1 className="mt-1 text-2xl font-black">Support</h1>
                        <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/75">Get help with orders, delivery, reservations, and onsite flash sale codes.</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-7">
                    <a
                      className="rounded-2xl border border-[#E5E7EB] bg-[#F8F9FB] p-4 transition hover:border-[#E51924] hover:bg-white"
                      href={`https://wa.me/${whatsappPhone(settings.supportPhone)}?text=${encodeURIComponent('Hello ChopASAP, I need support with my order.')}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e7f8ef] text-[#0b8f4f]">
                        <MessageCircle size={22} />
                      </span>
                      <h2 className="mt-4 font-black">WhatsApp support</h2>
                      <p className="mt-1 text-sm font-semibold leading-5 text-stone-600">Chat directly with the restaurant team.</p>
                    </a>
                    <a className="rounded-2xl border border-[#E5E7EB] bg-[#F8F9FB] p-4 transition hover:border-[#E51924] hover:bg-white" href={`tel:${settings.supportPhone}`}>
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff1ca] text-[#E51924]">
                        <Phone size={22} />
                      </span>
                      <h2 className="mt-4 font-black">Call support</h2>
                      <p className="mt-1 text-sm font-semibold leading-5 text-stone-600">{settings.supportPhone}</p>
                    </a>
                    <button className="rounded-2xl border border-[#E5E7EB] bg-[#F8F9FB] p-4 text-left transition hover:border-[#E51924] hover:bg-white disabled:opacity-60" disabled={!settings.reservations} onClick={() => setReservationOpen(true)}>
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#F8F9FB] text-[#171B25]">
                        <CalendarClock size={22} />
                      </span>
                      <h2 className="mt-4 font-black">Reserve onsite</h2>
                      <p className="mt-1 text-sm font-semibold leading-5 text-stone-600">Request a meal or table before you arrive.</p>
                    </button>
                  </div>
                </div>

                <div className="mt-5 rounded-3xl bg-white p-5 shadow-md sm:p-7">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-[#E51924]">Help center</p>
                      <h2 className="mt-1 text-xl font-black">Frequently asked questions</h2>
                    </div>
                    <div className="hidden h-12 w-12 place-items-center rounded-2xl bg-[#fff1ca] text-[#E51924] sm:grid">
                      <Info size={23} />
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3">
                    {supportFaqs.map((faq) => (
                      <div key={faq.question} className="rounded-2xl border border-[#edf0f2] bg-[#F8F9FB] p-4">
                        <h3 className="font-black text-[#171B25]">{faq.question}</h3>
                        <p className="mt-2 text-sm font-semibold leading-6 text-stone-600">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {activeTab === 'profile' ? (
              <section><div className="buyer-account-links"><button onClick={() => setActiveTab('favorites')}><Heart size={20} />Favourites</button><button onClick={() => setActiveTab('support')}><Phone size={20} />Contact support</button><button onClick={() => setActiveTab('orders')}><ClipboardList size={20} />Order history</button><button onClick={() => setNotificationPanelOpen(true)}><Bell size={20} />Notifications</button></div>
                <div className="overflow-hidden rounded-3xl bg-white shadow-md">
                  <div className="bg-[#171B25] px-5 py-6 text-white sm:px-7">
                    <div className="flex items-center gap-4">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-3xl bg-white/10">
                        {customer?.profileImageUrl ? (
                          <img className="h-full w-full object-cover" src={customer.profileImageUrl} alt={customer.name || 'Profile'} />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-white"><User size={34} /></div>
                        )}
                        <label className="absolute bottom-1 right-1 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-white text-[#E51924] shadow-md">
                          <Camera size={16} />
                          <input className="hidden" type="file" accept="image/*" disabled={avatarUploading} onChange={(event) => uploadCustomerAvatar(event.target.files?.[0])} />
                        </label>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-wide text-white/60">Customer account</p>
                        <h1 className="mt-1 truncate text-2xl font-black">{customer?.name || 'Guest customer'}</h1>
                        <p className="mt-1 text-sm font-semibold text-white/70">{customer?.phone}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 p-4 sm:gap-4 sm:p-7">
                    {[
                      { label: tr(language, 'totalOrders'), value: activeOrders.length || customer?.orderCount || 0, icon: ClipboardList, tone: 'bg-[#fff4d7] text-[#8b5f00]' },
                      { label: tr(language, 'points'), value: Number(customer?.points || 0), icon: Trophy, tone: 'bg-[#e7f8ef] text-[#0b8f4f]' },
                      { label: tr(language, 'referrals'), value: Number(customer?.referralCount || 0), icon: Gift, tone: 'bg-[#F8F9FB] text-[#171B25]' }
                    ].map((stat) => {
                      const Icon = stat.icon;
                      return (
                        <div key={stat.label} className="rounded-2xl border border-[#edf0f2] bg-[#F8F9FB] p-3 text-center sm:p-4">
                          <span className={clsx('mx-auto grid h-10 w-10 place-items-center rounded-xl', stat.tone)}>
                            <Icon size={20} />
                          </span>
                          <p className="mt-2 text-2xl font-black text-[#171B25] sm:text-3xl">{stat.value}</p>
                          <p className="mt-1 text-[11px] font-black uppercase text-stone-500 sm:text-xs">{stat.label}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-[#edf0f2] px-5 pb-5 sm:px-7 sm:pb-7">
                    <div className="rounded-2xl bg-[#171B25] p-4 text-white">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-black uppercase text-white/55">{tr(language, 'currentRank')}</p>
                          <p className="mt-1 font-black">{customerRank.title}</p>
                        </div>
                        <p className="text-right text-xs font-bold text-white/65">{customerRank.next}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-md">
                  <div className="grid grid-cols-2 gap-2 border-b border-[#edf0f2] bg-[#F8F9FB] p-2">
                    {[
                      { id: 'referral', label: tr(language, 'shareReferralLink'), icon: Share2 },
                      { id: 'details', label: tr(language, 'accountDetails'), icon: User }
                    ].map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          className={clsx('flex min-h-12 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-black transition', profileTab === tab.id ? 'bg-white text-[#E51924] shadow-sm' : 'text-stone-600')}
                          onClick={() => setProfileTab(tab.id)}
                        >
                          <Icon size={17} /> {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {profileTab === 'referral' ? (
                    <div className="p-5 sm:p-7">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-[#E51924]">{tr(language, 'referralRewards')}</p>
                          <h2 className="mt-1 text-xl font-black">{tr(language, 'inviteFriends')}</h2>
                          <p className="mt-1 text-sm font-semibold text-stone-500">{tr(language, 'referralHelp')}</p>
                        </div>
                        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#fff1ca] text-[#E51924]">
                          <Gift size={23} />
                        </span>
                      </div>
                      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                        <div className="min-w-0 rounded-2xl border border-[#E5E7EB] bg-[#F8F9FB] p-4">
                          <p className="text-xs font-black uppercase text-stone-500">{tr(language, 'yourReferralLink')}</p>
                          <p className="mt-2 truncate text-sm font-black text-[#171B25]">{referralLink || tr(language, 'referralPending')}</p>
                          <p className="mt-1 text-xs font-bold text-stone-500">{customer?.referralCount || 0} {Number(customer?.referralCount || 0) === 1 ? tr(language, 'successfulReferral') : tr(language, 'successfulReferrals')}</p>
                        </div>
                        <button
                          type="button"
                          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#E51924] px-5 text-sm font-black text-white disabled:opacity-60"
                          onClick={shareReferral}
                          disabled={!referralLink}
                        >
                          <Share2 size={17} /> {tr(language, 'share')}
                        </button>
                      </div>
                      <div className="mt-5 rounded-2xl border border-[#edf0f2] bg-[#F8F9FB] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-black uppercase text-stone-500">{tr(language, 'language')}</p>
                            <p className="mt-1 text-sm font-bold text-[#171B25]">{language === 'fr' ? 'Français' : 'English'}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: 'en', label: 'English' },
                              { id: 'fr', label: 'Français' }
                            ].map((option) => (
                              <button
                                key={option.id}
                                type="button"
                                className={clsx('h-10 rounded-xl px-4 text-xs font-black', language === option.id ? 'bg-[#E51924] text-white' : 'bg-white text-stone-600')}
                                onClick={() => chooseLanguage(option.id)}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {profileTab === 'details' ? (
                    <form className="grid gap-4 p-5 sm:p-7" onSubmit={updateCustomerProfile}>
                      <div>
                        <h2 className="text-xl font-black">{tr(language, 'accountDetails')}</h2>
                        <p className="mt-1 text-sm font-semibold text-stone-500">{tr(language, 'updateInfo')}</p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label>
                          <span className="label">{tr(language, 'name')}</span>
                          <input className="input mt-1" value={customerForm.name} onChange={(event) => setCustomerForm({ ...customerForm, name: event.target.value })} required />
                        </label>
                        <label>
                          <span className="label">{tr(language, 'phone')}</span>
                          <input className="input mt-1" type="tel" inputMode="tel" value={customerForm.phone} onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })} required />
                        </label>
                        <label>
                          <span className="label">{tr(language, 'emailOptional')}</span>
                          <input className="input mt-1" type="email" value={customerForm.email || ''} onChange={(event) => setCustomerForm({ ...customerForm, email: event.target.value })} />
                        </label>
                        <label>
                          <span className="label">{tr(language, 'defaultAddress')}</span>
                          <input className="input mt-1" value={customerForm.address || ''} onChange={(event) => setCustomerForm({ ...customerForm, address: event.target.value })} />
                        </label>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button className="flex h-11 items-center justify-center rounded-xl bg-[#E51924] px-4 text-sm font-black text-white disabled:opacity-60" disabled={customerSaving || avatarUploading}>
                          {customerSaving ? tr(language, 'saving') : avatarUploading ? tr(language, 'uploading') : tr(language, 'saveProfile')}
                        </button>
                        <button
                          type="button"
                          className="flex h-11 items-center justify-center rounded-xl bg-stone-100 px-4 text-sm font-black text-stone-700"
                          onClick={() => {
                            if (!window.confirm('Log out of your account?')) return;
                            localStorage.removeItem(customerStorageKey);
                            setCustomer(null);
                            setCustomerForm(emptyCustomerForm);
                            setActiveOrders([]);
                          }}
                        >
                          {tr(language, 'changeCustomer')}
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              </section>
            ) : null}
          </main>

          {!isFocusedPage ? <aside className="hidden self-start rounded-3xl bg-white p-4 shadow-md lg:block">
            <div className="flex items-center justify-between">
              <h2 className="font-black">Basket</h2>
              <span className="rounded-full bg-[#fff1ca] px-3 py-1 text-xs font-black text-[#E51924]">{cartCount} items</span>
            </div>
            <div className="mt-4 space-y-3">
              {cart.length ? cart.slice(0, 3).map((item) => (
                <div key={item.cartItemId} className="flex gap-3 rounded-2xl bg-[#fff4d7] p-3">
                  <img className="h-12 w-12 rounded-xl object-cover" src={item.imageUrl || fallbackImage} alt={item.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">{item.name}</p>
                    {item.variationName ? <p className="truncate text-xs font-bold text-stone-600">{item.variationName}</p> : null}
                    <p className="text-sm font-black text-[#E51924]">{currency(item.price * item.quantity)}</p>
                  </div>
                </div>
              )) : <p className="rounded-2xl bg-stone-50 p-4 text-sm font-semibold text-stone-600">Your basket is empty.</p>}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4 text-lg font-black">
              <span>Total</span>
              <span className="text-[#E51924]">{currency(grandTotal)}</span>
            </div>
            <RedButton className="mt-4 w-full" disabled={!settings.publicOrdering} onClick={() => openCheckout('cart')}>Checkout</RedButton>
          </aside> : null}
        </div>

        {<BottomNav activeTab={activeTab} setActiveTab={(id) => id === 'cart' ? openCheckout('cart') : setActiveTab(id)} language={language} activeOrderCount={activeOrderCount} cartCount={cartCount} />}
      </div>

      <FlashSalePopup
        code={flashSale.data?.item}
        open={flashSaleOpen}
        onClose={() => {
          if (flashSale.data?.item?.id) localStorage.setItem('chopasap_flash_sale_dismissed', flashSale.data.item.id);
          setFlashSaleOpen(false);
        }}
        onUse={() => {
          if (flashSale.data?.item?.id) localStorage.setItem('chopasap_flash_sale_dismissed', flashSale.data.item.id);
          setFlashSaleOpen(false);
          setActiveTab('home');
          if (cart.length) openCheckout('cart');
        }}
      />

      <NotificationPanel
        open={notificationPanelOpen}
        notifications={notifications}
        soundEnabled={soundEnabled}
        permission={notificationPermission}
        onClose={() => setNotificationPanelOpen(false)}
        onEnable={enableNotifications}
        onToggleSound={() => setSoundEnabled((current) => !current)}
      />

      <RewardPanel
        open={rewardPanelOpen}
        rewards={marketing.data?.floatingRewards || []}
        onClose={() => setRewardPanelOpen(false)}
      />

      {customer && (marketing.data?.floatingRewards || []).length ? (
        <button
          className="fixed bottom-24 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#E51924] text-white shadow-[0_18px_35px_rgba(215,25,32,0.28)] md:bottom-8 md:right-8"
          onClick={() => setRewardPanelOpen(true)}
          aria-label="Open rewards"
        >
          <Gift size={24} />
        </button>
      ) : null}

      {selectedMeal ? (
        <MealDetail
          item={selectedMeal}
          quantity={detailQuantity}
          selectedVariation={selectedVariation}
          reviews={mealReviews}
          showAllReviews={showAllReviews}
          onVariationChange={setSelectedVariation}
          onQuantityChange={(delta) => setDetailQuantity((current) => Math.min(99, Math.max(1, current + delta)))}
          onClose={closeMealDetail}
          onAdd={(item, quantity, variation) => add(item, quantity, variation, mealNote)}
          favorite={favorites.includes(selectedMeal.id)} onFavorite={toggleFavorite}
          note={mealNote} onNoteChange={setMealNote}
          relatedItems={items.filter(item => item.id !== selectedMeal.id && item.categoryId === selectedMeal.categoryId).slice(0, 4)} onOpenRelated={openMealDetail}
          onShare={shareMeal}
          onToggleReviews={() => setShowAllReviews((current) => !current)}
        />
      ) : null}

      {orderOpen ? (
        <CheckoutShell
          title={checkoutStep === 'details' ? 'Order Details' : checkoutStep === 'success' ? '' : cart.length ? 'Cart Details' : 'Cart'}
          onBack={goBackCheckout}
        >
          {checkoutStep === 'cart' ? (
            cart.length ? (
              <div className="pb-8">
                <div className="bg-white">
                  {cart.map((item) => (
                    <CheckoutItem key={item.cartItemId} item={item} address={orderForm.deliveryAddress} onChangeQty={updateQty} onRemove={(id) => { if (window.confirm('Remove this meal from your cart?')) updateQty(id, -999); }} />
                  ))}
                </div>
                <div className="mt-5 border-t border-[#E5E7EB] px-6 pt-4">
                  <div className="flex items-center justify-between text-[16px]">
                    <span>Items Total</span>
                    <span>{currency(subtotal)}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[16px]">
                    <span>Delivery</span>
                    <span>{currency(deliveryFee)}</span>
                  </div>
                  <div className="mt-10 flex items-center justify-between border-t border-[#E5E7EB] pt-4 text-[16px]">
                    <span>Total</span>
                    <span>{currency(grandTotal)}</span>
                  </div>
                </div>
                <div className="mt-44 px-6 sm:mt-12">
                  <RedButton className="w-full rounded-md" disabled={!settings.publicOrdering} onClick={() => setCheckoutStep('details')}>Proceed to order</RedButton>
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
                <p className="mt-3 max-w-xs text-[16px] leading-7 text-[#717680]">OOPPSS your cart is empty to view items try adding an item to cart</p>
                <RedButton className="mt-10 rounded-md px-8" onClick={closeCheckout}>Start Shopping</RedButton>
              </div>
            )
          ) : null}

          {checkoutStep === 'details' ? (
            <form className="pb-8" onSubmit={submitOrder}>
              <div className="px-5">
                <div className="grid h-[52px] grid-cols-2 rounded-full bg-[#e9e9e9] p-1">
                  {['delivery', 'reserve'].map((option) => (
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
              <div className="mt-4 bg-white">
                <label className="flex w-full items-start gap-4 border-b border-[#edf0f2] px-6 py-4 text-left">
                  <MapPin className="mt-1 shrink-0 text-black" size={27} fill="currentColor" />
                  <span className="min-w-0 flex-1">
                    <span className="mb-1 block text-xs font-black uppercase text-[#E51924]">
                      {fulfillment === 'delivery' ? 'Delivery address' : 'Reserve onsite'}
                    </span>
                    {fulfillment === 'delivery' ? (
                      <input
                        className="w-full bg-transparent text-[16px] font-medium outline-none placeholder:text-[#9aa4ad]"
                        placeholder="Example: Bonanjo, street, landmark"
                        value={orderForm.deliveryAddress}
                        onChange={(e) => setOrderForm({ ...orderForm, deliveryAddress: e.target.value })}
                        minLength={3}
                        required
                      />
                    ) : (
                      <span className="block text-[16px] font-medium text-[#07142a]">You will come onsite to pick up the meal.</span>
                    )}
                    <span className="mt-1 block text-sm text-[#717680]">{fulfillment === 'delivery' ? 'Tell us where to deliver your order.' : 'No delivery details are needed for reserve orders.'}</span>
                  </span>
                  {fulfillment === 'delivery' ? <button type="button" className="grid h-9 w-9 place-items-center" onClick={useLocation} aria-label="Use current location">
                    <ChevronRight className="text-[#07142a]" size={22} />
                  </button> : null}
                </label>
                {fulfillment === 'delivery' ? <label className="flex w-full items-start gap-4 border-b border-[#edf0f2] px-6 py-4">
                  <User className="mt-1 shrink-0 text-black" size={24} fill="currentColor" />
                  <span className="min-w-0 flex-1">
                    <span className="mb-1 block text-xs font-black uppercase text-[#E51924]">Your name</span>
                    <input
                      className="min-w-0 flex-1 bg-transparent text-[16px] font-medium outline-none placeholder:text-[#9aa4ad]"
                      placeholder="Example: Amina N."
                      value={orderForm.customerName}
                      onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })}
                      minLength={2}
                      required
                    />
                    <span className="mt-1 block text-sm text-[#717680]">The restaurant will use this name for your order.</span>
                  </span>
                </label> : null}
                {fulfillment === 'delivery' ? <label className="flex w-full items-start gap-4 px-6 py-4">
                  <Phone className="mt-1 shrink-0 text-black" size={24} />
                  <span className="min-w-0 flex-1">
                    <span className="mb-1 block text-xs font-black uppercase text-[#E51924]">Phone number</span>
                    <input
                      className="min-w-0 flex-1 bg-transparent text-[16px] font-medium outline-none placeholder:text-[#9aa4ad]"
                      placeholder="Example: 671286999"
                      type="tel"
                      inputMode="tel"
                      value={orderForm.customerPhone}
                      onChange={(e) => setOrderForm({ ...orderForm, customerPhone: e.target.value })}
                      minLength={6}
                      required
                    />
                    <span className="mt-1 block text-sm text-[#717680]">We need this to confirm your order if necessary.</span>
                  </span>
                </label> : null}
              </div>
              <div className="mt-4 bg-white px-6 py-5">
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#edf0f2] bg-[#F8F9FB] p-4">
                  <input
                    className="mt-1 h-4 w-4 accent-[#E51924]"
                    type="checkbox"
                    checked={orderForm.isGift}
                    onChange={(event) => setOrderForm({ ...orderForm, isGift: event.target.checked })}
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-black text-[#171B25]">
                      <Gift size={17} className="text-[#E51924]" /> Order this meal for someone else
                    </span>
                    <span className="mt-1 block text-sm font-semibold text-[#717680]">Add their name and phone so the restaurant knows who should receive or collect the meal.</span>
                  </span>
                </label>
                {orderForm.isGift ? (
                  <div className="mt-4 grid gap-3">
                    <label className="block">
                      <span className="text-xs font-black uppercase text-[#E51924]">Loved one's name</span>
                      <input
                        className="input mt-1"
                        placeholder="Example: Nelly"
                        value={orderForm.recipientName}
                        onChange={(event) => setOrderForm({ ...orderForm, recipientName: event.target.value })}
                        minLength={2}
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-black uppercase text-[#E51924]">Loved one's phone</span>
                      <input
                        className="input mt-1"
                        type="tel"
                        inputMode="tel"
                        placeholder="Example: 671286999"
                        value={orderForm.recipientPhone}
                        onChange={(event) => setOrderForm({ ...orderForm, recipientPhone: event.target.value })}
                        minLength={6}
                        required
                      />
                    </label>
                    {fulfillment === 'delivery' ? (
                      <label className="block">
                        <span className="text-xs font-black uppercase text-[#E51924]">Loved one's delivery address</span>
                        <input
                          className="input mt-1"
                          placeholder="Where should we deliver their meal?"
                          value={orderForm.recipientAddress}
                          onChange={(event) => setOrderForm({ ...orderForm, recipientAddress: event.target.value })}
                          minLength={3}
                          required
                        />
                      </label>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center justify-between px-4 py-4 text-[16px]">
                <span>{fulfillment === 'delivery' ? 'Delivery time' : 'Reserve time'}</span>
                <span>{fulfillment === 'delivery' ? 'Confirmed by restaurant' : 'Restaurant confirmation'}</span>
              </div>
              <div className="px-6">
                <label className="text-[16px] leading-5 text-[#07142a]">Leave a message for the restaurant (optional)</label>
                <textarea
                  className="mt-2 h-28 w-full rounded-md border border-[#aeb6bd] bg-transparent px-3 py-2 text-sm outline-none"
                  placeholder="Example: less pepper, call before delivery, no onions"
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
              <div className="mt-7 px-6"><p className="mb-3 text-sm text-stone-500">Your order is saved with ChopASAP first. WhatsApp opens a prepared message for you to send and finalize arrangements.</p>
                <RedButton className="w-full rounded-md" disabled={submitting || !settings.publicOrdering || !cart.length}>
                  {submitting ? 'Saving your order?' : 'Place Order & Continue to WhatsApp'}
                </RedButton>
              </div>
            </form>
          ) : null}

          {checkoutStep === 'success' && confirmedOrder ? (
            <div className="order-confirmation" role="status">
              <Check size={40} className="text-green-600" /><h2>Order received</h2>
              <p>{confirmedOrder.orderNo}</p><p>{orderStatusLabels[confirmedOrder.status] || confirmedOrder.status}</p>
              <p>Your order is saved. Send the prepared WhatsApp message to finalize arrangements.</p>
              {confirmedOrder.items?.map(item => <p key={item.id}>{item.quantity} ? {item.menuItem?.name} ? {fcfa(item.total)}</p>)}
              <strong>{fcfa(confirmedOrder.total)}</strong>
              {orderWhatsAppUrl(confirmedOrder, settings.supportPhone) ? <a className="btn-primary" href={orderWhatsAppUrl(confirmedOrder, settings.supportPhone)} target="_blank" rel="noreferrer">Continue to WhatsApp</a> : <p>WhatsApp is unavailable. Your order is still saved.</p>}
              <button className="btn-secondary" onClick={() => { closeCheckout(); setSelectedOrder(confirmedOrder); setActiveTab('orders'); }}>View order</button>
              <button className="btn-secondary" onClick={goBackCheckout}>Continue shopping</button>
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
                <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#fff1ca]">
                  {promotionForm.imageUrl ? <img className="h-full w-full object-cover" src={promotionForm.imageUrl} alt="Promotion preview" /> : <ShoppingBag className="text-[#E51924]" size={24} />}
                </div>
                <label className="flex min-h-24 cursor-pointer flex-col justify-center rounded-xl border border-dashed border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#6f7a86]">
                  <span className="font-black text-[#171B25]">{promotionImageUploading ? promotionUploadStatus : promotionForm.imageUrl ? 'Image uploaded' : 'Upload image'}</span>
                  <span className="mt-1 text-xs">PNG, JPG, or WEBP up to 5MB.</span>
                  <input className="hidden" type="file" accept="image/*" disabled={promotionImageUploading} onChange={(e) => uploadPromotionImage(e.target.files?.[0])} />
                  {promotionImageUploading || promotionUploadStatus ? (
                    <span className="mt-3 block h-2 overflow-hidden rounded-full bg-stone-100">
                      <span className="block h-full rounded-full bg-[#E51924] transition-all" style={{ width: `${promotionUploadProgress}%` }} />
                    </span>
                  ) : null}
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
