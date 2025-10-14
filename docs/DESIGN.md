# Incremental Game - Design Document

## Core Concept

A currency-based incremental game where players train multiple skills through time-based activities. Everything in the game is a currency (no complex inventory system). Skills have sub-activities that consume and produce currencies, creating an interconnected economy.

### Key Principles
- **Everything is currency** - Wood, meat, trained dogs, potions, etc. are all just numbers
- **No inventory management** - No slots, weight limits, or item stacking complexity
- **Time-based activities** - Each activity takes 2-8 seconds to complete
- **Free bootstrap activities** - Level 1 activities require no input currencies
- **Interconnected economy** - Advanced skills need currencies from other skills
- **Dual progression** - Individual skill levels + overall player level

---

## System Architecture

### GameEngine
**Responsibility:** Main game loop, time management, coordinating all systems

**Key Features:**
- Delta time tracking for smooth updates
- Pausing/resuming game
- Tick rate management (update 10x per second for smooth progress bars)
- Event coordination between systems

**Public API:**
```javascript
class GameEngine {
  constructor()
  start()                    // Begin game loop
  pause()                    // Pause game
  resume()                   // Resume game
  update(deltaTime)          // Called each frame
  on(event, callback)        // Subscribe to game events
}
```

**Events Emitted:**
- `activity:started`
- `activity:completed`
- `currency:changed`
- `skill:levelup`
- `player:levelup`

---

### CurrencyManager
**Responsibility:** Track all currency amounts, handle additions/subtractions

**Key Features:**
- Store currency amounts in a simple object `{ wood: 150, meat: 30 }`
- Add/subtract with validation
- Check if player can afford costs
- Track currency history (optional for statistics)

**Public API:**
```javascript
class CurrencyManager {
  constructor()
  add(currencyId, amount)                    // Add currency
  subtract(currencyId, amount)               // Remove currency (returns success)
  set(currencyId, amount)                    // Set exact amount
  get(currencyId)                            // Get current amount (0 if not exists)
  has(currencyId, amount)                    // Check if player has enough
  canAfford(costs)                           // Check if player can afford {wood: 5, stone: 2}
  getAll()                                   // Get all currencies object
  reset()                                    // Clear all currencies
}
```

**Data Structure:**
```javascript
currencies = {
  wood: 150,
  oakWood: 23,
  meat: 45,
  cookedMeat: 12,
  puppy: 3,
  guardDog: 1
}
```

---

### SkillManager
**Responsibility:** Manage skill XP, levels, unlocks

**Key Features:**
- Track XP per skill
- Calculate levels from XP (exponential curve)
- Determine which activities are unlocked
- Calculate overall player level

**Public API:**
```javascript
class SkillManager {
  constructor(skillDefinitions)
  addXP(skillId, amount)                     // Add XP, auto-level if threshold reached
  getLevel(skillId)                          // Get current level
  getXP(skillId)                             // Get current XP
  getXPForNextLevel(skillId)                 // XP needed for next level
  getXPProgress(skillId)                     // Returns {current, needed, percent}
  isActivityUnlocked(activityId)             // Check if activity level requirement met
  getPlayerLevel()                           // Overall level (sum of all skill levels)
  getAllSkills()                             // Get all skill states
  reset()                                    // Reset all skills
}
```

**Data Structure:**
```javascript
skillStates = {
  woodcutting: { xp: 1250, level: 8 },
  mining: { xp: 500, level: 4 },
  dogHandling: { xp: 2000, level: 12 }
}
```

**XP Curve Formula:**
```javascript
// XP required for level N
xpForLevel(level) {
  if (level <= 1) return 0
  return Math.floor(100 * Math.pow(1.15, level - 1))
}

// Examples:
// Level 1: 0 XP
// Level 2: 100 XP
// Level 5: 175 XP
// Level 10: 404 XP
// Level 25: 3,292 XP
// Level 50: 108,366 XP
```

---

### ActivityManager
**Responsibility:** Execute time-based activities, manage queues, handle auto-mode

**Key Features:**
- Start activities (validate requirements)
- Track progress with timers
- Complete activities (consume inputs, grant outputs, award XP)
- Auto-mode: loop activities automatically
- Support multiple simultaneous activities (unlockable)

**Public API:**
```javascript
class ActivityManager {
  constructor(activityDefinitions, currencyManager, skillManager)
  canStart(activityId)                       // Check if activity can be started
  start(activityId, options)                 // Start an activity
  update(deltaTime)                          // Update all active activities
  getProgress(activityId)                    // Get progress (0-1)
  getActiveActivities()                      // Get list of currently running activities
  stopActivity(activityId)                   // Stop an activity
  setAutoMode(activityId, enabled)           // Enable/disable auto-repeat
  reset()                                    // Stop all activities
}
```

**Activity State:**
```javascript
activeActivities = {
  chopNormalTree: {
    activityId: 'chopNormalTree',
    startTime: timestamp,
    duration: 2000,        // ms
    progress: 0.65,        // 0-1
    autoMode: false
  }
}
```

**Activity Execution Flow:**
1. Player clicks "Start" on activity
2. Validate: skill level requirement, currency costs
3. Begin timer (duration specified in activity definition)
4. Update progress bar each tick
5. On completion:
   - Consume input currencies
   - Grant output currencies
   - Award XP to skill
   - Emit `activity:completed` event
   - If auto-mode enabled and can afford, restart immediately

---

### UpgradeManager
**Responsibility:** Handle permanent upgrades, no prestige system

**Key Features:**
- Purchase upgrades with currencies
- Apply multipliers to activities (speed, output, cost reduction)
- Unlock features (auto-mode, multi-activity slots)
- Track purchased upgrades

**Public API:**
```javascript
class UpgradeManager {
  constructor(upgradeDefinitions, currencyManager)
  canPurchase(upgradeId)                     // Check if can afford
  purchase(upgradeId)                        // Buy upgrade
  isPurchased(upgradeId)                     // Check if already owned
  getMultiplier(type, skillId)               // Get combined multiplier for skill
  getAllUpgrades()                           // Get all upgrade states
  reset()                                    // Clear all upgrades
}
```

**Upgrade Types:**
- `speed` - Reduce activity duration (-10%, -20%, etc.)
- `output` - Increase currency produced (+20%, +50%, etc.)
- `efficiency` - Reduce currency costs (-10%, -15%, etc.)
- `unlock` - Enable auto-mode for a skill
- `slot` - Add multi-activity slot

**Upgrade Definition Example:**
```javascript
{
  id: 'woodcuttingSpeed1',
  name: 'Woodcutting Speed I',
  description: 'Reduce woodcutting time by 10%',
  cost: { wood: 1000 },
  type: 'speed',
  target: 'woodcutting',
  value: 0.10,              // 10% reduction
  requires: []              // Optional prerequisite upgrades
}
```

---

### SaveManager
**Responsibility:** Save/load game state, calculate offline progress

**Key Features:**
- Save to localStorage with versioning
- Load and migrate old saves
- Calculate offline progress for auto-activities
- Export/import save data

**Public API:**
```javascript
class SaveManager {
  constructor(game)
  save()                                     // Save entire game state
  load()                                     // Load from localStorage
  export()                                   // Return save as JSON string
  import(saveData)                           // Load from JSON string
  reset()                                    // Clear save data
  calculateOfflineProgress(timeDelta)        // Calculate gains while away
}
```

**Save Data Structure:**
```javascript
saveData = {
  version: '1.0.0',
  timestamp: 1234567890,
  currencies: { wood: 150, meat: 30 },
  skills: { woodcutting: { xp: 1250, level: 8 } },
  upgrades: ['woodcuttingSpeed1', 'autoWoodcutting'],
  activeActivities: [
    { activityId: 'chopNormalTree', autoMode: true }
  ]
}
```

**Offline Progress Calculation:**
1. Check which activities were in auto-mode
2. For each auto-activity:
   - Calculate how many completions fit in time away
   - Limited by currency availability (stop when can't afford)
3. Apply all completions (currencies, XP, levels)
4. Max offline time: 24 hours
5. Show summary popup on return

---

### EventBus
**Responsibility:** Decouple systems via pub/sub

**Public API:**
```javascript
class EventBus {
  on(event, callback)                        // Subscribe
  off(event, callback)                       // Unsubscribe
  emit(event, data)                          // Publish
}
```

**Common Events:**
- `activity:started` - `{activityId, skillId}`
- `activity:completed` - `{activityId, outputs, xpGained}`
- `currency:changed` - `{currencyId, amount, total}`
- `skill:xpGained` - `{skillId, xp, totalXP}`
- `skill:levelup` - `{skillId, newLevel}`
- `player:levelup` - `{newLevel}`
- `upgrade:purchased` - `{upgradeId}`

---

## Data Definitions

### Currency Definition
```javascript
{
  id: 'wood',
  name: 'Wood',
  description: 'Basic wood from trees',
  category: 'resource',       // resource, processed, advanced
  icon: '🪵'                  // Optional emoji
}
```

### Skill Definition
```javascript
{
  id: 'woodcutting',
  name: 'Woodcutting',
  description: 'Chop trees to gather wood',
  icon: '🪓',
  activities: ['chopNormalTree', 'chopOakTree', 'chopWillowTree']
}
```

### Activity Definition
```javascript
{
  id: 'chopNormalTree',
  name: 'Chop Normal Tree',
  skillId: 'woodcutting',
  levelRequired: 1,
  inputs: [],                 // FREE activity (level 1)
  outputs: { wood: 1 },
  duration: 2,                // seconds
  xpGained: 5,
  description: 'Chop a basic tree for wood'
}

{
  id: 'trainGuardDog',
  name: 'Train Guard Dog',
  skillId: 'dogHandling',
  levelRequired: 5,
  inputs: { puppy: 1, food: 3 },
  outputs: { guardDog: 1 },
  duration: 5,
  xpGained: 25,
  description: 'Train a puppy into a guard dog'
}
```

---

## Skill & Activity Design

### Design Philosophy
1. **Level 1 activities are FREE** - Generate base resources from nothing
2. **Higher level activities transform** - Consume currencies to produce better ones
3. **Skills interconnect** - Skill A produces inputs for Skill B
4. **Progressive complexity** - Start simple, unlock complexity

### Skill Categories

**Resource Gathering (Free activities)**
- Woodcutting: Trees → Wood variants
- Mining: Rocks → Ore variants
- Fishing: Water → Fish variants
- Hunting: Wilderness → Meat, Bones, Hides

**Processing Skills (Transform resources)**
- Cooking: Raw food → Cooked food
- Smithing: Ore → Bars → Equipment
- Crafting: Materials → Tools, Items
- Carpentry: Wood → Planks → Furniture

**Specialized Skills (Complex production)**
- Dog Handling: Puppies + resources → Trained dogs
- Farming: Seeds + time → Crops
- Alchemy: Ingredients → Potions
- Trading: Goods → Gold (universal currency)

### Skill Count
Target: **8-12 skills** with **5-15 activities each**

---

## Progression Systems

### Skill Leveling
- Activities award XP to their skill
- XP accumulates, levels increase automatically
- Each level unlocks new activities
- Max level: 99 (optional cap)

### Overall Player Level
- Sum of all skill levels, OR
- Total XP across all skills / 100
- Used to unlock new skills entirely
- Provides minor global bonuses (optional)

### Mastery (Optional)
- Track completions per activity
- Milestones: 10, 50, 100, 500, 1000 completions
- Bonuses: +5% speed, +10% output, etc.

### Upgrades
Permanent improvements purchased with currencies:
- **Speed**: Reduce activity time for a skill
- **Output**: Increase currencies produced
- **Efficiency**: Reduce currencies consumed
- **Unlocks**: Enable auto-mode, multi-tasking
- **Quality of Life**: Bulk actions, auto-sell, etc.

---

## UI/UX Design

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ [Currency Ticker: Wood: 150  Meat: 30  Puppy: 3  ...]      │
├──────────┬──────────────────────────────────────┬───────────┤
│ SKILLS   │  MAIN AREA                           │ ACTIVE    │
│          │                                      │           │
│ 🪓 WC 15 │  [Woodcutting - Level 15]            │ Running:  │
│ ⛏️ Min 8  │                                      │           │
│ 🎣 Fish 5 │  [🌳 Chop Normal Tree]  [▶ START]    │ • Chop    │
│ 🐕 Dog 12 │  FREE → Wood × 1                     │   Normal  │
│ 🍳 Cook 3 │  2s | +5 XP                          │   [85%]   │
│ ⚒️ Smith 6│                                      │           │
│ 🧪 Alch 4 │  [🌳 Chop Oak Tree]  [⟳ AUTO ON]    │ • Train   │
│ 🏪 Trade 2│  FREE → Oak Wood × 1                 │   Guard   │
│          │  3s | +8 XP                          │   [AUTO]  │
│ [Overall │  [Progress: ████████░░░░░░ 65%]      │           │
│  Level:  │                                      │           │
│    50]   │  [🔒 Chop Magic Tree (Lv 30)]        │ Slots:    │
│          │  FREE → Magic Wood × 1               │ 2/3       │
│          │  6s | +25 XP                         │           │
├──────────┴──────────────────────────────────────┴───────────┤
│ [Upgrades] [Statistics] [Settings] [Save] [Reset]          │
└─────────────────────────────────────────────────────────────┘
```

### Key UI Elements

**Currency Ticker (Top)**
- Scrollable horizontal list
- Shows all owned currencies
- Highlight when producing/consuming
- Optional: Group by category, filter, search

**Skill List (Left Sidebar)**
- All skills with current level
- Visual indicator of locked/unlocked
- Click to view skill's activities
- Show XP progress bar

**Activity Panel (Main Area)**
- Title: Skill name and level
- XP progress bar for skill
- List of all activities:
  - Locked (gray, show level requirement)
  - Unavailable (can't afford inputs)
  - Available (can start)
  - In progress (progress bar)
- Each activity shows:
  - Name and icon
  - Inputs → Outputs
  - Duration and XP gained
  - Start/Stop/Auto toggle buttons

**Active Activities (Right Sidebar)**
- List of currently running activities
- Progress bars
- Auto-mode indicator
- Quick stop button
- Show available activity slots (1/3)

**Bottom Bar**
- Tab navigation: Skills, Upgrades, Stats, Settings
- Save/Load buttons
- Reset button (with confirmation)

---

## File Structure

```
clicker-game/
├── docs/
│   ├── DESIGN.md              (this file)
│   ├── TESTING.md             (testing strategy)
│   └── EXAMPLES.md            (concrete skill examples)
├── src/
│   ├── core/
│   │   ├── GameEngine.js
│   │   ├── EventBus.js
│   │   └── SaveManager.js
│   ├── managers/
│   │   ├── CurrencyManager.js
│   │   ├── SkillManager.js
│   │   ├── ActivityManager.js
│   │   └── UpgradeManager.js
│   ├── data/
│   │   ├── currencies.js      (all currency definitions)
│   │   ├── skills.js          (all skill definitions)
│   │   ├── activities.js      (all activity definitions)
│   │   └── upgrades.js        (all upgrade definitions)
│   ├── ui/
│   │   ├── UIManager.js       (orchestrate UI updates)
│   │   └── components/
│   │       ├── CurrencyTicker.js
│   │       ├── SkillList.js
│   │       ├── ActivityPanel.js
│   │       ├── ActiveActivities.js
│   │       └── UpgradeTree.js
│   └── utils/
│       ├── calculations.js    (XP curves, cost scaling)
│       └── formatters.js      (number formatting, time strings)
├── tests/
│   ├── unit/
│   │   ├── managers/
│   │   │   ├── CurrencyManager.test.js
│   │   │   ├── SkillManager.test.js
│   │   │   ├── ActivityManager.test.js
│   │   │   └── UpgradeManager.test.js
│   │   └── utils/
│   │       └── calculations.test.js
│   ├── integration/
│   │   ├── activity-execution.test.js
│   │   ├── skill-leveling.test.js
│   │   ├── upgrade-effects.test.js
│   │   └── save-load.test.js
│   └── e2e/
│       ├── helpers/
│       │   ├── TestController.js
│       │   └── assertions.js
│       └── scenarios/
│           ├── bootstrap.spec.js
│           ├── production-chain.spec.js
│           ├── leveling.spec.js
│           └── offline-progress.spec.js
├── index.html
├── style.css
├── main.js                    (entry point)
├── package.json
└── playwright.config.js
```

---

## Implementation Roadmap

### Phase 1: Core Systems (Week 1)
1. Set up project structure
2. Implement CurrencyManager (with tests)
3. Implement SkillManager (with tests)
4. Implement EventBus
5. Basic GameEngine with time management

### Phase 2: First Skill (Week 1)
1. Define Woodcutting skill data
2. Implement ActivityManager (with tests)
3. Create basic UI for single skill
4. Test complete flow: click activity → wait → gain currency + XP

### Phase 3: Multi-Skill Economy (Week 2)
1. Add 3-4 more skills (Mining, Fishing, Dog Handling)
2. Create interconnected activities (one skill's output = another's input)
3. Expand UI to show multiple skills
4. Test production chains

### Phase 4: Progression Systems (Week 2)
1. Implement UpgradeManager
2. Define upgrade tree
3. Add upgrades UI tab
4. Test upgrades affecting activity stats

### Phase 5: Advanced Features (Week 3)
1. Implement auto-mode for activities
2. Add multi-activity slot system
3. Implement SaveManager with offline progress
4. Add statistics tracking

### Phase 6: Polish (Week 3-4)
1. Add remaining skills (target 8-12 total)
2. Balance tuning (XP curves, costs, durations)
3. Visual polish (animations, effects)
4. Achievement system (optional)
5. Tutorial/onboarding

---

## Testing Requirements

Every system must have:
1. **Unit tests** - Test individual methods in isolation
2. **Integration tests** - Test system interactions
3. **E2E tests** - Test complete user workflows

See TESTING.md for detailed testing strategy and examples.

---

## Design Goals

### Player Experience
- **Accessible**: Easy to understand, hard to master
- **Satisfying**: Constant progression, always something to do
- **Strategic**: Meaningful choices in skill training order
- **Relaxing**: Can play actively or idle

### Technical Goals
- **Testable**: 100% test coverage on core systems
- **Maintainable**: Clear separation of concerns
- **Performant**: Smooth at 60 FPS with 100+ currencies
- **Extensible**: Easy to add new skills/activities/upgrades

---

## Future Considerations (Post-MVP)

- Mastery system for activities
- Achievement/milestone system
- Stat tracking and analytics
- Cloud save sync
- Mobile-friendly UI
- Sound effects and music
- Seasonal events
- Combat system (optional)
- Trading/marketplace (optional)

---

**Document Version:** 1.0.0
**Last Updated:** 2025-10-14
