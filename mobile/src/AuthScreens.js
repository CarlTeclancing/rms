import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

const red = '#d91830';

export function AuthSplash() {
  const [branded, setBranded] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setBranded(true), 450); return () => clearTimeout(timer); }, []);
  return <SafeAreaView style={s.splash}>
    <StatusBar style="dark" />
    <View style={s.splashArt}><Image source={branded ? require('../assets/auth-brand.png') : require('../assets/auth-cart.png')} style={branded ? s.brand : s.cart} resizeMode="contain" /></View>
    {branded && <View style={s.credit}><Text style={s.by}>BY</Text><Text style={s.creator}>CRESTLANCING</Text></View>}
  </SafeAreaView>;
}

export default function AuthScreens({ form, setForm, saving, onSubmit, onDriverMode, items = [] }) {
  const [screen, setScreen] = useState('welcome');
  const [query, setQuery] = useState('');
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const valid = form.name.trim().length >= 2 && form.phone.replace(/\D/g, '').length >= 6 && (screen !== 'email' || emailValid);
  const field = (key, label, keyboardType = 'default') => <View style={s.field} key={key}>
    <Text style={s.label}>{label}</Text>
    <TextInput accessibilityLabel={label} style={s.input} value={form[key]} onChangeText={value => setForm(current => ({ ...current, [key]: value }))} keyboardType={keyboardType} autoCapitalize={key === 'email' ? 'none' : 'words'} autoCorrect={key !== 'email'} editable={!saving} />
  </View>;
  const button = (label, icon, action, primary = false, disabled = false) => <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={action} style={({ pressed }) => [s.button, primary && s.primary, pressed && { opacity: 0.75 }]}>
    <Ionicons name={icon} size={19} color={primary ? '#fff' : red} style={s.buttonIcon} /><Text style={[s.buttonText, primary && { color: '#fff' }]}>{label}</Text>
  </Pressable>;
  return <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {screen === 'welcome' ? <>
        <Image accessibilityLabel="Chop ASAP — fresh pasta" source={require('../assets/auth-hero.png')} style={s.hero} />
        <View style={s.body}>
          <Text style={s.title}>Sign up or login in{'\n'}No password required</Text>
          <View style={s.actions}>
            {button('Continue with email', 'mail-outline', () => setScreen('email'), true)}
            {button('Continue with number', 'call-outline', () => setScreen('phone'))}
            {button('Continue with Google', 'mail-open-outline', undefined, false, true)}
          </View>
          <Text style={s.unavailable}>Google sign-in coming soon</Text>
          <Pressable accessibilityRole="button" onPress={() => setScreen('nearby')} style={s.nearby}><Text style={s.link}>Search Nearby</Text></Pressable>
          <Text style={s.terms}>By clicking search nearby or continue with email, phone number or google you agree to chop asap’s <Text accessibilityRole="link" style={s.termsLink} onPress={() => setScreen('terms')}>terms and conditions</Text></Text>
        </View>
      </> : <View style={s.form}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to sign in" disabled={saving} onPress={() => setScreen('welcome')} style={s.back}><Ionicons name="chevron-back" size={24} color={red} /></Pressable>
        <Image source={require('../assets/auth-brand.png')} style={s.formBrand} resizeMode="contain" />
        <Text style={s.formTitle}>{screen === 'nearby' ? 'Search Nearby' : screen === 'terms' ? 'Terms and conditions' : 'Sign up or log in'}</Text>
        {screen === 'nearby' ? <>
          <Text style={s.copy}>Explore available meals. Sign in to place your order.</Text>
          <TextInput accessibilityLabel="Search meals" placeholder="Search meals" style={s.input} value={query} onChangeText={setQuery} />
          {items.filter(item => item.name.toLowerCase().includes(query.toLowerCase())).map(item => <View style={s.meal} key={item.id}><Text style={s.label}>{item.name}</Text><Text>{Number(item.price || 0).toLocaleString()} XAF</Text></View>)}
          {!items.filter(item => item.name.toLowerCase().includes(query.toLowerCase())).length && <Text style={s.copy}>No meals found. Try another search or check back soon.</Text>}
        </> : screen === 'terms' ? <Text style={s.copy}>Terms and conditions have not been published in the app yet. Please contact ChopASAP for the current terms before placing an order.</Text> : <>
          <Text style={s.copy}>No password required. Enter your details to continue.</Text>
          {screen === 'email' && field('email', 'Email', 'email-address')}
          {field('name', 'Name')}
          {field('phone', 'Phone number', 'phone-pad')}
          {screen === 'email' && <Text style={s.copy}>Your phone number identifies your account and helps with delivery.</Text>}
          {field('address', 'Address (optional)')}
          <Pressable accessibilityRole="button" disabled={!valid || saving} onPress={onSubmit} style={[s.button, s.primary, (!valid || saving) && { opacity: 0.5 }]}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={[s.buttonText, { color: '#fff' }]}>Continue</Text>}</Pressable>
          <Pressable accessibilityRole="button" onPress={onDriverMode} disabled={saving} style={s.nearby}><Text style={s.link}>Driver mode</Text></Pressable>
        </>}
      </View>}
    </ScrollView>
  </KeyboardAvoidingView>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' }, scroll: { flexGrow: 1, width: '100%', maxWidth: 500, alignSelf: 'center', paddingBottom: 16 },
  hero: { width: '100%', aspectRatio: 375 / 383, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  body: { paddingHorizontal: 24 }, title: { color: '#050505', fontSize: 25, lineHeight: 36, fontWeight: '600', textAlign: 'center', marginTop: 16 },
  actions: { gap: 17, marginTop: 26 }, button: { minHeight: 45, borderRadius: 12, borderWidth: 1, borderColor: red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 42, paddingVertical: 12 }, primary: { backgroundColor: red, minHeight: 48 },
  buttonIcon: { position: 'absolute', left: 15 }, buttonText: { color: red, fontSize: 14, textAlign: 'center' }, unavailable: { fontSize: 11, color: '#777', textAlign: 'center', marginTop: 6 },
  nearby: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, link: { color: '#333', fontSize: 14, textDecorationLine: 'underline' },
  terms: { fontSize: 10, lineHeight: 15, color: '#333' }, termsLink: { color: '#1675ff', textDecorationLine: 'underline' },
  form: { padding: 24, gap: 16 }, back: { width: 44, height: 44, justifyContent: 'center' }, formBrand: { width: 110, height: 130, alignSelf: 'center' }, formTitle: { fontSize: 26, fontWeight: '600', textAlign: 'center', color: '#111' },
  copy: { fontSize: 14, lineHeight: 21, color: '#666' }, field: { gap: 8 }, label: { fontSize: 14, color: '#222', fontWeight: '500' }, input: { minHeight: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 14, color: '#111', fontSize: 16, backgroundColor: '#fff' }, meal: { gap: 8, paddingVertical: 16, borderBottomWidth: 1, borderColor: '#eee' },
  splash: { flex: 1, backgroundColor: '#fff' }, splashArt: { position: 'absolute', top: '24%', alignSelf: 'center', width: 185, height: 218, justifyContent: 'flex-end', alignItems: 'center' }, brand: { width: 185, height: 218 }, cart: { width: 150, height: 101, marginBottom: 32 }, credit: { position: 'absolute', bottom: '9%', alignSelf: 'center', alignItems: 'center', gap: 8 }, by: { fontSize: 10, color: '#111' }, creator: { color: '#0878ff', fontSize: 20, fontWeight: '800' }
});
