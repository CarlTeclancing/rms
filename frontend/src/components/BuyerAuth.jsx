import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Mail, MailOpen, Phone } from 'lucide-react';
import './BuyerAuth.css';

export function BuyerSplash() {
  const [branded, setBranded] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setBranded(true), 450); return () => clearTimeout(timer); }, []);
  return <main className="buyer-splash" role="status" aria-label="Loading ChopASAP">
    <div className="buyer-splash-art"><img src={branded ? '/auth-brand.png' : '/auth-cart.png'} className={branded ? 'brand' : 'cart'} alt="Chop ASAP" /></div>
    {branded && <div className="buyer-credit"><span>BY</span><strong>CRESTLANCING</strong></div>}
  </main>;
}

export default function BuyerAuth({ form, saving, onChange, onSubmit, items = [] }) {
  const [screen, setScreen] = useState('welcome');
  const [query, setQuery] = useState('');
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); window.scrollTo(0, 0); }, [screen]);
  const valid = form.name.trim().length >= 2 && form.phone.replace(/\D/g, '').length >= 6 && (screen !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((form.email || '').trim()));
  const matches = items.filter(item => item.name.toLowerCase().includes(query.toLowerCase()));
  const field = (key, label, type = 'text', required = true, autoComplete) => <label className="buyer-field">{label}<input name={key} type={type} value={form[key] || ''} onChange={event => onChange(current => ({ ...current, [key]: event.target.value }))} required={required} autoComplete={autoComplete} minLength={key === 'name' ? 2 : undefined} disabled={saving} /></label>;
  return <main className="buyer-auth"><div className="buyer-auth-panel">
    {screen === 'welcome' ? <>
      <img className="buyer-hero" src="/auth-hero.png" alt="Chop ASAP — fresh pasta" />
      <div className="buyer-welcome-body">
        <h1 ref={heading} tabIndex={-1}>Sign up or login in<br />No password required</h1>
        <div className="buyer-actions">
          <button className="buyer-button primary" onClick={() => setScreen('email')}><Mail size={19} />Continue with email</button>
          <button className="buyer-button" onClick={() => setScreen('phone')}><Phone size={19} />Continue with number</button>
          <button className="buyer-button" disabled aria-describedby="google-unavailable"><MailOpen size={19} />Continue with Google</button>
        </div>
        <p id="google-unavailable" className="buyer-unavailable">Google sign-in coming soon</p>
        <button className="buyer-text-button" onClick={() => setScreen('nearby')}>Search Nearby</button>
        <p className="buyer-terms">By clicking search nearby or continue with email, phone number or google you agree to chop asap’s <button onClick={() => setScreen('terms')}>terms and conditions</button></p>
      </div>
    </> : <div className="buyer-details">
      <button className="buyer-back" aria-label="Back to sign in" disabled={saving} onClick={() => setScreen('welcome')}><ChevronLeft /></button>
      <img className="buyer-form-brand" src="/auth-brand.png" alt="Chop ASAP" />
      <h1 ref={heading} tabIndex={-1}>{screen === 'nearby' ? 'Search Nearby' : screen === 'terms' ? 'Terms and conditions' : 'Sign up or log in'}</h1>
      {screen === 'nearby' ? <>
        <p>Explore available meals. Sign in to place your order.</p>
        <label className="buyer-field">Search meals<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <ul className="buyer-meals">{matches.map(item => <li key={item.id}><span>{item.name}</span><span>{Number(item.price || 0).toLocaleString()} XAF</span></li>)}</ul>
        {!matches.length && <p>No meals found. Try another search or check back soon.</p>}
      </> : screen === 'terms' ? <p>Terms and conditions have not been published in the app yet. Please contact ChopASAP for the current terms before placing an order.</p> : <form onSubmit={event => { if (!valid || saving) { event.preventDefault(); return; } onSubmit(event); }}>
        <p>No password required. Enter your details to continue.</p>
        {screen === 'email' && field('email', 'Email', 'email', true, 'email')}
        {field('name', 'Name', 'text', true, 'name')}
        {field('phone', 'Phone number', 'tel', true, 'tel')}
        {screen === 'email' && <p>Your phone number identifies your account and helps with delivery.</p>}
        {field('address', 'Address (optional)', 'text', false, 'street-address')}
        {form.referralCode && <p className="buyer-referral">Referral bonus active</p>}
        <button className="buyer-button primary" disabled={!valid || saving} type="submit">{saving ? 'Connecting…' : 'Continue'}</button>
      </form>}
    </div>}
  </div></main>;
}
