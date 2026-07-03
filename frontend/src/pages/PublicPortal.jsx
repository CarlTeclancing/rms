import {
  Bell,
  Bike,
  CalendarClock,
  Heart,
  Home,
  LocateFixed,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Star,
  Store,
  User,
  Utensils,
  X
} from 'lucide-react';
import clsx from 'clsx';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { EmptyState } from '../components/EmptyState.jsx';
import { Loading } from '../components/Loading.jsx';
import { endpoints } from '../services/api.js';
import { currency } from '../utils/format.js';
import { useApi } from '../hooks/useApi.js';
import { useSettings } from '../context/SettingsContext.jsx';

const fallbackImage = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80';
const tabs = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'favorites', label: 'Favorites', icon: Heart },
  { id: 'shops', label: 'Shops', icon: Store },
  { id: 'profile', label: 'Profile', icon: User }
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

function RedButton({ children, className, ...props }) {
  return (
    <button
      className={clsx(
        'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-extrabold text-white shadow-sm shadow-red-200 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
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
        'flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-extrabold transition',
        active ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'text-stone-500 hover:bg-red-50 hover:text-red-600'
      )}
      onClick={onClick}
    >
      <Icon size={20} fill={tab.id === 'favorites' && active ? 'currentColor' : 'none'} />
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

function MealCard({ item, favorite, onFavorite, onAdd }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-red-100 bg-white shadow-[0_16px_40px_rgba(127,29,29,0.10)]">
      <div className="relative">
        <img className="h-40 w-full object-cover" src={item.imageUrl || fallbackImage} alt={item.name} />
        <button
          className={clsx('absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white shadow-md', favorite ? 'text-red-600' : 'text-stone-500')}
          onClick={() => onFavorite(item.id)}
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
          <p className="shrink-0 font-black text-red-600">{currency(item.price)}</p>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-600">
            <Star size={14} className="text-amber-500" fill="currentColor" />
            4.8
            <span className="h-1 w-1 rounded-full bg-stone-300" />
            25 min
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-full bg-red-600 text-white shadow-md shadow-red-200" onClick={() => onAdd(item)} aria-label="Add to basket">
            <Plus size={19} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function PublicPortal() {
  const { data, loading, error, refetch } = useApi(() => endpoints.publicMenu(), []);
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState('home');
  const [favorites, setFavorites] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [orderOpen, setOrderOpen] = useState(false);
  const [reservationOpen, setReservationOpen] = useState(false);
  const [orderForm, setOrderForm] = useState(emptyOrderForm);
  const [reservation, setReservation] = useState(emptyReservationForm);
  const [submitting, setSubmitting] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 'welcome', title: 'Welcome', body: 'Fresh meals are ready for delivery.' }
  ]);

  const items = data?.items || [];
  const categories = [...new Set(items.map((item) => item.category?.name).filter(Boolean))];
  const filteredItems = items.filter((item) => `${item.name} ${item.category?.name || ''}`.toLowerCase().includes(search.toLowerCase()));
  const favoriteItems = items.filter((item) => favorites.includes(item.id));
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const grandTotal = total + Number(settings.deliveryFee || 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addNotification = (title, body) => setNotifications((current) => [{ id: `${Date.now()}`, title, body }, ...current].slice(0, 5));
  const toggleFavorite = (id) => setFavorites((current) => (current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]));

  const add = (item) => {
    setCart((current) => {
      const existing = current.find((entry) => entry.menuItemId === item.id);
      if (existing) return current.map((entry) => (entry.menuItemId === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry));
      return [...current, { menuItemId: item.id, name: item.name, price: Number(item.price), quantity: 1, imageUrl: item.imageUrl }];
    });
    toast.success(`${item.name} added`);
  };

  const updateQty = (id, delta) => {
    setCart((current) =>
      current
        .map((item) => (item.menuItemId === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item))
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
    event.preventDefault();
    if (!cart.length) return toast.error('Add at least one meal');
    setSubmitting(true);
    try {
      const response = await endpoints.createOnlineOrder({
        ...orderForm,
        items: cart.map(({ menuItemId, quantity }) => ({ menuItemId, quantity }))
      });
      toast.success(`Order ${response.data.orderNo} received`);
      addNotification('Order placed', `${response.data.orderNo} is pending confirmation.`);
      setCart([]);
      setOrderOpen(false);
      setOrderForm(emptyOrderForm);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not place order');
    } finally {
      setSubmitting(false);
    }
  };

  const submitReservation = async (event) => {
    event.preventDefault();
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

  if (loading) return <Loading label="Loading menu" />;
  if (error || !data) return <EmptyState title="Menu unavailable" message="The ordering portal could not load the menu." onRetry={refetch} />;

  const renderMeals = (list) => (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {list.map((item) => (
        <MealCard key={item.id} item={item} favorite={favorites.includes(item.id)} onFavorite={toggleFavorite} onAdd={add} />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-red-50 text-stone-950">
      <div className="mx-auto min-h-screen max-w-7xl bg-[#fff8f5]">
        <header className="sticky top-0 z-30 border-b border-red-100 bg-[#fff8f5]/95 px-4 py-4 backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-200">
                <Utensils size={23} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-red-600">{settings.shortName}</p>
                <p className="flex items-center gap-1 truncate text-sm font-black text-stone-950">
                  <MapPin size={15} className="text-red-600" />
                  {orderForm.deliveryAddress || 'Choose delivery location'}
                </p>
              </div>
            </div>
            <button className="relative grid h-11 w-11 place-items-center rounded-2xl bg-white text-stone-800 shadow-md" onClick={() => setActiveTab('profile')} aria-label="Notifications">
              <Bell size={20} />
              {notifications.length ? <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-600" /> : null}
            </button>
          </div>
        </header>

        <div className="grid gap-5 px-4 pb-8 pt-4 md:grid-cols-[220px_1fr] md:px-6 lg:grid-cols-[220px_1fr_330px]">
          <aside className="self-start rounded-3xl bg-white p-3 shadow-md md:sticky md:top-24">
            <p className="px-3 pb-2 pt-1 text-xs font-black uppercase text-red-600">Menu</p>
            <nav className="grid gap-2">
              {tabs.map((tab) => (
                <TabButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
              ))}
            </nav>
            <button className="mt-4 flex h-11 w-full items-center justify-center rounded-2xl bg-red-50 text-sm font-black text-red-600 disabled:opacity-50" disabled={!settings.reservations} onClick={() => setReservationOpen(true)}>
              <CalendarClock size={17} /> Reserve
            </button>
            <a className="mt-2 flex h-11 w-full items-center justify-center rounded-2xl bg-stone-50 text-sm font-black text-stone-700" href="/login">Admin login</a>
          </aside>

          <main className="min-w-0">
            {activeTab === 'home' ? (
              <>
                <section className="rounded-3xl bg-gradient-to-br from-red-600 to-red-700 p-5 text-white shadow-xl shadow-red-200">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-red-100">Open now</p>
                      <h1 className="mt-1 text-3xl font-black tracking-normal">Order meals that arrive hot.</h1>
                      <p className="mt-2 text-sm font-semibold text-red-50">Browse shops, save favorites, and checkout in seconds.</p>
                    </div>
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15">
                      <Bike size={30} />
                    </div>
                  </div>
                </section>

                <div className="mt-4 flex h-12 items-center gap-2 rounded-2xl bg-white px-4 shadow-md">
                  <Search size={19} className="text-stone-500" />
                  <input
                    className="h-full flex-1 bg-transparent text-sm font-bold text-stone-950 outline-none placeholder:text-stone-400"
                    placeholder="Search meals or shops"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>

                <section className="mt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-black">Shops available</h2>
                    <button className="text-sm font-black text-red-600" onClick={() => setActiveTab('shops')}>View all</button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {(categories.length ? categories : ['Main Kitchen']).slice(0, 3).map((category) => (
                      <button key={category} className="flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-md" onClick={() => setSearch(category)}>
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-100 text-red-600"><Store size={22} /></div>
                        <div className="min-w-0">
                          <p className="truncate font-black">{category}</p>
                          <p className="text-xs font-bold text-green-600">Open for delivery</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="mt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-black">Popular meals</h2>
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">{filteredItems.length} items</span>
                  </div>
                  {renderMeals(filteredItems)}
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
                      <Heart className="mx-auto text-red-600" size={34} />
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
                          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-red-100 text-red-600"><Store size={24} /></div>
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

            {activeTab === 'profile' ? (
              <section className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-3xl bg-white p-5 shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="grid h-16 w-16 place-items-center rounded-3xl bg-red-100 text-red-600"><User size={28} /></div>
                    <div>
                      <h1 className="font-black">{orderForm.customerName || reservation.customerName || 'Guest customer'}</h1>
                      <p className="text-sm font-semibold text-stone-600">Anonymous checkout enabled</p>
                    </div>
                  </div>
                  <RedButton className="mt-5 w-full" disabled={!settings.reservations} onClick={() => setReservationOpen(true)}><CalendarClock size={17} /> Reserve a meal</RedButton>
                  <a className="mt-3 flex h-11 items-center justify-center rounded-xl bg-red-50 text-sm font-black text-red-600" href="/login">Admin login</a>
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-md">
                  <h2 className="font-black">Notifications</h2>
                  <div className="mt-3 space-y-3">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="rounded-2xl bg-red-50 p-3">
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
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">{cartCount} items</span>
            </div>
            <div className="mt-4 space-y-3">
              {cart.length ? cart.slice(0, 3).map((item) => (
                <div key={item.menuItemId} className="flex gap-3 rounded-2xl bg-red-50/70 p-3">
                  <img className="h-12 w-12 rounded-xl object-cover" src={item.imageUrl || fallbackImage} alt={item.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">{item.name}</p>
                    <p className="text-sm font-black text-red-600">{currency(item.price * item.quantity)}</p>
                  </div>
                </div>
              )) : <p className="rounded-2xl bg-stone-50 p-4 text-sm font-semibold text-stone-600">Your basket is empty.</p>}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4 text-lg font-black">
              <span>Total</span>
              <span className="text-red-600">{currency(grandTotal)}</span>
            </div>
            <RedButton className="mt-4 w-full" disabled={!settings.publicOrdering} onClick={() => setOrderOpen(true)}>Checkout</RedButton>
          </aside>
        </div>

        <button className="fixed bottom-5 right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-red-600 px-5 font-black text-white shadow-xl shadow-red-300 disabled:opacity-50 lg:hidden" disabled={!settings.publicOrdering} onClick={() => setOrderOpen(true)}>
          <ShoppingBag size={20} />
          {cartCount ? `${cartCount} item${cartCount > 1 ? 's' : ''}` : 'Basket'}
        </button>
      </div>

      <Modal title="Complete your order" open={orderOpen} onClose={() => setOrderOpen(false)}>
        <form onSubmit={submitOrder}>
          <div className="space-y-3">
            {cart.length ? cart.map((item) => (
              <div key={item.menuItemId} className="flex gap-3 rounded-2xl bg-red-50 p-3">
                <img className="h-14 w-14 rounded-2xl object-cover" src={item.imageUrl || fallbackImage} alt={item.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <p className="truncate text-sm font-black">{item.name}</p>
                    <p className="text-sm font-black text-red-600">{currency(item.price * item.quantity)}</p>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button type="button" className="grid h-8 w-8 place-items-center rounded-full bg-white text-red-600" onClick={() => updateQty(item.menuItemId, -1)}><Minus size={15} /></button>
                    <span className="w-7 text-center text-sm font-black">{item.quantity}</span>
                    <button type="button" className="grid h-8 w-8 place-items-center rounded-full bg-red-600 text-white" onClick={() => updateQty(item.menuItemId, 1)}><Plus size={15} /></button>
                  </div>
                </div>
              </div>
            )) : <p className="rounded-2xl bg-stone-50 p-4 text-sm font-semibold text-stone-600">Add meals before checkout.</p>}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <input className="input focus:border-red-500 focus:ring-red-100" placeholder="Your name" value={orderForm.customerName} onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })} required />
            <input className="input focus:border-red-500 focus:ring-red-100" placeholder="Phone number" value={orderForm.customerPhone} onChange={(e) => setOrderForm({ ...orderForm, customerPhone: e.target.value })} required />
            <input className="input focus:border-red-500 focus:ring-red-100 sm:col-span-2" placeholder="Email optional" type="email" value={orderForm.customerEmail} onChange={(e) => setOrderForm({ ...orderForm, customerEmail: e.target.value })} />
            <textarea className="input h-20 py-3 focus:border-red-500 focus:ring-red-100 sm:col-span-2" placeholder="Delivery address" value={orderForm.deliveryAddress} onChange={(e) => setOrderForm({ ...orderForm, deliveryAddress: e.target.value })} required />
            <button type="button" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-red-50 text-sm font-black text-red-600 sm:col-span-2" onClick={useLocation}>
              <LocateFixed size={17} /> Use my location
            </button>
            <textarea className="input h-20 py-3 focus:border-red-500 focus:ring-red-100 sm:col-span-2" placeholder="Delivery note optional" value={orderForm.deliveryNote} onChange={(e) => setOrderForm({ ...orderForm, deliveryNote: e.target.value })} />
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4 text-lg font-black">
            <span>Total</span>
            <span className="text-red-600">{currency(grandTotal)}</span>
          </div>
          <RedButton className="mt-4 w-full" disabled={submitting}>{submitting ? 'Submitting...' : 'Place order'}</RedButton>
        </form>
      </Modal>

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
          <RedButton className="mt-4 w-full" disabled={submitting}>{submitting ? 'Submitting...' : 'Request reservation'}</RedButton>
        </form>
      </Modal>
    </div>
  );
}
