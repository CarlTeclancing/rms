import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
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
          {form.referralCode ? <Text style={styles.referralBadge}>Referral bonus active</Text> : null}
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

function MealDetail({ item, visible, onClose, onAdd, onShare }) {
  const [quantity, setQuantity] = useState(1);
  const variations = mealVariations(item);
  const [variation, setVariation] = useState('');

  useEffect(() => {
    setQuantity(1);
    setVariation(variations[0]?.name || '');
  }, [item?.id]);

  if (!item) return null;
  const price = mealPrice(item, variation);

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
            <Text style={styles.detailCopy}>{item.description || 'Freshly prepared ChopASAP meal served hot for reserve or delivery.'}</Text>
            {variations.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Variation</Text>
                {variations.map((entry) => (
                  <Pressable key={entry.name} style={styles.optionRow} onPress={() => setVariation(variation === entry.name ? '' : entry.name)}>
                    <Ionicons name={variation === entry.name ? 'radio-button-on' : 'radio-button-off'} size={20} color={brandRed} />
                    <Text style={styles.optionText}>{entry.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>
        <View style={styles.detailFooter}>
          <View style={styles.qtyBox}>
            <Pressable onPress={() => setQuantity(Math.max(1, quantity - 1))}><Ionicons name="remove" size={18} /></Pressable>
            <Text style={styles.qtyText}>{quantity}</Text>
            <Pressable onPress={() => setQuantity(quantity + 1)}><Ionicons name="add" size={18} /></Pressable>
          </View>
          <Pressable style={styles.primaryButton} onPress={() => onAdd(item, quantity, variation)}>
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
  const [settings, setSettings] = useState({});
  const [promotions, setPromotions] = useState([]);
  const [flashSale, setFlashSale] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(null);
  const [reservationOpen, setReservationOpen] = useState(false);
  const [promotionOpen, setPromotionOpen] = useState(false);
  const [flashSaleOpen, setFlashSaleOpen] = useState(false);
  const [fulfillment, setFulfillment] = useState('delivery');
  const [orderForm, setOrderForm] = useState({ deliveryAddress: '', deliveryNote: '', isGift: false, recipientName: '', recipientPhone: '', recipientAddress: '' });
  const [reservationForm, setReservationForm] = useState(emptyReservationForm);
  const [promotionForm, setPromotionForm] = useState(emptyPromotionForm);
  const [profileTab, setProfileTab] = useState('referral');

  const filteredItems = useMemo(() => items.filter((item) => `${item.name} ${item.category?.name || ''}`.toLowerCase().includes(search.toLowerCase())), [items, search]);
  const favoriteItems = useMemo(() => items.filter((item) => favorites.includes(item.id)), [items, favorites]);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = fulfillment === 'delivery' ? Number(settings.deliveryFee || 0) : 0;
  const serviceFee = Number(settings.serviceFee || 0);
  const total = subtotal + deliveryFee + serviceFee;
  const referralLink = customer?.referralCode ? `${portalUrl}/?ref=${customer.referralCode}` : '';
  const rank = RewardRank(customer?.points);

  useEffect(() => {
    bootstrap();
  }, []);

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
        setCustomerForm({ name: parsed.name || '', phone: parsed.phone || '', email: parsed.email || '', address: parsed.address || '', referralCode: parsed.referralCode || '' });
        loadOrders(parsed.id);
      } else {
        const params = Linking.parse(initialUrl || '').queryParams || {};
        setCustomerForm((current) => ({ ...current, referralCode: params.ref || '' }));
      }

      const [menuData, settingsData, promotionData, flashSaleData] = await Promise.all([
        api.menu(),
        api.settings().catch(() => ({})),
        api.promotions().catch(() => ({ items: [] })),
        api.flashSale().catch(() => ({ item: null }))
      ]);
      setItems(menuData.items || []);
      setSettings(settingsData || {});
      setPromotions(promotionData.items || []);
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
    setCustomerForm({ name: saved.name || '', phone: saved.phone || '', email: saved.email || '', address: saved.address || '', referralCode: saved.referralCode || '' });
    setOrderForm((current) => ({ ...current, deliveryAddress: saved.address || current.deliveryAddress }));
    await AsyncStorage.setItem(customerKey, JSON.stringify(saved));
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

    setSaving(true);
    try {
      const submittedCart = cart;
      const submittedCustomer = {
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email || '',
        deliveryAddress: fulfillment === 'delivery' ? orderForm.deliveryAddress : 'Reserve onsite',
        deliveryNote: orderForm.deliveryNote,
        isGift: orderForm.isGift,
        recipientName: orderForm.recipientName,
        recipientPhone: orderForm.recipientPhone,
        recipientAddress: orderForm.recipientAddress
      };
      const order = await api.createOrder({
        ...submittedCustomer,
        customerId: customer.id,
        deliveryFee,
        items: cart.map(({ menuItemId, quantity, variationName }) => ({ menuItemId, quantity, variationName }))
      });
      setCart([]);
      setCheckoutSuccess(order);
      setActiveOrders((current) => [order, ...current.filter((entry) => entry.id !== order.id)].slice(0, 10));
      await saveCustomer({ ...customer, points: Number(customer.points || 0) + Number(order.pointsEarned || 0), orderCount: Number(customer.orderCount || 0) + 1 });
      await loadOrders(customer.id);
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

  if (loading) return <Loader label="Loading ChopASAP" />;

  return (
    <SafeAreaView style={styles.safe}>
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
            <Pressable style={styles.cartButton} onPress={() => setCheckoutOpen(true)}>
              <Ionicons name="bag-outline" size={21} color="#29384d" />
              {cart.length ? <Text style={styles.cartBadge}>{cart.reduce((sum, item) => sum + item.quantity, 0)}</Text> : null}
            </Pressable>
            {flashSale ? (
              <Pressable style={styles.cartButton} onPress={() => setFlashSaleOpen(true)}>
                <Ionicons name="pricetag-outline" size={21} color={brandRed} />
              </Pressable>
            ) : null}
          </View>

          {['home', 'meals', 'favorites'].includes(tab) ? (
            <View style={styles.searchBox}>
              <TextInput style={styles.searchInput} placeholder={t(language, 'search')} placeholderTextColor="#9aa4ad" value={search} onChangeText={setSearch} />
              <Ionicons name="search" size={21} color={brandRed} />
            </View>
          ) : null}

          <ScrollView style={styles.content} contentContainerStyle={styles.contentBody}>
            {tab === 'home' ? (
              <HomeView
                items={filteredItems}
                favorites={favorites}
                promotions={promotions}
                activeOrders={activeOrders}
                flashSale={flashSale}
                language={language}
                onOpen={setSelectedMeal}
                onFavorite={toggleFavorite}
                onShare={shareMeal}
                onReserve={() => setReservationOpen(true)}
                onPromote={() => setPromotionOpen(true)}
                onFlashSale={() => setFlashSaleOpen(true)}
              />
            ) : null}
            {tab === 'meals' ? <MealsView title={t(language, 'meals')} items={filteredItems} favorites={favorites} onOpen={setSelectedMeal} onFavorite={toggleFavorite} onShare={shareMeal} language={language} /> : null}
            {tab === 'favorites' ? <MealsView title={t(language, 'favorites')} items={favoriteItems} favorites={favorites} onOpen={setSelectedMeal} onFavorite={toggleFavorite} onShare={shareMeal} language={language} /> : null}
            {tab === 'orders' ? <OrdersView orders={orders} activeOrders={activeOrders} language={language} /> : null}
            {tab === 'support' ? <SupportView settings={settings} language={language} onReserve={() => setReservationOpen(true)} onPromote={() => setPromotionOpen(true)} /> : null}
            {tab === 'profile' ? (
              <ProfileView
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
              />
            ) : null}
          </ScrollView>

          <BottomTabs tab={tab} setTab={setTab} language={language} />
          <MealDetail item={selectedMeal} visible={Boolean(selectedMeal)} onClose={() => setSelectedMeal(null)} onAdd={addToCart} onShare={shareMeal} />
          <CheckoutModal
            visible={checkoutOpen}
            language={language}
            cart={cart}
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
            onSubmit={submitOrder}
          />
          <SuccessModal
            visible={Boolean(checkoutSuccess)}
            order={checkoutSuccess}
            onClose={() => {
              setCheckoutSuccess(null);
              setCheckoutOpen(false);
              setTab('home');
            }}
          />
          <FlashSaleModal visible={flashSaleOpen} code={flashSale} onClose={dismissFlashSale} onShare={shareFlashSale} />
          <ReservationModal visible={reservationOpen} form={reservationForm} setForm={setReservationForm} saving={saving} onClose={() => setReservationOpen(false)} onSubmit={submitReservation} />
          <PromotionModal visible={promotionOpen} form={promotionForm} setForm={setPromotionForm} saving={saving} onPickImage={pickPromotionImage} onClose={() => setPromotionOpen(false)} onSubmit={submitPromotion} />
        </>
      )}
    </SafeAreaView>
  );
}

function HomeView({ items, favorites, promotions, activeOrders, flashSale, language, onOpen, onFavorite, onShare, onReserve, onPromote, onFlashSale }) {
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

function MealsView({ title, items, favorites, onOpen, onFavorite, onShare, language }) {
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

function OrdersView({ orders, activeOrders, language }) {
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
          <Text style={styles.actionText}>Reserve a meal</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={onPromote}>
          <Ionicons name="megaphone-outline" size={19} color={brandRed} />
          <Text style={styles.actionText}>Promote</Text>
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

function ProfileView({ customer, customerForm, setCustomerForm, language, chooseLanguage, profileTab, setProfileTab, rank, orders, referralLink, saving, onShareReferral, onPickAvatar, onUpdateProfile }) {
  return (
    <View>
      <View style={styles.profileHeader}>
        <Pressable onPress={onPickAvatar}>
          {customer.profileImageUrl ? <Image source={{ uri: customer.profileImageUrl }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Ionicons name="person" size={34} color="#fff" /></View>}
        </Pressable>
        <View style={styles.profileNameBox}>
          <Text style={styles.profileName}>{customer.name}</Text>
          <Text style={styles.profilePhone}>{customer.phone}</Text>
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
        </View>
      )}
    </View>
  );
}

function CheckoutModal({ visible, language, cart, fulfillment, setFulfillment, orderForm, setOrderForm, updateQty, subtotal, deliveryFee, serviceFee, total, saving, onClose, onSubmit }) {
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.detailScreen}>
        <View style={styles.checkoutHeader}>
          <Text style={styles.pageTitle}>{t(language, 'checkout')}</Text>
          <Pressable onPress={onClose}><Ionicons name="close" size={26} color="#111" /></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.checkoutBody}>
          <View style={styles.segment}>
            {['delivery', 'reserve'].map((item) => (
              <Pressable key={item} style={[styles.segmentButton, fulfillment === item && styles.segmentActive]} onPress={() => setFulfillment(item)}>
                <Text style={[styles.segmentText, fulfillment === item && styles.segmentTextActive]}>{t(language, item)}</Text>
              </Pressable>
            ))}
          </View>
          {fulfillment === 'delivery' ? <Field label={t(language, 'deliveryAddress')} value={orderForm.deliveryAddress} onChangeText={(deliveryAddress) => setOrderForm({ ...orderForm, deliveryAddress })} /> : null}
          <View style={styles.giftRow}>
            <Text style={styles.cardTitle}>{t(language, 'orderForLovedOne')}</Text>
            <Switch value={orderForm.isGift} onValueChange={(isGift) => setOrderForm({ ...orderForm, isGift })} trackColor={{ true: '#ffd8dc' }} thumbColor={orderForm.isGift ? brandRed : '#f4f4f5'} />
          </View>
          {orderForm.isGift ? (
            <>
              <Field label={t(language, 'recipientName')} value={orderForm.recipientName} onChangeText={(recipientName) => setOrderForm({ ...orderForm, recipientName })} />
              <Field label={t(language, 'recipientPhone')} value={orderForm.recipientPhone} onChangeText={(recipientPhone) => setOrderForm({ ...orderForm, recipientPhone })} keyboardType="phone-pad" />
              {fulfillment === 'delivery' ? <Field label={t(language, 'recipientAddress')} value={orderForm.recipientAddress} onChangeText={(recipientAddress) => setOrderForm({ ...orderForm, recipientAddress })} /> : null}
            </>
          ) : null}
          <Field label={t(language, 'noteOptional')} value={orderForm.deliveryNote} onChangeText={(deliveryNote) => setOrderForm({ ...orderForm, deliveryNote })} multiline />
          {cart.length ? cart.map((item) => (
            <View key={item.cartItemId} style={styles.cartRow}>
              <Image source={{ uri: item.imageUrl || fallbackImage }} style={styles.cartImage} />
              <View style={styles.cartInfo}>
                <Text style={styles.cartName}>{item.name}</Text>
                <Text style={styles.mealPrice}>{formatMoney(item.price * item.quantity)}</Text>
              </View>
              <View style={styles.qtyBox}>
                <Pressable onPress={() => updateQty(item.cartItemId, -1)}><Ionicons name="remove" size={18} /></Pressable>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <Pressable onPress={() => updateQty(item.cartItemId, 1)}><Ionicons name="add" size={18} /></Pressable>
              </View>
            </View>
          )) : <Text style={styles.emptyText}>{t(language, 'emptyCart')}</Text>}
          <View style={styles.totalBox}>
            <Text style={styles.totalLine}>Items: {formatMoney(subtotal)}</Text>
            <Text style={styles.totalLine}>Promotion: -{formatMoney(0)}</Text>
            <Text style={styles.totalLine}>Delivery: {formatMoney(deliveryFee)}</Text>
            <Text style={styles.totalLine}>Taxes & other fees: {formatMoney(serviceFee)}</Text>
            <Text style={styles.totalValue}>Total: {formatMoney(total)}</Text>
          </View>
          <Pressable style={[styles.primaryButton, saving && styles.disabled]} onPress={onSubmit} disabled={saving}>
            <Text style={styles.primaryButtonText}>{saving ? t(language, 'checking') : t(language, 'confirmOrder')}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function SuccessModal({ visible, order, onClose }) {
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.successScreen}>
        <View style={styles.successCard}>
          <View style={styles.successIcon}><Ionicons name="checkmark" size={54} color="#fff" /></View>
          <Text style={styles.successTitle}>Order was placed!</Text>
          <Text style={styles.cardCopy}>{order?.orderNo ? `Track ${order.orderNo} in Orders.` : 'Track your order in Orders.'}</Text>
          <Text style={styles.supportTitle}>Rate your order</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <Pressable key={rating} style={styles.ratingButton} onPress={() => Alert.alert('ChopASAP', `Thanks for rating ${rating} star${rating === 1 ? '' : 's'}.`)}>
                <Ionicons name="star" size={22} color="#f5a400" />
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.primaryButton} onPress={onClose}>
            <Text style={styles.primaryButtonText}>Back to Home</Text>
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

function ReservationModal({ visible, form, setForm, saving, onClose, onSubmit }) {
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.detailScreen}>
        <View style={styles.checkoutHeader}>
          <Text style={styles.pageTitle}>Reserve a meal</Text>
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

function PromotionModal({ visible, form, setForm, saving, onPickImage, onClose, onSubmit }) {
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.detailScreen}>
        <View style={styles.checkoutHeader}>
          <Text style={styles.pageTitle}>Promote on ChopASAP</Text>
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

function BottomTabs({ tab, setTab, language }) {
  const tabs = [
    ['home', 'home-outline', t(language, 'home')],
    ['meals', 'restaurant-outline', t(language, 'meals')],
    ['support', 'headset-outline', t(language, 'support')],
    ['favorites', 'heart-outline', t(language, 'favorites')],
    ['orders', 'receipt-outline', t(language, 'orders')],
    ['profile', 'person-outline', t(language, 'profile')]
  ];
  return (
    <View style={styles.bottomTabs}>
      {tabs.map(([id, icon, label]) => (
        <Pressable key={id} style={styles.tabButton} onPress={() => setTab(id)}>
          <Ionicons name={icon} size={21} color={tab === id ? brandRed : '#42495a'} />
          <Text style={[styles.tabText, tab === id && styles.tabTextActive]} numberOfLines={1}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#eaf5f8' },
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
  fieldLabel: { fontSize: 11, color: brandRed, textTransform: 'uppercase', fontWeight: '900', marginBottom: 6 },
  input: { fontSize: 16, color: '#151923', fontWeight: '800', minHeight: 24 },
  referralBadge: { backgroundColor: '#fff4d7', color: '#8b5f00', padding: 12, borderRadius: 16, textAlign: 'center', fontWeight: '900' },
  primaryButton: { minHeight: 48, borderRadius: 16, backgroundColor: brandRed, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  primaryButtonText: { color: '#fff', fontWeight: '900' },
  disabled: { opacity: 0.55 },
  header: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  logo: { width: 42, height: 42, borderRadius: 12 },
  brand: { color: brandRed, fontWeight: '900', fontSize: 18 },
  location: { color: '#29384d', fontWeight: '800', maxWidth: 230 },
  cartButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  cartBadge: { position: 'absolute', top: -4, right: -2, backgroundColor: brandRed, color: '#fff', borderRadius: 9, overflow: 'hidden', minWidth: 18, textAlign: 'center', fontSize: 11, fontWeight: '900' },
  searchBox: { marginHorizontal: 16, height: 46, borderWidth: 1, borderColor: '#f15b66', borderRadius: 16, backgroundColor: '#fff', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, fontWeight: '800', color: '#29384d' },
  content: { flex: 1 },
  contentBody: { padding: 16, paddingBottom: 100 },
  pageTitle: { fontSize: 24, fontWeight: '900', color: '#151923', marginBottom: 14 },
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
  detailScreen: { flex: 1, backgroundColor: '#fff' },
  detailContent: { paddingBottom: 120 },
  detailImage: { width: '100%', height: 300 },
  detailIcon: { position: 'absolute', top: 18, right: 18, width: 42, height: 42, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  detailShare: { left: 18, right: 'auto' },
  detailBody: { padding: 22 },
  detailTitle: { fontSize: 24, fontWeight: '900', color: '#151923' },
  detailPrice: { marginTop: 8, fontSize: 18, color: brandRed, fontWeight: '900' },
  detailCopy: { marginTop: 14, color: '#5f646b', lineHeight: 22, fontWeight: '600' },
  section: { marginTop: 22 },
  sectionTitle: { fontWeight: '900', marginBottom: 10, color: '#151923' },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  optionText: { fontWeight: '700', color: '#5f646b' },
  detailFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#edf0f2', flexDirection: 'row', gap: 12 },
  qtyBox: { minWidth: 88, height: 46, borderWidth: 1, borderColor: brandRed, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 8 },
  qtyText: { fontWeight: '900', color: '#151923' },
  orderCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12 },
  orderNo: { fontWeight: '900', color: '#151923' },
  orderMeta: { marginTop: 5, color: '#737373', fontWeight: '700' },
  status: { marginTop: 8, color: '#0b8f4f', fontWeight: '900' },
  supportCard: { backgroundColor: '#fff', borderRadius: 24, padding: 22, alignItems: 'center', gap: 10 },
  supportTitle: { fontSize: 18, fontWeight: '900', color: '#151923' },
  supportText: { color: '#737373', fontWeight: '800' },
  profileHeader: { backgroundColor: '#151923', borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 76, height: 76, borderRadius: 22 },
  avatarFallback: { width: 76, height: 76, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  profileNameBox: { flex: 1 },
  profileName: { color: '#fff', fontWeight: '900', fontSize: 22 },
  profilePhone: { color: 'rgba(255,255,255,0.7)', fontWeight: '800', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statPill: { flex: 1, alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 12 },
  statValue: { marginTop: 5, fontSize: 22, fontWeight: '900', color: '#151923' },
  statLabel: { fontSize: 11, color: '#737373', fontWeight: '900', textTransform: 'uppercase' },
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
  checkoutHeader: { padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  checkoutBody: { padding: 16, paddingBottom: 34, gap: 12 },
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
  promoEyebrow: { color: brandRed, textTransform: 'uppercase', fontSize: 11, fontWeight: '900' },
  promoTitle: { color: '#151923', fontSize: 18, fontWeight: '900' },
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
  flashModal: { width: '100%', maxWidth: 380, borderRadius: 26, backgroundColor: '#fff', padding: 22, alignItems: 'center', gap: 12 },
  codeBox: { width: '100%', borderRadius: 18, backgroundColor: '#151923', color: '#fff', textAlign: 'center', padding: 16, fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  linkButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  linkButtonText: { color: '#5f646b', fontWeight: '900' },
  uploadCard: { backgroundColor: '#fff', borderRadius: 18, padding: 14, alignItems: 'center', justifyContent: 'center', gap: 12, borderWidth: 1, borderColor: '#dbe5e8' },
  uploadPreview: { width: '100%', height: 150, borderRadius: 14 },
  bottomTabs: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 74, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#dde7ea', flexDirection: 'row', paddingHorizontal: 4, paddingBottom: 4 },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabText: { fontSize: 10, color: '#42495a', fontWeight: '900' },
  tabTextActive: { color: brandRed }
});
