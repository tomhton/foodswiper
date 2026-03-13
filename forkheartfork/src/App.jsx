import { useState, useEffect, useRef, useCallback } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Geolocation } from '@capacitor/geolocation';
import { Browser } from '@capacitor/browser';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';

// ─── Constants ───────────────────────────────────────────────
const AV_COLORS = [
  { bg: '#FAECE7', text: '#4A1B0C' }, { bg: '#E6F1FB', text: '#0C447C' },
  { bg: '#EAF3DE', text: '#27500A' }, { bg: '#FAEEDA', text: '#633806' },
  { bg: '#EEEDFE', text: '#3C3489' }, { bg: '#FBEAF0', text: '#72243E' },
];
const CUISINES = [
  { label: 'Italian', em: '🍕', q: 'italian' }, { label: 'Japanese', em: '🍣', q: 'japanese' },
  { label: 'Mexican', em: '🌮', q: 'mexican' }, { label: 'Chinese', em: '🥢', q: 'chinese' },
  { label: 'Indian', em: '🍛', q: 'indian' }, { label: 'Thai', em: '🍜', q: 'thai' },
  { label: 'American', em: '🍔', q: 'american' }, { label: 'Mediterranean', em: '🥙', q: 'mediterranean' },
  { label: 'Vietnamese', em: '🍲', q: 'vietnamese' }, { label: 'Korean', em: '🥘', q: 'korean' },
  { label: 'French', em: '🥐', q: 'french' }, { label: 'Greek', em: '🫒', q: 'greek' },
  { label: 'Sushi', em: '🫙', q: 'sushi' }, { label: 'BBQ', em: '🔥', q: 'barbecue' },
  { label: 'Vegan', em: '🥗', q: 'vegan' }, { label: 'Seafood', em: '🦞', q: 'seafood' },
];
const EMOJI_BG = ['#FFF8F0','#FFF0F0','#F0FFF4','#FFF5E0','#FFF8E1','#F0F8FF','#FFF0F8','#F0FFFA','#FEF9EC','#F5F0FF'];
const CUISINE_MAP = { pizza:'🍕',italian:'🍕',sushi:'🍣',japanese:'🍣',mexican:'🌮',taco:'🌮',chinese:'🥢',indian:'🍛',thai:'🍜',ramen:'🍜',american:'🍔',burger:'🍔',mediterranean:'🥙',vietnamese:'🍲',pho:'🍲',korean:'🥘',french:'🥐',greek:'🫒',seafood:'🦞',bbq:'🔥',barbecue:'🔥',vegan:'🥗',steak:'🥩',cafe:'☕' };
const C_COLORS = ['#D85A30','#F0997B','#FAECE7','#3B6D11','#97C459','#185FA5','#85B7EB','#FAC775','#EF9F27'];

// ─── Helpers ──────────────────────────────────────────────────
const ac = i => AV_COLORS[i % AV_COLORS.length];
const ini = n => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
const genCode = () => Math.random().toString(36).slice(2, 7).toUpperCase();
const mpGenId = () => Math.random().toString(36).slice(2, 9);

function getEmoji(types = []) {
  for (const t of types) {
    const k = t.toLowerCase();
    for (const [w, e] of Object.entries(CUISINE_MAP)) if (k.includes(w)) return e;
  }
  return '🍽️';
}
function toPrice(pl) { return { PRICE_LEVEL_INEXPENSIVE:'$', PRICE_LEVEL_MODERATE:'$$', PRICE_LEVEL_EXPENSIVE:'$$$', PRICE_LEVEL_VERY_EXPENSIVE:'$$$$' }[pl] || '$$'; }
function toPriceNum(pl) { return { PRICE_LEVEL_INEXPENSIVE:1, PRICE_LEVEL_MODERATE:2, PRICE_LEVEL_EXPENSIVE:3, PRICE_LEVEL_VERY_EXPENSIVE:4 }[pl] || 2; }

async function haptic(style = 'medium') {
  try {
    if (style === 'match') await Haptics.notification({ type: NotificationType.Success });
    else if (style === 'light') await Haptics.impact({ style: ImpactStyle.Light });
    else await Haptics.impact({ style: ImpactStyle.Medium });
  } catch (_) { /* web fallback — no haptics */ }
}

async function openUrl(url) {
  try { await Browser.open({ url }); } catch (_) { window.open(url, '_blank'); }
}

function getDemoRestaurants(zip) {
  return [
    { name:'Sakura Ramen', emoji:'🍜', cuisine:'Japanese', dist:'0.3 mi', price:'$$', priceNum:2, rating:4.7, bg:'#FFF8F0', imgUrl:'', mapsUrl:`https://maps.google.com/?q=Sakura+Ramen+${zip}`, address:zip, isOpen:true, id:'d1' },
    { name:'Bella Napoli', emoji:'🍕', cuisine:'Italian', dist:'0.5 mi', price:'$$', priceNum:2, rating:4.5, bg:'#FFF0F0', imgUrl:'', mapsUrl:`https://maps.google.com/?q=Bella+Napoli+${zip}`, address:zip, isOpen:true, id:'d2' },
    { name:'Thai Garden', emoji:'🍛', cuisine:'Thai', dist:'0.8 mi', price:'$', priceNum:1, rating:4.6, bg:'#F0FFF4', imgUrl:'', mapsUrl:`https://maps.google.com/?q=Thai+Garden+${zip}`, address:zip, isOpen:false, id:'d3' },
    { name:'The Grill House', emoji:'🥩', cuisine:'American', dist:'1.1 mi', price:'$$$', priceNum:3, rating:4.8, bg:'#FFF5E0', imgUrl:'', mapsUrl:`https://maps.google.com/?q=The+Grill+House+${zip}`, address:zip, isOpen:true, id:'d4' },
    { name:'Taco Loco', emoji:'🌮', cuisine:'Mexican', dist:'0.2 mi', price:'$', priceNum:1, rating:4.4, bg:'#FFF8E1', imgUrl:'', mapsUrl:`https://maps.google.com/?q=Taco+Loco+${zip}`, address:zip, isOpen:true, id:'d5' },
    { name:'Pho Saigon', emoji:'🍲', cuisine:'Vietnamese', dist:'0.6 mi', price:'$', priceNum:1, rating:4.7, bg:'#F0F8FF', imgUrl:'', mapsUrl:`https://maps.google.com/?q=Pho+Saigon+${zip}`, address:zip, isOpen:true, id:'d6' },
    { name:'Sushi Yuki', emoji:'🍣', cuisine:'Japanese', dist:'0.9 mi', price:'$$$', priceNum:3, rating:4.9, bg:'#FFF0F8', imgUrl:'', mapsUrl:`https://maps.google.com/?q=Sushi+Yuki+${zip}`, address:zip, isOpen:false, id:'d7' },
    { name:'Mediterranean Breeze', emoji:'🥙', cuisine:'Mediterranean', dist:'1.4 mi', price:'$$', priceNum:2, rating:4.5, bg:'#F0FFFA', imgUrl:'', mapsUrl:`https://maps.google.com/?q=Mediterranean+Breeze+${zip}`, address:zip, isOpen:true, id:'d8' },
    { name:'Seoul Kitchen', emoji:'🥘', cuisine:'Korean', dist:'1.2 mi', price:'$$', priceNum:2, rating:4.6, bg:'#FEF9EC', imgUrl:'', mapsUrl:`https://maps.google.com/?q=Seoul+Kitchen+${zip}`, address:zip, isOpen:true, id:'d9' },
    { name:'Le Petit Bistro', emoji:'🥐', cuisine:'French', dist:'0.7 mi', price:'$$$', priceNum:3, rating:4.5, bg:'#F5F0FF', imgUrl:'', mapsUrl:`https://maps.google.com/?q=Le+Petit+Bistro+${zip}`, address:zip, isOpen:true, id:'d10' },
  ];
}

// ─── Confetti hook ────────────────────────────────────────────
function useConfetti(canvasRef) {
  const rafRef = useRef(null);
  const runningRef = useRef(false);

  const launch = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    let parts = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width, y: -15 - Math.random() * 80,
      w: 6 + Math.random() * 6, h: 4 + Math.random() * 4,
      color: C_COLORS[Math.floor(Math.random() * C_COLORS.length)],
      rot: Math.random() * 360, rv: (Math.random() - .5) * 7,
      vx: (Math.random() - .5) * 2.5, vy: 2.5 + Math.random() * 2.5,
    }));
    runningRef.current = true;
    const ctx = canvas.getContext('2d');
    const animate = () => {
      if (!runningRef.current) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts.forEach(p => {
        p.y += p.vy; p.x += p.vx; p.rot += p.rv; p.vy += 0.05;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      parts = parts.filter(p => p.y < canvas.height + 20);
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();
    setTimeout(stop, 4000);
  }, [canvasRef]);

  const stop = useCallback(() => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  }, [canvasRef]);

  return { launch, stop };
}

// ─── Swipe card component ─────────────────────────────────────
function SwipeCard({ restaurant, partners, votes, onVote }) {
  const cardRef = useRef(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const [badge, setBadge] = useState(null); // 'yes' | 'no' | null
  const [flying, setFlying] = useState(null);

  const commit = useCallback(async dir => {
    if (flying) return;
    await haptic(dir === 'yes' ? 'medium' : 'light');
    setFlying(dir);
    setTimeout(() => onVote(dir), 380);
  }, [flying, onVote]);

  const onDragStart = e => {
    if (flying) return;
    dragging.current = true;
    const pt = e.touches ? e.touches[0] : e;
    startX.current = pt.clientX; currentX.current = 0;
  };

  const onDragMove = e => {
    if (!dragging.current || flying) return;
    const pt = e.touches ? e.touches[0] : e;
    currentX.current = pt.clientX - startX.current;
    const card = cardRef.current;
    if (card) card.style.transform = `translateX(${currentX.current}px) rotate(${currentX.current * 0.06}deg)`;
    if (currentX.current > 40) setBadge('yes');
    else if (currentX.current < -40) setBadge('no');
    else setBadge(null);
  };

  const onDragEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (Math.abs(currentX.current) > 95) {
      commit(currentX.current > 0 ? 'yes' : 'no');
    } else {
      const card = cardRef.current;
      if (card) { card.style.transition = 'transform .3s cubic-bezier(.34,1.56,.64,1)'; card.style.transform = ''; }
      setBadge(null);
      setTimeout(() => { if (card) card.style.transition = ''; }, 320);
    }
  };

  const pvHtml = partners.slice(1).map((p, i) => {
    const v = votes?.[i + 1];
    const mark = v === 'yes' ? '✓' : v === 'no' ? '✕' : '?';
    const color = v === 'yes' ? '#3B6D11' : v === 'no' ? '#A32D2D' : '#9C9088';
    return (
      <div key={p.name} style={s.pvote}>
        <div style={{ ...s.pav, background: p.bg, color: p.text }}>{p.initials}</div>
        <span style={{ fontSize: 14, color }}>{mark}</span>
      </div>
    );
  });

  const flyStyle = flying === 'yes'
    ? { transition: 'transform .38s cubic-bezier(.4,0,.2,1), opacity .38s', transform: 'translateX(165%) rotate(22deg)', opacity: 0 }
    : flying === 'no'
    ? { transition: 'transform .38s cubic-bezier(.4,0,.2,1), opacity .38s', transform: 'translateX(-165%) rotate(-22deg)', opacity: 0 }
    : {};

  return (
    <div
      ref={cardRef}
      style={{ ...s.swipeCard, ...flyStyle }}
      onMouseDown={onDragStart} onMouseMove={onDragMove} onMouseUp={onDragEnd} onMouseLeave={onDragEnd}
      onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}
    >
      <div style={{ ...s.cardImgArea, background: restaurant.bg }}>
        {restaurant.imgUrl ? (
          <img src={restaurant.imgUrl} style={s.restImg} loading="lazy"
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
        ) : null}
        <div style={{ ...s.emojiFallback, display: restaurant.imgUrl ? 'none' : 'flex' }}>{restaurant.emoji}</div>
        <div style={s.imgOverlay} />
        <span style={s.cuisineTag}>{restaurant.cuisine}</span>
        {restaurant.isOpen && <span style={s.openTag}>● Open now</span>}
        {badge === 'yes' && <span style={{ ...s.voteOverlay, ...s.voteYes }}>YEP ♥</span>}
        {badge === 'no' && <span style={{ ...s.voteOverlay, ...s.voteNo }}>NOPE ✕</span>}
      </div>
      <div style={s.cardBodySwipe}>
        <div style={s.restName}>{restaurant.name}</div>
        <div style={s.restMeta}>
          <span>★ {restaurant.rating}</span>
          <span>{restaurant.price}</span>
          <span>📍 {restaurant.dist}</span>
        </div>
        {restaurant.address && restaurant.address !== restaurant.id && (
          <div style={s.restAddr}>{restaurant.address}</div>
        )}
        {pvHtml.length > 0 && <div style={s.pvoteRow}>{pvHtml}</div>}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────
export default function App() {
  // Screen
  const [screen, setScreen] = useState('invite'); // invite | swipe | matches

  // Data
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [zipInput, setZipInput] = useState('');
  const [currentZip, setCurrentZip] = useState('');
  const [cityName, setCityName] = useState('');
  const [zipError, setZipError] = useState('');
  const [allRestaurants, setAllRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [partners, setPartners] = useState([{ name: 'You', initials: 'YO', bg: '#FAECE7', text: '#4A1B0C' }]);
  const [partnerInput, setPartnerInput] = useState('');
  const [votes, setVotes] = useState({});
  const [matchHistory, setMatchHistory] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [currentMatchData, setCurrentMatchData] = useState(null);
  const [sessionCode, setSessionCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Filters
  const [filters, setFilters] = useState({ cuisines: [], prices: [], radius: 5, minRating: 4, openNow: false });
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Match popup
  const [matchPopupVisible, setMatchPopupVisible] = useState(false);
  const [matchPopupIdx, setMatchPopupIdx] = useState(null);

  // API modal
  const [apiModalVisible, setApiModalVisible] = useState(false);

  // Multiplayer
  const [mp, setMp] = useState({ active: false, isHost: false, roomCode: '', myId: '', myName: '', peers: {}, peerOrder: [], status: 'idle' });
  const [mpModalOpen, setMpModalOpen] = useState(false);
  const [mpTab, setMpTab] = useState('host');
  const [mpHostName, setMpHostName] = useState('');
  const [mpJoinName, setMpJoinName] = useState('');
  const [mpJoinCode, setMpJoinCode] = useState('');
  const [mpJoinError, setMpJoinError] = useState('');
  const mpChannelRef = useRef(null);
  const mpRef = useRef(mp);
  mpRef.current = mp;

  const canvasRef = useRef(null);
  const { launch: launchConfetti, stop: stopConfetti } = useConfetti(canvasRef);

  // ── Capacitor init ──────────────────────────────────────────
  useEffect(() => {
    try {
      StatusBar.setStyle({ style: Style.Light });
      StatusBar.setBackgroundColor({ color: '#F7F3EC' });
    } catch (_) {}

    // Show API modal on first load if no key saved
    const savedKey = localStorage.getItem('fhf_api_key') || '';
    if (savedKey) setGoogleApiKey(savedKey);
    else setTimeout(() => setApiModalVisible(true), 400);

    CapApp.addListener('backButton', () => {
      if (screen === 'matches') setScreen('swipe');
    });

    return () => { CapApp.removeAllListeners(); };
  }, []);

  // ── Clock ───────────────────────────────────────────────────
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const d = new Date(), h = d.getHours(), m = d.getMinutes().toString().padStart(2, '0');
      setTime(`${h % 12 || 12}:${m}`);
    };
    tick(); const t = setInterval(tick, 15000); return () => clearInterval(t);
  }, []);

  // ── Google Places fetch ─────────────────────────────────────
  async function fetchRestaurants(zip, key) {
    setLoading(true);
    let data = null;
    const apiKey = key || googleApiKey;

    if (apiKey) {
      try {
        const cuisineQ = filters.cuisines.length
          ? filters.cuisines.map(c => c.label).join(' OR ') + ' restaurant'
          : 'restaurant';
        const body = { textQuery: `${cuisineQ} near ${zip}`, maxResultCount: 16 };
        if (filters.openNow) body.openNow = true;

        const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.priceLevel,places.regularOpeningHours,places.photos,places.formattedAddress,places.googleMapsUri,places.primaryTypeDisplayName,places.types',
          },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const d = await res.json();
          if (d.places?.length) {
            data = d.places.map((p, i) => ({
              name: p.displayName?.text || 'Restaurant',
              emoji: getEmoji(p.types || []),
              cuisine: p.primaryTypeDisplayName?.text || 'Restaurant',
              dist: 'Nearby',
              price: toPrice(p.priceLevel),
              priceNum: toPriceNum(p.priceLevel),
              rating: +(p.rating || 4.0).toFixed(1),
              bg: EMOJI_BG[i % EMOJI_BG.length],
              imgUrl: p.photos ? `https://places.googleapis.com/v1/${p.photos[0].name}/media?maxHeightPx=400&maxWidthPx=600&key=${apiKey}` : '',
              mapsUrl: p.googleMapsUri || `https://maps.google.com/?q=${encodeURIComponent(p.displayName?.text || '')}`,
              address: p.formattedAddress || '',
              isOpen: p.regularOpeningHours?.openNow || false,
              id: p.id || String(i),
            }));
          }
        }
      } catch (e) { console.warn('Places API:', e); }
    }

    if (!data) data = getDemoRestaurants(zip);
    setAllRestaurants(data);
    applyFiltersTo(data, filters);
    setLoading(false);
  }

  function applyFiltersTo(list, f) {
    let out = [...list];
    if (f.cuisines.length) out = out.filter(r => f.cuisines.some(c => (r.name + ' ' + r.cuisine).toLowerCase().includes(c.q)));
    if (f.prices.length) out = out.filter(r => f.prices.includes(r.priceNum));
    if (f.minRating) out = out.filter(r => r.rating >= f.minRating);
    if (f.openNow) out = out.filter(r => r.isOpen);
    setFilteredRestaurants(out.length ? out : list);
  }

  async function fetchByZip() {
    const zip = zipInput.trim();
    if (!/^\d{5}$/.test(zip)) { setZipError('Please enter a valid 5-digit US zip code.'); return; }
    setZipError('');
    setCurrentZip(zip);
    try {
      const geo = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (!geo.ok) throw new Error();
      const gd = await geo.json();
      const pl = gd.places[0];
      setCityName(`${pl['place name']}, ${pl['state abbreviation']}`);
      await fetchRestaurants(zip);
    } catch { setZipError('Zip code not found. Try another.'); }
  }

  // ── Partners ────────────────────────────────────────────────
  function addPartner() {
    const name = partnerInput.trim();
    if (!name || partners.find(p => p.name === name)) { setPartnerInput(''); return; }
    const c = ac(partners.length);
    setPartners(prev => [...prev, { name, initials: ini(name), bg: c.bg, text: c.text }]);
    setPartnerInput('');
  }

  // ── Multiplayer ─────────────────────────────────────────────
  function mpConnect(code) {
    if (mpChannelRef.current) mpChannelRef.current.close();
    const ch = new BroadcastChannel('fhf_room_' + code);
    ch.onmessage = e => mpOnMessage(e.data);
    mpChannelRef.current = ch;
  }

  function mpSend(msg) {
    if (mpChannelRef.current) {
      mpChannelRef.current.postMessage({ ...msg, from: mpRef.current.myId, fromName: mpRef.current.myName });
    }
  }

  function mpOnMessage(msg) {
    const state = mpRef.current;
    if (msg.from === state.myId) return;

    if (msg.type === 'join') {
      setMp(prev => {
        const c = ac(prev.peerOrder.length);
        const newPeers = { ...prev.peers, [msg.from]: { name: msg.fromName, bg: c.bg, text: c.text, initials: ini(msg.fromName) } };
        const newOrder = prev.peerOrder.includes(msg.from) ? prev.peerOrder : [...prev.peerOrder, msg.from];
        if (prev.isHost) {
          setTimeout(() => mpSend({ type: 'state', roomCode: prev.roomCode, restaurants: filteredRestaurants, zip: currentZip }), 50);
        }
        return { ...prev, peers: newPeers, peerOrder: newOrder };
      });
      setPartners(prev => {
        if (prev.find(p => p.name === msg.fromName)) return prev;
        const c = ac(prev.length);
        return [...prev, { name: msg.fromName, initials: ini(msg.fromName), bg: c.bg, text: c.text }];
      });
    } else if (msg.type === 'state') {
      if (!state.isHost) {
        setAllRestaurants(msg.restaurants);
        setFilteredRestaurants(msg.restaurants);
        setCurrentZip(msg.zip);
      }
      (msg.peers || []).forEach(p => {
        if (p.id === state.myId) return;
        setMp(prev => {
          if (prev.peers[p.id]) return prev;
          const c = ac(prev.peerOrder.length);
          return { ...prev, peers: { ...prev.peers, [p.id]: { name: p.name, bg: c.bg, text: c.text, initials: ini(p.name) } }, peerOrder: [...prev.peerOrder, p.id] };
        });
      });
    } else if (msg.type === 'vote') {
      setVotes(prev => {
        const pOrder = mpRef.current.peerOrder;
        const pIdx = pOrder.indexOf(msg.from) + 1;
        if (pIdx <= 0) return prev;
        const updated = { ...prev, [msg.idx]: { ...(prev[msg.idx] || {}), [pIdx]: msg.dir } };
        // check match
        const v = updated[msg.idx] || {};
        if (v[0] === 'yes' && partners.length >= 2) {
          let isMatch = true;
          for (let p = 1; p < partners.length; p++) if (v[p] !== 'yes') { isMatch = false; break; }
          if (isMatch) {
            setMatchHistory(mh => mh.find(m => m.idx === msg.idx) ? mh : [...mh, { idx: msg.idx, time: new Date() }]);
            setTimeout(() => { setMatchPopupIdx(msg.idx); setMatchPopupVisible(true); launchConfetti(); haptic('match'); }, 220);
          }
        }
        return updated;
      });
    } else if (msg.type === 'start') {
      if (!state.isHost) {
        if (msg.restaurants) setFilteredRestaurants(msg.restaurants);
        setMpModalOpen(false);
        doStartSwiping();
      }
    } else if (msg.type === 'leave') {
      setMp(prev => {
        const newPeers = { ...prev.peers };
        delete newPeers[msg.from];
        return { ...prev, peers: newPeers, peerOrder: prev.peerOrder.filter(id => id !== msg.from) };
      });
    }
  }

  function mpHost() {
    if (!mpHostName.trim()) return;
    const id = mpGenId(), code = genCode();
    setMp({ active: true, isHost: true, roomCode: code, myId: id, myName: mpHostName, peers: {}, peerOrder: [], status: 'hosting' });
    setPartners([{ name: mpHostName, initials: ini(mpHostName), bg: '#FAECE7', text: '#4A1B0C' }]);
    mpConnect(code);
  }

  function mpJoin() {
    if (!mpJoinName.trim()) return;
    const code = mpJoinCode.trim().toUpperCase();
    if (!code || code.length < 4) { setMpJoinError('Enter the room code from your date.'); return; }
    setMpJoinError('');
    const id = mpGenId();
    setMp({ active: true, isHost: false, roomCode: code, myId: id, myName: mpJoinName, peers: {}, peerOrder: [], status: 'joining' });
    setPartners([{ name: mpJoinName, initials: ini(mpJoinName), bg: '#FAECE7', text: '#4A1B0C' }]);
    mpConnect(code);
    setTimeout(() => mpSend({ type: 'join' }), 100);
  }

  function mpLeave() {
    mpSend({ type: 'leave' });
    if (mpChannelRef.current) mpChannelRef.current.close();
    setMp({ active: false, isHost: false, roomCode: '', myId: '', myName: '', peers: {}, peerOrder: [], status: 'idle' });
    setPartners([{ name: 'You', initials: 'YO', bg: '#FAECE7', text: '#4A1B0C' }]);
    setMpModalOpen(false);
  }

  function mpStartFromModal() {
    mpSend({ type: 'start', restaurants: filteredRestaurants });
    setMpModalOpen(false);
    doStartSwiping();
  }

  // ── Swiping ─────────────────────────────────────────────────
  function doStartSwiping() {
    setCurrentIdx(0);
    setMatchHistory([]);
    // Simulate partner votes for demo partners, clear for real mp
    if (!mp.active && partners.length > 1) {
      const v = {};
      for (let r = 0; r < filteredRestaurants.length; r++) {
        v[r] = {};
        for (let p = 1; p < partners.length; p++) v[r][p] = Math.random() > 0.42 ? 'yes' : 'no';
      }
      setVotes(v);
    } else {
      setVotes({});
    }
    setSessionCode(mp.active ? mp.roomCode : genCode());
    setScreen('swipe');
  }

  function startSwiping() {
    if (!filteredRestaurants.length) return;
    doStartSwiping();
  }

  function recordVote(dir) {
    const idx = currentIdx;
    const newVotes = { ...votes, [idx]: { ...(votes[idx] || {}), 0: dir } };
    setVotes(newVotes);

    // Broadcast in multiplayer
    if (mp.active) mpSend({ type: 'vote', idx, dir });

    // Check match — requires at least 2 people
    let isMatch = false;
    if (dir === 'yes' && partners.length >= 2) {
      const v = newVotes[idx] || {};
      isMatch = v[0] === 'yes';
      for (let p = 1; p < partners.length; p++) if (v[p] !== 'yes') { isMatch = false; break; }
      if (isMatch) setMatchHistory(prev => prev.find(m => m.idx === idx) ? prev : [...prev, { idx, time: new Date() }]);
    }

    setTimeout(() => {
      setCurrentIdx(i => i + 1);
      if (isMatch) {
        setTimeout(() => { setMatchPopupIdx(idx); setMatchPopupVisible(true); launchConfetti(); haptic('match'); }, 220);
      }
    }, 380);
  }

  // ── Match popup ─────────────────────────────────────────────
  const matchData = matchPopupIdx !== null ? filteredRestaurants[matchPopupIdx] : null;

  function openCTA(type) {
    if (!matchData) return;
    const name = encodeURIComponent(matchData.name);
    const loc = currentZip;
    const urls = {
      maps: matchData.mapsUrl,
      reserve: `https://www.opentable.com/s?term=${name}`,
      delivery: `https://www.doordash.com/search/store/${name}/`,
      directions: `https://maps.google.com/?q=${name}+${loc}&dirflg=d`,
    };
    if (urls[type]) openUrl(urls[type]);
  }

  // ── Tabs ────────────────────────────────────────────────────
  function showTab(tab) { setScreen(tab); }

  // ── Render matches ──────────────────────────────────────────
  function renderMatchCard(m) {
    const r = filteredRestaurants[m.idx];
    if (!r) return null;
    const fmt = d => { const h = d.getHours(), min = d.getMinutes().toString().padStart(2, '0'); return `${h % 12 || 12}:${min}${h >= 12 ? 'pm' : 'am'}`; };
    const name = encodeURIComponent(r.name);
    const loc = currentZip;
    return (
      <div key={m.idx} style={s.matchCard}>
        <div style={s.matchCardTop}>
          <div style={{ ...s.matchEmojiBox, background: r.bg }}>{r.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={s.matchInfoH3}>{r.name}</div>
            <div style={s.miMeta}>★ {r.rating} · {r.price} · {r.dist}</div>
            <div style={s.matchVoters}>
              {partners.map(p => <div key={p.name} style={{ ...s.matchAv, background: p.bg, color: p.text }}>{p.initials}</div>)}
            </div>
          </div>
        </div>
        <div style={s.matchActions}>
          {[
            { icon: '🗺️', label: 'Maps', href: r.mapsUrl },
            { icon: '🍽️', label: 'Reserve', href: `https://www.opentable.com/s?term=${name}` },
            { icon: '🛵', label: 'Delivery', href: `https://www.doordash.com/search/store/${name}/` },
            { icon: '📍', label: 'Directions', href: `https://maps.google.com/?q=${name}+${loc}&dirflg=d` },
          ].map(a => (
            <button key={a.label} style={s.maBtn} onClick={() => openUrl(a.href)}>
              <span style={{ fontSize: 18 }}>{a.icon}</span>
              <span style={s.maLabel}>{a.label}</span>
            </button>
          ))}
        </div>
        <div style={s.matchTime}>Matched at {fmt(m.time)}</div>
      </div>
    );
  }

  const canStart = filteredRestaurants.length > 0;

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div style={s.root}>
      {/* Status bar */}
      <div style={s.statusBar}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{time}</span>
        <div style={s.notch} />
        <div style={{ display: 'flex', gap: 5, fontSize: 11, alignItems: 'center' }}>
          <span>●●●</span><span>WiFi</span><span>🔋</span>
        </div>
      </div>

      <div style={s.appContent}>
        <canvas ref={canvasRef} style={s.confettiCanvas} />

        {/* ══ INVITE SCREEN ══ */}
        {screen === 'invite' && (
          <div style={s.screen}>
            <div style={s.navBar}>
              <div style={s.logo}>fork<em style={{ fontStyle: 'italic', color: '#D85A30' }}>♥</em>fork</div>
              <button style={s.btnIcon} onClick={() => setApiModalVisible(true)}>⚙️</button>
            </div>
            <div style={s.scrollInner}>

              {/* Zip card */}
              <div style={s.zipCard}>
                <div style={s.zipLabel}>📍 Location</div>
                <div style={s.zipBig}>{currentZip || '—'}</div>
                <div style={s.zipCity}>{cityName || (loading ? 'Searching…' : 'Enter zip code to find nearby spots')}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <input
                    type="number" placeholder="e.g. 94105" value={zipInput}
                    onChange={e => setZipInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchByZip()}
                    style={{ ...s.input, ...s.zipInput, maxWidth: 150 }}
                  />
                  <button style={s.btnZip} onClick={fetchByZip}>Find spots</button>
                </div>
                {zipError && <div style={{ fontSize: 12, color: '#F0997B', marginTop: 8 }}>{zipError}</div>}
              </div>

              {/* Invite friends */}
              <button style={s.mpInviteBtn} onClick={() => setMpModalOpen(true)}>
                <span style={{ fontSize: 20 }}>🔗</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1612' }}>
                    Invite friends
                    {mp.active && (
                      <span style={s.mpBadge}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3B6D11', display: 'inline-block', marginRight: 4 }} />
                        Live
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#9C9088', marginTop: 1 }}>
                    {mp.active ? `Room: ${mp.roomCode} · ${mp.peerOrder.length + 1} joined` : 'Start a session — friends join with a code'}
                  </div>
                </div>
                <span style={{ fontSize: 18, color: '#9C9088' }}>›</span>
              </button>

              {/* Partners card */}
              <div style={s.card}>
                <div style={s.cardTitle}>Who's joining?</div>
                <div style={s.cardSub}>Add your partner(s). Everyone votes — only shared yeses become matches.</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <input
                    type="text" placeholder="Partner's name..." value={partnerInput}
                    onChange={e => setPartnerInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addPartner()}
                    style={s.input}
                  />
                  <button style={s.btnPrimary} onClick={addPartner}>Add</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {partners.map(p => (
                    <div key={p.name} style={s.partnerChip}>
                      <div style={{ ...s.avatar, background: p.bg, color: p.text }}>{p.initials}</div>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{p.name}</span>
                      <div style={s.onlineDot} />
                      <span style={{ fontSize: 12, color: '#9C9088' }}>Ready</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                style={{ ...s.btnPrimary, ...s.btnFull, opacity: canStart ? 1 : 0.4 }}
                disabled={!canStart}
                onClick={startSwiping}
              >
                Start swiping →
              </button>
              <div style={{ height: 10 }} />
            </div>
          </div>
        )}

        {/* ══ SWIPE SCREEN ══ */}
        {screen === 'swipe' && (
          <div style={s.screen}>
            <div style={s.navBar}>
              <div style={s.logo}>fork<em style={{ fontStyle: 'italic', color: '#D85A30' }}>♥</em>fork</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={s.sessionPill}>{sessionCode}</div>
              </div>
            </div>

            <div style={{ padding: '6px 20px 0' }}>
              <div style={s.progressBar}>
                <div style={{ ...s.progressFill, width: `${Math.round((currentIdx / (filteredRestaurants.length || 1)) * 100)}%` }} />
              </div>
              <div style={s.progressLabel}>{currentIdx} / {filteredRestaurants.length}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 28px 0', fontSize: 12, color: '#9C9088' }}>
              <span>← nope</span><span>yep →</span>
            </div>

            <div style={s.swipeWrap}>
              {currentIdx >= filteredRestaurants.length ? (
                <div style={s.loadingCard}>
                  <div style={{ fontSize: 52 }}>🎉</div>
                  <p style={{ fontSize: 15, color: '#5C5248' }}>{filteredRestaurants.length} spots reviewed!</p>
                  <button style={{ ...s.btnPrimary, marginTop: 8 }} onClick={() => showTab('matches')}>See matches ♥</button>
                </div>
              ) : loading ? (
                <div style={s.loadingCard}><div style={s.spinner} /><span>Finding spots…</span></div>
              ) : (
                <SwipeCard
                  key={currentIdx}
                  restaurant={filteredRestaurants[currentIdx]}
                  partners={partners}
                  votes={votes[currentIdx]}
                  onVote={recordVote}
                />
              )}
            </div>

            <div style={s.actionRow}>
              <button style={{ ...s.actionBtn, ...s.actionNope }} onClick={() => recordVote('no')}>✕</button>
              <button style={{ ...s.actionBtn, ...s.actionYep }} onClick={() => recordVote('yes')}>♥</button>
            </div>
          </div>
        )}

        {/* ══ MATCHES SCREEN ══ */}
        {screen === 'matches' && (
          <div style={s.screen}>
            <div style={s.navBar}>
              <div style={{ ...s.logo, fontSize: 18 }}>Matches</div>
              {matchHistory.length > 0 && (
                <div style={{ ...s.sessionPill, background: '#FAECE7', color: '#D85A30' }}>
                  {matchHistory.length} match{matchHistory.length > 1 ? 'es' : ''}
                </div>
              )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {matchHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '52px 20px', color: '#5C5248' }}>
                  <div style={{ fontSize: 52, marginBottom: 12 }}>🍽️</div>
                  <p style={{ fontSize: 14, marginBottom: 20 }}>No matches yet — keep swiping!</p>
                  <button style={s.btnPrimary} onClick={() => showTab('swipe')}>Back to swiping →</button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9C9088', margin: '8px 0 10px', padding: '0 20px' }}>
                    {matchHistory.length} match{matchHistory.length > 1 ? 'es' : ''} · everyone said yes
                  </div>
                  {matchHistory.map(renderMatchCard)}
                </>
              )}
            </div>
          </div>
        )}

        {/* Tab bar */}
        {(screen === 'swipe' || screen === 'matches') && (
          <div style={s.tabBar}>
            {[
              { id: 'swipe', icon: '🍽️', label: 'Swipe' },
              { id: 'matches', icon: '♥', label: matchHistory.length > 0 ? `Matches` : 'Matches', badge: matchHistory.length },
            ].map(t => (
              <button key={t.id} style={{ ...s.tab, ...(screen === t.id ? s.tabActive : {}) }} onClick={() => showTab(t.id)}>
                <span style={{ fontSize: 22 }}>{t.icon}</span>
                <span style={{ fontSize: 10, color: screen === t.id ? '#D85A30' : '#9C9088', fontWeight: 500 }}>
                  {t.label}
                  {t.badge > 0 && <span style={s.matchBadge}>{t.badge}</span>}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ══ MATCH POPUP ══ */}
        {matchPopupVisible && matchData && (
          <div style={s.matchBackdrop} onClick={e => { if (e.target === e.currentTarget) { setMatchPopupVisible(false); stopConfetti(); } }}>
            <div style={s.matchModal}>
              <span style={{ fontSize: 58, marginBottom: 10, display: 'block' }}>{matchData.emoji}</span>
              <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, marginBottom: 4 }}>It's a match!</h2>
              <p style={{ fontSize: 14, color: '#5C5248', marginBottom: 20, lineHeight: 1.4 }}>Everyone said yes to {matchData.name}!</p>
              <div style={s.ctaGrid}>
                {[
                  { type: 'maps', icon: '🗺️', label: 'Google Maps' },
                  { type: 'reserve', icon: '🍽️', label: 'Reserve' },
                  { type: 'delivery', icon: '🛵', label: 'Delivery' },
                  { type: 'directions', icon: '📍', label: 'Directions' },
                ].map(c => (
                  <button key={c.type} style={s.ctaBtn} onClick={() => openCTA(c.type)}>
                    <span style={{ fontSize: 24 }}>{c.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#5C5248' }}>{c.label}</span>
                  </button>
                ))}
              </div>
              <button style={{ ...s.btnGhost, ...s.btnFull }} onClick={() => { setMatchPopupVisible(false); stopConfetti(); }}>
                Keep swiping
              </button>
            </div>
          </div>
        )}

        {/* ══ MULTIPLAYER MODAL ══ */}
        {mpModalOpen && (
          <div style={s.sheetBackdrop} onClick={e => { if (e.target === e.currentTarget) setMpModalOpen(false); }}>
            <div style={s.sheet}>
              <div style={s.sheetHandle} />
              <div style={s.sheetHeader}>
                <div style={s.sheetTitle}>Play together</div>
                <button style={s.btnIcon} onClick={() => setMpModalOpen(false)}>✕</button>
              </div>
              <div style={s.sheetBody}>
                {!mp.active ? (
                  <>
                    <div style={s.mpTabs}>
                      {['host', 'join'].map(t => (
                        <button key={t} style={{ ...s.mpTab, ...(mpTab === t ? s.mpTabActive : {}) }} onClick={() => setMpTab(t)}>
                          {t === 'host' ? '🍽️ Host a session' : '🔗 Join a session'}
                        </button>
                      ))}
                    </div>
                    {mpTab === 'host' ? (
                      <div>
                        <p style={{ fontSize: 13, color: '#5C5248', marginBottom: 14, lineHeight: 1.5 }}>Create a session and share the code. Everyone votes the same restaurants — only mutual yeses match.</p>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                          <input type="text" placeholder="Your name..." value={mpHostName} onChange={e => setMpHostName(e.target.value)} style={s.input} />
                          <button style={s.btnPrimary} onClick={mpHost}>Create</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontSize: 13, color: '#5C5248', marginBottom: 14, lineHeight: 1.5 }}>Enter the code your date shared with you.</p>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                          <input type="text" placeholder="Your name..." value={mpJoinName} onChange={e => setMpJoinName(e.target.value)} style={{ ...s.input, maxWidth: 130 }} />
                          <input type="text" placeholder="Room code..." value={mpJoinCode} onChange={e => setMpJoinCode(e.target.value.toUpperCase())} style={{ ...s.input, letterSpacing: '.1em', fontWeight: 600 }} />
                          <button style={s.btnPrimary} onClick={mpJoin}>Join</button>
                        </div>
                        {mpJoinError && <div style={{ fontSize: 12, color: '#A32D2D' }}>{mpJoinError}</div>}
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={s.mpLivePill}><span style={s.mpLiveDot} /> Live session</span>
                      <button style={s.mpCopyBtn} onClick={() => { navigator.clipboard?.writeText(mp.roomCode).catch(() => {}); }}>Copy code</button>
                    </div>
                    <div style={s.mpRoomCode}>{mp.roomCode}</div>
                    <div style={{ fontSize: 12, color: '#9C9088', textAlign: 'center', marginBottom: 16 }}>Share this code with your dinner date</div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#5C5248', marginBottom: 6 }}>In this session</div>
                    {[{ id: mp.myId, name: mp.myName, bg: '#FAECE7', text: '#4A1B0C' }, ...mp.peerOrder.map(id => ({ id, ...mp.peers[id] }))].map(p => (
                      <div key={p.id} style={s.mpPeer}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: p.bg, color: p.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>{ini(p.name)}</div>
                        <span style={{ flex: 1, fontSize: 14 }}>{p.name}{p.id === mp.myId ? ' (you)' : ''}</span>
                        <div style={s.onlineDot} />
                      </div>
                    ))}
                    <div style={{ fontSize: 12, color: '#9C9088', textAlign: 'center', padding: '8px 0' }}>
                      {mp.peerOrder.length === 0 ? 'Waiting for others to join…' : `${mp.peerOrder.length + 1} people in this session`}
                    </div>
                    <button style={{ ...s.btnPrimary, ...s.btnFull, marginTop: 16 }} onClick={mpStartFromModal}>Start swiping together →</button>
                    <button style={{ ...s.btnGhost, ...s.btnFull, marginTop: 8, fontSize: 13, color: '#9C9088' }} onClick={mpLeave}>Leave session</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ API KEY MODAL ══ */}
        {apiModalVisible && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 24, padding: '28px 24px', maxWidth: 400, width: '100%', maxHeight: '90%', overflowY: 'auto' }}>
              <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, marginBottom: 4 }}>🗺️ Connect Google Maps</h2>
              <p style={{ fontSize: 13, color: '#5C5248', marginBottom: 20 }}>Paste your Google Places API key to show real nearby restaurants.</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input
                  type="text" placeholder="AIza..." defaultValue={googleApiKey}
                  id="api-key-input" style={s.input}
                />
                <button style={s.btnPrimary} onClick={() => {
                  const k = document.getElementById('api-key-input').value.trim();
                  if (k) { setGoogleApiKey(k); localStorage.setItem('fhf_api_key', k); }
                  setApiModalVisible(false);
                  if (currentZip) fetchRestaurants(currentZip, k);
                }}>Activate</button>
              </div>
              <button style={{ ...s.btnGhost, ...s.btnFull, marginTop: 10 }} onClick={() => setApiModalVisible(false)}>Use demo data for now</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const s = {
  root: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#F7F3EC', fontFamily: "'DM Sans', sans-serif", color: '#1A1612', WebkitFontSmoothing: 'antialiased', overflow: 'hidden' },
  statusBar: { height: 50, flexShrink: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 28px 8px', position: 'relative', zIndex: 10 },
  notch: { position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 120, height: 34, background: '#1A1612', borderRadius: '0 0 20px 20px' },
  appContent: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' },
  screen: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' },
  scrollInner: { flex: 1, overflowY: 'auto', padding: '0 20px 24px', scrollbarWidth: 'none' },
  confettiCanvas: { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 199 },
  navBar: { height: 54, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' },
  logo: { fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: '#1A1612' },
  sessionPill: { fontSize: 11, fontWeight: 500, color: '#5C5248', background: '#EDE7DA', borderRadius: 100, padding: '4px 10px' },
  card: { background: '#fff', borderRadius: 22, boxShadow: '0 2px 12px rgba(26,22,18,0.07)', padding: 20, marginBottom: 12 },
  cardTitle: { fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 600, marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#5C5248', marginBottom: 16, lineHeight: 1.5 },
  input: { flex: 1, padding: '12px 14px', background: '#F7F3EC', border: '1.5px solid #EDE7DA', borderRadius: 14, fontSize: 15, fontFamily: "'DM Sans', sans-serif", color: '#1A1612', outline: 'none', width: '100%' },
  zipInput: { background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.15)', color: '#fff' },
  zipCard: { background: 'linear-gradient(135deg, #1A1612 0%, #3a3530 100%)', borderRadius: 22, padding: 20, marginBottom: 12, color: '#F7F3EC' },
  zipLabel: { fontSize: 11, color: '#9C9088', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' },
  zipBig: { fontFamily: 'Fraunces, serif', fontSize: 38, fontWeight: 600, letterSpacing: '-.02em' },
  zipCity: { fontSize: 13, color: '#9C9088', marginTop: 2 },
  btnZip: { background: '#D85A30', color: '#fff', border: 'none', borderRadius: 14, padding: '12px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" },
  btnPrimary: { padding: '11px 18px', borderRadius: 14, fontSize: 14, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", border: 'none', cursor: 'pointer', background: '#D85A30', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6 },
  btnGhost: { padding: '11px 18px', borderRadius: 14, fontSize: 14, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", border: 'none', cursor: 'pointer', background: '#F7F3EC', color: '#5C5248', display: 'inline-flex', alignItems: 'center', gap: 6 },
  btnFull: { width: '100%', justifyContent: 'center', padding: '16px 20px', fontSize: 16, borderRadius: 18 },
  btnIcon: { padding: '10px 12px', borderRadius: 12, fontSize: 16, border: 'none', cursor: 'pointer', background: '#F7F3EC', color: '#5C5248' },
  partnerChip: { display: 'flex', alignItems: 'center', gap: 12, background: '#F7F3EC', borderRadius: 14, padding: '10px 14px' },
  avatar: { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, flexShrink: 0 },
  onlineDot: { width: 8, height: 8, borderRadius: '50%', background: '#63992B' },
  swipeWrap: { flex: 1, position: 'relative', margin: '6px 20px 0' },
  swipeCard: { position: 'absolute', inset: 0, background: '#fff', borderRadius: 28, boxShadow: '0 4px 28px rgba(26,22,18,0.12)', overflow: 'hidden', cursor: 'grab', userSelect: 'none', willChange: 'transform' },
  cardImgArea: { height: 228, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  restImg: { width: '100%', height: '100%', objectFit: 'cover' },
  emojiFallback: { fontSize: 96, lineHeight: 1 },
  imgOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 45%, rgba(0,0,0,0.38) 100%)' },
  cuisineTag: { position: 'absolute', bottom: 12, left: 12, background: 'rgba(255,255,255,0.92)', borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 500, color: '#1A1612' },
  openTag: { position: 'absolute', bottom: 12, right: 12, background: '#EAF3DE', borderRadius: 20, padding: '5px 10px', fontSize: 11, fontWeight: 500, color: '#3B6D11' },
  voteOverlay: { position: 'absolute', top: 14, right: 14, borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 600 },
  voteYes: { background: '#EAF3DE', color: '#3B6D11', border: '1.5px solid #97C459' },
  voteNo: { background: '#FCEBEB', color: '#A32D2D', border: '1.5px solid #F09595' },
  cardBodySwipe: { padding: '14px 20px 18px' },
  restName: { fontFamily: 'Fraunces, serif', fontSize: 21, fontWeight: 600, color: '#1A1612', marginBottom: 5 },
  restMeta: { display: 'flex', gap: 12, fontSize: 13, color: '#5C5248', marginBottom: 5, flexWrap: 'wrap' },
  restAddr: { fontSize: 12, color: '#9C9088', marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  pvoteRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  pvote: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 },
  pav: { width: 24, height: 24, borderRadius: '50%', fontSize: 9, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  progressBar: { height: 3, background: '#EDE7DA', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', background: '#D85A30', borderRadius: 2, transition: 'width .35s' },
  progressLabel: { fontSize: 11, color: '#9C9088', textAlign: 'right', marginTop: 3 },
  actionRow: { height: 86, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32 },
  actionBtn: { width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(26,22,18,0.07)' },
  actionNope: { background: '#fff', color: '#A32D2D' },
  actionYep: { background: '#D85A30', color: '#fff', fontSize: 20 },
  loadingCard: { background: '#fff', borderRadius: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: '#5C5248', fontSize: 14 },
  spinner: { width: 30, height: 30, border: '2.5px solid #EDE7DA', borderTopColor: '#D85A30', borderRadius: '50%', animation: 'spin .7s linear infinite' },
  tabBar: { height: 70, flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-around', paddingTop: 10, background: 'rgba(247,243,236,0.94)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(26,22,18,0.07)' },
  tab: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 },
  tabActive: {},
  matchBadge: { background: '#D85A30', color: '#fff', fontSize: 10, fontWeight: 600, borderRadius: 10, padding: '1px 5px', marginLeft: 2 },
  matchBackdrop: { position: 'absolute', inset: 0, background: 'rgba(26,22,18,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  matchModal: { background: '#fff', borderRadius: 28, padding: '28px 24px 24px', width: 'calc(100% - 48px)', maxWidth: 320, textAlign: 'center' },
  ctaGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 },
  ctaBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '13px 8px', borderRadius: 14, background: '#F7F3EC', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  matchCard: { background: '#fff', borderRadius: 20, margin: '0 20px 12px', padding: 16, boxShadow: '0 2px 12px rgba(26,22,18,0.07)' },
  matchCardTop: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 },
  matchEmojiBox: { width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 },
  matchInfoH3: { fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 600, marginBottom: 2 },
  miMeta: { fontSize: 12, color: '#5C5248' },
  matchVoters: { display: 'flex', gap: 4, marginTop: 5 },
  matchAv: { width: 22, height: 22, borderRadius: '50%', fontSize: 9, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  matchActions: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 },
  maBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '9px 4px', borderRadius: 12, background: '#F7F3EC', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  maLabel: { fontSize: 10, color: '#5C5248', fontWeight: 500 },
  matchTime: { fontSize: 11, color: '#9C9088', marginTop: 10 },
  sheetBackdrop: { position: 'absolute', inset: 0, background: 'rgba(26,22,18,0.52)', display: 'flex', alignItems: 'flex-end', zIndex: 300 },
  sheet: { background: '#fff', borderRadius: '28px 28px 0 0', width: '100%', maxHeight: '88%', display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 40px rgba(26,22,18,0.18)' },
  sheetHandle: { width: 36, height: 4, background: '#E3DBCF', borderRadius: 2, margin: '12px auto 0' },
  sheetHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px' },
  sheetTitle: { fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600 },
  sheetBody: { overflowY: 'auto', padding: '0 20px 24px', flex: 1 },
  mpInviteBtn: { display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 16, padding: '14px 16px', marginBottom: 12, cursor: 'pointer', boxShadow: '0 2px 12px rgba(26,22,18,0.07)', border: 'none', width: '100%', fontFamily: "'DM Sans', sans-serif", textAlign: 'left' },
  mpBadge: { display: 'inline-flex', alignItems: 'center', background: '#EAF3DE', color: '#3B6D11', fontSize: 10, fontWeight: 600, borderRadius: 100, padding: '2px 8px', marginLeft: 6 },
  mpTabs: { display: 'flex', background: '#F7F3EC', borderRadius: 14, padding: 4, marginBottom: 20 },
  mpTab: { flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 500, border: 'none', background: 'transparent', color: '#5C5248', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  mpTabActive: { background: '#fff', color: '#1A1612', boxShadow: '0 1px 4px rgba(26,22,18,0.1)' },
  mpRoomCode: { fontFamily: 'Fraunces, serif', fontSize: 42, fontWeight: 600, letterSpacing: '.12em', color: '#D85A30', textAlign: 'center', padding: '10px 0 4px', background: '#FAECE7', borderRadius: 16, margin: '10px 0' },
  mpLivePill: { display: 'inline-flex', alignItems: 'center', gap: 5, background: '#EAF3DE', color: '#3B6D11', fontSize: 11, fontWeight: 600, borderRadius: 100, padding: '4px 10px' },
  mpLiveDot: { width: 6, height: 6, borderRadius: '50%', background: '#3B6D11' },
  mpCopyBtn: { background: '#F7F3EC', border: '1.5px solid #EDE7DA', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 500, color: '#5C5248', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  mpPeer: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#F7F3EC', borderRadius: 14, marginBottom: 8 },
};
