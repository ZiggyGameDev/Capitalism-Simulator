# Game Testing Guide

## How to Play & Test the Worker System

### 🎮 Open the Game
Navigate to: **http://localhost:5173**

---

## 🌱 Phase 1: Getting Started (Farming)

### Step 1: Start with Farming
1. Click on **Farming** skill in the left panel (should be auto-selected)
2. You'll see activities like:
   - Plant Wheat by Hand (FREE)
   - Plant Corn
   - Grow Tomatoes (needs water)
   - Harvest Potatoes (needs water)

### Step 2: Gather Basic Resources
1. Click on **Gathering** skill
2. Start these FREE activities:
   - **Chop Wood** (2s) → produces wood
   - **Mine Stone** (3s) → produces stone
   - **Fetch Water** (2s) → produces water
3. Let them run and auto-restart

### Step 3: Start Your First Activity
1. Click **▶ Start** on "Plant Wheat by Hand"
2. Watch the progress bar fill up
3. When complete, you'll get 1 wheat + 5 XP
4. Click the **🔁 Auto OFF** button to enable auto-mode

---

## 🔨 Phase 2: Crafting & Production Chains

### Step 4: Craft Stone Tools
1. Switch to **Crafting** skill
2. Once you have stone + wood, craft **Stone Tools**
3. This creates production chains (tools needed for other activities)

### Step 5: Progress Through Skills
- **Manufacturing** - Unlocks at higher levels, uses machines
- **Engineering** - Build machines, refine materials
- **Automation** - This is where workers appear!

---

## 🤖 Phase 3: TESTING THE WORKER SYSTEM

### Step 6: Produce Worker Units
1. Progress until you unlock **Automation** skill activities
2. Look for activities that produce **workerUnit** currency (👤)
3. Some activities convert other resources into workerUnit
4. These represent "fungible human labor" (dark theme!)

### Step 7: Hire Your First Worker
1. Once you have workerUnit currency, check the **Workers** panel (right side)
2. Click **👤 Hire Worker** button
3. This converts 1 workerUnit into 1 actual worker
4. You'll see: "Total: 1, Available: 1"

### Step 8: Assign Workers to Activities
1. In the Workers panel, you'll see all your unlocked activities
2. Click the **+** button next to any activity to assign a worker
3. The activity will now show **🤖 Automated (0.5x speed)**
4. This means:
   - Activity runs automatically
   - Takes TWICE as long (half speed)
   - No manual clicking needed!

### Step 9: Test Worker Assignment
1. Try assigning workers to different activities
2. Use **-** button to unassign workers
3. Watch how activity duration changes in the activity panel
4. Available workers decreases as you assign them

---

## 🌌 Phase 4: End Game Content

### Step 10: Progress to Post-Human
As you level up and unlock more skills, you'll see:
- **Computing** - Harvest data, develop algorithms, train AI
- **Research** - Develop nanobots, quantum processors
- **Singularity** - Digitize consciousness, transcend material form

### Dark Theme Features
Look for these thematic elements:
- "Humans are fungible resources"
- "No breaks, no complaints" (robotic workers)
- "Your perfect replacement"
- "Humanity was merely the bootstrap"

---

## ✨ Testing Checklist

### Basic Features
- [ ] Activities start and complete
- [ ] Progress bars animate smoothly
- [ ] Currency ticker updates in real-time
- [ ] XP gained, levels increase
- [ ] Skill tabs switch correctly
- [ ] Auto-mode works (activities restart)

### Worker System
- [ ] workerUnit currency appears in ticker
- [ ] Hire Worker button appears when you have workerUnit
- [ ] Clicking hire converts currency to workers
- [ ] Worker count shown (Total/Available)
- [ ] Can assign workers with + button
- [ ] Can unassign workers with - button
- [ ] Activities show "🤖 Automated" when workers assigned
- [ ] Activities take twice as long with workers
- [ ] Available workers count decreases when assigned

### Save/Load
- [ ] Click 💾 Save button
- [ ] Refresh the page
- [ ] Game loads with all progress restored
- [ ] Workers and assignments persist

### Offline Progress
- [ ] Save the game
- [ ] Close the tab
- [ ] Wait 1-2 minutes
- [ ] Reopen the game
- [ ] You'll see "Welcome back!" notification
- [ ] Auto-activities completed while offline

---

## 🐛 Known Behaviors

1. **Workers are SLOWER** - This is intentional! They automate but at half speed
2. **Need resources first** - You need to earn workerUnit before hiring workers
3. **One worker per activity** - Each assignment takes 1 worker (but you can assign multiple if you have enough)
4. **Different skills** - Workers can be assigned to any unlocked activity across all skills

---

## 🎯 Quick Test Scenario

**5-Minute Test:**
1. Start "Chop Wood" and "Fetch Water" on auto
2. Craft Stone Tools once you have materials
3. Progress through Farming activities
4. Unlock Manufacturing skill
5. Find an activity that produces workerUnit
6. Hire a worker
7. Assign worker to an activity
8. Watch it run automatically at half speed!

---

## 💾 Save & Reset

- **Save:** Click 💾 button (auto-saves every 30 seconds)
- **Reset:** Click 🔄 button to start fresh (confirms before resetting)

---

## 🎨 UI Layout

```
┌─────────────────────────────────────────────────────┐
│  Currency Ticker (shows all your resources)         │
├──────────┬─────────────────────┬────────────────────┤
│          │                     │  Active Activities │
│  Skills  │    Activities       ├────────────────────┤
│  (Left)  │     (Center)        │  🤖 Workers Panel  │
│          │                     ├────────────────────┤
│  📦      │   Activity Items    │  ✨ Upgrades       │
│          │   with progress     │                    │
└──────────┴─────────────────────┴────────────────────┘
```

Happy Testing! 🚀
