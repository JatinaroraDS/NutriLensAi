/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  PlusCircle, 
  MessageSquare, 
  Home, 
  Settings, 
  LogOut, 
  ChevronRight, 
  Moon, 
  Zap, 
  Utensils, 
  PieChart as ChartIcon,
  Search,
  MapPin,
  Send,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { auth, db, signIn, signOutUser } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { DataInference } from './DataInference';
import { ContextAnalysis } from './ContextAnalysis';
import { UserNudge } from './UserNudge';
import { GoogleGenAI } from "@google/genai";

// --- Types ---
type Screen = 'onboarding' | 'dashboard' | 'meals' | 'chat';

// Declare google global for TS
declare global {
  interface Window {
    google: any;
  }
}
const google = (window as any).google;

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [context, setContext] = useState<any>({
    sleepScore: 70,
    stressLevel: 'medium',
    goal: 'maintain',
    diet: 'none'
  });
  const [nudge, setNudge] = useState<string>('');
  const [nudgeLoading, setNudgeLoading] = useState(false);
  
  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Fetch profile
        const profileDoc = await getDoc(doc(db, 'users', u.uid, 'profile', 'settings'));
        if (profileDoc.exists()) {
          const data = profileDoc.data();
          setProfile(data);
          setContext(prev => ({ ...prev, goal: data.goal, diet: data.diet }));
          setCurrentScreen('dashboard');
        } else {
          setCurrentScreen('onboarding');
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Update Nudge when context changes with debounce
  useEffect(() => {
    if (user && profile) {
      const timer = setTimeout(() => {
        updateNudge();
      }, 500); // 500ms debounce
      return () => clearTimeout(timer);
    }
  }, [context, user, profile]);

  const updateNudge = async () => {
    setNudgeLoading(true);
    const flags = ContextAnalysis.evaluate({ ...context, hour: new Date().getHours() });
    const text = await UserNudge.generate(context, flags);
    setNudge(text);
    setNudgeLoading(false);
  };

  const saveProfile = async (newProfile: any) => {
    if (!user) return;
    const profileData = { ...newProfile, onboarded: true, userId: user.uid };
    await setDoc(doc(db, 'users', user.uid, 'profile', 'settings'), profileData);
    setProfile(profileData);
    setContext(prev => ({ ...prev, goal: newProfile.goal, diet: newProfile.diet }));
    setCurrentScreen('dashboard');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginView onSignIn={signIn} />;
  }

  return (
    <div className="min-h-screen bg-bg flex h-full max-w-6xl mx-auto overflow-hidden shadow-2xl">
      {/* Sidebar Navigation - Desktop */}
      {profile && (
        <aside className="hidden md:flex w-20 flex-col items-center border-r border-slate-200 bg-white py-8 z-50">
          <div className="mb-12 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-emerald-200">
            <Activity size={24} strokeWidth={2.5} />
          </div>
          <nav className="flex flex-col gap-8">
            <NavItem active={currentScreen === 'dashboard'} icon={<Home size={28} strokeWidth={2.5} />} onClick={() => setCurrentScreen('dashboard')} />
            <NavItem active={currentScreen === 'meals'} icon={<PlusCircle size={28} strokeWidth={2.5} />} onClick={() => setCurrentScreen('meals')} />
            <NavItem active={currentScreen === 'chat'} icon={<MessageSquare size={28} strokeWidth={2.5} />} onClick={() => setCurrentScreen('chat')} />
          </nav>
          <div className="mt-auto flex flex-col gap-6 items-center">
            <button onClick={signOutUser} className="text-slate-300 hover:text-red-400 transition-colors">
              <LogOut size={28} strokeWidth={2.5} />
            </button>
            <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-emerald-100 bg-slate-100">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="User" />
            </div>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 scroll-smooth">
        <AnimatePresence mode="wait">
          {currentScreen === 'onboarding' && (
            <OnboardingView key="onboarding" onComplete={saveProfile} />
          )}
          {currentScreen === 'dashboard' && (
            <DashboardView 
              key="dashboard"
              context={context} 
              setContext={setContext}
              nudge={nudge}
              nudgeLoading={nudgeLoading}
              user={user}
            />
          )}
          {currentScreen === 'meals' && (
            <MealLoggerView key="meals" user={user} />
          )}
          {currentScreen === 'chat' && (
            <ChatView key="chat" user={user} context={context} />
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation - Mobile */}
      {profile && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-2 flex justify-between items-center z-50">
          <NavItem active={currentScreen === 'dashboard'} icon={<Home size={24} />} label="Home" onClick={() => setCurrentScreen('dashboard')} />
          <NavItem active={currentScreen === 'meals'} icon={<PlusCircle size={24} />} label="Log" onClick={() => setCurrentScreen('meals')} />
          <NavItem active={currentScreen === 'chat'} icon={<MessageSquare size={24} />} label="AI Chat" onClick={() => setCurrentScreen('chat')} />
          <button onClick={signOutUser} className="p-2 text-slate-300"><LogOut size={24} /></button>
        </nav>
      )}
    </div>
  );
}

// --- Views ---

function LoginView({ onSignIn }: { onSignIn: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await onSignIn();
    } catch (e: any) {
      console.error("Login Error:", e);
      setError(e.message || "Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-bg px-8 text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6">
        <Activity className="w-10 h-10 text-primary" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">NutriLens AI</h1>
      <p className="text-gray-500 mb-8 leading-relaxed">
        Stop cravings before they happen. <br/>
        Proactive nutrition based on your context.
      </p>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100 animate-in fade-in zoom-in duration-300">
          {error.includes("popup-closed-by-user") 
            ? "The login popup was closed. Please try again." 
            : error}
          <div className="mt-2 text-xs font-bold uppercase cursor-pointer underline" onClick={() => window.open(window.location.href, '_blank')}>
            Try opening in a new tab
          </div>
        </div>
      )}

      <button 
        onClick={handleSignIn}
        disabled={loading}
        className="btn-primary w-full flex items-center justify-center gap-3"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 bg-white rounded-sm p-0.5" alt="Google" />
        )}
        {loading ? "Signing in..." : "Sign in with Google"}
      </button>

      <p className="mt-8 text-[10px] text-slate-400 uppercase font-black tracking-widest">
        Login requires popups. <br/> 
        If it fails, use the "Open in new tab" icon at the top right.
      </p>
    </div>
  );
}

function NavItem({ active, icon, label, onClick }: any) {
  return (
    <button onClick={onClick} className={`nav-item flex flex-col items-center gap-1 cursor-pointer transition-transform active:scale-95 ${active ? 'active' : ''}`}>
      <div className={`p-2 rounded-xl transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-slate-300 hover:text-slate-500'}`}>
        {icon}
      </div>
      {label && <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>}
      {active && !label && <motion.div layoutId="nav-dot" className="w-1.5 h-1.5 bg-primary rounded-full mt-1 shadow-sm shadow-primary/50" />}
    </button>
  );
}

function OnboardingView({ onComplete }: { onComplete: (p: any) => void; key?: string }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({ name: '', goal: 'maintain', diet: 'none' });

  const next = () => {
    if (step < 3) setStep(step + 1);
    else onComplete(data);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-8 h-full flex flex-col justify-center"
    >
      <div className="text-sm font-bold text-primary mb-2 uppercase tracking-widest">Step {step} of 3</div>
      
      {step === 1 && (
        <div className="fade-in">
          <h2 className="text-2xl font-bold mb-6">What's your name?</h2>
          <input 
            type="text" 
            placeholder="First name"
            className="input-field mb-8"
            value={data.name}
            onChange={e => setData({...data, name: e.target.value})}
          />
        </div>
      )}

      {step === 2 && (
        <div className="fade-in">
          <h2 className="text-2xl font-bold mb-6">What's your primary goal?</h2>
          <div className="space-y-4 mb-8">
            {['lose weight', 'build muscle', 'maintain'].map(g => (
              <button 
                key={g}
                onClick={() => setData({...data, goal: g})}
                className={`w-full text-left px-5 py-4 rounded-2xl border transition-all ${data.goal === g ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20' : 'border-gray-200'}`}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="fade-in">
          <h2 className="text-2xl font-bold mb-6">Dietary preference?</h2>
          <div className="space-y-4 mb-8">
            {['veg', 'vegan', 'keto', 'none'].map(d => (
              <button 
                key={d}
                onClick={() => setData({...data, diet: d})}
                className={`w-full text-left px-5 py-4 rounded-2xl border transition-all ${data.diet === d ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20' : 'border-gray-200'}`}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      <button 
        disabled={step === 1 && !data.name}
        onClick={next}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        <span>{step === 3 ? 'Get Started' : 'Continue'}</span>
        <ChevronRight size={20} />
      </button>
    </motion.div>
  );
}

function DashboardView({ context, setContext, nudge, nudgeLoading, user }: any) {
  const [streak, setStreak] = useState(0);
  const [places, setPlaces] = useState<any[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);

  useEffect(() => {
    // Fetch streak
    const unsub = onSnapshot(doc(db, 'users', user.uid, 'streaks', 'main'), (doc) => {
      if (doc.exists()) setStreak(doc.data().count);
    });
    return unsub;
  }, [user.uid]);

  useEffect(() => {
    // Load healthy places
    if (window.google && window.google.maps && window.google.maps.importLibrary) {
      loadNearbyHealthyPlaces();
    }
  }, [context.diet]);

  const loadNearbyHealthyPlaces = async () => {
    setPlacesLoading(true);
    try {
      // @ts-ignore
      const { PlacesService } = await google.maps.importLibrary("places");
      const location = new google.maps.LatLng(37.7749, -122.4194); 
      const service = new PlacesService(document.createElement('div'));
      const request = {
        location,
        radius: 5000,
        keyword: `healthy ${context.diet !== 'none' ? context.diet : ''} restaurant`,
        type: 'restaurant'
      };

      service.nearbySearch(request, (results: any, status: any) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          setPlaces(results.slice(0, 3));
        }
        setPlacesLoading(false);
      });
    } catch (e) {
      console.error("Maps Error:", e);
      setPlacesLoading(false);
    }
  };

  const riskLevel = context.sleepScore < 60 || context.stressLevel === 'high' ? 'HIGH' : 'MODERATE';
  const riskColor = riskLevel === 'HIGH' ? 'text-red-500' : 'text-orange-500';
  const riskBg = riskLevel === 'HIGH' ? 'bg-red-500' : 'bg-orange-500';

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="p-8 space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Good morning, {user.displayName?.split(' ')[0]}</h1>
          <p className="text-slate-500 font-medium">You're on a <span className="text-primary font-bold">{streak}-day streak</span>. Keep it up!</p>
        </div>
        <div className="flex items-center gap-4 rounded-2xl bg-white px-5 py-3 shadow-sm ring-1 ring-slate-100 self-start">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Current Risk</p>
            <p className={`text-sm font-black ${riskColor}`}>{riskLevel}</p>
          </div>
          <div className={`h-10 w-1 rounded-full ${riskBg === 'bg-red-500' ? 'bg-red-100' : 'bg-orange-100'}`}>
            <div className={`w-full rounded-full ${riskBg}`} style={{ height: riskLevel === 'HIGH' ? '90%' : '60%' }}></div>
          </div>
        </div>
      </header>

      {/* Top Row Widgets */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Context Inputs */}
        <div className="card flex flex-col gap-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Daily Context</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                <span>Sleep Quality</span>
                <span className="text-primary">{context.sleepScore}%</span>
              </div>
              <input 
                type="range" 
                min="0" max="100" 
                value={context.sleepScore}
                onChange={e => setContext({...context, sleepScore: parseInt(e.target.value)})}
                className="w-full"
              />
              <p className="mt-1 text-[10px] text-slate-400 uppercase font-black tracking-tighter">Short Sleep = High Cravings</p>
            </div>
            <div>
              <p className="mb-3 text-sm font-bold text-slate-700">Stress Level</p>
              <div className="flex gap-2">
                {['low', 'medium', 'high'].map(s => (
                  <button 
                    key={s}
                    onClick={() => setContext({...context, stressLevel: s})}
                    className={`flex-1 rounded-xl py-2 text-xs font-black border transition-all ${context.stressLevel === s ? 'bg-primary border-primary text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                  >
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* AI Nudge Card */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-[2rem] bg-emerald-900 p-8 text-white shadow-xl flex flex-col justify-center min-h-[220px]">
          <div className="relative z-10">
            <div className="mb-4 flex items-center gap-2">
              <Zap size={16} className="text-emerald-300" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">NutriLens Proactive AI</span>
            </div>
            {nudgeLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin w-4 h-4 text-emerald-300" />
                <span className="text-emerald-300 font-medium">Generating nudge...</span>
              </div>
            ) : (
              <>
                <h2 className="text-xl md:text-2xl font-bold leading-tight mb-3 pr-8">{nudge}</h2>
                <div className="mt-4 flex items-center gap-2 text-emerald-200/60 text-xs font-medium">
                  <CheckCircle2 size={14} />
                  <span>Personalized Swap-to-Win Recommendation</span>
                </div>
              </>
            )}
          </div>
          <div className="nudge-blur-1"></div>
          <div className="nudge-blur-2"></div>
        </div>
      </section>

      {/* Bottom Row */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Nutrition Rings */}
        <div className="lg:col-span-4 card flex flex-col">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8">Nutrition Progress</h3>
          <div className="relative flex-1 flex items-center justify-center py-6">
             <NutritionRing percent={65} color="var(--color-primary)" size={180} stroke={16} innerPercent={45} innerColor="#6EE7B7" />
             <div className="absolute text-center">
                <p className="text-3xl font-black text-slate-800">1,420</p>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">kcal to go</p>
             </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center pt-6 border-t border-slate-50">
            <NutritionStat label="PRO" value="64g" />
            <NutritionStat label="CARB" value="112g" isMiddle />
            <NutritionStat label="FAT" value="38g" />
          </div>
        </div>

        {/* Map UI */}
        <div className="lg:col-span-8 flex flex-col overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100">
           <div className="flex items-center justify-between border-b border-slate-50 px-6 py-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Healthy Nearby ({context.diet})</h3>
              <span className="text-[10px] font-black text-primary">POWERED BY GOOGLE MAPS</span>
           </div>
           <div className="flex flex-col md:flex-row flex-1">
              <div className="md:w-1/2 p-6 space-y-3">
                {places.map((p, i) => (
                  <div key={i} className={`flex items-start gap-4 p-4 rounded-2xl transition-all ${i === 0 ? 'bg-emerald-50/50 ring-1 ring-emerald-100 shadow-sm' : 'hover:bg-slate-50'}`}>
                    <div className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${i === 0 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium truncate uppercase tracking-tighter">{p.vicinity}</p>
                    </div>
                    <div className="text-xs font-black text-primary">{p.rating} ★</div>
                  </div>
                ))}
                {places.length === 0 && <div className="text-slate-400 text-xs italic p-4">Searching for healthy eateries...</div>}
              </div>
              <div className="md:w-1/2 h-64 md:h-auto bg-slate-100 relative">
                 {/* This would be the actual map if we wanted to render it, otherwise we'll just use a styled placeholder as per design */}
                 <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <MapPin className="text-slate-300 w-12 h-12" />
                 </div>
                 <div className="absolute top-1/4 left-1/3 h-5 w-5 rounded-full border-2 border-white bg-primary shadow-xl animate-bounce"></div>
                 <div className="absolute top-1/2 left-2/3 h-4 w-4 rounded-full border-2 border-white bg-slate-400 shadow-lg"></div>
                 <div className="absolute bottom-1/3 left-1/4 h-4 w-4 rounded-full border-2 border-white bg-slate-400 shadow-lg"></div>
              </div>
           </div>
        </div>
      </section>
    </motion.div>
  );
}

function NutritionStat({ label, value, isMiddle }: any) {
  return (
    <div className={isMiddle ? 'border-x border-slate-100' : ''}>
      <p className="text-[10px] font-black text-slate-400">{label}</p>
      <p className="font-bold text-slate-700">{value}</p>
    </div>
  );
}

function NutritionRing({ percent, color, size, stroke, innerPercent, innerColor }: any) {
  const radius = size / 2;
  const outerRadius = radius - stroke;
  const innerRadius = outerRadius - 20;
  
  const outerCircumference = outerRadius * 2 * Math.PI;
  const innerCircumference = innerRadius * 2 * Math.PI;
  
  const outerOffset = outerCircumference - (percent / 100) * outerCircumference;
  const innerOffset = innerCircumference - (innerPercent / 100) * innerCircumference;

  return (
    <svg height={size} width={size} className="-rotate-90">
      {/* Outer Ring */}
      <circle cx={radius} cy={radius} r={outerRadius} stroke="#F1F5F9" strokeWidth={stroke} fill="none" />
      <circle 
        cx={radius} cy={radius} r={outerRadius} 
        stroke={color} strokeWidth={stroke} fill="none" 
        strokeDasharray={outerCircumference} 
        strokeDashoffset={outerOffset} 
        strokeLinecap="round" 
      />
      {/* Inner Ring */}
      <circle cx={radius} cy={radius} r={innerRadius} stroke="#F1F5F9" strokeWidth={stroke * 0.75} fill="none" />
      <circle 
        cx={radius} cy={radius} r={innerRadius} 
        stroke={innerColor} strokeWidth={stroke * 0.75} fill="none" 
        strokeDasharray={innerCircumference} 
        strokeDashoffset={innerOffset} 
        strokeLinecap="round" 
      />
    </svg>
  );
}

function MealLoggerView({ user }: { user: any; key?: string }) {
  const [queryText, setQueryText] = useState('');
  const [loading, setLoading] = useState(false);
  const [hunger, setHunger] = useState(3);
  const [mood, setMood] = useState('happy');
  const [meals, setMeals] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'meals'), orderBy('timestamp', 'desc'), limit(5));
    return onSnapshot(q, (snapshot) => {
      setMeals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [user.uid]);

  const logMeal = async () => {
    if (!queryText) return;
    setLoading(true);
    try {
      // Mock nutrition fetch from Open Food Facts API
      // In a real app we'd search and pick.
      const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${queryText}&json=1&page_size=1`);
      const data = await res.json();
      const product = data.products?.[0] || {};
      
      const meal = {
        userId: user.uid,
        name: queryText,
        calories: product.nutriments?.['energy-kcal_100g'] || 0,
        protein: product.nutriments?.protein_100g || 0,
        carbs: product.nutriments?.carbohydrates_100g || 0,
        fats: product.nutriments?.fat_100g || 0,
        mood,
        hunger,
        timestamp: new Date()
      };

      await addDoc(collection(db, 'users', user.uid, 'meals'), meal);
      setQueryText('');
      alert('Meal logged successfully!');
    } catch (e) {
      console.error(e);
      alert('Error fetching nutrition data.');
    }
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6">
      <h2 className="text-2xl font-bold pt-4">Meal Logger</h2>
      
      <div className="card space-y-4">
        <div>
          <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">What did you eat?</label>
          <div className="relative">
            <input 
              type="text" 
              placeholder="e.g. Greek Yogurt, Oats..." 
              className="input-field pl-10"
              value={queryText}
              onChange={e => setQueryText(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">Mood</label>
            <select className="input-field py-2 text-sm" value={mood} onChange={e => setMood(e.target.value)}>
               <option value="happy">Happy</option>
               <option value="stressed">Stressed</option>
               <option value="tired">Tired</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">Hunger (1-5)</label>
            <input type="range" min="1" max="5" value={hunger} onChange={e => setHunger(parseInt(e.target.value))} className="w-full mt-2" />
          </div>
        </div>

        <button 
          onClick={logMeal} 
          disabled={loading || !queryText}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : <PlusCircle size={20} />}
          Log Meal
        </button>
      </div>

      <section className="space-y-4">
        <h3 className="text-sm font-bold">Recent Meals</h3>
        <div className="space-y-3">
          {meals.map((m, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl flex justify-between items-center border border-gray-100">
               <div>
                 <h4 className="font-bold text-sm">{m.name}</h4>
                 <div className="text-[10px] text-gray-400 mt-1 flex gap-2">
                    <span className="uppercase">{m.mood}</span>
                    <span>•</span>
                    <span>{Math.round(m.calories)} kcal</span>
                 </div>
               </div>
               <div className="bg-accent px-3 py-1 rounded-full text-[10px] font-bold text-primary">
                 Hunger: {m.hunger}
               </div>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

function ChatView({ user, context }: { user: any; context: any; key?: string }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: `Hi ${user.displayName?.split(' ')[0]}! I'm your AI Coach. Based on your stress being ${context.stressLevel} and sleep score of ${context.sleepScore}, how can I help you with your ${context.goal} goal today?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input || loading) return;
    const msg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      // Fetch latest meals for context
      const mealsSnap = await getDoc(doc(db, 'users', user.uid, 'meals', 'latest')); // Or just last few
      
      const prompt = `
        You are an expert AI Nutrition Coach for NutriLens AI. 
        User Context: 
        - Name: ${user.displayName}
        - Sleep: ${context.sleepScore}/100
        - Stress: ${context.stressLevel}
        - Goal: ${context.goal}
        - Diet: ${context.diet}
        - Time: ${new Date().toLocaleTimeString()}
        
        User Question: "${msg}"
        
        Guidelines:
        - Be warm, encouraging, and science-based.
        - Provide specific food suggestions linked to their stress/sleep/goal.
        - Keep responses concise (3-4 sentences).
        - Use "Swap-to-Win" logic.
      `;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setMessages(prev => [...prev, { role: 'ai', text: result.text || "I'm here to help you stay on track!" }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'ai', text: "Hmm, I'm having trouble connecting to my AI brain. Try again in a bit!" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col p-4">
      <h2 className="text-center font-bold py-4">AI Coach Chat</h2>
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pb-4 px-2">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`chat-bubble ${m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai shadow-sm'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-bubble chat-bubble-ai italic opacity-50 flex items-center gap-2">
            <Loader2 className="animate-spin w-3 h-3" />
            AI is typing...
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 p-2 flex gap-2 items-center bottom-20">
        <input 
          type="text" 
          placeholder="Ask about your diet..."
          className="flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && sendMessage()}
        />
        <button 
          onClick={sendMessage}
          disabled={!input || loading}
          className="bg-primary text-white p-3 rounded-2xl disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </motion.div>
  );
}
