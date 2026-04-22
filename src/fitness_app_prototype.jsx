import { useState, useMemo, useEffect, useRef } from 'react';
import { X, Plus, Search, ChevronDown, Minus, Check, ArrowLeft, Play, Trash2, Bell, GripVertical, Calendar, CalendarCheck, Copy, Dumbbell, CalendarDays } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ========================================================================
// DATA — 82 egzersizlik kütüphane (kullanıcının Excel'inden birebir)
// ========================================================================

const MUSCLES = [
  { id: 'chest',     label: 'CHEST',     front: true  },
  { id: 'triceps',   label: 'TRICEPS',   front: false },
  { id: 'biceps',    label: 'BICEPS',    front: true  },
  { id: 'arms',      label: 'ARMS',      front: true  },
  { id: 'legs',      label: 'LEGS',      front: true  },
  { id: 'back',      label: 'BACK',      front: false },
  { id: 'trapezius', label: 'TRAPEZIUS', front: false },
  { id: 'shoulders', label: 'SHOULDERS', front: true  },
  { id: 'abs',       label: 'ABS',       front: true  },
];

// Helper: parse exercise
const mk = (muscle, raw, flags = {}) => {
  const m = raw.match(/^(\d+)[\s-]/);
  const deviceNo = m ? parseInt(m[1]) : null;
  const hasBench = /bench/i.test(raw);
  let equipment = 'Free Weight';
  if (hasBench) equipment = 'Bench';
  else if (deviceNo) equipment = 'Selectorised';
  return { id: crypto.randomUUID(), muscle, name: raw.toUpperCase(), equipment, deviceNo, ...flags };
};

const LIBRARY = [
  // CHEST
  mk('chest', '11 CHEST PRESS'),
  mk('chest', '10 FLY', { hasPosition: true }),
  mk('chest', '13 CABLE CROSS'),
  mk('chest', '14 BENCH PRESS'),
  mk('chest', 'BENCH 45° FLY', { hasAngle: true }),
  mk('chest', 'PULLOVER'),
  mk('chest', 'FLAT BENCH PULLOVER'),
  mk('chest', 'DECLINE BENCH'),
  mk('chest', 'BENCH 45° PRESS', { hasAngle: true }),
  mk('chest', 'BENCH BODY'),
  mk('chest', '13 DOUBLE ROBE', { hasWeightVar: true }),
  mk('chest', 'LATERAL RAISE SIDE'),

  // TRICEPS
  mk('triceps', '13-1 ARM REVERS GR', { singleArm: true, hasWeightVar: true }),
  mk('triceps', 'DECLINE EXTENSION'),
  mk('triceps', '7 OVERHEAD EXTENSION'),
  mk('triceps', '13 V-BAR', { hasWeightVar: true }),
  mk('triceps', '13 Z-BAR REVERS GR', { hasWeightVar: true }),
  mk('triceps', '13 DOUBLE ROBE', { hasWeightVar: true }),
  mk('triceps', 'LOW BENCH 90°', { hasAngle: true }),
  mk('triceps', 'FREE Z BAR'),
  mk('triceps', 'FREE WEIGHTS'),
  mk('triceps', 'FLAT BENCH Z BAR'),
  mk('triceps', '8 DIPS'),
  mk('triceps', 'BENCH 45°', { hasAngle: true }),

  // BICEPS
  mk('biceps', 'FREE WEIGHTS CURL'),
  mk('biceps', 'FREE Z BAR CURL'),
  mk('biceps', 'HAMMER CURL FREE W.'),
  mk('biceps', 'BENCH 45°', { hasAngle: true }),
  mk('biceps', '13 V-Z BAR', { hasWeightVar: true }),
  mk('biceps', '13 Z-BAR REVERS GR', { hasWeightVar: true }),
  mk('biceps', 'FLAT BENCH'),

  // LEGS
  mk('legs', '1 LEG PRESS CLOSE PRESS'),
  mk('legs', '2 LEG CURL'),
  mk('legs', '3 LEG EXTENSION'),
  mk('legs', 'SQUAT SUMO'),
  mk('legs', '14 SQUAT OPEN'),
  mk('legs', 'LUNGE'),
  mk('legs', 'TRAP UP BOX'),
  mk('legs', 'CALVES'),
  mk('legs', '13 Z-BAR FRONT'),
  mk('legs', '18 ADD INSIDE'),
  mk('legs', '18 ABD. OUTSIDE'),
  mk('legs', '13 HIP EXTENSION', { hasPosition: true }),

  // BACK
  mk('back', '5 LARGE GRIP'),
  mk('back', '5 CLOSE GRIP'),
  mk('back', '6 LARGE GRIP'),
  mk('back', '6 HALF LARGE GRIP'),
  mk('back', '6 CLOSE GRIP'),
  mk('back', '7 LARGE GRIP FRONT'),
  mk('back', '7 REVERSE HALF LARGE GRIP'),
  mk('back', '7 CLOSE GRIP'),
  mk('back', '13 Z-BAR PULLDOWN'),
  mk('back', 'FREE WEIGHT'),
  mk('back', 'FLY BENCH'),
  mk('back', 'FREE BAR'),
  mk('back', '4 LOWER BACK'),
  mk('back', 'ROMANIAN LIFT FREE W.'),
  mk('back', '13 DOUBLE ROBE', { hasWeightVar: true }),
  mk('back', 'LATERAL RAISE SIDE'),

  // TRAPEZIUS
  mk('trapezius', 'Z BAR'),
  mk('trapezius', 'FREE WEIGHT'),
  mk('trapezius', 'FREE BAR'),
  mk('trapezius', '13 Z BAR SHRUG'),

  // SHOULDERS
  mk('shoulders', '12 LARGE GRIP'),
  mk('shoulders', '12 CLOSE GRIP'),
  mk('shoulders', '14 BACK PRESS 75°', { hasAngle: true }),
  mk('shoulders', '14 FRONT PRESS 75°', { hasAngle: true }),
  mk('shoulders', 'BENCH'),
  mk('shoulders', '13-1 ARM', { singleArm: true }),
  mk('shoulders', 'LATERAL RAISE FREE W.'),
  mk('shoulders', 'BACK RAISE'),
  mk('shoulders', '10 REAR DELT'),
  mk('shoulders', 'FLY BENCH'),
  mk('shoulders', '13-1 ARM LATERAL RAISE', { singleArm: true }),
  mk('shoulders', 'FRONT RAISE SIDE'),

  // ABS
  mk('abs', '8 LOWER ABS'),
  mk('abs', '13 WOODSCHOPPER'),
  mk('abs', '15 ABS'),
  mk('abs', 'FLAT BENCH ON BACK'),
  mk('abs', 'DECLINE BENCH BODY'),
  mk('abs', '13 ROBE'),
  mk('abs', '13-1 ARM PULL L+R', { singleArm: true }),
];

const EQUIPMENT_TYPES = ['Selectorised', 'Free Weight', 'Bench'];

// ========================================================================
// STYLE — Design tokens
// ========================================================================

const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');
    .font-display { font-family: 'Bebas Neue', 'Arial Narrow', sans-serif; letter-spacing: 0.04em; }
    .font-body { font-family: 'DM Sans', system-ui, sans-serif; }
    .app-bg {
      background:
        radial-gradient(circle at 10% 0%, rgba(250, 204, 21, 0.06), transparent 40%),
        radial-gradient(circle at 90% 100%, rgba(37, 99, 235, 0.05), transparent 50%),
        #050505;
    }
    .card-bg {
      background: linear-gradient(180deg, #141414 0%, #0f0f0f 100%);
      border: 1px solid #222;
    }
    .accent-glow { box-shadow: 0 0 24px rgba(250, 204, 21, 0.2); }
    .fade-in { animation: fadeIn 0.25s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .scrollbar-none::-webkit-scrollbar { display: none; }
    .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
    .muscle-path { cursor: pointer; transition: fill 0.2s; }
    .muscle-path:hover { fill: #444; }
    .muscle-path.selected { fill: #facc15; }
    .tap-scale { transition: transform 0.1s; }
    .tap-scale:active { transform: scale(0.96); }
    .chip { transition: all 0.2s; }
    .chip.active { background: #facc15; color: #0a0a0a; border-color: #facc15; }
  `}</style>
);

// ========================================================================
// MUSCLE BODY MAP — simplified stylized bodies (front + back)
// ========================================================================

const BodyMap = ({ selectedMuscles, onToggle, interactive = true, size = 'lg' }) => {
  const isSel = (m) => selectedMuscles.includes(m);
  const cls = (m) => `muscle-path ${isSel(m) ? 'selected' : ''}`;
  const base = '#2a2a2a';
  const stroke = '#0a0a0a';
  const sw = size === 'sm' ? 1 : 1.5;
  const handleClick = (m) => interactive && onToggle && onToggle(m);

  return (
    <div className="flex gap-2 justify-center items-center">
      {/* FRONT BODY */}
      <svg viewBox="0 0 140 300" className="h-full w-auto" style={{ maxHeight: '100%' }}>
        {/* Head */}
        <ellipse cx="70" cy="22" rx="14" ry="17" fill={base} stroke={stroke} strokeWidth={sw}/>
        {/* Neck */}
        <rect x="63" y="38" width="14" height="10" fill={base} stroke={stroke} strokeWidth={sw}/>
        {/* Shoulders (front delts) */}
        <path d="M 40 52 Q 35 60 38 72 L 50 70 Q 54 58 55 52 Z"
              fill={isSel('shoulders') ? '#facc15' : base} stroke={stroke} strokeWidth={sw}
              className={cls('shoulders')} onClick={() => handleClick('shoulders')}/>
        <path d="M 100 52 Q 105 60 102 72 L 90 70 Q 86 58 85 52 Z"
              fill={isSel('shoulders') ? '#facc15' : base} stroke={stroke} strokeWidth={sw}
              className={cls('shoulders')} onClick={() => handleClick('shoulders')}/>
        {/* Chest (two pecs) */}
        <path d="M 55 55 Q 50 75 52 92 L 68 90 L 70 55 Z"
              fill={isSel('chest') ? '#facc15' : base} stroke={stroke} strokeWidth={sw}
              className={cls('chest')} onClick={() => handleClick('chest')}/>
        <path d="M 85 55 Q 90 75 88 92 L 72 90 L 70 55 Z"
              fill={isSel('chest') ? '#facc15' : base} stroke={stroke} strokeWidth={sw}
              className={cls('chest')} onClick={() => handleClick('chest')}/>
        {/* Biceps */}
        <path d="M 36 72 Q 28 90 30 110 L 42 108 Q 44 88 44 72 Z"
              fill={isSel('biceps') ? '#facc15' : base} stroke={stroke} strokeWidth={sw}
              className={cls('biceps')} onClick={() => handleClick('biceps')}/>
        <path d="M 104 72 Q 112 90 110 110 L 98 108 Q 96 88 96 72 Z"
              fill={isSel('biceps') ? '#facc15' : base} stroke={stroke} strokeWidth={sw}
              className={cls('biceps')} onClick={() => handleClick('biceps')}/>
        {/* Arms (forearms) */}
        <path d="M 30 110 Q 26 130 28 148 L 40 146 Q 42 128 42 108 Z"
              fill={isSel('arms') ? '#facc15' : base} stroke={stroke} strokeWidth={sw}
              className={cls('arms')} onClick={() => handleClick('arms')}/>
        <path d="M 110 110 Q 114 130 112 148 L 100 146 Q 98 128 98 108 Z"
              fill={isSel('arms') ? '#facc15' : base} stroke={stroke} strokeWidth={sw}
              className={cls('arms')} onClick={() => handleClick('arms')}/>
        {/* ABS */}
        <path d="M 55 92 L 85 92 L 84 140 L 56 140 Z"
              fill={isSel('abs') ? '#facc15' : base} stroke={stroke} strokeWidth={sw}
              className={cls('abs')} onClick={() => handleClick('abs')}/>
        <line x1="70" y1="92" x2="70" y2="140" stroke={stroke} strokeWidth={sw}/>
        <line x1="56" y1="108" x2="84" y2="108" stroke={stroke} strokeWidth={sw * 0.7} opacity="0.5"/>
        <line x1="56" y1="122" x2="84" y2="122" stroke={stroke} strokeWidth={sw * 0.7} opacity="0.5"/>
        {/* Hips */}
        <path d="M 52 140 L 88 140 L 90 160 L 50 160 Z" fill={base} stroke={stroke} strokeWidth={sw}/>
        {/* Legs (quads) */}
        <path d="M 50 160 Q 46 200 50 240 L 66 240 Q 68 200 68 160 Z"
              fill={isSel('legs') ? '#facc15' : base} stroke={stroke} strokeWidth={sw}
              className={cls('legs')} onClick={() => handleClick('legs')}/>
        <path d="M 90 160 Q 94 200 90 240 L 74 240 Q 72 200 72 160 Z"
              fill={isSel('legs') ? '#facc15' : base} stroke={stroke} strokeWidth={sw}
              className={cls('legs')} onClick={() => handleClick('legs')}/>
        {/* Calves (lower legs) */}
        <path d="M 52 240 Q 50 270 54 290 L 66 290 Q 66 270 66 240 Z"
              fill={isSel('legs') ? '#facc15' : base} stroke={stroke} strokeWidth={sw}
              className={cls('legs')} onClick={() => handleClick('legs')}/>
        <path d="M 88 240 Q 90 270 86 290 L 74 290 Q 74 270 74 240 Z"
              fill={isSel('legs') ? '#facc15' : base} stroke={stroke} strokeWidth={sw}
              className={cls('legs')} onClick={() => handleClick('legs')}/>
      </svg>

      {/* BACK BODY */}
      <svg viewBox="0 0 140 300" className="h-full w-auto" style={{ maxHeight: '100%' }}>
        {/* Head back */}
        <ellipse cx="70" cy="22" rx="14" ry="17" fill={base} stroke={stroke} strokeWidth={sw}/>
        {/* Neck */}
        <rect x="63" y="38" width="14" height="10" fill={base} stroke={stroke} strokeWidth={sw}/>
        {/* Rear delts (shoulders back) */}
        <path d="M 40 52 Q 35 60 38 72 L 50 70 Q 54 58 55 52 Z"
              fill={isSel('shoulders') ? '#facc15' : base} stroke={stroke} strokeWidth={sw}
              className={cls('shoulders')} onClick={() => handleClick('shoulders')}/>
        <path d="M 100 52 Q 105 60 102 72 L 90 70 Q 86 58 85 52 Z"
              fill={isSel('shoulders') ? '#facc15' : base} stroke={stroke} strokeWidth={sw}
              className={cls('shoulders')} onClick={() => handleClick('shoulders')}/>
        {/* Trapezius */}
        <path d="M 55 48 L 85 48 L 82 72 L 58 72 Z"
              fill={isSel('trapezius') ? '#facc15' : base} stroke={stroke} strokeWidth={sw}
              className={cls('trapezius')} onClick={() => handleClick('trapezius')}/>
        {/* Triceps */}
        <path d="M 36 72 Q 28 90 30 110 L 42 108 Q 44 88 44 72 Z"
              fill={isSel('triceps') ? '#facc15' : base} stroke={stroke} strokeWidth={sw}
              className={cls('triceps')} onClick={() => handleClick('triceps')}/>
        <path d="M 104 72 Q 112 90 110 110 L 98 108 Q 96 88 96 72 Z"
              fill={isSel('triceps') ? '#facc15' : base} stroke={stroke} strokeWidth={sw}
              className={cls('triceps')} onClick={() => handleClick('triceps')}/>
        {/* Arms (forearms back) */}
        <path d="M 30 110 Q 26 130 28 148 L 40 146 Q 42 128 42 108 Z"
              fill={isSel('arms') ? '#facc15' : base} stroke={stroke} strokeWidth={sw}
              className={cls('arms')} onClick={() => handleClick('arms')}/>
        <path d="M 110 110 Q 114 130 112 148 L 100 146 Q 98 128 98 108 Z"
              fill={isSel('arms') ? '#facc15' : base} stroke={stroke} strokeWidth={sw}
              className={cls('arms')} onClick={() => handleClick('arms')}/>
        {/* Back (lats + mid) */}
        <path d="M 55 72 L 85 72 L 88 140 L 52 140 Z"
              fill={isSel('back') ? '#facc15' : base} stroke={stroke} strokeWidth={sw}
              className={cls('back')} onClick={() => handleClick('back')}/>
        {/* Glutes/hips */}
        <path d="M 52 140 L 88 140 L 90 165 L 50 165 Z" fill={base} stroke={stroke} strokeWidth={sw}/>
        {/* Hamstrings */}
        <path d="M 50 165 Q 46 205 50 240 L 66 240 Q 68 205 68 165 Z"
              fill={isSel('legs') ? '#facc15' : base} stroke={stroke} strokeWidth={sw}
              className={cls('legs')} onClick={() => handleClick('legs')}/>
        <path d="M 90 165 Q 94 205 90 240 L 74 240 Q 72 205 72 165 Z"
              fill={isSel('legs') ? '#facc15' : base} stroke={stroke} strokeWidth={sw}
              className={cls('legs')} onClick={() => handleClick('legs')}/>
        {/* Calves */}
        <path d="M 52 240 Q 50 270 54 290 L 66 290 Q 66 270 66 240 Z"
              fill={isSel('legs') ? '#facc15' : base} stroke={stroke} strokeWidth={sw}
              className={cls('legs')} onClick={() => handleClick('legs')}/>
        <path d="M 88 240 Q 90 270 86 290 L 74 290 Q 74 270 74 240 Z"
              fill={isSel('legs') ? '#facc15' : base} stroke={stroke} strokeWidth={sw}
              className={cls('legs')} onClick={() => handleClick('legs')}/>
      </svg>
    </div>
  );
};

// ========================================================================
// SHARED UI
// ========================================================================

const TopBar = ({ left, title, right, border = true }) => (
  <div className={`flex items-center justify-between px-4 py-4 ${border ? 'border-b border-zinc-900' : ''}`}>
    <div className="w-10 flex justify-start">{left}</div>
    <div className="font-display text-lg tracking-wider flex-1 text-center">{title}</div>
    <div className="w-10 flex justify-end">{right}</div>
  </div>
);

const IconBtn = ({ icon: Icon, onClick, className = '' }) => (
  <button onClick={onClick}
    className={`w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center tap-scale hover:bg-zinc-800 ${className}`}>
    <Icon className="w-4 h-4" strokeWidth={2} />
  </button>
);

const PrimaryBtn = ({ children, onClick, className = '', disabled = false }) => (
  <button onClick={onClick} disabled={disabled}
    className={`w-full py-4 rounded-2xl text-white font-display text-lg tracking-widest tap-scale ${disabled ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'} ${className}`}>
    {children}
  </button>
);

const TabBar = ({ active, onNav }) => {
  const tabs = [
    { id: 'home', label: 'WORKOUTS', icon: Dumbbell },
    { id: 'plans', label: 'PLANS', icon: CalendarDays },
  ];
  return (
    <div className="flex border-t border-zinc-900 bg-black">
      {tabs.map(t => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button key={t.id} onClick={() => onNav(t.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 tap-scale ${isActive ? 'text-yellow-400' : 'text-zinc-500'}`}>
            <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
            <span className="font-display text-[10px] tracking-widest">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
};

const Stepper = ({ value, onDec, onInc, unit, label }) => (
  <div className="flex-1 flex flex-col items-center gap-1">
    <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-display">{label}</div>
    <div className="flex items-center gap-2">
      <button onClick={onDec} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center tap-scale">
        <Minus className="w-3 h-3" />
      </button>
      <div className="text-white font-display text-xl tabular-nums min-w-12 text-center">
        {value}<span className="text-xs text-zinc-500 ml-0.5">{unit}</span>
      </div>
      <button onClick={onInc} className="w-8 h-8 rounded-full bg-yellow-400 text-black flex items-center justify-center tap-scale">
        <Plus className="w-3 h-3" strokeWidth={3}/>
      </button>
    </div>
  </div>
);

// ========================================================================
// SCREEN 1: HOME — workout listesi
// ========================================================================

const HomeScreen = ({ workouts, onNew, onOpen, onDelete, onDuplicate }) => {
  const [search, setSearch] = useState('');
  const filtered = workouts.filter(w => w.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full fade-in">
      <TopBar
        left={<IconBtn icon={Bell} onClick={() => {}} />}
        title="MY WORKOUTS"
        right={
          <button onClick={onNew} className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center tap-scale accent-glow">
            <Plus className="w-4 h-4" strokeWidth={2.5}/>
          </button>
        }
      />

      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 bg-zinc-900 rounded-xl px-3 py-2.5 border border-zinc-800">
          <Search className="w-4 h-4 text-zinc-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search workouts" className="bg-transparent outline-none flex-1 text-sm text-white placeholder-zinc-500"/>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none px-4 pt-4 pb-6">
        {workouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-40 h-40 opacity-40">
              <BodyMap selectedMuscles={[]} interactive={false} size="sm" />
            </div>
            <div className="font-display text-2xl mt-6 text-zinc-300">NO WORKOUTS YET</div>
            <p className="text-sm text-zinc-500 mt-2 max-w-xs">
              Tap the <span className="text-blue-400 font-bold">+</span> button to create your first workout
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((w, i) => {
              const muscles = [...new Set(w.exercises.map(e => e.muscle))];
              const totalSets = w.exercises.reduce((s, e) => s + e.sets.length, 0);
              const estMin = Math.max(1, Math.round(totalSets * 1.2));
              return (
                <div key={w.id} onClick={() => onOpen(w.id)}
                  className="card-bg rounded-2xl overflow-hidden tap-scale cursor-pointer">
                  <div className="relative h-44 flex items-center justify-center" style={{
                    background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)'
                  }}>
                    <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/80 rounded-lg border border-zinc-800">
                      <span className="font-display text-xs tracking-wider">{estMin} MIN</span>
                    </div>
                    <div className="absolute top-3 right-3 flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); onDuplicate(w.id); }}
                        title="Duplicate"
                        className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 tap-scale">
                        <Copy className="w-3.5 h-3.5 text-zinc-400"/>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onDelete(w.id); }}
                        className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 tap-scale">
                        <Trash2 className="w-3.5 h-3.5 text-zinc-400"/>
                      </button>
                    </div>
                    <div className="h-32 py-2">
                      <BodyMap selectedMuscles={muscles} interactive={false} size="sm" />
                    </div>
                  </div>
                  <div className="px-4 py-3 border-t border-zinc-900">
                    <div className="font-display text-xl tracking-wider">{w.name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {w.exercises.length} exercises · {totalSets} sets
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ========================================================================
// SCREEN 2: NAME WORKOUT — modal
// ========================================================================

const NameWorkoutScreen = ({ existingCount, onCancel, onCreate }) => {
  const [name, setName] = useState(`DAY ${existingCount + 1}`);

  return (
    <div className="flex flex-col h-full slide-up">
      <div className="flex items-center p-4">
        <IconBtn icon={X} onClick={onCancel} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 -mt-12">
        <div className="text-sm uppercase tracking-widest text-zinc-500 font-display mb-4">Name your workout</div>
        <input value={name} onChange={e => setName(e.target.value)} autoFocus
          className="bg-transparent text-blue-500 font-display text-5xl tracking-wider text-center w-full outline-none border-b border-zinc-800 pb-3"/>
        <div className="text-xs text-zinc-600 mt-4 text-center">
          Tip: use <span className="text-zinc-400">Day 1, Push Day,</span> or anything that works for you
        </div>
      </div>

      <div className="p-4">
        <PrimaryBtn onClick={() => name.trim() && onCreate(name.trim())} disabled={!name.trim()}>
          CREATE WORKOUT
        </PrimaryBtn>
      </div>
    </div>
  );
};

// ========================================================================
// SCREEN 3: WORKOUT DETAIL — egzersizler + add / edit sets
// ========================================================================

const summaryOfEx = (ex) => {
  if (!ex.sets.length) return 'No sets';
  const reps = ex.sets[0].reps, kg = ex.sets[0].kg;
  const allSame = ex.sets.every(s => s.reps === reps && s.kg === kg);
  return allSame ? `${ex.sets.length}×${reps} · ${kg}kg` : `${ex.sets.length} sets · varied`;
};

const SortableExerciseCard = ({ ex, onEdit, onRemove, onUpdateDates }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ex.instanceId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };
  const isDone = !!ex.completedDate;
  const isPlanned = !isDone && !!ex.plannedDate;
  const dateInputRef = useRef(null);
  const openDatePicker = (e) => {
    e.stopPropagation();
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      try { input.showPicker(); return; } catch (err) { /* fall through */ }
    }
    input.focus();
    input.click();
  };
  const onPickedDate = (value) => {
    if (!value) return;
    if (isDone) onUpdateDates(ex.instanceId, { completedDate: value });
    else onUpdateDates(ex.instanceId, { plannedDate: value, completedDate: null });
  };
  const markDone = (e) => {
    e.stopPropagation();
    onUpdateDates(ex.instanceId, { completedDate: todayISO(), plannedDate: null });
  };
  const clearAll = (e) => {
    e.stopPropagation();
    onUpdateDates(ex.instanceId, { completedDate: null, plannedDate: null });
  };
  const borderClass = isDone ? 'border-green-600/40' : isPlanned ? 'border-blue-600/40' : '';
  return (
    <div ref={setNodeRef} style={style}
      className={`card-bg rounded-xl p-3.5 ${borderClass}`}>
      <div onClick={() => onEdit(ex.instanceId)} className="flex items-center gap-3 tap-scale cursor-pointer">
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center border ${
          isDone ? 'bg-green-500/10 border-green-500/30'
          : isPlanned ? 'bg-blue-500/10 border-blue-500/30'
          : 'bg-yellow-400/10 border-yellow-400/20'
        }`}>
          <span className={`font-display text-xs tracking-wider ${
            isDone ? 'text-green-400' : isPlanned ? 'text-blue-400' : 'text-yellow-400'
          }`}>{ex.slotLabel}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-sm tracking-wider truncate">{ex.name}</div>
          <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1.5">
            <span className="tabular-nums">{summaryOfEx(ex)}</span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-500">{ex.sets[0]?.rest || 60}s rest</span>
          </div>
        </div>
        <button {...attributes} {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
          aria-label="Reorder">
          <GripVertical className="w-3.5 h-3.5 text-zinc-500"/>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onRemove(ex.instanceId); }}
          className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center tap-scale">
          <X className="w-3.5 h-3.5 text-zinc-500"/>
        </button>
      </div>
      <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center gap-2 flex-wrap">
        <input ref={dateInputRef} type="date" lang="en"
          value={(isDone ? ex.completedDate : ex.plannedDate) || ''}
          onChange={(e) => onPickedDate(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
          tabIndex={-1} aria-hidden="true"/>
        {isDone ? (
          <>
            <div className="flex-1 flex items-center gap-1.5 text-green-400 font-display text-xs tracking-wider">
              <Check className="w-3.5 h-3.5" strokeWidth={3}/>
              <span>DONE · {fmtDateShort(ex.completedDate)}</span>
            </div>
            <button onClick={openDatePicker}
              className="text-xs font-display tracking-wider text-zinc-500 hover:text-zinc-300 px-2 py-1 tap-scale">
              CHANGE
            </button>
            <button onClick={clearAll}
              className="text-xs font-display tracking-wider text-zinc-500 hover:text-red-400 px-2 py-1 tap-scale">
              UNDO
            </button>
          </>
        ) : isPlanned ? (
          <>
            <div className="flex-1 flex items-center gap-1.5 text-blue-400 font-display text-xs tracking-wider">
              <Calendar className="w-3.5 h-3.5"/>
              <span>PLANNED · {fmtDateShort(ex.plannedDate)}</span>
            </div>
            <button onClick={markDone}
              className="text-xs font-display tracking-wider text-zinc-500 hover:text-green-400 px-2 py-1 tap-scale">
              DONE
            </button>
            <button onClick={openDatePicker}
              className="text-xs font-display tracking-wider text-zinc-500 hover:text-zinc-300 px-2 py-1 tap-scale">
              CHANGE
            </button>
            <button onClick={clearAll}
              className="text-xs font-display tracking-wider text-zinc-500 hover:text-red-400 px-2 py-1 tap-scale">
              CLEAR
            </button>
          </>
        ) : (
          <>
            <button onClick={markDone}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-green-600/10 border border-green-600/30 text-green-400 font-display text-xs tracking-wider tap-scale hover:bg-green-600/20">
              <Check className="w-3.5 h-3.5" strokeWidth={3}/>
              MARK DONE
            </button>
            <button onClick={openDatePicker}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 font-display text-xs tracking-wider tap-scale hover:text-white">
              <Calendar className="w-3.5 h-3.5"/>
              PICK DATE
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const WorkoutDetailScreen = ({ workout, onBack, onDone, onAddExercise, onEditExercise, onRemoveExercise, onReorderExercises, onUpdateExerciseDates }) => {
  const numberedExercises = useMemo(() => {
    const counters = {};
    return workout.exercises.map(ex => {
      counters[ex.muscle] = (counters[ex.muscle] || 0) + 1;
      const lbl = MUSCLES.find(m => m.id === ex.muscle)?.label || ex.muscle;
      return { ...ex, slotLabel: `${lbl.charAt(0) + lbl.slice(1).toLowerCase()}${counters[ex.muscle]}` };
    });
  }, [workout.exercises]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = workout.exercises.findIndex(e => e.instanceId === active.id);
    const newIdx = workout.exercises.findIndex(e => e.instanceId === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    onReorderExercises(arrayMove(workout.exercises, oldIdx, newIdx));
  };

  return (
    <div className="flex flex-col h-full fade-in">
      <TopBar
        left={<IconBtn icon={ArrowLeft} onClick={onBack} />}
        title={workout.name}
        right={<button onClick={onDone} className="font-display text-sm tracking-widest text-blue-400 px-2 tap-scale">DONE</button>}
      />

      <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm tracking-widest text-zinc-400">EXERCISES</span>
          <span className="text-blue-400 font-display text-sm">{workout.exercises.length}</span>
        </div>
        <button onClick={onAddExercise}
          className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center tap-scale">
          <Plus className="w-4 h-4" strokeWidth={2.5}/>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none px-4 py-4">
        {workout.exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-40 h-40 opacity-30">
              <BodyMap selectedMuscles={[]} interactive={false} size="sm" />
            </div>
            <button onClick={onAddExercise}
              className="mt-8 flex items-center gap-2 text-blue-400 font-display text-lg tracking-widest tap-scale">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
                <Plus className="w-4 h-4" strokeWidth={3}/>
              </div>
              ADD EXERCISES
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={numberedExercises.map(e => e.instanceId)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2.5">
                  {numberedExercises.map(ex => (
                    <SortableExerciseCard key={ex.instanceId} ex={ex}
                      onEdit={onEditExercise} onRemove={onRemoveExercise}
                      onUpdateDates={onUpdateExerciseDates} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <button onClick={onAddExercise}
              className="w-full py-3.5 rounded-xl border border-dashed border-zinc-800 text-zinc-500 font-display text-sm tracking-widest tap-scale hover:border-blue-600 hover:text-blue-400">
              + ADD EXERCISE
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ========================================================================
// SCREEN 4: SELECT EXERCISES
// ========================================================================

const SelectExercisesScreen = ({ onClose, onAddExercise, onOpenMuscle, onOpenEquipment, filters, setFilters }) => {
  const [search, setSearch] = useState('');
  const [bodyweightOn, setBodyweightOn] = useState(filters.bodyweight);

  const filtered = useMemo(() => {
    const list = LIBRARY.filter(ex => {
      if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filters.muscles.length && !filters.muscles.includes(ex.muscle)) return false;
      if (filters.equipment.length && !filters.equipment.includes(ex.equipment)) return false;
      if (bodyweightOn && ex.equipment !== 'Free Weight') return false;
      return true;
    });
    if (filters.equipment.includes('Selectorised')) {
      return [...list].sort((a, b) => {
        const da = a.deviceNo ?? 9999, db = b.deviceNo ?? 9999;
        if (da !== db) return da - db;
        return a.name.localeCompare(b.name);
      });
    }
    if (bodyweightOn) {
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [search, filters, bodyweightOn]);

  const muscleLabel = filters.muscles.length === 0 ? 'Muscle Group' :
    filters.muscles.length === 1 ? (MUSCLES.find(m => m.id === filters.muscles[0])?.label || '') :
    `${filters.muscles.length} MUSCLES`;

  const equipLabel = filters.equipment.length === 0 ? 'Equipment' :
    filters.equipment.length === 1 ? filters.equipment[0] :
    `${filters.equipment.length} TYPES`;

  return (
    <div className="flex flex-col h-full slide-up">
      <TopBar
        left={<IconBtn icon={X} onClick={onClose} />}
        title="SELECT EXERCISES"
        right={null}
      />

      <div className="px-4 pt-3">
        <div className="flex items-center gap-2 bg-zinc-900 rounded-xl px-3 py-2.5 border border-zinc-800">
          <Search className="w-4 h-4 text-zinc-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search exercises" className="bg-transparent outline-none flex-1 text-sm text-white placeholder-zinc-500"/>
        </div>
      </div>

      <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-none">
        <button onClick={onOpenMuscle}
          className={`chip flex items-center gap-1.5 px-3 py-1.5 rounded-full border whitespace-nowrap text-xs font-display tracking-wider ${
            filters.muscles.length ? 'active' : 'border-zinc-800 text-zinc-300'
          }`}>
          {muscleLabel} <ChevronDown className="w-3 h-3"/>
        </button>
        <button onClick={onOpenEquipment}
          className={`chip flex items-center gap-1.5 px-3 py-1.5 rounded-full border whitespace-nowrap text-xs font-display tracking-wider ${
            filters.equipment.length ? 'active' : 'border-zinc-800 text-zinc-300'
          }`}>
          {equipLabel} <ChevronDown className="w-3 h-3"/>
        </button>
        <button onClick={() => { setBodyweightOn(!bodyweightOn); setFilters({ ...filters, bodyweight: !bodyweightOn }); }}
          className={`chip flex items-center gap-1.5 px-3 py-1.5 rounded-full border whitespace-nowrap text-xs font-display tracking-wider ${
            bodyweightOn ? 'active' : 'border-zinc-800 text-zinc-300'
          }`}>
          BODYWEIGHT
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none px-4 pb-4">
        <div className="text-xs uppercase tracking-widest text-zinc-500 font-display mb-2 pl-1">
          {filtered.length} EXERCISE{filtered.length !== 1 ? 'S' : ''}
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-sm">No matches found</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(ex => {
              const mLabel = MUSCLES.find(m => m.id === ex.muscle)?.label || '';
              return (
                <div key={ex.id} onClick={() => onAddExercise(ex)}
                  className="card-bg rounded-xl p-3 flex items-center gap-3 tap-scale cursor-pointer hover:border-blue-600">
                  <div className="w-11 h-11 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800">
                    {ex.deviceNo ? (
                      <span className="font-display text-yellow-400 text-sm tracking-wider">#{ex.deviceNo}</span>
                    ) : (
                      <span className="font-display text-zinc-500 text-[10px] tracking-wider">{ex.equipment === 'Bench' ? 'BNCH' : 'FREE'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-sm tracking-wider truncate">{ex.name}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1.5">
                      <span className="text-zinc-400">{mLabel}</span>
                      <span className="text-zinc-700">·</span>
                      <span>{ex.equipment}</span>
                      {ex.hasPosition && <><span className="text-zinc-700">·</span><span className="text-yellow-400/70">pos 1-6</span></>}
                      {ex.hasAngle && <><span className="text-zinc-700">·</span><span className="text-yellow-400/70">angle</span></>}
                      {ex.singleArm && <><span className="text-zinc-700">·</span><span className="text-yellow-400/70">1-arm</span></>}
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <Plus className="w-3.5 h-3.5" strokeWidth={3}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ========================================================================
// SCREEN 5: MUSCLE GROUP PICKER
// ========================================================================

const MuscleGroupPickerScreen = ({ selected, onClose, onApply }) => {
  const [local, setLocal] = useState(selected);
  const toggle = (m) => setLocal(local.includes(m) ? local.filter(x => x !== m) : [...local, m]);

  return (
    <div className="flex flex-col h-full slide-up">
      <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-900">
        <IconBtn icon={X} onClick={onClose} />
        <div className="font-display text-lg tracking-wider">MUSCLE GROUP</div>
        <button onClick={() => setLocal([])}
          className="font-display text-xs tracking-widest text-zinc-400 px-2 tap-scale">CLEAR</button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none">
        <div className="h-80 px-4 pt-4 pb-2 flex items-center justify-center">
          <BodyMap selectedMuscles={local} onToggle={toggle} />
        </div>

        <div className="px-4 pb-4">
          <div className="text-xs uppercase tracking-widest text-zinc-500 font-display mb-2 pl-1">
            OR SELECT FROM LIST
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MUSCLES.map(m => {
              const on = local.includes(m.id);
              return (
                <button key={m.id} onClick={() => toggle(m.id)}
                  className={`py-3 rounded-xl font-display text-xs tracking-wider tap-scale border ${
                    on ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-zinc-900 text-zinc-300 border-zinc-800'
                  }`}>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4">
        <button onClick={() => onApply(local)}
          className="w-full py-4 rounded-2xl bg-white text-black font-display text-lg tracking-widest tap-scale">
          APPLY {local.length > 0 && `(${local.length})`}
        </button>
      </div>
    </div>
  );
};

// ========================================================================
// SCREEN 6: EQUIPMENT PICKER
// ========================================================================

const EquipmentPickerScreen = ({ selected, onClose, onApply }) => {
  const [local, setLocal] = useState(selected);
  const [expanded, setExpanded] = useState(null);
  const toggle = (e) => setLocal(local.includes(e) ? local.filter(x => x !== e) : [...local, e]);

  const countByType = EQUIPMENT_TYPES.reduce((acc, t) => {
    acc[t] = LIBRARY.filter(ex => ex.equipment === t).length;
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full slide-up">
      <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-900">
        <IconBtn icon={X} onClick={onClose} />
        <div className="font-display text-lg tracking-wider">EQUIPMENT</div>
        <button onClick={() => setLocal([])}
          className="font-display text-xs tracking-widest text-zinc-400 px-2 tap-scale">CLEAR</button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none px-4 py-4 space-y-2.5">
        {EQUIPMENT_TYPES.map(type => {
          const on = local.includes(type);
          const isOpen = expanded === type;
          const machines = LIBRARY.filter(ex => ex.equipment === type && ex.deviceNo)
            .reduce((acc, ex) => {
              if (!acc.find(x => x.deviceNo === ex.deviceNo)) acc.push(ex);
              return acc;
            }, []).sort((a, b) => (a.deviceNo || 0) - (b.deviceNo || 0));

          return (
            <div key={type} className="card-bg rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <button onClick={() => toggle(type)} className="flex-1 flex items-center gap-3 text-left tap-scale">
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                    on ? 'bg-yellow-400 border-yellow-400' : 'border-zinc-600'
                  }`}>
                    {on && <Check className="w-3 h-3 text-black" strokeWidth={3}/>}
                  </div>
                  <div>
                    <div className="font-display text-base tracking-wider">{type.toUpperCase()}</div>
                    <div className="text-xs text-zinc-500">{countByType[type]} exercises</div>
                  </div>
                </button>
                {type === 'Selectorised' && machines.length > 0 && (
                  <button onClick={() => setExpanded(isOpen ? null : type)} className="tap-scale p-1">
                    <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
                  </button>
                )}
              </div>
              {isOpen && type === 'Selectorised' && (
                <div className="px-4 pb-4 border-t border-zinc-900 pt-3">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-display mb-2">Machines by device no.</div>
                  <div className="flex flex-wrap gap-1.5">
                    {machines.map(m => (
                      <div key={m.deviceNo} className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-display tracking-wider text-yellow-400">
                        #{m.deviceNo}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-4">
        <button onClick={() => onApply(local)}
          className="w-full py-4 rounded-2xl bg-white text-black font-display text-lg tracking-widest tap-scale">
          APPLY {local.length > 0 && `(${local.length})`}
        </button>
      </div>
    </div>
  );
};

// ========================================================================
// SCREEN 7: SET EDITOR
// ========================================================================

const SetEditorScreen = ({ exercise, onClose, onSave, onDelete }) => {
  const [sets, setSets] = useState(exercise.sets.length ? exercise.sets : [{ reps: 10, kg: 20, rest: 60 }]);
  const [position, setPosition] = useState(exercise.position || 1);
  const [angle, setAngle] = useState(exercise.angle || 45);

  const updateSet = (i, key, delta) => {
    const ns = [...sets];
    ns[i] = { ...ns[i], [key]: Math.max(0, ns[i][key] + delta) };
    setSets(ns);
  };

  const addSet = () => {
    const last = sets[sets.length - 1] || { reps: 10, kg: 20, rest: 60 };
    setSets([...sets, { ...last }]);
  };

  const removeSet = (i) => {
    if (sets.length > 1) setSets(sets.filter((_, idx) => idx !== i));
  };

  return (
    <div className="flex flex-col h-full slide-up">
      <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-900">
        <IconBtn icon={X} onClick={onClose} />
        <div className="flex-1 text-center px-2">
          <div className="font-display text-sm tracking-wider truncate">{exercise.name}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
            {MUSCLES.find(m => m.id === exercise.muscle)?.label} · {exercise.equipment}
            {exercise.deviceNo && ` · Device #${exercise.deviceNo}`}
          </div>
        </div>
        <button onClick={onDelete} className="text-red-500 tap-scale">
          <Trash2 className="w-4 h-4"/>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none px-4 py-4">
        {/* Video placeholder */}
        <div className="aspect-video rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{
            background: 'repeating-linear-gradient(45deg, #facc15 0, #facc15 1px, transparent 1px, transparent 12px)'
          }}/>
          <div className="flex flex-col items-center gap-2 z-10">
            <div className="w-14 h-14 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center">
              <Play className="w-5 h-5 text-yellow-400 ml-0.5" fill="currentColor"/>
            </div>
            <div className="text-xs text-zinc-500 font-display tracking-widest">VIDEO COMING SOON</div>
          </div>
        </div>

        {/* Variants */}
        {(exercise.hasPosition || exercise.hasAngle) && (
          <div className="mb-5 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-display mb-2">VARIANT</div>
            {exercise.hasPosition && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-zinc-400 font-display tracking-wider w-16">POSITION</span>
                <div className="flex gap-1">
                  {[1,2,3,4,5,6].map(p => (
                    <button key={p} onClick={() => setPosition(p)}
                      className={`w-8 h-8 rounded-lg font-display text-sm tap-scale border ${
                        position === p ? 'bg-yellow-400 text-black border-yellow-400' : 'border-zinc-700 text-zinc-400'
                      }`}>{p}</button>
                  ))}
                </div>
              </div>
            )}
            {exercise.hasAngle && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 font-display tracking-wider w-16">ANGLE</span>
                <div className="flex gap-1 flex-wrap">
                  {[30, 45, 60, 75, 90].map(a => (
                    <button key={a} onClick={() => setAngle(a)}
                      className={`px-3 h-8 rounded-lg font-display text-sm tap-scale border ${
                        angle === a ? 'bg-yellow-400 text-black border-yellow-400' : 'border-zinc-700 text-zinc-400'
                      }`}>{a}°</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sets */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="font-display text-sm tracking-widest">SETS</span>
          <span className="text-xs text-zinc-500">{sets.length} total</span>
        </div>

        <div className="space-y-2">
          {sets.map((s, i) => (
            <div key={i} className="card-bg rounded-xl p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-yellow-400 text-black font-display text-xs flex items-center justify-center">
                    {i + 1}
                  </div>
                  <span className="font-display text-sm tracking-wider text-zinc-400">SET {i + 1}</span>
                </div>
                {sets.length > 1 && (
                  <button onClick={() => removeSet(i)} className="text-zinc-600 hover:text-red-500 tap-scale">
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                )}
              </div>
              <div className="flex gap-2 items-end">
                <Stepper label="REPS" value={s.reps} unit=""
                  onDec={() => updateSet(i, 'reps', -1)} onInc={() => updateSet(i, 'reps', 1)} />
                <div className="w-px h-10 bg-zinc-800"/>
                <Stepper label="WEIGHT" value={s.kg} unit="kg"
                  onDec={() => updateSet(i, 'kg', -2.5)} onInc={() => updateSet(i, 'kg', 2.5)} />
                <div className="w-px h-10 bg-zinc-800"/>
                <Stepper label="REST" value={s.rest} unit="s"
                  onDec={() => updateSet(i, 'rest', -15)} onInc={() => updateSet(i, 'rest', 15)} />
              </div>
            </div>
          ))}

          <button onClick={addSet}
            className="w-full py-3 rounded-xl border border-dashed border-zinc-800 text-zinc-500 font-display text-xs tracking-widest tap-scale hover:border-yellow-400 hover:text-yellow-400">
            + ADD SET
          </button>
        </div>

        <div className="mt-4 p-3 rounded-xl bg-blue-600/5 border border-blue-600/20">
          <div className="text-[10px] uppercase tracking-widest text-blue-400/80 font-display mb-1">COMING SOON</div>
          <div className="text-xs text-zinc-400">Last performance tracking — "Last time: 42.5kg × 10" will appear here once you start logging</div>
        </div>
      </div>

      <div className="p-4 border-t border-zinc-900">
        <PrimaryBtn onClick={() => onSave({ sets, position, angle })}>SAVE EXERCISE</PrimaryBtn>
      </div>
    </div>
  );
};

// ========================================================================
// SCREEN 7: PLANS — week plan list
// ========================================================================

const PlansScreen = ({ weekPlans, workoutCount, onNew, onOpen, onDelete, onGoWorkouts }) => {
  const summaryOfPlan = (p) => {
    const done = p.slots.filter(s => s.completedDate).length;
    const total = p.slots.length;
    return { done, total };
  };

  const fmtDate = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="flex flex-col h-full fade-in">
      <TopBar
        left={<IconBtn icon={Bell} onClick={() => {}} />}
        title="MY PLANS"
        right={
          <button onClick={onNew} className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center tap-scale accent-glow">
            <Plus className="w-4 h-4" strokeWidth={2.5}/>
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto scrollbar-none px-4 pt-4 pb-6">
        {weekPlans.length === 0 ? (
          workoutCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-28 h-28 rounded-full bg-zinc-900/50 border border-zinc-800 flex items-center justify-center opacity-60">
                <Dumbbell className="w-12 h-12 text-zinc-600" strokeWidth={1.5} />
              </div>
              <div className="font-display text-2xl mt-6 text-zinc-300">CREATE A WORKOUT FIRST</div>
              <p className="text-sm text-zinc-500 mt-2 max-w-xs">
                Plans are built from your workout templates. Head over to the WORKOUTS tab and create at least one.
              </p>
              <button onClick={onGoWorkouts}
                className="mt-6 px-4 py-2 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 font-display text-sm tracking-widest tap-scale">
                GO TO WORKOUTS
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-28 h-28 rounded-full bg-zinc-900/50 border border-zinc-800 flex items-center justify-center opacity-60">
                <CalendarDays className="w-12 h-12 text-zinc-600" strokeWidth={1.5} />
              </div>
              <div className="font-display text-2xl mt-6 text-zinc-300">NO PLANS YET</div>
              <p className="text-sm text-zinc-500 mt-2 max-w-xs">
                Tap the <span className="text-blue-400 font-bold">+</span> button to create your first weekly plan
              </p>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {weekPlans.map(p => {
              const { done, total } = summaryOfPlan(p);
              const dates = p.slots
                .map(s => s.completedDate)
                .filter(Boolean)
                .map(fmtDate);
              return (
                <div key={p.id} onClick={() => onOpen(p.id)}
                  className="card-bg rounded-2xl p-4 tap-scale cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-xl tracking-wider">{p.name}</div>
                      <div className="text-xs text-zinc-500 mt-1 tabular-nums">
                        {total === 0 ? 'No slots yet' : `${done}/${total} done`}
                        {dates.length > 0 && <span className="text-zinc-600"> · {dates.join(', ')}</span>}
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
                      className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 tap-scale shrink-0">
                      <Trash2 className="w-3.5 h-3.5 text-zinc-400"/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ========================================================================
// SCREEN 8: NAME WEEK PLAN — modal
// ========================================================================

const NameWeekPlanScreen = ({ existingCount, onCancel, onCreate }) => {
  const [name, setName] = useState(`Week ${existingCount + 1}`);

  return (
    <div className="flex flex-col h-full fade-in">
      <TopBar
        left={<IconBtn icon={X} onClick={onCancel} />}
        title=""
        right={null}
        border={false}
      />
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <CalendarDays className="w-16 h-16 text-yellow-400 mb-4" strokeWidth={1.5}/>
        <div className="text-sm text-zinc-500 font-display tracking-widest mb-4">NAME YOUR PLAN</div>
        <input autoFocus value={name} onChange={e => setName(e.target.value)}
          className="w-full text-center bg-transparent outline-none font-display text-3xl tracking-wider border-b border-zinc-800 pb-2 focus:border-yellow-400"/>
        <p className="text-xs text-zinc-600 mt-3">e.g. "Week 1", "Cut Week", "Heavy Week"</p>
      </div>
      <div className="p-4">
        <PrimaryBtn onClick={() => name.trim() && onCreate(name.trim())} disabled={!name.trim()}>
          CREATE PLAN
        </PrimaryBtn>
      </div>
    </div>
  );
};

// ========================================================================
// SCREEN 9: WEEK DETAIL — slots + date actions
// ========================================================================

const fmtDateShort = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const SlotCard = ({ slot, slotIndex, workout, onRemove, onAssignWorkout, onSetPlannedDate, onMarkDone, onClearStatus, onOpenWorkout }) => {
  const [editingDate, setEditingDate] = useState(false);

  if (!workout) {
    return (
      <div className="card-bg rounded-xl p-3.5 border-dashed border-zinc-800">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 shrink-0">
              <span className="font-display text-zinc-500 text-xs">{slotIndex}</span>
            </div>
            <div className="text-zinc-500 text-sm italic truncate">Workout deleted</div>
          </div>
          <button onClick={onRemove}
            className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center tap-scale shrink-0">
            <X className="w-3.5 h-3.5 text-zinc-500"/>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-bg rounded-xl p-3.5">
      <button onClick={onOpenWorkout}
        className="flex items-center gap-3 w-full text-left tap-scale">
        <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
          <span className="font-display text-blue-400 text-xs">{slotIndex}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-sm tracking-wider truncate">{workout.name}</div>
          <div className="text-xs text-zinc-500 mt-0.5">
            {workout.exercises.length} exercises
          </div>
        </div>
        <span onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center tap-scale shrink-0">
          <X className="w-3.5 h-3.5 text-zinc-500"/>
        </span>
      </button>

      <div className="mt-3 pt-3 border-t border-zinc-900">
        {slot.completedDate ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-green-400">
              <CalendarCheck className="w-4 h-4"/>
              <span className="text-xs font-display tracking-wider">DONE · {fmtDateShort(slot.completedDate)}</span>
            </div>
            <button onClick={onClearStatus}
              className="text-[10px] text-zinc-500 tracking-wider font-display tap-scale hover:text-zinc-300">UNDO</button>
          </div>
        ) : slot.plannedDate ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-yellow-400">
              <Calendar className="w-4 h-4"/>
              <span className="text-xs font-display tracking-wider">PLANNED · {fmtDateShort(slot.plannedDate)}</span>
            </div>
            <div className="flex gap-1.5">
              <button onClick={onMarkDone}
                className="px-2.5 py-1 rounded-md bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-display tracking-wider tap-scale">
                MARK DONE
              </button>
              <button onClick={onClearStatus}
                className="text-[10px] text-zinc-500 tracking-wider font-display tap-scale hover:text-zinc-300 px-1.5">CLEAR</button>
            </div>
          </div>
        ) : editingDate ? (
          <div className="flex items-center gap-2">
            <input type="date" autoFocus
              onChange={(e) => { if (e.target.value) { onSetPlannedDate(e.target.value); setEditingDate(false); } }}
              className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-xs text-white outline-none focus:border-yellow-400 flex-1"/>
            <button onClick={() => setEditingDate(false)}
              className="text-[10px] text-zinc-500 tracking-wider font-display tap-scale px-1.5">CANCEL</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => setEditingDate(true)}
              className="flex-1 px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-display tracking-wider tap-scale flex items-center justify-center gap-1.5">
              <Calendar className="w-3.5 h-3.5"/> SET DATE
            </button>
            <button onClick={onMarkDone}
              className="flex-1 px-2.5 py-1.5 rounded-md bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-display tracking-wider tap-scale flex items-center justify-center gap-1.5">
              <Check className="w-3.5 h-3.5"/> DONE TODAY
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const WorkoutPickerModal = ({ workouts, onPick, onClose }) => (
  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-20 flex items-end slide-up">
    <div className="w-full bg-zinc-950 border-t border-zinc-800 rounded-t-2xl max-h-[85%] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900">
        <div className="font-display tracking-wider text-sm">PICK A WORKOUT</div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center tap-scale">
          <X className="w-4 h-4 text-zinc-400"/>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-none p-3">
        {workouts.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-sm">
            No workouts yet. Create one from the WORKOUTS tab first.
          </div>
        ) : (
          <div className="space-y-3">
            {workouts.map(w => {
              const muscles = [...new Set(w.exercises.map(e => e.muscle))];
              const totalSets = w.exercises.reduce((s, e) => s + e.sets.length, 0);
              const estMin = Math.max(1, Math.round(totalSets * 1.2));
              return (
                <button key={w.id} onClick={() => onPick(w.id)}
                  className="w-full card-bg rounded-2xl overflow-hidden tap-scale text-left">
                  <div className="relative h-36 flex items-center justify-center" style={{
                    background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)'
                  }}>
                    <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/80 rounded-lg border border-zinc-800">
                      <span className="font-display text-xs tracking-wider">{estMin} MIN</span>
                    </div>
                    <div className="h-28 py-2">
                      <BodyMap selectedMuscles={muscles} interactive={false} size="sm" />
                    </div>
                  </div>
                  <div className="px-4 py-2.5 border-t border-zinc-900 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-display text-lg tracking-wider truncate">{w.name}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {w.exercises.length} exercises · {totalSets} sets
                      </div>
                    </div>
                    <Plus className="w-5 h-5 text-blue-400 shrink-0" strokeWidth={2.5}/>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </div>
);

const WeekDetailScreen = ({ plan, workouts, weekCount, onBack, onAddSlot, onRemoveSlot, onUpdateSlot, onOpenWorkout, onCopyToNext }) => {
  const [picking, setPicking] = useState(false);
  const findWorkout = (id) => workouts.find(w => w.id === id);

  return (
    <div className="flex flex-col h-full fade-in relative">
      <TopBar
        left={<IconBtn icon={ArrowLeft} onClick={onBack} />}
        title={plan.name}
        right={null}
      />

      <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm tracking-widest text-zinc-400">SLOTS</span>
          <span className="text-blue-400 font-display text-sm">{plan.slots.length}</span>
        </div>
        <button onClick={() => setPicking(true)}
          className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center tap-scale">
          <Plus className="w-4 h-4" strokeWidth={2.5}/>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none px-4 py-4">
        {plan.slots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarDays className="w-20 h-20 text-zinc-700" strokeWidth={1.2}/>
            <button onClick={() => setPicking(true)}
              className="mt-6 flex items-center gap-2 text-blue-400 font-display text-lg tracking-widest tap-scale">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
                <Plus className="w-4 h-4" strokeWidth={3}/>
              </div>
              ADD FIRST SLOT
            </button>
            <p className="text-xs text-zinc-600 mt-3 max-w-xs">
              Add slots from your workout templates. Dates are optional.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {plan.slots.map((slot, i) => (
              <SlotCard key={slot.slotId} slot={slot} slotIndex={i + 1}
                workout={findWorkout(slot.workoutId)}
                onRemove={() => onRemoveSlot(slot.slotId)}
                onAssignWorkout={(id) => onUpdateSlot(slot.slotId, { workoutId: id })}
                onSetPlannedDate={(date) => onUpdateSlot(slot.slotId, { plannedDate: date, completedDate: null })}
                onMarkDone={() => onUpdateSlot(slot.slotId, { completedDate: todayISO(), plannedDate: null })}
                onClearStatus={() => onUpdateSlot(slot.slotId, { plannedDate: null, completedDate: null })}
                onOpenWorkout={() => onOpenWorkout(slot.workoutId)}
              />
            ))}
            <button onClick={() => setPicking(true)}
              className="w-full py-3.5 rounded-xl border border-dashed border-zinc-800 text-zinc-500 font-display text-sm tracking-widest tap-scale hover:border-blue-600 hover:text-blue-400">
              + ADD SLOT
            </button>
          </div>
        )}
      </div>

      {plan.slots.length > 0 && (
        <div className="p-4 border-t border-zinc-900">
          <button onClick={onCopyToNext}
            className="w-full py-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 text-zinc-300 font-display text-sm tracking-widest tap-scale hover:bg-zinc-800 flex items-center justify-center gap-2">
            <Copy className="w-4 h-4" /> COPY TO WEEK {weekCount + 1}
          </button>
        </div>
      )}

      {picking && (
        <WorkoutPickerModal workouts={workouts}
          onPick={(id) => { onAddSlot(id); setPicking(false); }}
          onClose={() => setPicking(false)} />
      )}
    </div>
  );
};

// ========================================================================
// MAIN APP — state + routing
// ========================================================================

function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}

export default function App() {
  const [workouts, setWorkouts] = useLocalStorage('fitness.workouts.v1', []);
  const [weekPlans, setWeekPlans] = useLocalStorage('fitness.weekPlans.v1', []);
  const [screen, setScreen] = useState('home');
  const [history, setHistory] = useState([]); // for back navigation
  const [currentWorkoutId, setCurrentWorkoutId] = useState(null);
  const [currentExerciseInstanceId, setCurrentExerciseInstanceId] = useState(null);
  const [currentWeekPlanId, setCurrentWeekPlanId] = useState(null);
  const [filters, setFilters] = useState({ muscles: [], equipment: [], bodyweight: false });

  const currentWorkout = workouts.find(w => w.id === currentWorkoutId);
  const currentExercise = currentWorkout?.exercises.find(e => e.instanceId === currentExerciseInstanceId);
  const currentWeekPlan = weekPlans.find(p => p.id === currentWeekPlanId);

  const nav = (s) => { setHistory([...history, screen]); setScreen(s); };
  const back = () => {
    const prev = history[history.length - 1] || 'home';
    setHistory(history.slice(0, -1));
    setScreen(prev);
  };

  // --- Actions ---
  const openWorkoutFromSlot = (id) => {
    setCurrentWorkoutId(id);
    nav('workoutDetail');
  };

  const createWorkout = (name) => {
    const w = { id: crypto.randomUUID(), name, exercises: [] };
    setWorkouts([...workouts, w]);
    setCurrentWorkoutId(w.id);
    setHistory([]);
    setScreen('workoutDetail');
  };

  const openWorkout = (id) => {
    setCurrentWorkoutId(id);
    setHistory([]);
    setScreen('workoutDetail');
  };

  const deleteWorkout = (id) => {
    if (window.confirm('Delete this workout?')) setWorkouts(workouts.filter(w => w.id !== id));
  };

  const duplicateWorkout = (id) => {
    const src = workouts.find(w => w.id === id);
    if (!src) return;
    const dayPrefixMatch = /^DAY\s+\d+$/i.test(src.name.trim());
    const nextName = dayPrefixMatch
      ? `DAY ${workouts.length + 1}`
      : `${src.name} (COPY)`;
    const copy = {
      id: crypto.randomUUID(),
      name: nextName,
      exercises: src.exercises.map(ex => ({
        ...ex,
        instanceId: crypto.randomUUID(),
        sets: ex.sets.map(s => ({ ...s })),
      })),
    };
    setWorkouts([...workouts, copy]);
  };

  const addExerciseToWorkout = (ex) => {
    const instance = {
      ...ex,
      instanceId: crypto.randomUUID(),
      sets: [{ reps: 10, kg: 20, rest: 60 }, { reps: 10, kg: 20, rest: 60 }, { reps: 10, kg: 20, rest: 60 }],
    };
    setWorkouts(workouts.map(w => w.id === currentWorkoutId
      ? { ...w, exercises: [...w.exercises, instance] }
      : w));
    setCurrentExerciseInstanceId(instance.instanceId);
    setScreen('setEditor');
  };

  const saveExerciseEdit = ({ sets, position, angle }) => {
    setWorkouts(workouts.map(w => w.id === currentWorkoutId
      ? { ...w, exercises: w.exercises.map(e => e.instanceId === currentExerciseInstanceId
          ? { ...e, sets, position, angle } : e) }
      : w));
    back();
  };

  const removeExerciseFromWorkout = (instanceId) => {
    setWorkouts(workouts.map(w => w.id === currentWorkoutId
      ? { ...w, exercises: w.exercises.filter(e => e.instanceId !== instanceId) }
      : w));
  };

  const reorderExercises = (newExercises) => {
    setWorkouts(workouts.map(w => w.id === currentWorkoutId
      ? { ...w, exercises: newExercises.map(({ slotLabel, ...rest }) => rest) }
      : w));
  };

  const updateExerciseDates = (instanceId, updates) => {
    setWorkouts(workouts.map(w => w.id === currentWorkoutId
      ? { ...w, exercises: w.exercises.map(e => e.instanceId === instanceId ? { ...e, ...updates } : e) }
      : w));
  };

  // --- Week Plan actions ---
  const createWeekPlan = (name) => {
    const p = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString(), slots: [] };
    setWeekPlans([...weekPlans, p]);
    setCurrentWeekPlanId(p.id);
    setHistory([]);
    setScreen('weekDetail');
  };

  const openWeekPlan = (id) => {
    setCurrentWeekPlanId(id);
    setHistory([]);
    setScreen('weekDetail');
  };

  const deleteWeekPlan = (id) => {
    if (window.confirm('Delete this week plan?')) setWeekPlans(weekPlans.filter(p => p.id !== id));
  };

  const updateWeekPlan = (updater) => {
    setWeekPlans(weekPlans.map(p => p.id === currentWeekPlanId ? updater(p) : p));
  };

  const addSlot = (workoutId) => {
    updateWeekPlan(p => ({
      ...p,
      slots: [...p.slots, { slotId: crypto.randomUUID(), workoutId, plannedDate: null, completedDate: null }],
    }));
  };

  const updateSlot = (slotId, patch) => {
    updateWeekPlan(p => ({
      ...p,
      slots: p.slots.map(s => s.slotId === slotId ? { ...s, ...patch } : s),
    }));
  };

  const removeSlot = (slotId) => {
    updateWeekPlan(p => ({ ...p, slots: p.slots.filter(s => s.slotId !== slotId) }));
  };

  const copyWeekToNext = () => {
    if (!currentWeekPlan) return;
    const n = weekPlans.length + 1;
    const copy = {
      id: crypto.randomUUID(),
      name: `Week ${n}`,
      createdAt: new Date().toISOString(),
      slots: currentWeekPlan.slots.map(s => ({
        slotId: crypto.randomUUID(),
        workoutId: s.workoutId,
        plannedDate: null,
        completedDate: null,
      })),
    };
    setWeekPlans([...weekPlans, copy]);
    setCurrentWeekPlanId(copy.id);
  };

  const switchTab = (tab) => {
    setHistory([]);
    setScreen(tab);
  };

  const showTabBar = screen === 'home' || screen === 'plans';

  // --- Render ---
  return (
    <>
      <Styles />
      <div className="min-h-screen app-bg font-body text-white flex items-center justify-center p-0 md:p-6">
        <div className="w-full md:max-w-sm md:rounded-[2.5rem] md:border md:border-zinc-800 md:shadow-2xl overflow-hidden relative"
             style={{ height: '100dvh', maxHeight: '100dvh' }}>
          <div className="h-full flex flex-col bg-black">
            <div className="flex-1 min-h-0 overflow-hidden">
              {screen === 'home' && (
                <HomeScreen workouts={workouts}
                  onNew={() => nav('nameWorkout')}
                  onOpen={openWorkout}
                  onDelete={deleteWorkout}
                  onDuplicate={duplicateWorkout} />
              )}
              {screen === 'nameWorkout' && (
                <NameWorkoutScreen existingCount={workouts.length}
                  onCancel={() => setScreen('home')}
                  onCreate={createWorkout} />
              )}
              {screen === 'workoutDetail' && currentWorkout && (
                <WorkoutDetailScreen workout={currentWorkout}
                  onBack={back}
                  onDone={back}
                  onAddExercise={() => { setFilters({ muscles: [], equipment: [], bodyweight: false }); nav('selectExercises'); }}
                  onEditExercise={(id) => { setCurrentExerciseInstanceId(id); nav('setEditor'); }}
                  onRemoveExercise={removeExerciseFromWorkout}
                  onReorderExercises={reorderExercises}
                  onUpdateExerciseDates={updateExerciseDates} />
              )}
              {screen === 'selectExercises' && (
                <SelectExercisesScreen
                  filters={filters}
                  setFilters={setFilters}
                  onClose={back}
                  onAddExercise={addExerciseToWorkout}
                  onOpenMuscle={() => nav('muscleGroupPicker')}
                  onOpenEquipment={() => nav('equipmentPicker')} />
              )}
              {screen === 'muscleGroupPicker' && (
                <MuscleGroupPickerScreen selected={filters.muscles}
                  onClose={back}
                  onApply={(m) => { setFilters({ ...filters, muscles: m }); back(); }} />
              )}
              {screen === 'equipmentPicker' && (
                <EquipmentPickerScreen selected={filters.equipment}
                  onClose={back}
                  onApply={(e) => { setFilters({ ...filters, equipment: e }); back(); }} />
              )}
              {screen === 'setEditor' && currentExercise && (
                <SetEditorScreen exercise={currentExercise}
                  onClose={back}
                  onSave={saveExerciseEdit}
                  onDelete={() => {
                    removeExerciseFromWorkout(currentExerciseInstanceId);
                    back();
                  }} />
              )}
              {screen === 'plans' && (
                <PlansScreen weekPlans={weekPlans}
                  workoutCount={workouts.length}
                  onNew={() => nav('nameWeekPlan')}
                  onOpen={openWeekPlan}
                  onDelete={deleteWeekPlan}
                  onGoWorkouts={() => switchTab('home')} />
              )}
              {screen === 'nameWeekPlan' && (
                <NameWeekPlanScreen existingCount={weekPlans.length}
                  onCancel={() => setScreen('plans')}
                  onCreate={createWeekPlan} />
              )}
              {screen === 'weekDetail' && currentWeekPlan && (
                <WeekDetailScreen plan={currentWeekPlan}
                  workouts={workouts}
                  weekCount={weekPlans.length}
                  onBack={() => setScreen('plans')}
                  onAddSlot={addSlot}
                  onRemoveSlot={removeSlot}
                  onUpdateSlot={updateSlot}
                  onOpenWorkout={openWorkoutFromSlot}
                  onCopyToNext={copyWeekToNext} />
              )}
            </div>
            {showTabBar && <TabBar active={screen} onNav={switchTab} />}
          </div>
        </div>
      </div>
    </>
  );
}
