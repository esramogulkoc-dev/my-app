# Fitness Tracker App — Project Specification

> **Handoff-ready project document** for Claude Code, Lovable, Claude Design, or any development continuation. Contains complete architecture, data model, screen specs, 82-exercise library, design system, and implementation guidance.

**Status:** V1 Interactive Prototype complete (React JSX artifact).
**Next step:** Rebuild as production app with persistence, or iterate on UX before stack commitment.

---

## 1. Project Overview

### 1.1 Purpose
Replace a paper/Excel-based personal workout tracker with a mobile-first app. The user currently tracks ~82 gym exercises across 9 muscle groups on paper, organizing them into daily workouts (e.g. "Day 1 = Chest1 + Chest2 + Leg1 + Leg2..."). The app digitizes this flow, adds structure, enables progressive overload tracking over weeks.

### 1.2 User
**Single user, personal use (MVP).** Gym-goe.Plans own workouts, knows lifting terminology, wants simple input flow at the gym (phone in hand between sets).

Not a community app. Not multi-user. Not a coach tool. If this changes later, data model supports scoping, but V1 assumes one user.

### 1.3 Design Inspiration
**Specifically the "Create & Save Your Own Workouts" flow. We use the *flow* and *aesthetic direction* (dark theme, muscle map, filters, set editor). The target app has its own name, colors, and personality.

Key differences from ultimate version:
- No QR-code / equipment-login features
- No AI Precision Program / Wellness Magazine / Outdoor training
- **Custom day structure**: Days (Day 1, Day 2...) with auto-numbered exercise slots per muscle (Chest1, Chest2, Leg1...)
- **Progressive overload tracking** across weekly copies (V2)

### 1.4 Platform
**Mobile-first PWA.** User confirmed "telefon only" for MVP. Priority is smartphone experience (portrait, ~380–430px width). Should be installable on home screen. Offline-capable would be huge (gyms have bad signal) but V1 can be online-only.

Tech recommendation: **React (Vite or Next.js PWA)** for web target, or **React Native** if native feel is required. Prototype is React JSX with Tailwind.

---

## 2. Core Architecture

### 2.1 The 3-Layer Mental Model

This took several iterations to land on — the final model is:

```
┌──────────────────────────────────────────────────────────┐
│ LAYER 1 — EXERCISE LIBRARY                               │
│ 82 exercises (static reference, user-defined once)       │
│ Each has: muscle group, equipment type, device#, variants│
└──────────────────────────────────────────────────────────┘
                         ↓ user picks from library
┌──────────────────────────────────────────────────────────┐
│ LAYER 2 — WORKOUTS / DAYS                                │
│ Named containers (Day 1, Day 2, "Push Day"...)           │
│ Contain ExerciseInstances with their own sets/reps/kg    │
│ Auto-numbered slots per muscle (Chest1, Chest2, Leg1...) │
└──────────────────────────────────────────────────────────┘
                         ↓ (V2) copy into weeks
┌──────────────────────────────────────────────────────────┐
│ LAYER 3 — WEEKLY PLANS (V2, not in V1)                   │
│ Week copies of days with independent logs                │
│ Shows "last performance" for progressive overload        │
└──────────────────────────────────────────────────────────┘
```

### 2.2 Why This Model Works

- **Library is the source of truth for exercise metadata** (name, device number, equipment) — change once, reflected everywhere.
- **Days are the user's creative unit** — each workout has its own copy of exercises with *day-specific* set/rep/weight values. Editing weights in Day 1 does not affect Day 3 even if they share the same exercise.
- **Week plans (V2) copy days** so each week can log different weights while sharing structure. This enables progressive overload: Week 1 Chest Press 40kg → Week 2 42.5kg → Week 3 45kg.

### 2.3 Key Behavioral Rules

| Rule | Reasoning |
|---|---|
| Exercise ordering in a Day = insertion order | User confirmed: adds in the order they want to perform. Drag-and-drop to reorder (V2). |
| Slot numbering auto-computed per muscle per Day | Chest1 = first chest exercise added to this Day, Chest2 = second, etc. Reset per Day. |
| Same exercise allowed only once per Day (V1) | Simplification. User may add warmup/burnout sets within the same exercise via multiple sets, not multiple instances. Expandable in V2. |
| Weights/reps independent per Day | Day 1's Chest Press is logged separately from Day 4's Chest Press. |
| When copying a Day to a Week (V2), each copy logs independently | Week 1's Chest Press at 40kg doesn't change Week 2's Chest Press. Previous week's best appears as reference. |
| Library is fixed, Days are mutable | Users don't edit library from the Day flow. Library has its own management screen (not in V1). |

---

## 3. Data Model

### 3.1 TypeScript Definitions

```typescript
// 9 muscle groups in the order user requested
type MuscleId =
  | 'chest' | 'triceps' | 'biceps' | 'arms'
  | 'legs' | 'back' | 'trapezius' | 'shoulders' | 'abs';

type EquipmentType = 'Selectorised' | 'Free Weight' | 'Bench';
// Future: 'Cardio' | 'Cable' | 'Bodyweight' | 'Accessories'

interface Exercise {
  id: string;                    // UUID
  muscle: MuscleId;
  name: string;                  // UPPERCASE display name, e.g. "11 CHEST PRESS"
  equipment: EquipmentType;
  deviceNo: number | null;       // Gym machine number (1-18), if Selectorised
  hasPosition?: boolean;         // Variant: position 1-6 (for Fly, Hip Extension)
  hasAngle?: boolean;            // Variant: angle 30/45/60/75/90° (for Bench ?°)
  hasWeightVar?: boolean;        // Variant: alt weight selection (when "(18)" appears)
  singleArm?: boolean;           // Single-arm variant ("13-1 ARM ...")
  videoUrl?: string;             // V2: user-uploaded demo video
}

interface Set {
  reps: number;   // default 10
  kg: number;     // default 20, step 2.5
  rest: number;   // seconds, default 60, step 15
}

interface ExerciseInstance {
  instanceId: string;            // UUID, unique per Day
  libraryId: string;             // ref to Exercise.id
  // Denormalized snapshots (resilient to library changes):
  muscle: MuscleId;
  name: string;
  equipment: EquipmentType;
  deviceNo: number | null;
  // Variants chosen for this instance:
  position?: number;             // 1-6 if hasPosition
  angle?: number;                // 30/45/60/75/90 if hasAngle
  // The actual lifting data:
  sets: Set[];                   // default: 3 sets of {10, 20, 60}
  // Computed at render: slotLabel = "Chest1" | "Leg2" etc.
}

interface Workout {
  id: string;                    // UUID
  name: string;                  // e.g. "DAY 1", "PUSH DAY"
  createdAt: string;             // ISO date
  exercises: ExerciseInstance[]; // ordered (insertion order)
}

// V2:
interface WeekPlan {
  id: string;
  name: string;
  weekStart: string;             // ISO date (Monday)
  days: Array<{
    dayIndex: number;            // 0-6 (Mon-Sun) OR 1-N (flexible)
    workoutId: string;           // ref to Workout template
    // Per-week overrides:
    exerciseLogs: Record<string /* instanceId */, LoggedSet[]>;
  }>;
}

interface LoggedSet extends Set {
  completedAt: string;           // ISO timestamp
  rpe?: number;                  // 1-10 RPE (V3)
}
```

### 3.2 Muscle Groups (Order Matters)

User-specified order for the muscle picker UI:

```
1. CHEST     — Göğüs
2. TRICEPS   — Arka kol (hard to translate; kept English)
3. BICEPS    — Ön kol iç kısmı
4. ARMS      — Forearms / compound
5. LEGS      — Bacak (includes quads, hamstrings, glutes, calves)
6. BACK      — Sırt (includes lats, rhomboids, lower back)
7. TRAPEZIUS — Kapuze / trapez
8. SHOULDERS — Omuz (all delt heads)
9. ABS       — Karın (includes obliques, core)
```

**Note:** We do NOT break down into sub-muscles (e.g. inner chest, rear delts). User chose "simple 9-group model" for MVP. Can subdivide later if needed.

---

## 4. The 82-Exercise Library

Complete list, grouped by muscle, copied verbatim from user's Excel tracker. Parsing rules:

- **Name starts with number (e.g. "11 CHEST PRESS")** → `equipment: 'Selectorised'`, `deviceNo: 11`
- **Name contains "BENCH"** → `equipment: 'Bench'` (may still have device number)
- **Otherwise** → `equipment: 'Free Weight'`
- **"(1)", "(2)" in name** → position variant, `hasPosition: true`
- **"(18)", "(9)" in name** (large numbers) → weight variant, `hasWeightVar: true`
- **"45°", "75°", "90°" in name** → angle variant, `hasAngle: true`
- **"13-1" prefix** → single arm, `singleArm: true`, device 13

```
CHEST (12)
  11 CHEST PRESS                 [Selectorised #11]
  10 FLY                         [Selectorised #10, hasPosition]
  13 CABLE CROSS                 [Selectorised #13]
  14 BENCH PRESS                 [Bench, #14]
  BENCH 45° FLY                  [Bench, hasAngle]
  PULLOVER                       [Free Weight]
  FLAT BENCH PULLOVER            [Bench]
  DECLINE BENCH                  [Bench]
  BENCH 45° PRESS                [Bench, hasAngle]
  BENCH BODY                     [Bench]
  13 DOUBLE ROBE                 [Selectorised #13, hasWeightVar]
  LATERAL RAISE SIDE             [Free Weight]

TRICEPS (12)
  13-1 ARM REVERS GR             [Selectorised #13, singleArm, hasWeightVar]
  DECLINE EXTENSION              [Free Weight]
  7 OVERHEAD EXTENSION           [Selectorised #7]
  13 V-BAR                       [Selectorised #13, hasWeightVar]
  13 Z-BAR REVERS GR             [Selectorised #13, hasWeightVar]
  13 DOUBLE ROBE                 [Selectorised #13, hasWeightVar]
  LOW BENCH 90°                  [Bench, hasAngle]
  FREE Z BAR                     [Free Weight]
  FREE WEIGHTS                   [Free Weight]
  FLAT BENCH Z BAR               [Bench]
  8 DIPS                         [Selectorised #8]
  BENCH 45°                      [Bench, hasAngle]

BICEPS (7)
  FREE WEIGHTS CURL              [Free Weight]
  FREE Z BAR CURL                [Free Weight]
  HAMMER CURL FREE W.            [Free Weight]
  BENCH 45°                      [Bench, hasAngle]
  13 V-Z BAR                     [Selectorised #13, hasWeightVar]
  13 Z-BAR REVERS GR             [Selectorised #13, hasWeightVar]
  FLAT BENCH                     [Bench]

ARMS (0)
  (user will add later — forearm exercises, compound arm movements)

LEGS (12)
  1 LEG PRESS CLOSE PRESS        [Selectorised #1]
  2 LEG CURL                     [Selectorised #2]
  3 LEG EXTENSION                [Selectorised #3]
  SQUAT SUMO                     [Free Weight]
  14 SQUAT OPEN                  [Selectorised #14]
  LUNGE                          [Free Weight]
  TRAP UP BOX                    [Free Weight]
  CALVES                         [Free Weight]
  13 Z-BAR FRONT                 [Selectorised #13]
  18 ADD INSIDE                  [Selectorised #18]
  18 ABD. OUTSIDE                [Selectorised #18]
  13 HIP EXTENSION               [Selectorised #13, hasPosition]

BACK (16)
  5 LARGE GRIP                   [Selectorised #5]
  5 CLOSE GRIP                   [Selectorised #5]
  6 LARGE GRIP                   [Selectorised #6]
  6 HALF LARGE GRIP              [Selectorised #6]
  6 CLOSE GRIP                   [Selectorised #6]
  7 LARGE GRIP FRONT             [Selectorised #7]
  7 REVERSE HALF LARGE GRIP      [Selectorised #7]
  7 CLOSE GRIP                   [Selectorised #7]
  13 Z-BAR PULLDOWN              [Selectorised #13]
  FREE WEIGHT                    [Free Weight]  ← user will clarify later
  FLY BENCH                      [Bench]
  FREE BAR                       [Free Weight]  ← user will clarify later
  4 LOWER BACK                   [Selectorised #4]
  ROMANIAN LIFT FREE W.          [Free Weight]
  13 DOUBLE ROBE                 [Selectorised #13, hasWeightVar]
  LATERAL RAISE SIDE             [Free Weight]

TRAPEZIUS (4)
  Z BAR                          [Free Weight]
  FREE WEIGHT                    [Free Weight]
  FREE BAR                       [Free Weight]
  13 Z BAR SHRUG                 [Selectorised #13]

SHOULDERS (12)
  12 LARGE GRIP                  [Selectorised #12]
  12 CLOSE GRIP                  [Selectorised #12]
  14 BACK PRESS 75°              [Selectorised #14, hasAngle]
  14 FRONT PRESS 75°             [Selectorised #14, hasAngle]
  BENCH                          [Bench]
  13-1 ARM                       [Selectorised #13, singleArm]
  LATERAL RAISE FREE W.          [Free Weight]
  BACK RAISE                     [Free Weight]
  10 REAR DELT                   [Selectorised #10]
  FLY BENCH                      [Bench]
  13-1 ARM LATERAL RAISE         [Selectorised #13, singleArm]
  FRONT RAISE SIDE               [Free Weight]

ABS (7)
  8 LOWER ABS                    [Selectorised #8]
  13 WOODSCHOPPER                [Selectorised #13]
  15 ABS                         [Selectorised #15]
  FLAT BENCH ON BACK             [Bench]
  DECLINE BENCH BODY             [Bench]  ← meaning of "(9)" unclear, left as-is
  13 ROBE                        [Selectorised #13]
  13-1 ARM PULL L+R              [Selectorised #13, singleArm]
```

**Total: 82 exercises across 9 muscle groups.**

**Exercises flagged "unclear" by user** (names like "FREE WEIGHT" in BACK are too generic):
- User will clarify when they start using the app and record videos.
- For now: preserve exactly as written, mark for later edit.

---

## 5. Screen Specifications

### 5.1 Screen List & Navigation

```
Home (workout list)
  ├─ [+] → Name Workout (modal) → Workout Detail (new)
  └─ tap card → Workout Detail (existing)

Workout Detail
  ├─ [+] or [+ ADD EXERCISES] → Select Exercises
  ├─ tap exercise → Set Editor
  └─ DONE → Home

Select Exercises
  ├─ [Muscle Group ▼] → Muscle Group Picker → back
  ├─ [Equipment ▼] → Equipment Picker → back
  ├─ [Bodyweight] toggle (inline)
  ├─ tap exercise (+) → add to workout + open Set Editor
  └─ ✕ → back to Workout Detail

Muscle Group Picker
  ├─ body map + grid list (both interactive)
  ├─ CLEAR → reset local selection
  ├─ APPLY → save selection + back
  └─ ✕ → cancel + back

Equipment Picker
  ├─ accordion: Selectorised / Free Weight / Bench
  ├─ Selectorised expandable (shows machine numbers)
  └─ APPLY → back with selection

Set Editor
  ├─ variant pickers (if hasPosition / hasAngle)
  ├─ sets list with steppers (reps/kg/rest)
  ├─ [+ ADD SET] / [trash per set]
  ├─ SAVE EXERCISE → back to Workout Detail
  └─ [trash icon] → delete exercise from workout
```

### 5.2 Home Screen

**Purpose:** Landing. List of all saved workouts.

**Layout:**
- Top bar: bell icon (left, decorative for V1) · "MY WORKOUTS" · blue (+) button (right)
- Search bar (filters workouts by name)
- Scrollable list of workout cards:
  - Each card: duration badge ("~8 MIN", computed: totalSets × 1.2), delete icon, mini muscle map with user's chosen muscles highlighted yellow, name (display font), meta ("6 exercises · 18 sets")
- Empty state: faded body map + "NO WORKOUTS YET" + hint to tap `+`

**Interactions:**
- Tap card → Workout Detail
- Tap delete icon → confirm → remove workout
- Tap (+) → Name Workout modal

### 5.3 Name Workout Modal

**Purpose:** Capture the workout's name before creation.

**Layout:**
- ✕ top-left
- Centered: "Name your workout" label + large editable input
- Default value: `DAY ${existingCount + 1}` (e.g. "DAY 1", "DAY 2")
- Tip text: "use Day 1, Push Day, or anything"
- Bottom: blue "CREATE WORKOUT" full-width button

**Interactions:**
- Type → update name
- CREATE → create workout + navigate to Workout Detail
- ✕ → back to Home (discard)

### 5.4 Workout Detail

**Purpose:** Edit the exercises and sets of one workout.

**Layout:**
- Top bar: ← back · workout name · DONE (right, blue text)
- Sub-bar: "EXERCISES" + count + small (+) button
- Either empty state (faded body + "ADD EXERCISES" CTA) OR list of exercise cards:
  - Each card: yellow slot label chip ("Chest1"), exercise name, summary ("3×10 · 40kg · 60s rest"), ✕ remove button
- Add-more dashed button at bottom of list: "+ ADD EXERCISE"

**Auto-numbering logic (critical):**
```javascript
// Computed at render time, not stored
function computeSlotLabels(exercises) {
  const counters = {};
  return exercises.map(ex => {
    counters[ex.muscle] = (counters[ex.muscle] || 0) + 1;
    const label = MUSCLES.find(m => m.id === ex.muscle).label;
    // "CHEST" → "Chest1"
    return { ...ex, slotLabel: label.charAt(0) + label.slice(1).toLowerCase() + counters[ex.muscle] };
  });
}
```

**Interactions:**
- Tap exercise card → Set Editor
- Tap ✕ on card → remove exercise (immediate, no confirm in V1 — V2 should confirm)
- Tap (+) → Select Exercises
- DONE → Home

### 5.5 Select Exercises

**Purpose:** Browse/filter library, add to current workout.

**Layout:**
- ✕ top-left · "SELECT EXERCISES" centered · (no right button)
- Search bar
- 3 horizontal filter chips (scrollable):
  1. "Muscle Group ▼" — opens Muscle Group Picker. Active label: "CHEST" / "3 MUSCLES"
  2. "Equipment ▼" — opens Equipment Picker. Active label: "Selectorised" / "2 TYPES"
  3. "Bodyweight" — inline toggle (no separate screen). Active state = yellow.
- Count line: "12 EXERCISES"
- Exercise list:
  - Each row: small square icon (shows `#11` in yellow if Selectorised, "BNCH" if Bench, "FREE" otherwise), name, tiny meta ("CHEST · Selectorised · pos 1-6"), blue (+) button
- Empty state: "No matches found"

**Filter semantics:**
- AND between filter categories (muscle AND equipment)
- OR within a category (muscle = chest OR back)
- "Bodyweight" filter = `equipment === 'Free Weight'` (prototype simplification; refine as user adds true bodyweight exercises)

**Interactions:**
- Tap exercise (+) → add to current workout with defaults (3 sets × 10 reps × 20kg × 60s rest), open Set Editor
- Tap chip → open respective picker
- Close → back to Workout Detail

### 5.6 Muscle Group Picker

**Purpose:** Select one or multiple muscle groups via body map OR list.

**Layout:**
- ✕ left · "MUSCLE GROUP" · CLEAR (right)
- Top: interactive body map (front + back SVG, side by side)
  - Each muscle region is a clickable `<path>`. Selected = `fill: #facc15`
  - Hover state (desktop): slight fill change
- Bottom: "OR SELECT FROM LIST" + 3-col grid of muscle buttons (same toggle behavior)
- Bottom: white "APPLY (2)" button (count shown)

**SVG Body Map:**
Simplified anatomical shapes, NOT realistic. The prototype uses rough SVG paths for 9 regions:
- Front: head, chest (×2), biceps (×2), arms/forearms (×2), shoulders (×2), abs, legs (thighs + calves)
- Back: head, trapezius, back, triceps (×2), arms/forearms (×2), shoulders (×2), legs (hamstrings + calves)

**Important:** The SVG is intentionally stylized — not medical accuracy. Recognizable body zones with clear tap targets (min 32×32px equivalent).

**Interactions:**
- Tap body region → toggle selection (local state only)
- Tap grid button → same toggle
- CLEAR → deselect all (local state)
- APPLY → push local selection to parent filters + back
- ✕ → discard and back

### 5.7 Equipment Picker

**Purpose:** Select equipment types.

**Layout:**
- ✕ left · "EQUIPMENT" · CLEAR (right)
- Accordion cards (one per equipment type):
  - Checkbox (yellow if selected) · type name · count of exercises · expand arrow (only for Selectorised, which shows device numbers)
- Selectorised expanded: wrapping row of chips like "#1", "#2", "#3", ..., "#18" (distinct machine numbers from library)
- APPLY button

**Interactions:**
- Tap card body → toggle type selection
- Tap arrow (Selectorised only) → expand/collapse machine list
- APPLY → back with selection

### 5.8 Set Editor

**Purpose:** Configure sets for one exercise in the current workout.

**Layout:**
- ✕ left · centered name + meta ("CHEST · Selectorised · Device #11") · trash icon (right, delete exercise)
- Video placeholder: yellow play button + "VIDEO COMING SOON" (future: user-uploaded MP4)
- **Variant block** (only if hasPosition or hasAngle):
  - Row "POSITION": 6 small square buttons (1-6)
  - Row "ANGLE": buttons for 30°, 45°, 60°, 75°, 90°
  - Selected = yellow fill
- "SETS" label + total count
- Set cards (one per set):
  - Header: yellow circle with set number · "SET 1" · trash (if sets > 1)
  - 3 steppers side-by-side: REPS (± 1) · WEIGHT (± 2.5 kg) · REST (± 15 s)
- "+ ADD SET" dashed button
- **V2 placeholder block**: "Last performance tracking coming soon"
- Bottom: blue "SAVE EXERCISE" full-width button

**Stepper Component:**
- Minus button (dark) — value — plus button (yellow)
- Tabular numeric display
- Disabled state: plus → values don't exceed sane max (e.g. 500kg, 99 reps); minus → never below 0

**Defaults when adding a new exercise:**
```javascript
sets: [
  { reps: 10, kg: 20, rest: 60 },
  { reps: 10, kg: 20, rest: 60 },
  { reps: 10, kg: 20, rest: 60 },
]
```

**When adding a new set:** copy the last set's values (common pattern — user usually keeps same weight across sets, or slightly decreases).

---

## 6. Design System

### 6.1 Color Tokens

```css
--bg-app:        #050505;                   /* near-black with subtle gradient overlay */
--bg-card:       linear-gradient(180deg, #141414 0%, #0f0f0f 100%);
--border:        #222;
--border-subtle: #111;

--text-primary:  #ffffff;
--text-muted:    #8a8a8a;
--text-faint:    #555;

--accent:        #facc15;  /* yellow — muscle highlights, active states, primary CTA icons */
--accent-soft:   rgba(250, 204, 21, 0.1);
--accent-glow:   rgba(250, 204, 21, 0.2);

--primary:       #2563eb;  /* blue — CTA buttons, "+" actions, DONE text */
--primary-hover: #3b82f6;

--danger:        #ef4444;
--success:       #10b981;
```

**Background treatment:** subtle radial gradients (yellow top-left 6%, blue bottom-right 5%) over `#050505` base. Creates depth without being busy.

### 6.2 Typography

**Display (headings, labels, buttons):** `Bebas Neue`
- Bold, narrow, athletic. Evokes gym/sports posters.
- Always uppercase or title case for section labels
- Letter-spacing: 0.04–0.1em (tighter for headings, wider for small labels)

**Body (inputs, descriptions):** `DM Sans`
- Clean, modern, readable at small sizes
- Weights used: 400, 500, 600, 700

**Tabular numbers:** Use `font-variant-numeric: tabular-nums` (or Tailwind `tabular-nums`) in set editor values so digits don't shift width.

```css
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');
.font-display { font-family: 'Bebas Neue', 'Arial Narrow', sans-serif; letter-spacing: 0.04em; }
.font-body { font-family: 'DM Sans', system-ui, sans-serif; }
```

### 6.3 Spacing & Radius

- Border radius: `12px` (md cards), `16px` (lg cards), `24px` (prominent buttons), `9999px` (chips, avatars)
- Padding: cards mostly `p-3.5` or `p-4`, screens `px-4`
- Section gaps: `space-y-2.5` or `space-y-3`

### 6.4 Component Patterns

**IconBtn:** 36×36px rounded-full zinc-900 surface, 16px icon.

**PrimaryBtn:** Full-width, 16px vertical padding, rounded-2xl, bg-blue-600, display font, wide letter-spacing.

**Chip (filter):** Rounded-full, border, small padding. Active = yellow fill with black text.

**Card:** `card-bg` class (dark gradient + border). Hover state (desktop): subtle lift (translate-y or border brighten).

**Stepper:** Flex row, minus (dark circle) — value — plus (yellow circle). Delta values: reps ±1, kg ±2.5, rest ±15s.

### 6.5 Motion

Subtle and fast. No bouncy spring animations.
- `fade-in`: 0.25s ease-out on screen transitions
- `slide-up`: 0.3s cubic-bezier(0.16, 1, 0.3, 1) for modals/pickers
- `tap-scale`: `transform: scale(0.96)` on `:active` — mobile tactile feedback
- Muscle fill color: 0.2s transition

### 6.6 Icons

Using `lucide-react`. Consistent stroke-width: 2 (or 2.5 for emphasized + buttons, 3 for inside filled circles).

Used: `X, Plus, Search, ChevronDown, Minus, Check, ArrowLeft, MoreHorizontal, Play, Trash2, Bell`.

---

## 7. Feature Roadmap

### 7.1 V1 — MVP (COMPLETE in prototype)

- [x] Exercise library with 82 exercises (user's Excel)
- [x] Home screen with workout cards + empty state
- [x] Create workout (name)
- [x] Workout detail view with auto-numbered exercise slots
- [x] Select exercises with 3-filter system (muscle / equipment / bodyweight)
- [x] Muscle group picker with interactive SVG body map
- [x] Equipment picker with accordion (Selectorised, Free Weight, Bench)
- [x] Set editor with steppers (reps/kg/rest)
- [x] Variant pickers (position 1-6, angle 30-90°)
- [x] Device number badges
- [x] Compact workout cards showing muscle highlights
- [x] Delete workout / delete exercise / delete set
- [x] Dark theme + yellow accent + Bebas Neue / DM Sans

### 7.2 V2 — Production Features

- [ ] **Persistence** (localStorage V2.0, then IndexedDB or Supabase for sync)
- [ ] **Weekly Plans** (Layer 3 of architecture)
  - Create plan → select days → "Copy for X weeks" button
  - Calendar view toggle (show weeks as rows)
  - Each week copy has independent set logs
- [ ] **Progressive overload display** — "Last time: 42.5kg × 10" in set editor
- [ ] **Drag-and-drop reorder** for exercises within a day
- [ ] **Drag-and-drop move** for days between plans
- [ ] **Exercise videos** (user uploads MP4 per exercise, plays in set editor)
- [ ] **Edit library** screen (add/rename/delete exercises, add ARMS exercises)
- [ ] **Library categories user said they'd add later**: Cardio, Cable, Bodyweight, Accessories
- [ ] **Workout execution mode** — "Start Workout" → timer between sets + one-tap log actual set
- [ ] **Refinement of ambiguous exercises**: BACK's "FREE WEIGHT", "FREE BAR" need clearer names + video

### 7.3 V3+ — Nice to Have

- [ ] Analytics: volume over time, 1RM estimates per exercise, muscle group balance
- [ ] RPE / RIR field per set (1-10 scale or "reps in reserve")
- [ ] Tempo notation (3-1-2 format) per exercise
- [ ] Superset grouping (pair exercises to alternate)
- [ ] Rest timer with audio/vibration
- [ ] Export data to CSV (symmetry with Excel roots)
- [ ] Calendar integration (log when workout performed)
- [ ] Offline PWA with sync on reconnect
- [ ] Backup / import

### 7.4 Explicitly NOT planned

- Multi-user / social / sharing
- AI coach recommendations
- Premade workout marketplace
- Wellness / nutrition content
- Cardio equipment QR-login (gym hardware integration)

---

## 8. Key Decisions Log

| Decision | Rationale | Date |
|---|---|---|
| MVP = personal use only (single user) | Scope control; user can't predict community needs yet | during discovery |
| User creates own templates (no curated library) | Direct consequence of single-user MVP | during discovery |
| 9 muscle groups, no sub-muscles | User's Excel uses this level; "simple enough" for MVP | during discovery |
| Equipment types: Selectorised / Free Weight / Bench (only) | User's Excel parse rules only produce these 3; others are V2 | during discovery |
| Auto-slot-numbering (Chest1, Chest2...) instead of manual | More intuitive; matches user's Excel mental model exactly | during discovery |
| Same exercise only once per day (V1) | Simpler. Warmup+working+burnout can be achieved with multiple sets. Revisit V2. | during discovery |
| Weekly plan copies have independent logs | Required for progressive overload | during discovery |
| Start with Claude artifact prototype, not Lovable/Claude Code | Fast iteration without stack commitment | during discovery |
| Dark theme + yellow accent + blue CTA | user confirmed each choice | during discovery |
| Bebas Neue + DM Sans fonts | Athletic + readable, not the generic "AI look" (avoided Inter) | design |
| Stepper inputs (not keyboard) for reps/kg/rest | Faster at gym; may revisit if user wants typing | design |
| Position variants: 1-6, Angle variants: 30/45/60/75/90 | User specified | data model |
| Exercise names in English UPPERCASE | User requested | data model |
| 82 exercises, transcribed from user's handwritten Excel | Source of truth is user's Excel, faithfully captured | data model |
| Empty state designs include muscle map at low opacity | Consistent visual language, sets expectation | design |
| Video is V2 placeholder | User will record own videos later | roadmap |

---

## 9. Open Questions (Unresolved)

Items the user flagged as "figure out later":

1. **"DECLINE BENCH BODY (9)"** — does `(9)` mean device #9, weight 9kg, or something else? User wasn't sure. Currently treated as no variant, name kept.
2. **BACK's "FREE WEIGHT" and "FREE BAR"** — generic names, actual exercise unclear. User plans to record videos when using, then rename.
3. **"13-1 ARM" family** — user has never performed these, pulled from Excel. Semantics assumed: device #13 with single-arm variant. User will verify and may rename.
4. **ARMS category** — currently empty (0 exercises). User trains arms with free weights for now, will add forearm/compound movements later.
5. **"TRAPEZE" vs "TRAPEZIUS"** — Excel used TRAPEZE (shortened). Using TRAPEZIUS in UI for clarity. Confirm with user.
6. **V2 interaction**: when editing exercise in a Week 2 copy, does the "template day" update? Decided: NO — each week copy is independent after creation. But the original template Day editing propagates only to NEW week copies made after the edit. To confirm in V2 design.

---

## 10. Handoff Prompts

Ready-to-paste prompts for continuing development in different tools.

### 10.1 For Claude Code (continuing development)

```
I have a fitness tracker app with a completed V1 React JSX prototype. I want to convert it into a production PWA with persistence and then progressively add V2 features.

Please read PROJECT.md in this repo for full context — architecture, 82-exercise library, screen specs, design system, feature roadmap.

Start by:
1. Scaffolding a Vite + React + TypeScript + Tailwind PWA project in /app
2. Converting the existing prototype.jsx into typed components (match the folder structure: /components, /screens, /data, /hooks)
3. Replacing React state with Zustand store (or whichever you recommend for PWA)
4. Adding localStorage persistence for workouts
5. Extracting the exercise library into /data/library.ts with full TypeScript types

Once that runs, I'll review and we'll move to V2 features.
```

### 10.2 For Lovable

```
Build a fitness tracker mobile-first PWA based on this spec:

[Paste sections 1, 2.1, 2.2, 3, 5, 6 of PROJECT.md]

Match the prototype.jsx screen flow and design system exactly. Dark theme with yellow accent, Bebas Neue + DM Sans fonts. Mobile viewport (max-width 430px).

Use Supabase for persistence (single-user, auth can be magic link for now). Seed the exercise library table from the 82 exercises in section 4.

Deliverables:
- Home, Workout Detail, Select Exercises, Muscle Group Picker, Equipment Picker, Set Editor screens
- Persistence: saving a workout survives refresh
- PWA manifest + installable from mobile Safari/Chrome
- Does NOT need week plans yet — that's V2
```

### 10.3 For Claude Design

```
I have a React prototype of a fitness tracker app (prototype.jsx). Before I hand off to a coding tool, help me refine the visual design:

1. Review the current dark theme + yellow accent + blue CTA direction — is it cohesive or does something feel off?
2. The muscle map SVG is intentionally simple/stylized. Should I invest in a more refined anatomical illustration, or does simple work better for tap targets?
3. The set editor uses ± stepper buttons. Some users may want to type numbers directly. Design a hybrid: big tap steppers for speed, tap-to-type for precision.
4. Add a gentle loading/empty state illustration system — currently using a faded body map as empty state everywhere. Show me variations.

Reference prototype attached. Design system in PROJECT.md section 6.
```

---

## 11. File Inventory

Handed over with this document:

```
prototype.jsx      — V1 interactive React artifact (~1048 lines, single file)
PROJECT.md         — this document
(Excel photos)     — source screenshots of user's handwritten tracker

```

---

## 12. Quick Reference: How the User Thinks

To build the right thing, understand the user's mental model:

- **They think in Excel terms first.** They already have a system that works (paper + Excel). The app's job is to digitize, not reinvent. Respect their structure.
- **"Day 1" is the atomic unit.** Not "week", not "program" — they start from a day and expand outward.
- **"Chest1, Chest2" is positional slang** for "first chest exercise of the day, second chest exercise". It's not a category. It emerges from ordering.
- **They go to the gym on irregular schedules.** Plans should flex around real life, not force adherence to a fixed calendar. That's why we use Day 1/2/3 (sequential) instead of dates as the primary organizing idea.
- **Progressive overload is the point.** The entire point of tracking is to see last week's numbers and go heavier. Without that, the app is just a fancy notepad.
- **Brevity > features.** They chose single-user MVP over multi-user. They chose "figure out weekly later" over building it upfront. When in doubt, do less.
- **They will record videos themselves.** Don't spend effort sourcing generic exercise demos. The app should support user-uploaded video.

---

*End of specification. Built through iterative discovery with user Apr 2026. Update this doc as features land.*
