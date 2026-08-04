import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  StatusBar as NativeStatusBar,
  useWindowDimensions,
  View
} from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { api, uploadCustomerAvatar, uploadPromotionImage } from './src/api';
import { t } from './src/i18n';

const logo = require('./assets/chopasap-logo.png');
const fallbackImage = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80';
const portalUrl = process.env.EXPO_PUBLIC_PORTAL_URL || 'https://your-domain.com';
const brandRed = '#d71920';
const customerKey = 'chopasap_mobile_customer';
const favoritesKey = 'chopasap_mobile_favorites';
const languageKey = 'chopasap_mobile_language';
const activeOrdersKey = 'chopasap_mobile_active_orders';
const flashSaleDismissedKey = 'chopasap_mobile_flash_sale_dismissed';

const emptyReservationForm = {
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  partySize: '2',
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

const supportFaqs = [
  {
    question: 'How does ChopASAP ordering work?',
    answer: 'Choose meals, confirm order details, then send the prepared WhatsApp message so the restaurant can process it quickly.'
  },
  {
    question: 'Do I pay inside the app?',
    answer: 'No. ChopASAP sends the order first. The restaurant confirms payment or reserve details directly with you.'
  },
  {
    question: 'Can I reserve a meal or table?',
    answer: 'Yes. Use the reservation action and the restaurant team will confirm your request.'
  },
  {
    question: 'How do flash sale codes work?',
    answer: 'Copy or share the code shown in the app and present it at the restaurant, subject to the offer terms.'
  }
];

const formatMoney = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const cleanPhone = (phone = '') => String(phone).replace(/\D/g, '');
const mealVariations = (item) => (Array.isArray(item?.variations) ? item.variations.filter((variation) => variation?.name) : []);
const mealPrice = (item, variationName) => Number(mealVariations(item).find((entry) => entry.name === variationName)?.price || item?.price || 0);
const cartKeyFor = (id, variationName) => `${id}:${variationName || 'base'}`;
const orderItemTotal = (item) => Number(item.total ?? Number(item.price || item.unitPrice || 0) * Number(item.quantity || 0));
const orderItemName = (item) => item.menuItem?.name || item.name || 'Menu item';

function RewardRank(points = 0) {
  const value = Number(points || 0);
  if (value >= 150) return { title: 'ChopASAP Royalty', next: 'Top customer tier unlocked' };
  if (value >= 50) return { title: 'Taste Champion', next: `${150 - value} points to ChopASAP Royalty` };
  return { title: 'Food Explorer', next: `${50 - value} points to Taste Champion` };
}

const customerFacingMarketingTypes = ['HOMEPAGE_BANNER', 'CAMPAIGN', 'FLASH_DEAL', 'FEATURED_RESTAURANT', 'ANNOUNCEMENT', 'COUPON'];
const fallbackPromotionSlide = {
  id: 'default-home-offer',
  label: 'ChopASAP',
  title: 'Fresh meals, offers, and rewards will appear here',
  description: 'Check back for active campaigns, flash deals, and featured restaurant offers.'
};

const rewardClaimTypes = ['DAILY_REWARD', 'DAILY_STREAK', 'LOYALTY_PROGRAM', 'CHALLENGE', 'REFERRAL_PROGRAM'];

function campaignActionFor(slide = {}) {
  const text = `${slide.type || ''} ${slide.title || ''} ${slide.ctaLabel || ''} ${slide.deepLink || ''}`.toLowerCase();
  if (rewardClaimTypes.includes(slide.type) || text.includes('reward') || text.includes('claim') || text.includes('point') || text.includes('streak')) return 'reward';
  if (slide.type === 'FLASH_DEAL' || text.includes('flash') || text.includes('deal') || text.includes('offer')) return 'flash';
  if (text.includes('support') || text.includes('promote')) return 'support';
  return 'meals';
}

function Loader({ label = 'Loading' }) {
  return (
    <View style={styles.loader}>
      <View style={styles.loaderPlate}>
        <Image source={logo} style={styles.loaderLogo} />
        <View style={styles.loaderHands}>
          <View style={styles.hand} />
          <View style={[styles.hand, styles.handRight]} />
        </View>
        <ActivityIndicator color={brandRed} size="large" style={styles.loaderSpinner} />
        <Text style={styles.loaderTitle}>{label}</Text>
        <Text style={styles.loaderText}>Fresh meals are landing.</Text>
      </View>
    </View>
  );
}

function LanguagePrompt({ visible, language, onChoose }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.languageCard}>
          <View style={styles.languageIcon}>
            <Ionicons name="language" size={30} color={brandRed} />
          </View>
          <Text style={styles.modalTitle}>{t(language, 'chooseLanguage')}</Text>
          <Text style={styles.mutedCenter}>{t(language, 'chooseLanguageHint')}</Text>
          <Pressable style={[styles.languageOption, language === 'en' && styles.languageOptionActive]} onPress={() => onChoose('en')}>
            <Text style={[styles.languageOptionText, language === 'en' && styles.languageOptionTextActive]}>English</Text>
          </Pressable>
          <Pressable style={[styles.languageOption, language === 'fr' && styles.languageOptionActive]} onPress={() => onChoose('fr')}>
            <Text style={[styles.languageOptionText, language === 'fr' && styles.languageOptionTextActive]}>Français</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function CustomerGate({ language, form, setForm, saving, onSubmit }) {
  const complete = form.name.trim().length >= 2 && form.phone.trim().length >= 6;
  return (
    <View style={styles.gate}>
      <View style={styles.gateCard}>
        <View style={styles.gateHeader}>
          <Image source={logo} style={styles.gateLogo} />
          <Text style={styles.gateTitle}>{t(language, 'welcome')}</Text>
          <Text style={styles.gateCopy}>{t(language, 'enterDetails')}</Text>
        </View>
        <View style={styles.formBody}>
          <Field label={t(language, 'name')} value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder="Amina N." />
          <Field label={t(language, 'phone')} value={form.phone} onChangeText={(phone) => setForm({ ...form, phone })} placeholder="671286999" keyboardType="phone-pad" />
          <Field label={t(language, 'addressOptional')} value={form.address} onChangeText={(address) => setForm({ ...form, address })} placeholder="Bonanjo, near..." />
          {form.referralCode ? <Text style={styles.referralBadge}>{t(language, 'referralActive')}</Text> : null}
          <Pressable style={[styles.primaryButton, (!complete || saving) && styles.disabled]} disabled={!complete || saving} onPress={onSubmit}>
            <Text style={styles.primaryButtonText}>{saving ? t(language, 'checking') : t(language, 'continue')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Field({ label, style, ...props }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor="#9aa4ad" {...props} />
    </View>
  );
}

function MealCard({ item, favorite, onOpen, onFavorite, onShare }) {
  return (
    <Pressable style={styles.mealCard} onPress={() => onOpen(item)}>
      <Image source={{ uri: item.imageUrl || fallbackImage }} style={styles.mealImage} />
      <Pressable style={styles.shareButton} onPress={() => onShare(item)}>
        <Ionicons name="share-social-outline" size={18} color="#29384d" />
      </Pressable>
      <Pressable style={styles.favoriteButton} onPress={() => onFavorite(item.id)}>
        <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={18} color={favorite ? brandRed : '#666'} />
      </Pressable>
      <View style={styles.mealBody}>
        <Text style={styles.mealName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.mealMeta}>{item.category?.name || 'Kitchen'}</Text>
        <View style={styles.mealFooter}>
          <Text style={styles.mealPrice}>{formatMoney(item.price)}</Text>
          <View style={styles.addCircle}>
            <Ionicons name="add" size={20} color="#fff" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function MealDetail({ item, visible, customer, settings, language, onClose, onAdd, onShare }) {
  const [quantity, setQuantity] = useState(1);
  const variations = mealVariations(item);
  const [variation, setVariation] = useState('');
  const [reviews, setReviews] = useState([]);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    setQuantity(1);
    setVariation('');
    setShowAllReviews(false);
  }, [item?.id]);

  useEffect(() => {
    if (!visible || !item?.id) return;
    api.mealReviews(item.id)
      .then((data) => setReviews(data.items || []))
      .catch(() => setReviews(item.reviews || []));
  }, [visible, item?.id]);

  if (!item) return null;
  const price = mealPrice(item, variation);
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 2);
  const averageRating = reviews.length
    ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)
    : item.averageRating || 0;

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.detailScreen}>
        <ScrollView contentContainerStyle={styles.detailContent}>
          <Image source={{ uri: item.imageUrl || fallbackImage }} style={styles.detailImage} />
          <Pressable style={[styles.detailIcon, styles.detailShare]} onPress={() => onShare(item)}>
            <Ionicons name="share-social-outline" size={22} color="#07142a" />
          </Pressable>
          <Pressable style={styles.detailIcon} onPress={onClose}>
            <Ionicons name="close" size={24} color="#07142a" />
          </Pressable>
          <View style={styles.detailBody}>
            <Text style={styles.detailTitle}>{item.name}</Text>
            <Text style={styles.detailPrice}>{formatMoney(price)}</Text>
            <View style={styles.restaurantInfoCard}>
              <Image source={logo} style={styles.restaurantLogo} />
              <View style={styles.restaurantInfoText}>
                <Text style={styles.restaurantName}>{settings?.restaurantName || 'ChopASAP'}</Text>
                <Text style={styles.restaurantMeta}>{t(language, 'restaurantKitchen')}</Text>
              </View>
              <View style={styles.openBadge}><Text style={styles.openBadgeText}>{settings?.publicOrdering === false ? 'Closed' : 'Open now'}</Text></View>
            </View>
            <Text style={styles.detailCopy}>{item.description || 'Freshly prepared ChopASAP meal served hot for reserve or delivery.'}</Text>
            {variations.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t(language, 'extrasAndVariations')}</Text>
                <Text style={styles.optionHelp}>{t(language, 'optionalAddons')}</Text>
                {variations.map((entry) => (
                  <Pressable key={entry.name} style={[styles.variationCard, variation === entry.name && styles.variationCardActive]} onPress={() => setVariation(variation === entry.name ? '' : entry.name)}>
                    <Ionicons name={variation === entry.name ? 'radio-button-on' : 'radio-button-off'} size={20} color={brandRed} />
                    <View style={styles.variationTextBox}>
                      <Text style={styles.optionText}>{entry.name}</Text>
                      <Text style={styles.mealMeta}>{formatMoney(entry.price || item.price)}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <View style={styles.reviewSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{t(language, 'mealReviews')}</Text>
                <Text style={styles.reviewScore}>{averageRating ? `${averageRating} ★` : 'No ratings'}</Text>
              </View>
              {visibleReviews.length ? visibleReviews.map((review) => (
                <View key={review.id || `${review.customerName}-${review.createdAt}`} style={styles.reviewCard}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.cardTitle}>{review.customerName}</Text>
                    <Text style={styles.reviewStars}>{'★'.repeat(Number(review.rating || 0))}</Text>
                  </View>
                  {review.comment ? <Text style={styles.cardCopy}>{review.comment}</Text> : null}
                </View>
              )) : <Text style={styles.cardCopy}>{t(language, 'noReviewsYet')}</Text>}
              {reviews.length > 2 ? (
                <Pressable style={styles.linkButton} onPress={() => setShowAllReviews((current) => !current)}>
                  <Text style={styles.linkButtonText}>{showAllReviews ? 'Show fewer reviews' : 'See all reviews'}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </ScrollView>
        <View style={styles.detailFooter}>
          <View style={styles.qtyBox}>
            <Pressable onPress={() => setQuantity(Math.max(1, quantity - 1))}><Ionicons name="remove" size={18} /></Pressable>
            <Text style={styles.qtyText}>{quantity}</Text>
            <Pressable onPress={() => setQuantity(quantity + 1)}><Ionicons name="add" size={18} /></Pressable>
          </View>
          <Pressable style={[styles.primaryButton, styles.detailAddButton]} onPress={() => onAdd(item, quantity, variation)}>
            <Text style={styles.primaryButtonText}>{t('en', 'addToCart')} {formatMoney(price * quantity)}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function StatPill({ icon, label, value }) {
  return (
    <View style={styles.statPill}>
      <Ionicons name={icon} size={21} color={brandRed} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function App() {
  const [language, setLanguage] = useState('en');
  const [languagePrompt, setLanguagePrompt] = useState(false);
  const [tab, setTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', address: '', email: '', referralCode: '' });
  const [items, setItems] = useState([]);
  const [menuCategories, setMenuCategories] = useState([]);
  const [settings, setSettings] = useState({});
  const [promotions, setPromotions] = useState([]);
  const [marketing, setMarketing] = useState({ items: [], hero: null, floatingRewards: [], flashDeal: null });
  const [flashSale, setFlashSale] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState('cart');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [homeCategoryLimit, setHomeCategoryLimit] = useState(3);
  const [reservationOpen, setReservationOpen] = useState(false);
  const [promotionOpen, setPromotionOpen] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [flashSaleOpen, setFlashSaleOpen] = useState(false);
  const [fulfillment, setFulfillment] = useState('delivery');
  const [orderForm, setOrderForm] = useState({ customerName: '', customerPhone: '', customerEmail: '', deliveryAddress: '', deliveryNote: '', isGift: false, recipientName: '', recipientPhone: '', recipientAddress: '' });
  const [reservationForm, setReservationForm] = useState(emptyReservationForm);
  const [promotionForm, setPromotionForm] = useState(emptyPromotionForm);
  const [profileTab, setProfileTab] = useState('referral');
  const [refreshing, setRefreshing] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [rewardClaimingId, setRewardClaimingId] = useState('');
  const [rewardClaim, setRewardClaim] = useState(null);
  const activeOrderPulse = useRef(new Animated.Value(1)).current;
  const rewardBurst = useRef(new Animated.Value(0)).current;

  const filteredItems = useMemo(() => items.filter((item) => `${item.name} ${item.category?.name || ''}`.toLowerCase().includes(search.toLowerCase())), [items, search]);
  const favoriteItems = useMemo(() => items.filter((item) => favorites.includes(item.id)), [items, favorites]);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = fulfillment === 'delivery' ? Number(settings.deliveryFee || 0) : 0;
  const serviceFee = Number(settings.serviceFee || 0);
  const total = subtotal + deliveryFee + serviceFee;
  const referralLink = customer?.referralCode ? `${portalUrl}/?ref=${customer.referralCode}` : '';
  const rank = RewardRank(customer?.points);
  const activeOrderCount = activeOrders.filter((order) => !['DELIVERED', 'CANCELLED'].includes(order.status)).length;

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    if (!activeOrderCount) return undefined;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(activeOrderPulse, { toValue: 0.35, duration: 650, useNativeDriver: true }),
        Animated.timing(activeOrderPulse, { toValue: 1, duration: 650, useNativeDriver: true })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [activeOrderCount, activeOrderPulse]);

  useEffect(() => {
    AsyncStorage.setItem(favoritesKey, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    AsyncStorage.setItem(activeOrdersKey, JSON.stringify(activeOrders.slice(0, 10)));
  }, [activeOrders]);

  useEffect(() => {
    if (!activeOrders.length) return undefined;
    const timer = setInterval(async () => {
      const trackable = activeOrders.filter((order) => order.id && !['DELIVERED', 'CANCELLED'].includes(order.status));
      if (!trackable.length) return;
      const refreshed = await Promise.all(trackable.map((order) => api.order(order.id).catch(() => order)));
      setActiveOrders((current) =>
        current.map((order) => refreshed.find((entry) => entry.id === order.id) || order)
      );
    }, 30000);
    return () => clearInterval(timer);
  }, [activeOrders]);

  const bootstrap = async () => {
    try {
      const [savedCustomer, savedFavorites, savedLanguage, savedActiveOrders, dismissedFlashSale, initialUrl] = await Promise.all([
        AsyncStorage.getItem(customerKey),
        AsyncStorage.getItem(favoritesKey),
        AsyncStorage.getItem(languageKey),
        AsyncStorage.getItem(activeOrdersKey),
        AsyncStorage.getItem(flashSaleDismissedKey),
        Linking.getInitialURL()
      ]);
      const nextLanguage = savedLanguage || 'en';
      setLanguage(nextLanguage);
      setLanguagePrompt(!savedLanguage);
      if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
      if (savedActiveOrders) setActiveOrders(JSON.parse(savedActiveOrders));
      if (savedCustomer) {
        const parsed = JSON.parse(savedCustomer);
        setCustomer(parsed);
        setCustomerForm({ name: parsed.name || '', phone: parsed.phone || '', email: parsed.email || '', address: parsed.address || '', profileImageUrl: parsed.profileImageUrl || '', referralCode: parsed.referralCode || '' });
        refreshCustomer(parsed)
          .then((freshCustomer) => loadOrders(freshCustomer?.id || parsed.id))
          .catch(() => loadOrders(parsed.id));
      } else {
        const params = Linking.parse(initialUrl || '').queryParams || {};
        setCustomerForm((current) => ({ ...current, referralCode: params.ref || '' }));
      }

      const [menuData, settingsData, promotionData, marketingData, flashSaleData] = await Promise.all([
        api.menu(),
        api.settings().catch(() => ({})),
        api.promotions().catch(() => ({ items: [] })),
        api.marketing().catch(() => ({ items: [], hero: null, floatingRewards: [], flashDeal: null })),
        api.flashSale().catch(() => ({ item: null }))
      ]);
      setItems(menuData.items || []);
      setMenuCategories(menuData.categories || []);
      setSettings(settingsData || {});
      setPromotions(promotionData.items || []);
      setMarketing(marketingData || { items: [], hero: null, floatingRewards: [], flashDeal: null });
      setFlashSale(flashSaleData.item || null);
      if (flashSaleData.item?.id && dismissedFlashSale !== flashSaleData.item.id) {
        setFlashSaleOpen(true);
      }
      const mealId = Linking.parse(initialUrl || '').queryParams?.meal;
      if (mealId) {
        const sharedMeal = (menuData.items || []).find((item) => item.id === mealId);
        if (sharedMeal) setSelectedMeal(sharedMeal);
      }
    } catch (error) {
      Alert.alert('ChopASAP', error.message);
    } finally {
      setLoading(false);
    }
  };

  const chooseLanguage = async (nextLanguage) => {
    setLanguage(nextLanguage);
    setLanguagePrompt(false);
    await AsyncStorage.setItem(languageKey, nextLanguage);
  };

  const saveCustomer = async (nextCustomer) => {
    const saved = { ...nextCustomer, orderCount: nextCustomer.orderCount || 0 };
    setCustomer(saved);
    setCustomerForm({ name: saved.name || '', phone: saved.phone || '', email: saved.email || '', address: saved.address || '', profileImageUrl: saved.profileImageUrl || '', referralCode: saved.referralCode || '' });
    setOrderForm((current) => ({
      ...current,
      customerName: saved.name || current.customerName,
      customerPhone: saved.phone || current.customerPhone,
      customerEmail: saved.email || current.customerEmail,
      deliveryAddress: saved.address || current.deliveryAddress
    }));
    await AsyncStorage.setItem(customerKey, JSON.stringify(saved));
  };

  const refreshCustomer = async (currentCustomer = customer) => {
    if (!currentCustomer?.name || !currentCustomer?.phone) return null;
    const response = await api.customerSession({
      name: currentCustomer.name,
      phone: currentCustomer.phone,
      email: currentCustomer.email || '',
      address: currentCustomer.address || '',
      referralCode: currentCustomer.referralCode || ''
    });
    await saveCustomer(response);
    return response;
  };

  const submitCustomer = async () => {
    setSaving(true);
    try {
      const response = await api.customerSession(customerForm);
      await saveCustomer(response);
      await loadOrders(response.id);
    } catch (error) {
      Alert.alert('ChopASAP', error.message);
    } finally {
      setSaving(false);
    }
  };

  const loadOrders = async (customerId = customer?.id) => {
    if (!customerId) return;
    try {
      const response = await api.customerOrders(customerId);
      setOrders(response.items || []);
    } catch {
      setOrders([]);
    }
  };

  const refreshApp = async () => {
    setRefreshing(true);
    try {
      const [menuData, settingsData, promotionData, marketingData, flashSaleData] = await Promise.all([
        api.menu(),
        api.settings().catch(() => settings),
        api.promotions().catch(() => ({ items: promotions })),
        api.marketing().catch(() => marketing),
        api.flashSale().catch(() => ({ item: flashSale }))
      ]);
      setItems(menuData.items || []);
      setMenuCategories(menuData.categories || []);
      setSettings(settingsData || {});
      setPromotions(promotionData.items || []);
      setMarketing(marketingData || { items: [], hero: null, floatingRewards: [], flashDeal: null });
      setFlashSale(flashSaleData.item || null);
      if (customer?.id) {
        const freshCustomer = await refreshCustomer(customer).catch(() => null);
        await loadOrders(freshCustomer?.id || customer.id);
      }
      if (activeOrders.length) {
        const refreshed = await Promise.all(activeOrders.map((order) => (order.id ? api.order(order.id).catch(() => order) : order)));
        setActiveOrders(refreshed);
      }
    } catch (error) {
      Alert.alert('ChopASAP', error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const toggleFavorite = (id) => {
    setFavorites((current) => (current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]));
  };

  const shareMeal = async (item) => {
    await Share.share({
      title: item.name,
      message: `Order ${item.name} on ChopASAP: ${portalUrl}/?meal=${item.id}`
    });
  };

  const shareReferral = async () => {
    if (!referralLink) return;
    await Share.share({ title: 'ChopASAP', message: referralLink });
  };

  const claimReward = async (reward) => {
    if (!customer?.id || !reward?.id) return;
    setRewardClaimingId(reward.id);
    try {
      const result = await api.claimReward(reward.id, { customerId: customer.id });
      if (result.customer) await saveCustomer(result.customer);
      setRewardClaim({ ...result, reward });
      rewardBurst.setValue(0);
      Animated.sequence([
        Animated.spring(rewardBurst, { toValue: 1, useNativeDriver: true, friction: 4, tension: 90 }),
        Animated.timing(rewardBurst, { toValue: 0, duration: 900, useNativeDriver: true })
      ]).start();
    } catch (error) {
      Alert.alert('ChopASAP', error.message);
    } finally {
      setRewardClaimingId('');
    }
  };

  const addToCart = (item, quantity = 1, variationName = '') => {
    const cartItemId = cartKeyFor(item.id, variationName);
    const price = mealPrice(item, variationName);
    setCart((current) => {
      const existing = current.find((entry) => entry.cartItemId === cartItemId);
      if (existing) return current.map((entry) => (entry.cartItemId === cartItemId ? { ...entry, quantity: entry.quantity + quantity } : entry));
      return [...current, { cartItemId, menuItemId: item.id, name: item.name, imageUrl: item.imageUrl, quantity, variationName, price }];
    });
    setSelectedMeal(null);
  };

  const updateQty = (id, delta) => {
    setCart((current) => current.map((item) => (item.cartItemId === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item)).filter((item) => item.quantity > 0));
  };

  const buildWhatsappMessage = (order, submittedCart, submittedCustomer) => [
    `New order ${order.orderNo}`,
    `Customer: ${submittedCustomer.customerName}`,
    `Phone: ${submittedCustomer.customerPhone}`,
    `Address: ${submittedCustomer.deliveryAddress}`,
    submittedCustomer.isGift ? `For: ${submittedCustomer.recipientName} (${submittedCustomer.recipientPhone})` : '',
    submittedCustomer.isGift && submittedCustomer.recipientAddress ? `Recipient address: ${submittedCustomer.recipientAddress}` : '',
    submittedCustomer.deliveryNote ? `Note: ${submittedCustomer.deliveryNote}` : '',
    '',
    'Items:',
    ...(order.items?.length ? order.items : submittedCart).map((item) => `- ${item.quantity} x ${orderItemName(item)}${item.variationName ? ` (${item.variationName})` : ''}: ${formatMoney(orderItemTotal(item))}`),
    '',
    `Delivery fee: ${formatMoney(deliveryFee)}`,
    `Total: ${formatMoney(order.total || total)}`
  ].filter(Boolean).join('\n');

  const submitOrder = async () => {
    if (!cart.length) return Alert.alert('ChopASAP', t(language, 'emptyCart'));
    if (fulfillment === 'delivery' && !orderForm.deliveryAddress.trim()) return Alert.alert('ChopASAP', t(language, 'deliveryAddress'));
    if (orderForm.isGift && (!orderForm.recipientName.trim() || !orderForm.recipientPhone.trim())) return Alert.alert('ChopASAP', t(language, 'orderForLovedOne'));
    if (orderForm.isGift && fulfillment === 'delivery' && !orderForm.recipientAddress.trim()) return Alert.alert('ChopASAP', t(language, 'recipientAddress'));
    const customerName = customer?.name || orderForm.customerName;
    const customerPhone = customer?.phone || orderForm.customerPhone;
    if (!customerName?.trim()) return Alert.alert('ChopASAP', t(language, 'name'));
    if (!customerPhone?.trim()) return Alert.alert('ChopASAP', t(language, 'phone'));

    setSaving(true);
    try {
      const submittedCart = cart;
      const submittedCustomer = {
        customerName,
        customerPhone,
        customerEmail: customer?.email || orderForm.customerEmail || '',
        deliveryAddress: fulfillment === 'delivery' ? orderForm.deliveryAddress : 'Reserve onsite',
        deliveryNote: orderForm.deliveryNote,
        isGift: orderForm.isGift,
        recipientName: orderForm.recipientName,
        recipientPhone: orderForm.recipientPhone,
        recipientAddress: orderForm.recipientAddress
      };
      const order = await api.createOrder({
        ...submittedCustomer,
        customerId: customer?.id,
        deliveryFee,
        items: cart.map(({ menuItemId, quantity, variationName }) => ({ menuItemId, quantity, variationName }))
      });
      setCart([]);
      setCheckoutSuccess(order);
      setActiveOrders((current) => [order, ...current.filter((entry) => entry.id !== order.id)].slice(0, 10));
      if (order.customer) {
        await saveCustomer(order.customer);
        await loadOrders(order.customer.id);
      } else if (customer?.id) {
        const freshCustomer = await refreshCustomer(customer).catch(() => null);
        await loadOrders(freshCustomer?.id || customer.id);
      }
      const phone = cleanPhone(settings.supportPhone);
      if (phone) {
        Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(buildWhatsappMessage(order, submittedCart, submittedCustomer))}`);
      } else {
        Alert.alert('ChopASAP', t(language, 'orderPlaced'));
      }
    } catch (error) {
      Alert.alert('ChopASAP', error.message);
    } finally {
      setSaving(false);
    }
  };

  const submitReservation = async () => {
    if (!reservationForm.customerName.trim() || !reservationForm.customerPhone.trim() || !reservationForm.reservationAt) {
      return Alert.alert('ChopASAP', 'Name, phone, and reserve time are required.');
    }
    setSaving(true);
    try {
      await api.createReservation({
        ...reservationForm,
        partySize: Number(reservationForm.partySize || 1)
      });
      setReservationOpen(false);
      setReservationForm(emptyReservationForm);
      Alert.alert('ChopASAP', 'Reservation request sent.');
    } catch (error) {
      Alert.alert('ChopASAP', error.message);
    } finally {
      setSaving(false);
    }
  };

  const pickPromotionImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85 });
    if (result.canceled) return;
    setSaving(true);
    try {
      const uploaded = await uploadPromotionImage(result.assets[0]);
      setPromotionForm((current) => ({ ...current, imageUrl: uploaded.url }));
    } catch (error) {
      Alert.alert('ChopASAP', error.message);
    } finally {
      setSaving(false);
    }
  };

  const submitPromotion = async () => {
    const required = ['businessName', 'contactName', 'contactPhone', 'title', 'description'];
    if (required.some((key) => !promotionForm[key].trim())) {
      return Alert.alert('ChopASAP', 'Business, contact, title, and description are required.');
    }
    setSaving(true);
    try {
      await api.submitPromotionRequest(promotionForm);
      setPromotionOpen(false);
      setPromotionForm(emptyPromotionForm);
      Alert.alert('ChopASAP', 'Promotion request submitted.');
    } catch (error) {
      Alert.alert('ChopASAP', error.message);
    } finally {
      setSaving(false);
    }
  };

  const dismissFlashSale = async () => {
    if (flashSale?.id) await AsyncStorage.setItem(flashSaleDismissedKey, flashSale.id);
    setFlashSaleOpen(false);
  };

  const shareFlashSale = async () => {
    if (!flashSale) return;
    await Share.share({
      title: flashSale.title,
      message: `${flashSale.title}: use code ${flashSale.code} on ChopASAP.`
    });
    await dismissFlashSale();
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
    if (result.canceled || !customer?.id) return;
    setSaving(true);
    try {
      const uploaded = await uploadCustomerAvatar(result.assets[0]);
      const updated = await api.updateCustomer(customer.id, { profileImageUrl: uploaded.url });
      await saveCustomer(updated);
    } catch (error) {
      Alert.alert('ChopASAP', error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateProfile = async () => {
    setSaving(true);
    try {
      const updated = await api.updateCustomer(customer.id, customerForm);
      await saveCustomer(updated);
    } catch (error) {
      Alert.alert('ChopASAP', error.message);
    } finally {
      setSaving(false);
    }
  };

  const switchAccount = async () => {
    await AsyncStorage.removeItem(customerKey);
    await AsyncStorage.removeItem(activeOrdersKey);
    setCustomer(null);
    setOrders([]);
    setActiveOrders([]);
    setCart([]);
    setProfileOpen(false);
    setCustomerForm({ name: '', phone: '', email: '', address: '', profileImageUrl: '', referralCode: '' });
  };

  if (loading) return <Loader label="Loading ChopASAP" />;

  return (
    <SafeAreaView style={styles.safe}>
      <SafeAreaView style={styles.appSafe}>
        <StatusBar style="dark" />
        <LanguagePrompt visible={languagePrompt} language={language} onChoose={chooseLanguage} />
        {!customer ? (
          <CustomerGate language={language} form={customerForm} setForm={setCustomerForm} saving={saving} onSubmit={submitCustomer} />
        ) : (
          <>
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <Image source={logo} style={styles.logo} />
              <View>
                <Text style={styles.brand}>CHOP ASAP</Text>
                <Text style={styles.location} numberOfLines={1}>{orderForm.deliveryAddress || customer.address || 'Choose delivery location'}</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              {flashSale ? (
              <Pressable style={styles.headerIconButton} onPress={() => setFlashSaleOpen(true)}>
                <Ionicons name="pricetag-outline" size={21} color={brandRed} />
              </Pressable>
            ) : null}
              <Pressable style={styles.headerIconButton} onPress={() => {
                setCheckoutStep('cart');
                setCheckoutOpen(true);
              }}>
                <Ionicons name="bag-outline" size={21} color="#29384d" />
                {cart.length ? <Text style={styles.cartBadge}>{cart.reduce((sum, item) => sum + item.quantity, 0)}</Text> : null}
              </Pressable>
              <Pressable style={styles.profileButton} onPress={() => setProfileOpen(true)}>
                {customer.profileImageUrl ? <Image source={{ uri: customer.profileImageUrl }} style={styles.profileButtonImage} /> : <Ionicons name="person-outline" size={21} color="#29384d" />}
              </Pressable>
            </View>
          </View>

          {['home', 'meals', 'favorites'].includes(tab) ? (
            <View style={styles.searchBox}>
              <TextInput style={styles.searchInput} placeholder={t(language, 'search')} placeholderTextColor="#9aa4ad" value={search} onChangeText={setSearch} />
              <Ionicons name="search" size={21} color={brandRed} />
            </View>
          ) : null}

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentBody}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshApp} colors={[brandRed]} tintColor={brandRed} />}
            scrollEventThrottle={200}
            onScroll={({ nativeEvent }) => {
              if (tab !== 'home') return;
              const distanceFromBottom = nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height - nativeEvent.contentOffset.y;
              if (distanceFromBottom < 280) {
                setHomeCategoryLimit((current) => current + 2);
              }
            }}
          >
            {tab === 'home' ? (
              <HomeView
                items={filteredItems}
                menuCategories={menuCategories}
                categoryLimit={homeCategoryLimit}
                favorites={favorites}
                promotions={promotions}
                marketing={marketing}
                flashSale={flashSale}
                language={language}
                onOpen={setSelectedMeal}
                onFavorite={toggleFavorite}
                onShare={shareMeal}
                onFlashSale={() => setFlashSaleOpen(true)}
                onCampaignAction={(action) => {
                  if (action === 'reward') {
                    setRewardOpen(true);
                    return;
                  }
                  if (action === 'flash') {
                    if (flashSale || marketing.flashDeal) setFlashSaleOpen(true);
                    else setTab('meals');
                    return;
                  }
                  setTab(action === 'support' ? 'support' : 'meals');
                }}
              />
            ) : null}
            {tab === 'meals' ? <MealsView title={t(language, 'meals')} items={filteredItems} favorites={favorites} onOpen={setSelectedMeal} onFavorite={toggleFavorite} onShare={shareMeal} language={language} /> : null}
            {tab === 'favorites' ? <MealsView title={t(language, 'favorites')} items={favoriteItems} favorites={favorites} onOpen={setSelectedMeal} onFavorite={toggleFavorite} onShare={shareMeal} language={language} /> : null}
            {tab === 'orders' ? <OrdersView orders={orders} activeOrders={activeOrders} language={language} statusFilter={orderStatusFilter} onFilter={setOrderStatusFilter} onOpen={setSelectedOrder} /> : null}
            {tab === 'support' ? <SupportView settings={settings} language={language} onReserve={() => setReservationOpen(true)} onPromote={() => setPromotionOpen(true)} /> : null}
          </ScrollView>

          <BottomTabs tab={tab} setTab={setTab} language={language} activeOrderCount={activeOrderCount} pulse={activeOrderPulse} />
          {marketing.floatingRewards?.length ? (
            <Pressable style={styles.rewardFab} onPress={() => setRewardOpen(true)}>
              <Ionicons name="gift-outline" size={24} color="#fff" />
            </Pressable>
          ) : null}
          <MealDetail item={selectedMeal} visible={Boolean(selectedMeal)} customer={customer} settings={settings} language={language} onClose={() => setSelectedMeal(null)} onAdd={addToCart} onShare={shareMeal} />
          <CheckoutModal
            visible={checkoutOpen}
            language={language}
            cart={cart}
            step={checkoutStep}
            setStep={setCheckoutStep}
            fulfillment={fulfillment}
            setFulfillment={setFulfillment}
            orderForm={orderForm}
            setOrderForm={setOrderForm}
            updateQty={updateQty}
            subtotal={subtotal}
            deliveryFee={deliveryFee}
            serviceFee={serviceFee}
            total={total}
            saving={saving}
            onClose={() => setCheckoutOpen(false)}
            onShop={() => {
              setCheckoutOpen(false);
              setTab('meals');
            }}
            onSubmit={submitOrder}
          />
          <ProfileModal
            visible={profileOpen}
            onClose={() => setProfileOpen(false)}
            customer={customer}
            customerForm={customerForm}
            setCustomerForm={setCustomerForm}
            language={language}
            chooseLanguage={chooseLanguage}
            profileTab={profileTab}
            setProfileTab={setProfileTab}
            rank={rank}
            orders={orders}
            referralLink={referralLink}
            saving={saving}
            onShareReferral={shareReferral}
            onPickAvatar={pickAvatar}
            onUpdateProfile={updateProfile}
            onSwitchAccount={switchAccount}
          />
          <SuccessModal
            visible={Boolean(checkoutSuccess)}
            language={language}
            order={checkoutSuccess}
            onClose={() => {
              setCheckoutSuccess(null);
              setCheckoutOpen(false);
              setTab('home');
            }}
          />
          <FlashSaleModal visible={flashSaleOpen} code={flashSale} onClose={dismissFlashSale} onShare={shareFlashSale} />
          <RewardModal
            visible={rewardOpen}
            rewards={marketing.floatingRewards || []}
            claim={rewardClaim}
            claimingId={rewardClaimingId}
            burst={rewardBurst}
            onClaim={claimReward}
            onClose={() => setRewardOpen(false)}
          />
          <OrderDetailModal visible={Boolean(selectedOrder)} order={selectedOrder} language={language} onClose={() => setSelectedOrder(null)} />
          <ReservationModal visible={reservationOpen} language={language} form={reservationForm} setForm={setReservationForm} saving={saving} onClose={() => setReservationOpen(false)} onSubmit={submitReservation} />
          <PromotionModal visible={promotionOpen} language={language} form={promotionForm} setForm={setPromotionForm} saving={saving} onPickImage={pickPromotionImage} onClose={() => setPromotionOpen(false)} onSubmit={submitPromotion} />
          </>
        )}
      </SafeAreaView>
    </SafeAreaView>
  );
}

function LegacyHomeView({ items, favorites, promotions, activeOrders, flashSale, language, onOpen, onFavorite, onShare, onReserve, onPromote, onFlashSale }) {
  const featuredPromotion = promotions[0];
  return (
    <View>
      {flashSale ? (
        <Pressable style={styles.flashBanner} onPress={onFlashSale}>
          <View style={styles.flashIcon}><Ionicons name="flash" size={22} color="#fff" /></View>
          <View style={styles.flashCopy}>
            <Text style={styles.flashTitle}>{flashSale.title}</Text>
            <Text style={styles.flashText}>Use code {flashSale.code} for {flashSale.discountPercent || 10}% off onsite.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#151923" />
        </Pressable>
      ) : null}

      <View style={styles.actionRow}>
        <Pressable style={styles.actionButton} onPress={onReserve}>
          <Ionicons name="calendar-outline" size={19} color={brandRed} />
          <Text style={styles.actionText}>Reserve</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={onPromote}>
          <Ionicons name="megaphone-outline" size={19} color={brandRed} />
          <Text style={styles.actionText}>Promote</Text>
        </Pressable>
      </View>

      <View style={styles.promoCard}>
        {featuredPromotion?.imageUrl ? <Image source={{ uri: featuredPromotion.imageUrl }} style={styles.promoImage} /> : <View style={styles.promoImageFallback}><Ionicons name="sparkles-outline" size={32} color={brandRed} /></View>}
        <View style={styles.promoBody}>
          <Text style={styles.promoEyebrow}>Featured promotion</Text>
          <Text style={styles.promoTitle}>{featuredPromotion?.title || 'Promote on ChopASAP'}</Text>
          <Text style={styles.cardCopy}>{featuredPromotion?.description || 'Put your business in front of customers ordering meals today.'}</Text>
          <Pressable style={styles.secondaryButton} onPress={featuredPromotion?.ctaUrl ? () => Linking.openURL(featuredPromotion.ctaUrl) : onPromote}>
            <Text style={styles.secondaryButtonText}>{featuredPromotion?.ctaLabel || 'Request promotion'}</Text>
          </Pressable>
        </View>
      </View>

      {activeOrders.length ? (
        <View style={styles.activeOrdersBox}>
          <Text style={styles.sectionTitle}>Active orders</Text>
          {activeOrders.slice(0, 3).map((order) => (
            <View key={order.id || order.orderNo} style={styles.activeOrderRow}>
              <View>
                <Text style={styles.orderNo}>{order.orderNo}</Text>
                <Text style={styles.orderMeta}>{formatMoney(order.total)} · {(order.status || 'PENDING').replaceAll('_', ' ')}</Text>
              </View>
              <Ionicons name="time-outline" size={20} color={brandRed} />
            </View>
          ))}
        </View>
      ) : null}

      <MealsView title={t(language, 'todaysMenu')} items={items} favorites={favorites} onOpen={onOpen} onFavorite={onFavorite} onShare={onShare} language={language} />
    </View>
  );
}

function LegacyMealsView({ title, items, favorites, onOpen, onFavorite, onShare, language }) {
  return (
    <View>
      <Text style={styles.pageTitle}>{title}</Text>
      <View style={styles.mealGrid}>
        {items.length ? items.map((item) => (
          <MealCard key={item.id} item={item} favorite={favorites.includes(item.id)} onOpen={onOpen} onFavorite={onFavorite} onShare={onShare} />
        )) : <Text style={styles.emptyText}>{t(language, 'noMeals')}</Text>}
      </View>
    </View>
  );
}

function LegacyOrdersView({ orders, activeOrders, language }) {
  const mergedOrders = [
    ...activeOrders,
    ...orders.filter((order) => !activeOrders.some((active) => active.id === order.id))
  ];
  return (
    <View>
      <Text style={styles.pageTitle}>{t(language, 'orders')}</Text>
      {mergedOrders.length ? mergedOrders.map((order) => (
        <View key={order.id || order.orderNo} style={styles.orderCard}>
          <Text style={styles.orderNo}>{order.orderNo}</Text>
          <Text style={styles.orderMeta}>{(order.items || []).length} items · {formatMoney(order.total)}</Text>
          <Text style={styles.status}>{(order.status || 'PENDING').replaceAll('_', ' ')}</Text>
          {order.isGift ? <Text style={styles.orderMeta}>For {order.recipientName}</Text> : null}
          <Text style={styles.orderMeta}>{order.deliveryAddress}</Text>
        </View>
      )) : <Text style={styles.emptyText}>No orders yet.</Text>}
    </View>
  );
}

function groupMealsByCategory(items, categories = []) {
  const seededGroups = categories.map((category) => ({
    ...category,
    items: []
  }));
  return items.reduce((groups, item) => {
    const name = item.category?.name || 'Kitchen';
    const existing = groups.find((group) => group.name === name);
    if (existing) {
      existing.items.push(item);
      return groups;
    }
    return [...groups, { ...(item.category || { name }), items: [item] }];
  }, seededGroups);
}

function HomeView({ items, menuCategories, categoryLimit, favorites, promotions, marketing, flashSale, language, onOpen, onFavorite, onShare, onFlashSale, onCampaignAction }) {
  const categories = groupMealsByCategory(items, menuCategories).filter((category) => category.items.length > 0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const visibleCategories = selectedCategory === 'all' ? categories : categories.filter((category) => category.name === selectedCategory);
  const visibleItems = selectedCategory === 'all' ? items : visibleCategories.flatMap((category) => category.items);
  const featuredMeals = visibleItems.slice(0, 6);
  const displayedCategories = selectedCategory === 'all' ? visibleCategories.slice(0, categoryLimit) : visibleCategories;
  const marketingBanners = [
    ...(marketing?.banners || []),
    ...(marketing?.hero ? [marketing.hero] : []),
    ...(marketing?.items || []).filter((item) => customerFacingMarketingTypes.includes(item.type))
  ].filter((item, index, source) => item?.id && source.findIndex((entry) => entry?.id === item.id) === index);
  const bannerSlides = [
    ...marketingBanners.map((item) => ({ ...item, label: item.type?.replaceAll('_', ' ') || 'Campaign' })),
    ...promotions.map((item) => ({ ...item, label: item.businessName || 'Promotion', deepLink: item.ctaUrl }))
  ];
  const visibleBannerSlides = bannerSlides.length ? bannerSlides : [fallbackPromotionSlide];
  return (
    <View>
      <PromotionCarousel slides={visibleBannerSlides} onAction={onCampaignAction} />

      <View style={styles.categoryQuickAccess}>
        <View style={styles.categoryGridTop}>
          <CategoryTile label="All" variant="meal" active={selectedCategory === 'all'} onPress={() => setSelectedCategory('all')} featured />
          {categories.slice(0, 1).map((category, index) => (
            <CategoryTile key={category.name} label={category.name} variant={variantForCategory(category.name, index)} active={selectedCategory === category.name} onPress={() => setSelectedCategory(category.name)} featured badge={promotions.length ? 'Promo' : ''} />
          ))}
        </View>
        <View style={styles.categoryGridBottom}>
          {categories.slice(1, 5).map((category, index) => (
            <CategoryTile key={category.name} label={category.name} variant={variantForCategory(category.name, index + 1)} active={selectedCategory === category.name} onPress={() => setSelectedCategory(category.name)} />
          ))}
          {categories.length > 5 ? <CategoryTile label="More" variant="more" active={false} onPress={() => setSelectedCategory('all')} /> : null}
        </View>
      </View>

      {flashSale ? (
        <Pressable style={styles.flashBanner} onPress={onFlashSale}>
          <View style={styles.flashIcon}><Ionicons name="flash" size={22} color="#fff" /></View>
          <View style={styles.flashCopy}>
            <Text style={styles.flashTitle}>{flashSale.title}</Text>
            <Text style={styles.flashText}>Use code {flashSale.code} for {flashSale.discountPercent || 10}% off onsite.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#151923" />
        </Pressable>
      ) : null}

      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.pageTitle}>{t(language, 'todaysMenu')}</Text>
          <Text style={styles.sectionCount}>{visibleItems.length} meals</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredMealRail}>
          {featuredMeals.length ? featuredMeals.map((item) => (
            <FeaturedMealCard key={item.id} item={item} favorite={favorites.includes(item.id)} onOpen={onOpen} onFavorite={onFavorite} onShare={onShare} />
          )) : <Text style={styles.emptyText}>{t(language, 'noMeals')}</Text>}
        </ScrollView>
      </View>

      {displayedCategories.map((category) => (
        <CategoryMealSection key={category.name} category={category} favorites={favorites} onOpen={onOpen} onFavorite={onFavorite} onShare={onShare} />
      ))}

      {selectedCategory === 'all' && displayedCategories.length < visibleCategories.length ? (
        <View style={styles.loadingMoreBox}>
          <ActivityIndicator color={brandRed} />
          <Text style={styles.loadingMoreText}>{t(language, 'loadingMeals')}</Text>
        </View>
      ) : null}

      {promotions.length ? (
        <View style={styles.promotionStrip}>
          <Text style={styles.sectionTitle}>{t(language, 'promotions')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promotionRail}>
            {promotions.slice(0, 4).map((promotion) => (
              <Pressable key={promotion.id || promotion.title} style={styles.promotionTile} onPress={promotion.ctaUrl ? () => Linking.openURL(promotion.ctaUrl) : undefined}>
                {promotion.imageUrl ? <Image source={{ uri: promotion.imageUrl }} style={styles.promotionTileImage} /> : <View style={styles.promotionTileFallback}><Ionicons name="sparkles-outline" size={24} color={brandRed} /></View>}
                <Text style={styles.promoEyebrow}>{t(language, 'offer')}</Text>
                <Text style={styles.promoTitle} numberOfLines={2}>{promotion.title}</Text>
                <Text style={styles.cardCopy} numberOfLines={2}>{promotion.description}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function variantForCategory(name = '', fallback = 0) {
  const value = name.toLowerCase();
  if (value.includes('drink') || value.includes('beverage') || value.includes('juice') || value.includes('sweet')) return 'drinks';
  if (value.includes('alcohol') || value.includes('beer') || value.includes('wine')) return 'bottles';
  if (value.includes('ice') || value.includes('cream') || value.includes('dessert') || value.includes('sweet')) return 'icecream';
  if (value.includes('grocery') || value.includes('store')) return 'basket';
  if (value.includes('african') || value.includes('main') || value.includes('meal') || value.includes('food')) return 'meal';
  return ['meal', 'basket', 'drinks', 'bottles', 'icecream'][fallback % 5];
}

function PromotionCarousel({ slides, onAction }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 32, 430);
  const activeSlide = slides[activeIndex] || slides[0];
  useEffect(() => {
    if (activeIndex < slides.length) return;
    setActiveIndex(0);
  }, [activeIndex, slides.length]);

  return (
    <View style={styles.promotionHeroBlock}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.promotionHeroRail}
        onMomentumScrollEnd={({ nativeEvent }) => {
          const width = nativeEvent.layoutMeasurement.width || 1;
          setActiveIndex(Math.round(nativeEvent.contentOffset.x / width));
        }}
      >
        {slides.map((slide) => (
          <Pressable key={slide.id || slide.title} style={[styles.promotionHeroCard, { width: cardWidth }]} onPress={() => onAction?.(campaignActionFor(slide), slide)}>
            <View style={styles.promotionHeroText}>
              <Text style={styles.promoEyebrow}>{slide.label || 'Featured'}</Text>
              <Text style={styles.promotionHeroTitle} numberOfLines={1}>{slide.title}</Text>
              {slide.description ? <Text style={styles.promotionHeroCopy} numberOfLines={1}>{slide.description}</Text> : null}
              <View style={styles.promotionHeroCta}>
                <Text style={styles.promotionHeroCtaText}>{slide.ctaLabel || 'View offer'}</Text>
                <Ionicons name="chevron-forward" size={15} color="#fff" />
              </View>
            </View>
            <View style={styles.promotionHeroMedia}>
              {slide.imageUrl ? <Image source={{ uri: slide.imageUrl }} style={styles.promotionHeroImage} resizeMode="cover" /> : <Ionicons name="bag-handle-outline" size={30} color={brandRed} />}
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.promotionHeroDots}>
        {slides.map((slide, index) => (
          <View key={`${slide.id || slide.title}-dot`} style={[styles.promotionHeroDot, index === activeIndex && styles.promotionHeroDotActive]} />
        ))}
      </View>
      {activeSlide?.title ? <Text style={styles.promotionHeroStatus} numberOfLines={1}>{activeIndex + 1}/{slides.length} active offer{slides.length === 1 ? '' : 's'}</Text> : null}
    </View>
  );
}

function CategoryTile({ label, variant, active, onPress, featured = false, badge = '' }) {
  return (
    <Pressable style={[featured ? styles.categoryTileLarge : styles.categoryTileSmall, active && styles.categoryTileActive]} onPress={onPress}>
      {badge ? <Text style={styles.categoryBadge}>{badge}</Text> : null}
      <CategorySvg variant={variant} large={featured} />
      <Text style={[styles.categoryTileText, active && styles.categoryTileTextActive]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function CategorySvg({ variant, large }) {
  const size = large ? 62 : 46;
  if (variant === 'basket') {
    return (
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Rect x="14" y="25" width="38" height="25" rx="4" fill="#ef4d23" />
        <Path d="M18 25l8-10M46 25l-8-10" stroke="#7a2b16" strokeWidth="4" strokeLinecap="round" />
        <Rect x="20" y="18" width="11" height="22" rx="2" fill="#fff4d7" />
        <Rect x="33" y="13" width="10" height="25" rx="2" fill="#dbeafe" />
        <Path d="M15 31h37M18 39h32" stroke="#9c2f16" strokeWidth="3" />
      </Svg>
    );
  }
  if (variant === 'drinks' || variant === 'bottles') {
    return (
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Rect x="29" y="12" width="9" height="39" rx="4" fill="#8b3a17" />
        <Rect x="30" y="8" width="7" height="8" rx="2" fill="#d7a15a" />
        <Rect x="22" y="31" width="10" height="21" rx="4" fill="#f2a23a" />
        <Rect x="40" y="24" width="8" height="28" rx="4" fill="#2f5f9f" />
        <Circle cx="18" cy="45" r="8" fill="#6ee7f9" />
        <Circle cx="18" cy="45" r="5" fill="#ff8a3d" />
      </Svg>
    );
  }
  if (variant === 'icecream') {
    return (
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Path d="M31 12c12 10 8 23-4 27 2-9-9-11 4-27z" fill="#ff7b54" />
        <Path d="M33 16c7 9 2 17-8 20 3-7-2-10 8-20z" fill="#ffd0b8" />
        <Ellipse cx="28" cy="42" rx="15" ry="8" fill="#9dd8ff" />
        <Path d="M18 42c5 10 17 11 27 0" fill="#4766d8" opacity="0.7" />
        <Circle cx="48" cy="47" r="5" fill="#d71920" />
        <Path d="M50 42c2-5 5-7 8-8" stroke="#4c7a38" strokeWidth="2" />
      </Svg>
    );
  }
  if (variant === 'more') {
    return (
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Circle cx="22" cy="32" r="4" fill="#d71920" />
        <Circle cx="32" cy="32" r="4" fill="#111827" />
        <Circle cx="42" cy="32" r="4" fill="#111827" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Ellipse cx="32" cy="38" rx="22" ry="13" fill="#b91c1c" />
      <Ellipse cx="32" cy="35" rx="18" ry="10" fill="#fff4d7" />
      <Circle cx="24" cy="34" r="5" fill="#34d399" />
      <Circle cx="33" cy="36" r="5" fill="#f97316" />
      <Circle cx="42" cy="33" r="5" fill="#ef4444" />
      <Path d="M17 35c9 9 21 10 31 0" stroke="#7f1d1d" strokeWidth="3" fill="none" />
    </Svg>
  );
}

function MealsView({ title, items, favorites, onOpen, onFavorite, onShare, language }) {
  const categories = groupMealsByCategory(items);
  return (
    <View>
      <Text style={styles.pageTitle}>{title}</Text>
      {items.length ? categories.map((category) => (
        <CategoryMealSection key={category.name} category={category} favorites={favorites} onOpen={onOpen} onFavorite={onFavorite} onShare={onShare} />
      )) : <Text style={styles.emptyText}>{t(language, 'noMeals')}</Text>}
    </View>
  );
}

function CategoryMealSection({ category, favorites, onOpen, onFavorite, onShare }) {
  return (
    <View style={styles.categorySection}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.categoryTitle}>{category.name}</Text>
        <Text style={styles.sectionCount}>{category.items.length}</Text>
      </View>
      <View style={styles.mealGrid}>
        {category.items.map((item) => (
          <MealCard key={item.id} item={item} favorite={favorites.includes(item.id)} onOpen={onOpen} onFavorite={onFavorite} onShare={onShare} />
        ))}
      </View>
    </View>
  );
}

function FeaturedMealCard({ item, favorite, onOpen, onFavorite, onShare }) {
  return (
    <Pressable style={styles.featuredMealCard} onPress={() => onOpen(item)}>
      <Image source={{ uri: item.imageUrl || fallbackImage }} style={styles.featuredMealImage} />
      <Pressable style={styles.shareButton} onPress={() => onShare(item)}>
        <Ionicons name="share-social-outline" size={18} color="#29384d" />
      </Pressable>
      <Pressable style={styles.favoriteButton} onPress={() => onFavorite(item.id)}>
        <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={18} color={favorite ? brandRed : '#666'} />
      </Pressable>
      <View style={styles.featuredMealBody}>
        <Text style={styles.mealName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.mealMeta}>{item.category?.name || 'Kitchen'}</Text>
        <Text style={styles.mealPrice}>{formatMoney(item.price)}</Text>
      </View>
    </Pressable>
  );
}

function OrdersView({ orders, activeOrders, language, statusFilter, onFilter, onOpen }) {
  const mergedOrders = [
    ...activeOrders,
    ...orders.filter((order) => !activeOrders.some((active) => active.id === order.id))
  ];
  const statusOptions = ['ALL', ...Array.from(new Set(mergedOrders.map((order) => order.status || 'PENDING')))];
  const visibleOrders = statusFilter === 'ALL' ? mergedOrders : mergedOrders.filter((order) => (order.status || 'PENDING') === statusFilter);
  return (
    <View>
      <Text style={styles.pageTitle}>{t(language, 'orders')}</Text>
      {mergedOrders.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
          {statusOptions.map((status) => (
            <Pressable key={status} style={[styles.filterChip, statusFilter === status && styles.filterChipActive]} onPress={() => onFilter(status)}>
              <Text style={[styles.filterChipText, statusFilter === status && styles.filterChipTextActive]}>{status === 'ALL' ? t(language, 'all') : status.replaceAll('_', ' ')}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {visibleOrders.length ? visibleOrders.map((order) => (
        <Pressable key={order.id || order.orderNo} style={styles.orderCard} onPress={() => onOpen(order)}>
          <View style={styles.orderCardTop}>
            <Text style={styles.orderNo}>{order.orderNo}</Text>
            <Ionicons name="chevron-forward" size={20} color="#07142a" />
          </View>
          <Text style={styles.orderMeta}>{(order.items || []).length} items - {formatMoney(order.total)}</Text>
          <Text style={styles.status}>{(order.status || 'PENDING').replaceAll('_', ' ')}</Text>
          {order.isGift ? <Text style={styles.orderMeta}>For {order.recipientName}</Text> : null}
          <Text style={styles.orderMeta}>{order.deliveryAddress}</Text>
        </Pressable>
      )) : <Text style={styles.emptyText}>{mergedOrders.length ? t(language, 'noOrdersForStatus') : t(language, 'noOrdersYet')}</Text>}
    </View>
  );
}

function OrderReviewItem({ item, order, language }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const menuItemId = item.menuItemId || item.menuItem?.id;

  const submitReview = async () => {
    if (!menuItemId) return Alert.alert('ChopASAP', 'This meal cannot be reviewed from this order.');
    setSaving(true);
    try {
      await api.createMealReview(menuItemId, {
        customerName: order.customerName || 'Customer',
        customerPhone: order.customerPhone || '',
        rating,
        comment
      });
      setSubmitted(true);
      setComment('');
      Alert.alert('ChopASAP', 'Thanks for your review.');
    } catch (error) {
      Alert.alert('ChopASAP', error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.orderReviewBox}>
      <Text style={styles.cardTitle}>{t(language, 'rateThisMeal')}</Text>
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable key={value} onPress={() => setRating(value)} disabled={submitted}>
            <Ionicons name={value <= rating ? 'star' : 'star-outline'} size={23} color="#f5a400" />
          </Pressable>
        ))}
      </View>
      <TextInput
        style={styles.reviewInput}
        value={comment}
        onChangeText={setComment}
        editable={!submitted}
        placeholder={submitted ? t(language, 'reviewed') : t(language, 'reviewPlaceholder')}
        placeholderTextColor="#9aa4ad"
        multiline
      />
      <Pressable style={[styles.secondaryButton, (saving || submitted) && styles.disabled]} onPress={submitReview} disabled={saving || submitted}>
        <Text style={styles.secondaryButtonText}>{submitted ? t(language, 'reviewed') : saving ? t(language, 'submitting') : t(language, 'submitReview')}</Text>
      </Pressable>
    </View>
  );
}

function OrderDetailModal({ visible, order, language, onClose }) {
  if (!order) return null;
  const items = order.items || [];
  const deliveryFeeValue = Number(order.deliveryFee || 0);
  const serviceFeeValue = Number(order.serviceFee || order.tax || 0);
  const subtotalValue = items.reduce((sum, item) => sum + orderItemTotal(item), 0);
  const totalValue = Number(order.total || subtotalValue + deliveryFeeValue + serviceFeeValue);
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.detailScreen}>
        <View style={styles.checkoutHeader}>
          <Pressable onPress={onClose}><Ionicons name="chevron-back" size={26} color="#111" /></Pressable>
          <Text style={styles.checkoutTitle}>{t(language, 'orderDetails')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView contentContainerStyle={styles.checkoutBody}>
          <View style={styles.orderDetailSummary}>
            <Text style={styles.orderDetailNo}>{order.orderNo || 'Order'}</Text>
            <Text style={styles.status}>{(order.status || 'PENDING').replaceAll('_', ' ')}</Text>
            <Text style={styles.orderMeta}>{order.customerName || 'Customer'}</Text>
            <Text style={styles.orderMeta}>{order.customerPhone}</Text>
            <Text style={styles.orderMeta}>{order.deliveryAddress || 'Not provided'}</Text>
          </View>
          <View style={styles.checkoutList}>
            {items.length ? items.map((item, index) => (
              <View key={item.id || `${item.menuItemId || item.name}-${index}`} style={styles.orderDetailItemBlock}>
                <View style={styles.orderDetailItem}>
                  <Image source={{ uri: item.menuItem?.imageUrl || item.imageUrl || fallbackImage }} style={styles.orderDetailImage} />
                  <View style={styles.checkoutItemInfo}>
                    <Text style={styles.checkoutItemName}>{orderItemName(item)}</Text>
                    {item.variationName ? <Text style={styles.checkoutItemVariation}>{item.variationName}</Text> : null}
                    <Text style={styles.checkoutItemMeta}>{item.quantity || 1} item</Text>
                  </View>
                  <Text style={styles.priceValue}>{formatMoney(orderItemTotal(item))}</Text>
                </View>
                <OrderReviewItem item={item} order={order} language={language} />
              </View>
            )) : <Text style={styles.emptyText}>{t(language, 'noOrderItems')}</Text>}
          </View>
          {order.isGift ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t(language, 'giftRecipient')}</Text>
              <Text style={styles.cardCopy}>{order.recipientName} - {order.recipientPhone}</Text>
              {order.recipientAddress ? <Text style={styles.cardCopy}>{order.recipientAddress}</Text> : null}
            </View>
          ) : null}
          {order.deliveryNote ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t(language, 'restaurantNote')}</Text>
              <Text style={styles.cardCopy}>{order.deliveryNote}</Text>
            </View>
          ) : null}
          <PriceRows language={language} subtotal={subtotalValue} deliveryFee={deliveryFeeValue} serviceFee={serviceFeeValue} total={totalValue} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function SupportView({ settings, language, onReserve, onPromote }) {
  const supportUrl = `https://wa.me/${cleanPhone(settings.supportPhone)}?text=${encodeURIComponent('Hello ChopASAP, I need support with my order.')}`;
  return (
    <View>
      <Text style={styles.pageTitle}>{t(language, 'support')}</Text>
      <View style={styles.supportCard}>
        <Ionicons name="logo-whatsapp" size={34} color="#0b8f4f" />
        <Text style={styles.supportTitle}>{t(language, 'whatsappSupport')}</Text>
        <Text style={styles.supportText}>{settings.supportPhone || 'Support number not set'}</Text>
        <Pressable style={styles.primaryButton} onPress={() => Linking.openURL(supportUrl)}>
          <Text style={styles.primaryButtonText}>{t(language, 'support')}</Text>
        </Pressable>
      </View>
      <View style={styles.actionRow}>
        <Pressable style={styles.actionButton} onPress={onReserve}>
          <Ionicons name="calendar-outline" size={19} color={brandRed} />
          <Text style={styles.actionText}>{t(language, 'reserveMeal')}</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={onPromote}>
          <Ionicons name="megaphone-outline" size={19} color={brandRed} />
          <Text style={styles.actionText}>{t(language, 'promote')}</Text>
        </Pressable>
      </View>
      {supportFaqs.map((faq) => (
        <View key={faq.question} style={styles.faqCard}>
          <Text style={styles.cardTitle}>{faq.question}</Text>
          <Text style={styles.cardCopy}>{faq.answer}</Text>
        </View>
      ))}
    </View>
  );
}

function ProfileView({ customer, customerForm, setCustomerForm, language, chooseLanguage, profileTab, setProfileTab, rank, orders, referralLink, saving, onShareReferral, onPickAvatar, onUpdateProfile, onSwitchAccount }) {
  return (
    <View>
      <View style={styles.profileHeader}>
        <Pressable onPress={onPickAvatar}>
          {customer.profileImageUrl ? <Image source={{ uri: customer.profileImageUrl }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Ionicons name="person" size={34} color="#fff" /></View>}
          <View style={styles.avatarEditBadge}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </Pressable>
        <View style={styles.profileNameBox}>
          <Text style={styles.profileName}>{customer.name}</Text>
          <Text style={styles.profilePhone}>{customer.phone}</Text>
          <Pressable style={styles.avatarUploadButton} onPress={onPickAvatar} disabled={saving}>
            <Text style={styles.avatarUploadText}>{saving ? t(language, 'uploading') : 'Upload profile image'}</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.statsRow}>
        <StatPill icon="receipt-outline" label={t(language, 'totalOrders')} value={orders.length || customer.orderCount || 0} />
        <StatPill icon="trophy-outline" label={t(language, 'points')} value={customer.points || 0} />
        <StatPill icon="gift-outline" label={t(language, 'referrals')} value={customer.referralCount || 0} />
      </View>
      <View style={styles.rankCard}>
        <Text style={styles.rankLabel}>{rank.title}</Text>
        <Text style={styles.rankCopy}>{rank.next}</Text>
      </View>
      <View style={styles.segment}>
        <Pressable style={[styles.segmentButton, profileTab === 'referral' && styles.segmentActive]} onPress={() => setProfileTab('referral')}>
          <Text style={[styles.segmentText, profileTab === 'referral' && styles.segmentTextActive]}>{t(language, 'shareReferral')}</Text>
        </Pressable>
        <Pressable style={[styles.segmentButton, profileTab === 'details' && styles.segmentActive]} onPress={() => setProfileTab('details')}>
          <Text style={[styles.segmentText, profileTab === 'details' && styles.segmentTextActive]}>{t(language, 'accountDetails')}</Text>
        </Pressable>
      </View>
      {profileTab === 'referral' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t(language, 'shareReferral')}</Text>
          <Text style={styles.cardCopy}>{t(language, 'referralHelp')}</Text>
          <Text style={styles.linkText} numberOfLines={1}>{referralLink}</Text>
          <Pressable style={styles.primaryButton} onPress={onShareReferral}>
            <Ionicons name="share-social-outline" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>{t(language, 'share')}</Text>
          </Pressable>
          <View style={styles.languageSwitch}>
            <Text style={styles.fieldLabel}>{t(language, 'language')}</Text>
            <View style={styles.languageButtons}>
              <Pressable style={[styles.smallLang, language === 'en' && styles.smallLangActive]} onPress={() => chooseLanguage('en')}><Text style={language === 'en' ? styles.smallLangTextActive : styles.smallLangText}>English</Text></Pressable>
              <Pressable style={[styles.smallLang, language === 'fr' && styles.smallLangActive]} onPress={() => chooseLanguage('fr')}><Text style={language === 'fr' ? styles.smallLangTextActive : styles.smallLangText}>Français</Text></Pressable>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <Field label={t(language, 'name')} value={customerForm.name} onChangeText={(name) => setCustomerForm({ ...customerForm, name })} />
          <Field label={t(language, 'phone')} value={customerForm.phone} onChangeText={(phone) => setCustomerForm({ ...customerForm, phone })} keyboardType="phone-pad" />
          <Field label={t(language, 'addressOptional')} value={customerForm.address || ''} onChangeText={(address) => setCustomerForm({ ...customerForm, address })} />
          <Pressable style={[styles.primaryButton, saving && styles.disabled]} onPress={onUpdateProfile} disabled={saving}>
            <Text style={styles.primaryButtonText}>{t(language, 'saveProfile')}</Text>
          </Pressable>
          <Pressable style={styles.switchAccountButton} onPress={onSwitchAccount}>
            <Ionicons name="swap-horizontal-outline" size={18} color={brandRed} />
            <Text style={styles.switchAccountText}>{t(language, 'switchAccount')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function ProfileModal({ visible, onClose, ...profileProps }) {
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.detailScreen}>
        <View style={styles.checkoutHeader}>
          <Text style={styles.pageTitle}>{t(profileProps.language, 'profile')}</Text>
          <Pressable onPress={onClose}><Ionicons name="close" size={26} color="#111" /></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.checkoutBody}>
          <ProfileView {...profileProps} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function CheckoutItem({ item, address, updateQty }) {
  return (
    <View style={styles.checkoutItem}>
      <Image source={{ uri: item.imageUrl || fallbackImage }} style={styles.checkoutItemImage} />
      <View style={styles.checkoutItemInfo}>
        <Text style={styles.checkoutItemName} numberOfLines={1}>{item.name}</Text>
        {item.variationName ? <Text style={styles.checkoutItemVariation} numberOfLines={1}>{item.variationName}</Text> : null}
        <Text style={styles.checkoutItemMeta}>{item.quantity} item - {formatMoney(item.price * item.quantity)}</Text>
        <Text style={styles.checkoutItemMeta} numberOfLines={1}>Deliver to {address || 'Bonanjo Biyamassi'}</Text>
      </View>
      <Pressable style={styles.checkoutRemove} onPress={() => updateQty(item.cartItemId, -999)}>
        <Ionicons name="trash-outline" size={16} color={brandRed} />
      </Pressable>
      <View style={styles.checkoutQty}>
        <Pressable onPress={() => updateQty(item.cartItemId, -1)}><Ionicons name="remove" size={17} color="#5f646b" /></Pressable>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <Pressable onPress={() => updateQty(item.cartItemId, 1)}><Ionicons name="add" size={17} color="#5f646b" /></Pressable>
      </View>
    </View>
  );
}

function PriceRows({ language, subtotal, deliveryFee, serviceFee, total }) {
  return (
    <View style={styles.priceRows}>
      <View style={styles.priceRow}><Text style={styles.priceLabel}>{t(language, 'subtotal')}</Text><Text style={styles.priceValue}>{formatMoney(subtotal)}</Text></View>
      <View style={styles.priceRow}><Text style={styles.priceLabel}>{t(language, 'promotion')}</Text><Text style={styles.discountValue}>-{formatMoney(0)}</Text></View>
      <View style={styles.priceRow}><Text style={styles.priceLabel}>{t(language, 'deliveryFee')}</Text><Text style={styles.priceValue}>{formatMoney(deliveryFee)}</Text></View>
      <View style={styles.priceRow}><Text style={styles.priceLabel}>{t(language, 'taxesFees')}</Text><Text style={styles.priceValue}>{formatMoney(serviceFee)}</Text></View>
      <View style={styles.priceRow}><Text style={styles.priceTotalLabel}>{t(language, 'total')}</Text><Text style={styles.priceTotal}>{formatMoney(total)}</Text></View>
    </View>
  );
}

function CheckoutModal({ visible, language, cart, step, setStep, fulfillment, setFulfillment, orderForm, setOrderForm, updateQty, subtotal, deliveryFee, serviceFee, total, saving, onClose, onShop, onSubmit }) {
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.detailScreen}>
        <View style={styles.checkoutHeader}>
          <Pressable onPress={step === 'details' ? () => setStep('cart') : onClose}><Ionicons name={step === 'details' ? 'chevron-back' : 'close'} size={26} color="#111" /></Pressable>
          <Text style={styles.checkoutTitle}>{t(language, 'checkout')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        {step === 'cart' ? (
          cart.length ? (
            <ScrollView contentContainerStyle={styles.checkoutBodyFlush}>
              <View style={styles.checkoutList}>
                {cart.map((item) => <CheckoutItem key={item.cartItemId} item={item} address={orderForm.deliveryAddress} updateQty={updateQty} />)}
              </View>
              <View style={styles.cartTotals}>
                <View style={styles.priceRow}><Text style={styles.priceTotalLabel}>{t(language, 'itemsTotal')}</Text><Text style={styles.priceValue}>{formatMoney(subtotal)}</Text></View>
                <View style={styles.priceRow}><Text style={styles.priceTotalLabel}>{t(language, 'delivery')}</Text><Text style={styles.priceValue}>{formatMoney(deliveryFee)}</Text></View>
                <View style={styles.cartGrandTotal}><Text style={styles.priceTotalLabel}>{t(language, 'total')}</Text><Text style={styles.priceTotal}>{formatMoney(total)}</Text></View>
              </View>
              <View style={styles.checkoutCtaBox}>
                <Pressable style={styles.checkoutButton} onPress={() => setStep('details')}>
                  <Text style={styles.primaryButtonText}>{t(language, 'proceedCheckout')}</Text>
                </Pressable>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.emptyCartScreen}>
              <Ionicons name="bag-outline" size={82} color={brandRed} />
              <Text style={styles.emptyCartTitle}>{t(language, 'emptyBasketTitle')}</Text>
              <Text style={styles.emptyCartCopy}>{t(language, 'emptyBasketCopy')}</Text>
              <Pressable style={styles.checkoutButton} onPress={onShop}>
                <Text style={styles.primaryButtonText}>{t(language, 'startShopping')}</Text>
              </Pressable>
            </View>
          )
        ) : (
          <ScrollView contentContainerStyle={styles.checkoutBodyFlush}>
            <View style={styles.segmentPill}>
              {['delivery', 'reserve'].map((item) => (
                <Pressable key={item} style={[styles.segmentPillButton, fulfillment === item && styles.segmentPillActive]} onPress={() => setFulfillment(item)}>
                  <Text style={styles.segmentPillText}>{t(language, item)}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.detailRows}>
              <FieldRow icon="location" label={fulfillment === 'delivery' ? 'Delivery address' : 'Reserve onsite'} hint={fulfillment === 'delivery' ? 'Tell us where to deliver your order.' : 'No delivery details are needed for reserve orders.'}>
                {fulfillment === 'delivery' ? (
                  <TextInput style={styles.rowInput} placeholder="Example: Bonanjo, street, landmark" placeholderTextColor="#9aa4ad" value={orderForm.deliveryAddress} onChangeText={(deliveryAddress) => setOrderForm({ ...orderForm, deliveryAddress })} />
                ) : (
                  <Text style={styles.rowStatic}>{t(language, 'pickupOnsite')}</Text>
                )}
              </FieldRow>
              {fulfillment === 'delivery' ? (
                <>
                  <FieldRow icon="person" label="Your name" hint="The restaurant will use this name for your order.">
                    <TextInput style={styles.rowInput} placeholder="Example: Amina N." placeholderTextColor="#9aa4ad" value={orderForm.customerName} onChangeText={(customerName) => setOrderForm({ ...orderForm, customerName })} />
                  </FieldRow>
                  <FieldRow icon="call" label="Phone number" hint="We need this to confirm your order if necessary.">
                    <TextInput style={styles.rowInput} placeholder="Example: 671286999" placeholderTextColor="#9aa4ad" value={orderForm.customerPhone} onChangeText={(customerPhone) => setOrderForm({ ...orderForm, customerPhone })} keyboardType="phone-pad" />
                  </FieldRow>
                </>
              ) : null}
            </View>
            <View style={styles.giftPanel}>
              <View style={styles.giftText}>
                <Text style={styles.cardTitle}>{t(language, 'orderForSomeoneElse')}</Text>
                <Text style={styles.cardCopy}>{t(language, 'orderGiftHelp')}</Text>
              </View>
              <Switch value={orderForm.isGift} onValueChange={(isGift) => setOrderForm({ ...orderForm, isGift })} trackColor={{ true: '#ffd8dc' }} thumbColor={orderForm.isGift ? brandRed : '#f4f4f5'} />
            </View>
            {orderForm.isGift ? (
              <View style={styles.giftFields}>
                <Field label="Loved one's name" value={orderForm.recipientName} onChangeText={(recipientName) => setOrderForm({ ...orderForm, recipientName })} />
                <Field label="Loved one's phone" value={orderForm.recipientPhone} onChangeText={(recipientPhone) => setOrderForm({ ...orderForm, recipientPhone })} keyboardType="phone-pad" />
                {fulfillment === 'delivery' ? <Field label="Loved one's delivery address" value={orderForm.recipientAddress} onChangeText={(recipientAddress) => setOrderForm({ ...orderForm, recipientAddress })} /> : null}
              </View>
            ) : null}
            <View style={styles.deliveryTimeRow}>
              <Text style={styles.priceTotalLabel}>{fulfillment === 'delivery' ? 'Delivery time' : 'Reserve time'}</Text>
              <Text style={styles.priceValue}>{fulfillment === 'delivery' ? '15-30 min(s)' : 'Restaurant confirmation'}</Text>
            </View>
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>{t(language, 'restaurantMessage')}</Text>
              <TextInput style={styles.noteInput} placeholder="Example: less pepper, call before delivery, no onions" placeholderTextColor="#9aa4ad" value={orderForm.deliveryNote} onChangeText={(deliveryNote) => setOrderForm({ ...orderForm, deliveryNote })} multiline />
            </View>
            <View style={styles.checkoutSectionHeader}>
              <Text style={styles.priceTotalLabel}>{t(language, 'yourItems')}</Text>
              <Pressable onPress={onShop}><Text style={styles.seeMenu}>{t(language, 'seeMenu')}</Text></Pressable>
            </View>
            <View style={styles.checkoutList}>
              {cart.map((item) => <CheckoutItem key={item.cartItemId} item={item} address={orderForm.deliveryAddress} updateQty={updateQty} />)}
            </View>
            <Pressable style={styles.addMoreButton} onPress={onShop}>
              <Ionicons name="add" size={16} color="#07142a" />
              <Text style={styles.addMoreText}>{t(language, 'addMoreItems')}</Text>
            </Pressable>
            <PriceRows language={language} subtotal={subtotal} deliveryFee={deliveryFee} serviceFee={serviceFee} total={total} />
            <View style={styles.checkoutCtaBox}>
              <Pressable style={[styles.checkoutButton, (saving || !cart.length) && styles.disabled]} onPress={onSubmit} disabled={saving || !cart.length}>
                <Text style={styles.primaryButtonText}>{saving ? 'Placing order...' : 'Confirm order'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function FieldRow({ icon, label, hint, children }) {
  return (
    <View style={styles.fieldRow}>
      <Ionicons name={icon} size={25} color="#07142a" />
      <View style={styles.fieldRowBody}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {children}
        <Text style={styles.fieldHint}>{hint}</Text>
      </View>
    </View>
  );
}

function SuccessModal({ visible, order, language, onClose }) {
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.successScreen}>
        <View style={styles.successCard}>
          <View style={styles.successIcon}><Ionicons name="checkmark" size={54} color="#fff" /></View>
          <Text style={styles.successTitle}>{t(language, 'orderPlacedSuccess')}</Text>
          <Text style={styles.cardCopy}>{order?.orderNo ? `Track ${order.orderNo} in Orders.` : 'Track your order in Orders.'}</Text>
          <Text style={styles.supportTitle}>{t(language, 'rateYourOrder')}</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <Pressable key={rating} style={styles.ratingButton} onPress={() => Alert.alert('ChopASAP', `Thanks for rating ${rating} star${rating === 1 ? '' : 's'}.`)}>
                <Ionicons name="star" size={22} color="#f5a400" />
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.primaryButton} onPress={onClose}>
            <Text style={styles.primaryButtonText}>{t(language, 'backHome')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function FlashSaleModal({ visible, code, onClose, onShare }) {
  if (!code) return null;
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.flashModal}>
          <View style={styles.flashIcon}><Ionicons name="flash" size={28} color="#fff" /></View>
          <Text style={styles.modalTitle}>{code.title}</Text>
          <Text style={styles.cardCopy}>{code.description || `Show this code for ${code.discountPercent || 10}% off onsite.`}</Text>
          <Text style={styles.codeBox}>{code.code}</Text>
          <Pressable style={styles.primaryButton} onPress={onShare}>
            <Ionicons name="share-social-outline" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>Share code</Text>
          </Pressable>
          <Pressable style={styles.linkButton} onPress={onClose}>
            <Text style={styles.linkButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function RewardModal({ visible, rewards, claim, claimingId, burst, onClaim, onClose }) {
  const streak = Number(claim?.streakCount || 0);
  const streakProgress = `${Math.min(100, (streak / 7) * 100)}%`;
  const burstScale = burst.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.18] });
  const burstOpacity = burst.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] });
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.rewardOverlay}>
        <View style={styles.rewardSheet}>
          <View style={styles.checkoutHeader}>
            <Text style={styles.pageTitle}>Rewards</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={26} color="#111" /></Pressable>
          </View>
          <View style={styles.streakPanel}>
            <View>
              <Text style={styles.streakLabel}>Daily streak</Text>
              <Text style={styles.streakValue}>{streak || 0} day{streak === 1 ? '' : 's'}</Text>
            </View>
            <View style={styles.streakTrack}>
              <View style={[styles.streakFill, { width: streakProgress }]} />
            </View>
            <Text style={styles.streakHint}>{streak >= 7 ? 'Weekly streak completed' : `${Math.max(0, 7 - streak)} days to a full week`}</Text>
            <Animated.View style={[styles.rewardBurst, { opacity: burstOpacity, transform: [{ scale: burstScale }] }]}>
              <Ionicons name="sparkles" size={20} color="#fff" />
              <Text style={styles.rewardBurstText}>+{claim?.pointsEarned || 0}</Text>
            </Animated.View>
          </View>
          <ScrollView contentContainerStyle={styles.checkoutBody}>
            {rewards.length ? rewards.map((reward) => (
              <View key={reward.id} style={styles.rewardCard}>
                <View style={styles.rewardCardHeader}>
                  <View style={styles.rewardIcon}>
                    <Ionicons name={reward.type === 'DAILY_STREAK' ? 'flame-outline' : 'gift-outline'} size={20} color={brandRed} />
                  </View>
                  <View style={styles.rewardCardCopy}>
                    <Text style={styles.cardTitle}>{reward.title}</Text>
                    {reward.description ? <Text style={styles.cardCopy}>{reward.description}</Text> : null}
                  </View>
                </View>
                <Pressable style={[styles.claimButton, claimingId === reward.id && styles.disabled]} disabled={claimingId === reward.id} onPress={() => onClaim(reward)}>
                  <Ionicons name="sparkles-outline" size={17} color="#fff" />
                  <Text style={styles.claimButtonText}>{claimingId === reward.id ? 'Claiming...' : reward.ctaLabel || 'Claim reward'}</Text>
                </Pressable>
                {claim?.reward?.id === reward.id ? (
                  <Text style={styles.claimResult}>{claim.alreadyClaimed ? 'Already claimed today. Keep your streak tomorrow.' : `Reward claimed. ${claim.pointsEarned} points added.`}</Text>
                ) : null}
              </View>
            )) : <Text style={styles.emptyText}>No rewards are active right now.</Text>}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ReservationModal({ visible, language, form, setForm, saving, onClose, onSubmit }) {
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.detailScreen}>
        <View style={styles.checkoutHeader}>
          <Text style={styles.pageTitle}>{t(language, 'reserveMeal')}</Text>
          <Pressable onPress={onClose}><Ionicons name="close" size={26} color="#111" /></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.checkoutBody}>
          <Field label="Your name" value={form.customerName} onChangeText={(customerName) => setForm({ ...form, customerName })} />
          <Field label="Phone number" value={form.customerPhone} onChangeText={(customerPhone) => setForm({ ...form, customerPhone })} keyboardType="phone-pad" />
          <Field label="Email optional" value={form.customerEmail} onChangeText={(customerEmail) => setForm({ ...form, customerEmail })} keyboardType="email-address" />
          <Field label="Party size" value={String(form.partySize)} onChangeText={(partySize) => setForm({ ...form, partySize })} keyboardType="number-pad" />
          <Field label="Reserve time" value={form.reservationAt} onChangeText={(reservationAt) => setForm({ ...form, reservationAt })} placeholder="2026-08-01T18:30:00" />
          <Field label="Meal preference optional" value={form.mealPreference} onChangeText={(mealPreference) => setForm({ ...form, mealPreference })} />
          <Field label="Reservation note optional" value={form.note} onChangeText={(note) => setForm({ ...form, note })} multiline />
          <Pressable style={[styles.primaryButton, saving && styles.disabled]} onPress={onSubmit} disabled={saving}>
            <Text style={styles.primaryButtonText}>{saving ? 'Submitting...' : 'Request reservation'}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function PromotionModal({ visible, language, form, setForm, saving, onPickImage, onClose, onSubmit }) {
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.detailScreen}>
        <View style={styles.checkoutHeader}>
          <Text style={styles.pageTitle}>{t(language, 'promoteOnChopasap')}</Text>
          <Pressable onPress={onClose}><Ionicons name="close" size={26} color="#111" /></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.checkoutBody}>
          <Field label="Business name" value={form.businessName} onChangeText={(businessName) => setForm({ ...form, businessName })} />
          <Field label="Contact name" value={form.contactName} onChangeText={(contactName) => setForm({ ...form, contactName })} />
          <Field label="Phone number" value={form.contactPhone} onChangeText={(contactPhone) => setForm({ ...form, contactPhone })} keyboardType="phone-pad" />
          <Field label="Email optional" value={form.contactEmail} onChangeText={(contactEmail) => setForm({ ...form, contactEmail })} keyboardType="email-address" />
          <Field label="Promotion title" value={form.title} onChangeText={(title) => setForm({ ...form, title })} />
          <Field label="Description" value={form.description} onChangeText={(description) => setForm({ ...form, description })} multiline />
          <View style={styles.uploadCard}>
            {form.imageUrl ? <Image source={{ uri: form.imageUrl }} style={styles.uploadPreview} /> : <Ionicons name="image-outline" size={28} color={brandRed} />}
            <Pressable style={styles.secondaryButton} onPress={onPickImage}>
              <Text style={styles.secondaryButtonText}>{form.imageUrl ? 'Change image' : 'Upload image'}</Text>
            </Pressable>
          </View>
          <Field label="Website or social link optional" value={form.ctaUrl} onChangeText={(ctaUrl) => setForm({ ...form, ctaUrl })} />
          <Pressable style={[styles.primaryButton, saving && styles.disabled]} onPress={onSubmit} disabled={saving}>
            <Text style={styles.primaryButtonText}>{saving ? 'Submitting...' : 'Submit request'}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function BottomTabs({ tab, setTab, language, activeOrderCount = 0, pulse }) {
  const tabs = [
    ['home', 'home-outline', t(language, 'home')],
    ['meals', 'restaurant-outline', t(language, 'meals')],
    ['support', 'headset-outline', t(language, 'support')],
    ['favorites', 'heart-outline', t(language, 'favorites')],
    ['orders', 'receipt-outline', t(language, 'orders')]
  ];
  return (
    <View style={styles.bottomTabs}>
      {tabs.map(([id, icon, label]) => (
        <Pressable key={id} style={styles.tabButton} onPress={() => setTab(id)}>
          <View>
            <Ionicons name={icon} size={21} color={tab === id ? brandRed : '#42495a'} />
            {id === 'orders' && activeOrderCount ? (
              <Animated.View style={[styles.activeOrderTabBadge, { opacity: pulse || 1 }]}>
                <Text style={styles.activeOrderTabText}>{activeOrderCount}</Text>
              </Animated.View>
            ) : null}
          </View>
          <Text style={[styles.tabText, tab === id && styles.tabTextActive]} numberOfLines={1}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#eaf5f8', paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight || 0 : 0 },
  appSafe: { flex: 1, backgroundColor: '#eaf5f8' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  loaderPlate: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', padding: 28 },
  loaderLogo: { width: 116, height: 116, borderRadius: 30 },
  loaderHands: { flexDirection: 'row', gap: 54, marginTop: -10 },
  hand: { width: 54, height: 22, borderRadius: 20, backgroundColor: '#ffd3b6', transform: [{ rotate: '-16deg' }] },
  handRight: { transform: [{ rotate: '16deg' }] },
  loaderSpinner: { marginTop: 22 },
  loaderTitle: { marginTop: 16, fontSize: 18, fontWeight: '900', color: '#151923' },
  loaderText: { marginTop: 4, color: '#6d6f76', fontWeight: '700' },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(21,25,35,0.65)', padding: 18 },
  languageCard: { width: '100%', maxWidth: 380, borderRadius: 26, backgroundColor: '#fff', padding: 22, alignItems: 'center' },
  languageIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff1ca' },
  modalTitle: { marginTop: 14, fontSize: 24, fontWeight: '900', color: '#151923', textAlign: 'center' },
  mutedCenter: { marginTop: 8, color: '#667085', textAlign: 'center', fontWeight: '700' },
  languageOption: { width: '100%', height: 50, borderRadius: 18, borderWidth: 1, borderColor: '#dbe5e8', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  languageOptionActive: { backgroundColor: brandRed, borderColor: brandRed },
  languageOptionText: { fontWeight: '900', color: '#151923' },
  languageOptionTextActive: { color: '#fff' },
  gate: { flex: 1, justifyContent: 'center', padding: 18 },
  gateCard: { overflow: 'hidden', borderRadius: 28, backgroundColor: '#fff' },
  gateHeader: { alignItems: 'center', backgroundColor: '#151923', padding: 24 },
  gateLogo: { width: 68, height: 68, borderRadius: 18 },
  gateTitle: { marginTop: 16, color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  gateCopy: { marginTop: 8, color: 'rgba(255,255,255,0.72)', fontWeight: '700' },
  formBody: { padding: 22, gap: 14 },
  field: { borderWidth: 1, borderColor: '#dbe5e8', backgroundColor: '#f7fbfc', borderRadius: 18, padding: 14 },
  fieldLabel: { fontSize: 12, color: brandRed, textTransform: 'uppercase', fontWeight: '900', marginBottom: 6 },
  input: { fontSize: 16, color: '#151923', fontWeight: '800', minHeight: 24 },
  referralBadge: { backgroundColor: '#fff4d7', color: '#8b5f00', padding: 12, borderRadius: 16, textAlign: 'center', fontWeight: '900' },
  primaryButton: { minHeight: 48, borderRadius: 16, backgroundColor: brandRed, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  primaryButtonText: { color: '#fff', fontWeight: '900' },
  detailAddButton: { flex: 1 },
  disabled: { opacity: 0.55 },
  header: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  logo: { width: 42, height: 42, borderRadius: 12 },
  brand: { color: brandRed, fontWeight: '900', fontSize: 18 },
  location: { color: '#29384d', fontWeight: '800', maxWidth: 170 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  profileButton: { width: 42, height: 42, borderRadius: 21, overflow: 'hidden', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  profileButtonImage: { width: '100%', height: '100%' },
  cartButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  cartBadge: { position: 'absolute', top: -4, right: -2, backgroundColor: brandRed, color: '#fff', borderRadius: 9, overflow: 'hidden', minWidth: 18, textAlign: 'center', fontSize: 12, fontWeight: '900' },
  searchBox: { marginHorizontal: 16, height: 46, borderWidth: 1, borderColor: '#f15b66', borderRadius: 16, backgroundColor: '#fff', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, fontWeight: '800', color: '#29384d' },
  content: { flex: 1 },
  contentBody: { padding: 16, paddingBottom: 100 },
  pageTitle: { fontSize: 24, fontWeight: '900', color: '#151923', marginBottom: 14 },
  promotionHeroBlock: { marginBottom: 8 },
  promotionHeroRail: { gap: 8 },
  promotionHeroCard: { height: 82, borderRadius: 14, backgroundColor: '#fff4d7', borderWidth: 1, borderColor: '#ffd08a', overflow: 'hidden', flexDirection: 'row' },
  promotionHeroText: { flex: 1, paddingVertical: 8, paddingLeft: 10, paddingRight: 8, justifyContent: 'center' },
  promotionHeroTitle: { color: '#151923', fontSize: 14, lineHeight: 17, fontWeight: '900' },
  promotionHeroCopy: { marginTop: 2, color: '#6c6250', fontSize: 11, lineHeight: 13, fontWeight: '700' },
  promotionHeroCta: { marginTop: 6, alignSelf: 'flex-start', height: 24, borderRadius: 12, backgroundColor: '#151923', paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 3 },
  promotionHeroCtaText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  promotionHeroMedia: { width: 72, backgroundColor: '#ffe6a3', alignItems: 'center', justifyContent: 'center' },
  promotionHeroImage: { width: '100%', height: '100%' },
  promotionHeroDots: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  promotionHeroDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#d8dee2' },
  promotionHeroDotActive: { width: 16, backgroundColor: brandRed },
  promotionHeroStatus: { position: 'absolute', right: 2, bottom: -1, color: brandRed, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  categoryQuickAccess: { marginBottom: 10, gap: 6 },
  categoryGridTop: { flexDirection: 'row', gap: 8 },
  categoryGridBottom: { flexDirection: 'row', gap: 7 },
  categoryTileLarge: { flex: 1, height: 76, borderRadius: 10, backgroundColor: '#eef3f4', padding: 8, justifyContent: 'space-between', overflow: 'visible' },
  categoryTileSmall: { flex: 1, minWidth: 0, height: 58, borderRadius: 8, backgroundColor: '#eef3f4', paddingVertical: 5, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'space-between', overflow: 'visible' },
  categoryTileActive: { borderWidth: 2, borderColor: '#2fbf71', backgroundColor: '#f2fbf5' },
  categoryTileText: { alignSelf: 'flex-start', color: '#333b45', fontSize: 12, fontWeight: '600' },
  categoryTileTextActive: { color: '#0f7f45', fontWeight: '800' },
  categoryBadge: { position: 'absolute', top: -12, alignSelf: 'center', zIndex: 2, borderRadius: 12, backgroundColor: '#23b35d', color: '#fff', paddingHorizontal: 10, paddingVertical: 3, fontSize: 12, fontWeight: '900', overflow: 'hidden' },
  sectionBlock: { marginTop: 6, marginBottom: 16 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionCount: { color: '#6d6f76', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  featuredMealRail: { gap: 8, paddingRight: 10 },
  featuredMealCard: { width: 118, borderRadius: 14, backgroundColor: '#fff', overflow: 'hidden', borderWidth: 1, borderColor: '#f5c45d' },
  featuredMealImage: { width: '100%', height: 84 },
  featuredMealBody: { padding: 8, gap: 3 },
  categorySection: { marginTop: 18 },
  categoryTitle: { color: '#151923', fontSize: 19, fontWeight: '900' },
  mealGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  mealCard: { width: '48%', borderRadius: 16, backgroundColor: '#fff', overflow: 'hidden', borderWidth: 1, borderColor: '#f5c45d' },
  mealImage: { width: '100%', height: 124 },
  shareButton: { position: 'absolute', top: 8, left: 8, width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  favoriteButton: { position: 'absolute', top: 8, right: 8, width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  mealBody: { padding: 12 },
  mealName: { minHeight: 40, color: '#151923', fontWeight: '900' },
  mealMeta: { marginTop: 4, color: '#737373', fontSize: 12, fontWeight: '800' },
  mealFooter: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mealPrice: { color: brandRed, fontWeight: '900' },
  addCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: brandRed, alignItems: 'center', justifyContent: 'center' },
  emptyText: { width: '100%', textAlign: 'center', color: '#737373', fontWeight: '800', padding: 28 },
  loadingMoreBox: { paddingVertical: 18, alignItems: 'center', gap: 8 },
  loadingMoreText: { color: '#6d6f76', fontSize: 12, fontWeight: '800' },
  detailScreen: { flex: 1, backgroundColor: '#fff' },
  detailContent: { paddingBottom: 120 },
  detailImage: { width: '100%', height: 300 },
  detailIcon: { position: 'absolute', top: 18, right: 18, width: 42, height: 42, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  detailShare: { left: 18, right: 'auto' },
  detailBody: { padding: 22 },
  detailTitle: { fontSize: 24, fontWeight: '900', color: '#151923' },
  detailPrice: { marginTop: 8, fontSize: 18, color: brandRed, fontWeight: '900' },
  detailCopy: { marginTop: 14, color: '#5f646b', lineHeight: 22, fontWeight: '600' },
  restaurantInfoCard: { marginTop: 14, borderRadius: 18, borderWidth: 1, borderColor: '#edf0f2', backgroundColor: '#fff', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  restaurantLogo: { width: 44, height: 44, borderRadius: 22 },
  restaurantInfoText: { flex: 1 },
  restaurantName: { color: '#151923', fontWeight: '900' },
  restaurantMeta: { marginTop: 2, color: '#6d6f76', fontSize: 12, fontWeight: '700' },
  openBadge: { borderRadius: 14, backgroundColor: '#e7f8ef', paddingHorizontal: 10, paddingVertical: 6 },
  openBadgeText: { color: '#0b8f4f', fontSize: 12, fontWeight: '900' },
  section: { marginTop: 22 },
  sectionTitle: { fontWeight: '900', marginBottom: 10, color: '#151923' },
  optionHelp: { marginTop: -4, marginBottom: 10, color: '#6d6f76', fontSize: 13, fontWeight: '700' },
  variationCard: { marginTop: 8, borderRadius: 16, borderWidth: 1, borderColor: '#dbe5e8', backgroundColor: '#fff', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  variationCardActive: { borderColor: brandRed, backgroundColor: '#fff4d7' },
  variationTextBox: { flex: 1 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  optionText: { fontWeight: '700', color: '#5f646b' },
  detailFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#edf0f2', flexDirection: 'row', gap: 8 },
  qtyBox: { width: 76, height: 46, borderWidth: 1, borderColor: brandRed, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 6 },
  qtyText: { fontWeight: '900', color: '#151923' },
  orderCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12 },
  orderCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  orderNo: { fontWeight: '900', color: '#151923' },
  orderMeta: { marginTop: 5, color: '#737373', fontWeight: '700' },
  status: { marginTop: 8, color: '#0b8f4f', fontWeight: '900' },
  supportCard: { backgroundColor: '#fff', borderRadius: 24, padding: 22, alignItems: 'center', gap: 10 },
  supportTitle: { fontSize: 18, fontWeight: '900', color: '#151923' },
  supportText: { color: '#737373', fontWeight: '800' },
  profileHeader: { backgroundColor: '#151923', borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 76, height: 76, borderRadius: 22 },
  avatarFallback: { width: 76, height: 76, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  avatarEditBadge: { position: 'absolute', right: -5, bottom: -5, width: 28, height: 28, borderRadius: 14, backgroundColor: brandRed, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#151923' },
  avatarUploadButton: { alignSelf: 'flex-start', marginTop: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 7 },
  avatarUploadText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  profileNameBox: { flex: 1 },
  profileName: { color: '#fff', fontWeight: '900', fontSize: 22 },
  profilePhone: { color: 'rgba(255,255,255,0.7)', fontWeight: '800', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statPill: { flex: 1, alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 12 },
  statValue: { marginTop: 5, fontSize: 22, fontWeight: '900', color: '#151923' },
  statLabel: { fontSize: 12, color: '#737373', fontWeight: '900', textTransform: 'uppercase' },
  rankCard: { marginTop: 12, backgroundColor: '#151923', borderRadius: 18, padding: 14 },
  rankLabel: { color: '#fff', fontWeight: '900' },
  rankCopy: { color: 'rgba(255,255,255,0.68)', marginTop: 4, fontWeight: '700' },
  segment: { flexDirection: 'row', backgroundColor: '#edf0f2', borderRadius: 18, padding: 4, marginTop: 14, gap: 4 },
  segmentButton: { flex: 1, minHeight: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  segmentActive: { backgroundColor: '#fff' },
  segmentText: { color: '#737373', fontWeight: '900', textAlign: 'center' },
  segmentTextActive: { color: brandRed },
  card: { backgroundColor: '#fff', borderRadius: 22, padding: 16, marginTop: 12, gap: 12 },
  cardTitle: { fontWeight: '900', color: '#151923' },
  cardCopy: { color: '#737373', fontWeight: '700', lineHeight: 20 },
  linkText: { backgroundColor: '#f7fbfc', borderRadius: 14, padding: 12, color: '#151923', fontWeight: '900' },
  languageSwitch: { borderTopWidth: 1, borderTopColor: '#edf0f2', paddingTop: 12 },
  languageButtons: { flexDirection: 'row', gap: 8, marginTop: 8 },
  smallLang: { flex: 1, height: 40, borderRadius: 12, backgroundColor: '#f7fbfc', alignItems: 'center', justifyContent: 'center' },
  smallLangActive: { backgroundColor: brandRed },
  smallLangText: { color: '#737373', fontWeight: '900' },
  smallLangTextActive: { color: '#fff', fontWeight: '900' },
  checkoutHeader: { minHeight: 92, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eef8fa' },
  checkoutTitle: { flex: 1, textAlign: 'center', fontSize: 20, color: '#07142a', fontWeight: '500' },
  headerSpacer: { width: 26 },
  checkoutBody: { padding: 16, paddingBottom: 34, gap: 12 },
  checkoutBodyFlush: { paddingBottom: 34 },
  checkoutList: { backgroundColor: '#fff' },
  checkoutItem: { minHeight: 102, borderBottomWidth: 1, borderBottomColor: '#dbe5e8', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkoutItemImage: { width: 74, height: 74, borderRadius: 37 },
  checkoutItemInfo: { flex: 1, paddingRight: 28 },
  checkoutItemName: { color: '#111827', fontSize: 15, fontWeight: '600' },
  checkoutItemVariation: { marginTop: 2, color: brandRed, fontSize: 12, fontWeight: '800' },
  checkoutItemMeta: { marginTop: 3, color: '#6d6f76', fontSize: 13, fontWeight: '600' },
  checkoutRemove: { position: 'absolute', right: 14, top: 12 },
  checkoutQty: { position: 'absolute', right: 12, bottom: 8, width: 84, height: 28, borderRadius: 6, borderWidth: 1, borderColor: '#818892', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  cartTotals: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#dbe5e8', paddingHorizontal: 24, paddingTop: 14, gap: 14 },
  cartGrandTotal: { marginTop: 22, borderTopWidth: 1, borderTopColor: '#dbe5e8', paddingTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  checkoutCtaBox: { paddingHorizontal: 24, paddingTop: 36, paddingBottom: 10 },
  checkoutButton: { minHeight: 48, borderRadius: 6, backgroundColor: brandRed, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  emptyCartScreen: { flex: 1, minHeight: 620, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#eef8fa' },
  emptyCartTitle: { marginTop: 18, color: '#07142a', fontSize: 20, fontWeight: '500', textAlign: 'center' },
  emptyCartCopy: { marginTop: 12, color: '#5f646b', fontSize: 16, lineHeight: 24, textAlign: 'center' },
  segmentPill: { marginHorizontal: 20, height: 52, borderRadius: 26, backgroundColor: '#e9e9e9', padding: 4, flexDirection: 'row', gap: 4 },
  segmentPillButton: { flex: 1, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  segmentPillActive: { backgroundColor: '#fff' },
  segmentPillText: { color: '#000', fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  detailRows: { marginTop: 16, backgroundColor: '#fff' },
  fieldRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingHorizontal: 22, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#edf0f2', backgroundColor: '#fff' },
  fieldRowBody: { flex: 1 },
  rowInput: { minHeight: 28, color: '#07142a', fontSize: 16, fontWeight: '600' },
  rowStatic: { minHeight: 28, color: '#07142a', fontSize: 16, fontWeight: '600' },
  fieldHint: { marginTop: 4, color: '#6d6f76', fontSize: 13, lineHeight: 18, fontWeight: '600' },
  giftPanel: { marginTop: 16, padding: 18, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  giftText: { flex: 1 },
  giftFields: { padding: 16, gap: 12, backgroundColor: '#fff' },
  deliveryTimeRow: { paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between' },
  noteBox: { paddingHorizontal: 22, paddingVertical: 12 },
  noteLabel: { color: '#07142a', fontSize: 16, lineHeight: 22 },
  noteInput: { marginTop: 8, minHeight: 112, borderWidth: 1, borderColor: '#aeb6bd', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, textAlignVertical: 'top', color: '#07142a', fontSize: 14 },
  checkoutSectionHeader: { paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeMenu: { color: '#00a35b', fontSize: 14, fontWeight: '700' },
  addMoreButton: { alignSelf: 'flex-start', margin: 16, height: 38, borderRadius: 19, backgroundColor: '#e9e9e9', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  addMoreText: { color: '#07142a', fontSize: 14, fontWeight: '600' },
  priceRows: { paddingHorizontal: 24, gap: 13 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { color: '#6d6f76', fontSize: 16 },
  priceValue: { color: '#07142a', fontSize: 16, fontWeight: '600' },
  discountValue: { color: '#00a35b', fontSize: 16, fontWeight: '600' },
  priceTotalLabel: { color: '#07142a', fontSize: 16, fontWeight: '500' },
  priceTotal: { color: '#07142a', fontSize: 16, fontWeight: '700' },
  giftRow: { backgroundColor: '#fff', borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cartRow: { backgroundColor: '#fff', borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cartImage: { width: 56, height: 56, borderRadius: 14 },
  cartInfo: { flex: 1 },
  cartName: { fontWeight: '900', color: '#151923' },
  totalBox: { backgroundColor: '#151923', borderRadius: 18, padding: 16, gap: 8 },
  totalLine: { color: 'rgba(255,255,255,0.72)', fontWeight: '700' },
  totalValue: { color: '#fff', fontWeight: '900', fontSize: 18 },
  flashBanner: { marginBottom: 12, borderRadius: 20, backgroundColor: '#fff4d7', borderWidth: 1, borderColor: '#ffd08a', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  flashIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: brandRed, alignItems: 'center', justifyContent: 'center' },
  flashCopy: { flex: 1 },
  flashTitle: { color: '#151923', fontWeight: '900' },
  flashText: { marginTop: 3, color: '#6d6f76', fontWeight: '700', lineHeight: 18 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 12 },
  actionButton: { flex: 1, minHeight: 48, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ffd5d7', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 10 },
  actionText: { color: '#151923', fontWeight: '900' },
  promoCard: { backgroundColor: '#fff', borderRadius: 22, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: '#edf0f2' },
  promoImage: { width: '100%', height: 132 },
  promoImageFallback: { height: 116, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff1ca' },
  promoBody: { padding: 16, gap: 8 },
  promoEyebrow: { color: brandRed, textTransform: 'uppercase', fontSize: 12, fontWeight: '900' },
  promoTitle: { color: '#151923', fontSize: 18, fontWeight: '900' },
  promotionStrip: { marginTop: 22, marginBottom: 6 },
  marketingHeroRail: { gap: 12, paddingRight: 12, paddingVertical: 4 },
  marketingHero: { width: 286, marginTop: 14, borderRadius: 20, backgroundColor: '#fff4d7', overflow: 'hidden', borderWidth: 1, borderColor: '#ffd08a' },
  marketingHeroImage: { width: '100%', height: 112 },
  marketingHeroCopy: { padding: 14, gap: 4 },
  promotionRail: { gap: 12, paddingRight: 10 },
  promotionTile: { width: 230, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#edf0f2', overflow: 'hidden', paddingBottom: 12 },
  promotionTileImage: { width: '100%', height: 106 },
  promotionTileFallback: { height: 106, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff1ca' },
  orderDetailSummary: { backgroundColor: '#151923', borderRadius: 22, padding: 18, gap: 6 },
  orderDetailNo: { color: '#fff', fontSize: 22, fontWeight: '900' },
  orderDetailItem: { minHeight: 76, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  orderDetailImage: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#fff' },
  secondaryButton: { minHeight: 42, borderRadius: 14, backgroundColor: '#fff1ca', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  secondaryButtonText: { color: brandRed, fontWeight: '900' },
  activeOrdersBox: { backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 14, gap: 10 },
  activeOrderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#edf0f2', paddingTop: 10 },
  faqCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginTop: 12, gap: 6 },
  successScreen: { flex: 1, backgroundColor: '#eaf5f8', justifyContent: 'center', padding: 18 },
  successCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center', gap: 16 },
  successIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#33c85a', alignItems: 'center', justifyContent: 'center' },
  successTitle: { color: '#33c85a', fontSize: 20, fontWeight: '900' },
  ratingRow: { flexDirection: 'row', gap: 8 },
  ratingButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff1ca', alignItems: 'center', justifyContent: 'center' },
  reviewSection: { marginTop: 24, gap: 10 },
  reviewScore: { color: brandRed, fontSize: 13, fontWeight: '900' },
  reviewCard: { borderRadius: 16, backgroundColor: '#f7fbfc', borderWidth: 1, borderColor: '#edf0f2', padding: 12, gap: 6 },
  reviewStars: { color: '#f5a400', fontSize: 12, fontWeight: '900' },
  reviewForm: { marginTop: 6, borderRadius: 18, borderWidth: 1, borderColor: '#ffd5d7', backgroundColor: '#fff', padding: 14, gap: 10 },
  reviewInput: { minHeight: 76, borderRadius: 14, borderWidth: 1, borderColor: '#dbe5e8', backgroundColor: '#f7fbfc', padding: 12, color: '#151923', textAlignVertical: 'top', fontWeight: '700' },
  orderReviewBox: { marginTop: 10, borderRadius: 16, borderWidth: 1, borderColor: '#ffd5d7', backgroundColor: '#fff', padding: 12, gap: 10 },
  orderDetailItemBlock: { borderRadius: 18, backgroundColor: '#fff4d7', padding: 12, gap: 8 },
  filterRail: { gap: 8, paddingBottom: 12 },
  filterChip: { borderRadius: 999, borderWidth: 1, borderColor: '#dbe5e8', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8 },
  filterChipActive: { borderColor: brandRed, backgroundColor: '#fff4f4' },
  filterChipText: { color: '#5f646b', fontSize: 12, fontWeight: '900' },
  filterChipTextActive: { color: brandRed },
  switchAccountButton: { marginTop: 12, minHeight: 46, borderRadius: 16, borderWidth: 1, borderColor: '#ffd5d7', backgroundColor: '#fff8f8', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  switchAccountText: { color: brandRed, fontSize: 12, fontWeight: '900' },
  flashModal: { width: '100%', maxWidth: 380, borderRadius: 26, backgroundColor: '#fff', padding: 22, alignItems: 'center', gap: 12 },
  codeBox: { width: '100%', borderRadius: 18, backgroundColor: '#151923', color: '#fff', textAlign: 'center', padding: 16, fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  linkButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  linkButtonText: { color: '#5f646b', fontWeight: '900' },
  uploadCard: { backgroundColor: '#fff', borderRadius: 18, padding: 14, alignItems: 'center', justifyContent: 'center', gap: 12, borderWidth: 1, borderColor: '#dbe5e8' },
  uploadPreview: { width: '100%', height: 150, borderRadius: 14 },
  bottomTabs: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 74, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#dde7ea', flexDirection: 'row', paddingHorizontal: 4, paddingBottom: 4 },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabText: { fontSize: 12, color: '#42495a', fontWeight: '900' },
  tabTextActive: { color: brandRed },
  activeOrderTabBadge: { position: 'absolute', top: -8, right: -10, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: brandRed, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  activeOrderTabText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  rewardFab: { position: 'absolute', right: 18, bottom: 92, width: 56, height: 56, borderRadius: 28, backgroundColor: brandRed, alignItems: 'center', justifyContent: 'center', shadowColor: brandRed, shadowOpacity: 0.28, shadowRadius: 18, elevation: 8 },
  rewardOverlay: { flex: 1, backgroundColor: 'rgba(21,25,35,0.45)', justifyContent: 'flex-end' },
  rewardSheet: { maxHeight: '78%', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: '#fff', overflow: 'hidden' },
  streakPanel: { marginHorizontal: 16, marginBottom: 4, borderRadius: 18, backgroundColor: '#151923', padding: 14, overflow: 'hidden' },
  streakLabel: { color: 'rgba(255,255,255,0.62)', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  streakValue: { marginTop: 2, color: '#fff', fontSize: 24, fontWeight: '900' },
  streakTrack: { marginTop: 12, height: 9, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.16)', overflow: 'hidden' },
  streakFill: { height: '100%', borderRadius: 8, backgroundColor: '#2fbf71' },
  streakHint: { marginTop: 7, color: 'rgba(255,255,255,0.72)', fontSize: 12, fontWeight: '800' },
  rewardBurst: { position: 'absolute', right: 14, top: 16, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 16, backgroundColor: brandRed, paddingHorizontal: 10, paddingVertical: 6 },
  rewardBurstText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  rewardCard: { borderRadius: 18, backgroundColor: '#fff8e8', padding: 14, gap: 12, marginBottom: 12, borderWidth: 1, borderColor: '#ffd08a' },
  rewardCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rewardIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  rewardCardCopy: { flex: 1 },
  claimButton: { height: 42, borderRadius: 16, backgroundColor: brandRed, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  claimButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  claimResult: { color: '#16894d', fontSize: 12, fontWeight: '900' }
});
