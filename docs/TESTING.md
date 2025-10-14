# Testing Strategy - Incremental Game

## Overview

This document outlines the comprehensive testing strategy for the incremental game. We follow **Test-Driven Development (TDD)** where tests are written before implementation.

### Testing Pyramid
```
           ╱────────╲
          ╱  E2E (5) ╲         Full user scenarios with time manipulation
         ╱────────────╲
        ╱ Integration  ╲       System interactions
       ╱   Tests (15)   ╲
      ╱──────────────────╲
     ╱   Unit Tests (50)  ╲    Individual functions/methods
    ╱──────────────────────╲
```

---

## TDD Workflow

### Red-Green-Refactor Cycle

1. **RED** - Write a failing test
   ```javascript
   test('CurrencyManager can add currency', () => {
     const cm = new CurrencyManager()
     cm.add('wood', 10)
     expect(cm.get('wood')).toBe(10)  // FAILS - not implemented yet
   })
   ```

2. **GREEN** - Write minimal code to pass
   ```javascript
   class CurrencyManager {
     constructor() { this.currencies = {} }
     add(id, amount) { this.currencies[id] = (this.currencies[id] || 0) + amount }
     get(id) { return this.currencies[id] || 0 }
   }
   ```

3. **REFACTOR** - Improve code while keeping tests green
   - Extract methods
   - Remove duplication
   - Improve naming

### Development Process

For each feature:
1. Read design spec from DESIGN.md
2. Write unit tests for all public methods
3. Implement class/function to pass tests
4. Write integration tests for interactions
5. Write E2E tests for user workflows
6. Refactor and optimize

---

## Unit Tests

### Purpose
Test individual functions and methods in isolation.

### Framework
Vitest (fast, Vite-native) or Jest

### Coverage Target
- 100% coverage on all manager classes
- 100% coverage on utility functions
- All public methods tested
- Edge cases covered

### Structure

#### CurrencyManager Tests
```javascript
// tests/unit/managers/CurrencyManager.test.js

import { describe, it, expect, beforeEach } from 'vitest'
import { CurrencyManager } from '../../../src/managers/CurrencyManager'

describe('CurrencyManager', () => {
  let cm

  beforeEach(() => {
    cm = new CurrencyManager()
  })

  describe('add()', () => {
    it('should add currency to empty manager', () => {
      cm.add('wood', 10)
      expect(cm.get('wood')).toBe(10)
    })

    it('should accumulate currency', () => {
      cm.add('wood', 10)
      cm.add('wood', 5)
      expect(cm.get('wood')).toBe(15)
    })

    it('should handle multiple currency types', () => {
      cm.add('wood', 10)
      cm.add('stone', 5)
      expect(cm.get('wood')).toBe(10)
      expect(cm.get('stone')).toBe(5)
    })

    it('should handle decimal amounts', () => {
      cm.add('wood', 10.5)
      cm.add('wood', 2.3)
      expect(cm.get('wood')).toBe(12.8)
    })
  })

  describe('subtract()', () => {
    it('should subtract currency', () => {
      cm.add('wood', 10)
      const success = cm.subtract('wood', 3)
      expect(success).toBe(true)
      expect(cm.get('wood')).toBe(7)
    })

    it('should fail if insufficient currency', () => {
      cm.add('wood', 5)
      const success = cm.subtract('wood', 10)
      expect(success).toBe(false)
      expect(cm.get('wood')).toBe(5)  // Unchanged
    })

    it('should handle subtracting non-existent currency', () => {
      const success = cm.subtract('wood', 5)
      expect(success).toBe(false)
    })
  })

  describe('has()', () => {
    it('should return true if sufficient currency', () => {
      cm.add('wood', 10)
      expect(cm.has('wood', 5)).toBe(true)
      expect(cm.has('wood', 10)).toBe(true)
    })

    it('should return false if insufficient', () => {
      cm.add('wood', 5)
      expect(cm.has('wood', 10)).toBe(false)
    })

    it('should return false for non-existent currency', () => {
      expect(cm.has('wood', 1)).toBe(false)
    })
  })

  describe('canAfford()', () => {
    it('should return true if can afford all costs', () => {
      cm.add('wood', 10)
      cm.add('stone', 5)
      expect(cm.canAfford({ wood: 5, stone: 2 })).toBe(true)
    })

    it('should return false if missing any currency', () => {
      cm.add('wood', 10)
      cm.add('stone', 5)
      expect(cm.canAfford({ wood: 5, stone: 10 })).toBe(false)
    })

    it('should handle empty cost object', () => {
      expect(cm.canAfford({})).toBe(true)
    })
  })

  describe('getAll()', () => {
    it('should return all currencies', () => {
      cm.add('wood', 10)
      cm.add('stone', 5)
      expect(cm.getAll()).toEqual({ wood: 10, stone: 5 })
    })

    it('should return empty object if no currencies', () => {
      expect(cm.getAll()).toEqual({})
    })
  })

  describe('reset()', () => {
    it('should clear all currencies', () => {
      cm.add('wood', 10)
      cm.add('stone', 5)
      cm.reset()
      expect(cm.getAll()).toEqual({})
    })
  })
})
```

#### SkillManager Tests
```javascript
// tests/unit/managers/SkillManager.test.js

describe('SkillManager', () => {
  let sm
  const skills = [
    { id: 'woodcutting', name: 'Woodcutting', activities: [] },
    { id: 'mining', name: 'Mining', activities: [] }
  ]

  beforeEach(() => {
    sm = new SkillManager(skills)
  })

  describe('addXP()', () => {
    it('should add XP to skill', () => {
      sm.addXP('woodcutting', 50)
      expect(sm.getXP('woodcutting')).toBe(50)
    })

    it('should level up when XP threshold reached', () => {
      sm.addXP('woodcutting', 100)  // Level 2 threshold
      expect(sm.getLevel('woodcutting')).toBe(2)
    })

    it('should emit levelup event', () => {
      const levelupSpy = vi.fn()
      sm.on('skill:levelup', levelupSpy)
      sm.addXP('woodcutting', 100)
      expect(levelupSpy).toHaveBeenCalledWith({ skillId: 'woodcutting', newLevel: 2 })
    })

    it('should level up multiple times if enough XP', () => {
      sm.addXP('woodcutting', 500)
      expect(sm.getLevel('woodcutting')).toBeGreaterThan(2)
    })
  })

  describe('getLevel()', () => {
    it('should return 1 for new skill', () => {
      expect(sm.getLevel('woodcutting')).toBe(1)
    })

    it('should calculate level from XP', () => {
      sm.addXP('woodcutting', 100)
      expect(sm.getLevel('woodcutting')).toBe(2)
    })
  })

  describe('getXPProgress()', () => {
    it('should return progress to next level', () => {
      sm.addXP('woodcutting', 50)
      const progress = sm.getXPProgress('woodcutting')
      expect(progress).toEqual({
        current: 50,
        needed: 100,
        percent: 0.5
      })
    })
  })

  describe('isActivityUnlocked()', () => {
    it('should return true if level requirement met', () => {
      const activities = [
        { id: 'chopTree', skillId: 'woodcutting', levelRequired: 1 },
        { id: 'chopOak', skillId: 'woodcutting', levelRequired: 5 }
      ]
      sm = new SkillManager(skills, activities)
      sm.addXP('woodcutting', 500)  // Get to level 5+
      expect(sm.isActivityUnlocked('chopTree')).toBe(true)
      expect(sm.isActivityUnlocked('chopOak')).toBe(true)
    })

    it('should return false if level too low', () => {
      const activities = [
        { id: 'chopOak', skillId: 'woodcutting', levelRequired: 5 }
      ]
      sm = new SkillManager(skills, activities)
      expect(sm.isActivityUnlocked('chopOak')).toBe(false)
    })
  })

  describe('getPlayerLevel()', () => {
    it('should return sum of all skill levels', () => {
      sm.addXP('woodcutting', 100)  // Level 2
      sm.addXP('mining', 100)       // Level 2
      expect(sm.getPlayerLevel()).toBe(4)
    })
  })
})
```

#### ActivityManager Tests
```javascript
// tests/unit/managers/ActivityManager.test.js

describe('ActivityManager', () => {
  let am, cm, sm
  const activities = [
    {
      id: 'chopTree',
      skillId: 'woodcutting',
      levelRequired: 1,
      inputs: {},
      outputs: { wood: 1 },
      duration: 2,
      xpGained: 5
    },
    {
      id: 'trainDog',
      skillId: 'dogHandling',
      levelRequired: 5,
      inputs: { puppy: 1, food: 3 },
      outputs: { guardDog: 1 },
      duration: 5,
      xpGained: 25
    }
  ]

  beforeEach(() => {
    cm = new CurrencyManager()
    sm = new SkillManager([{ id: 'woodcutting' }, { id: 'dogHandling' }], activities)
    am = new ActivityManager(activities, cm, sm)
  })

  describe('canStart()', () => {
    it('should return true if all requirements met', () => {
      expect(am.canStart('chopTree')).toBe(true)
    })

    it('should return false if level requirement not met', () => {
      expect(am.canStart('trainDog')).toBe(false)
    })

    it('should return false if missing currency', () => {
      sm.addXP('dogHandling', 500)  // Get to level 5+
      expect(am.canStart('trainDog')).toBe(false)  // Missing puppy + food
    })

    it('should return true if all requirements met', () => {
      sm.addXP('dogHandling', 500)
      cm.add('puppy', 1)
      cm.add('food', 3)
      expect(am.canStart('trainDog')).toBe(true)
    })
  })

  describe('start()', () => {
    it('should start activity if requirements met', () => {
      am.start('chopTree')
      const active = am.getActiveActivities()
      expect(active).toHaveLength(1)
      expect(active[0].activityId).toBe('chopTree')
    })

    it('should throw if requirements not met', () => {
      expect(() => am.start('trainDog')).toThrow()
    })

    it('should prevent starting same activity twice', () => {
      am.start('chopTree')
      expect(() => am.start('chopTree')).toThrow()
    })
  })

  describe('update()', () => {
    it('should update activity progress', () => {
      am.start('chopTree')
      am.update(1000)  // 1 second passed
      const progress = am.getProgress('chopTree')
      expect(progress).toBeCloseTo(0.5)  // 1s / 2s = 50%
    })

    it('should complete activity when time elapsed', () => {
      am.start('chopTree')
      const completeSpy = vi.fn()
      am.on('activity:completed', completeSpy)

      am.update(2000)  // Full duration

      expect(completeSpy).toHaveBeenCalled()
      expect(cm.get('wood')).toBe(1)
      expect(sm.getXP('woodcutting')).toBe(5)
      expect(am.getActiveActivities()).toHaveLength(0)
    })

    it('should consume inputs on completion', () => {
      sm.addXP('dogHandling', 500)
      cm.add('puppy', 1)
      cm.add('food', 3)

      am.start('trainDog')
      am.update(5000)

      expect(cm.get('puppy')).toBe(0)
      expect(cm.get('food')).toBe(0)
      expect(cm.get('guardDog')).toBe(1)
    })

    it('should restart if auto-mode enabled', () => {
      am.start('chopTree', { autoMode: true })
      am.update(2000)

      // Should auto-restart
      const active = am.getActiveActivities()
      expect(active).toHaveLength(1)
    })

    it('should stop auto-mode if cannot afford', () => {
      sm.addXP('dogHandling', 500)
      cm.add('puppy', 1)
      cm.add('food', 3)

      am.start('trainDog', { autoMode: true })
      am.update(5000)

      // Only had resources for 1 completion
      expect(am.getActiveActivities()).toHaveLength(0)
    })
  })

  describe('stopActivity()', () => {
    it('should stop running activity', () => {
      am.start('chopTree')
      am.stopActivity('chopTree')
      expect(am.getActiveActivities()).toHaveLength(0)
    })

    it('should not grant rewards if stopped early', () => {
      am.start('chopTree')
      am.update(1000)  // Only halfway
      am.stopActivity('chopTree')

      expect(cm.get('wood')).toBe(0)
      expect(sm.getXP('woodcutting')).toBe(0)
    })
  })
})
```

#### Utility Function Tests
```javascript
// tests/unit/utils/calculations.test.js

import { xpForLevel, levelFromXP, calculateCost } from '../../../src/utils/calculations'

describe('XP Calculations', () => {
  describe('xpForLevel()', () => {
    it('should return 0 for level 1', () => {
      expect(xpForLevel(1)).toBe(0)
    })

    it('should return 100 for level 2', () => {
      expect(xpForLevel(2)).toBe(100)
    })

    it('should use exponential growth', () => {
      expect(xpForLevel(5)).toBe(175)
      expect(xpForLevel(10)).toBe(404)
      expect(xpForLevel(50)).toBeGreaterThan(100000)
    })
  })

  describe('levelFromXP()', () => {
    it('should return 1 for 0 XP', () => {
      expect(levelFromXP(0)).toBe(1)
    })

    it('should return correct level for XP thresholds', () => {
      expect(levelFromXP(100)).toBe(2)
      expect(levelFromXP(175)).toBe(5)
      expect(levelFromXP(404)).toBe(10)
    })

    it('should handle XP between levels', () => {
      expect(levelFromXP(150)).toBe(3)
    })
  })
})
```

---

## Integration Tests

### Purpose
Test interactions between multiple systems.

### Key Integration Points
1. Activity execution → Currency changes + XP gains
2. Leveling up → New activities unlocked
3. Upgrades → Activity stats modified
4. Save/Load → State preserved
5. Offline progress → Auto-activities simulated

### Structure

```javascript
// tests/integration/activity-execution.test.js

describe('Activity Execution Integration', () => {
  let game

  beforeEach(() => {
    game = createGame()  // Helper that initializes all systems
  })

  it('should complete full activity cycle', () => {
    // Start activity
    game.activityManager.start('chopTree')

    // Simulate time
    game.update(2000)

    // Verify all systems updated
    expect(game.currencyManager.get('wood')).toBe(1)
    expect(game.skillManager.getXP('woodcutting')).toBe(5)
    expect(game.activityManager.getActiveActivities()).toHaveLength(0)
  })

  it('should chain production activities', () => {
    // Set up: Get resources from first activity
    game.currencyManager.add('puppy', 1)
    game.currencyManager.add('food', 3)
    game.skillManager.addXP('dogHandling', 500)  // Unlock trainDog

    // Execute chained activity
    game.activityManager.start('trainDog')
    game.update(5000)

    // Verify transformation
    expect(game.currencyManager.get('puppy')).toBe(0)
    expect(game.currencyManager.get('food')).toBe(0)
    expect(game.currencyManager.get('guardDog')).toBe(1)
  })

  it('should apply upgrade multipliers to activities', () => {
    // Purchase speed upgrade
    game.currencyManager.add('wood', 1000)
    game.upgradeManager.purchase('woodcuttingSpeed1')  // -10% time

    // Start activity (should be faster now)
    game.activityManager.start('chopTree')
    game.update(1800)  // 2s * 0.9 = 1.8s

    expect(game.currencyManager.get('wood')).toBe(1)  // Should complete
  })
})
```

```javascript
// tests/integration/skill-leveling.test.js

describe('Skill Leveling Integration', () => {
  let game

  beforeEach(() => {
    game = createGame()
  })

  it('should unlock activities when leveling up', () => {
    // Activity locked initially
    expect(game.activityManager.canStart('chopOak')).toBe(false)

    // Gain XP to reach level 5
    game.skillManager.addXP('woodcutting', 500)

    // Activity now unlocked
    expect(game.activityManager.canStart('chopOak')).toBe(true)
  })

  it('should increase player level when skills level', () => {
    const initialPlayerLevel = game.skillManager.getPlayerLevel()

    game.skillManager.addXP('woodcutting', 100)
    game.skillManager.addXP('mining', 100)

    expect(game.skillManager.getPlayerLevel()).toBeGreaterThan(initialPlayerLevel)
  })
})
```

```javascript
// tests/integration/save-load.test.js

describe('Save/Load Integration', () => {
  it('should preserve all game state', () => {
    const game1 = createGame()

    // Make progress
    game1.currencyManager.add('wood', 100)
    game1.skillManager.addXP('woodcutting', 250)
    game1.upgradeManager.purchase('woodcuttingSpeed1')

    // Save
    const saveData = game1.saveManager.save()

    // Create new game and load
    const game2 = createGame()
    game2.saveManager.load(saveData)

    // Verify state preserved
    expect(game2.currencyManager.get('wood')).toBe(100)
    expect(game2.skillManager.getXP('woodcutting')).toBe(250)
    expect(game2.upgradeManager.isPurchased('woodcuttingSpeed1')).toBe(true)
  })

  it('should calculate offline progress', () => {
    const game = createGame()

    // Start auto-activity
    game.activityManager.start('chopTree', { autoMode: true })

    // Save and simulate time away
    const saveData = game.saveManager.save()
    const timeAway = 60 * 1000  // 1 minute

    // Load with offline progress
    game.saveManager.load(saveData, timeAway)

    // Should have completed ~30 activities (2s each)
    expect(game.currencyManager.get('wood')).toBeCloseTo(30, 0)
  })
})
```

---

## E2E Tests with Time Manipulation

### Purpose
Test complete user workflows with time control for faster testing.

### TestController

Special helper class for E2E tests that provides:
- Time manipulation (fast-forward, instant complete)
- State inspection
- Custom assertions

```javascript
// tests/e2e/helpers/TestController.js

export class TestController {
  constructor(game) {
    this.game = game
  }

  // Time manipulation
  fastForward(seconds) {
    const ms = seconds * 1000
    this.game.update(ms)
  }

  tick(ms = 100) {
    this.game.update(ms)
  }

  completeActivity(activityId) {
    const activity = this.game.activityManager.getActivity(activityId)
    if (!activity) throw new Error(`Activity ${activityId} not active`)
    this.fastForward(activity.duration)
  }

  // Activity control
  selectActivity(activityId) {
    this.game.activityManager.start(activityId)
  }

  stopActivity(activityId) {
    this.game.activityManager.stopActivity(activityId)
  }

  enableAutoMode(activityId) {
    this.game.activityManager.setAutoMode(activityId, true)
  }

  // State manipulation
  setCurrency(currencyId, amount) {
    this.game.currencyManager.set(currencyId, amount)
  }

  setSkillLevel(skillId, level) {
    const xpNeeded = xpForLevel(level)
    this.game.skillManager.setXP(skillId, xpNeeded)
  }

  // State inspection
  getCurrency(currencyId) {
    return this.game.currencyManager.get(currencyId)
  }

  getSkillLevel(skillId) {
    return this.game.skillManager.getLevel(skillId)
  }

  getPlayerLevel() {
    return this.game.skillManager.getPlayerLevel()
  }

  isActivityUnlocked(activityId) {
    return this.game.activityManager.canStart(activityId)
  }
}
```

### Custom Assertions

```javascript
// tests/e2e/helpers/assertions.js

export function expectCurrency(testController, currencyId, expected) {
  const actual = testController.getCurrency(currencyId)
  if (actual !== expected) {
    throw new Error(`Expected ${currencyId}: ${expected}, got: ${actual}`)
  }
}

export function expectSkillLevel(testController, skillId, expected) {
  const actual = testController.getSkillLevel(skillId)
  if (actual !== expected) {
    throw new Error(`Expected ${skillId} level: ${expected}, got: ${actual}`)
  }
}

export function expectPlayerLevel(testController, expected) {
  const actual = testController.getPlayerLevel()
  if (actual !== expected) {
    throw new Error(`Expected player level: ${expected}, got: ${actual}`)
  }
}

export function expectActivityUnlocked(testController, activityId) {
  const unlocked = testController.isActivityUnlocked(activityId)
  if (!unlocked) {
    throw new Error(`Expected activity ${activityId} to be unlocked`)
  }
}

export function expectActivityLocked(testController, activityId) {
  const unlocked = testController.isActivityUnlocked(activityId)
  if (unlocked) {
    throw new Error(`Expected activity ${activityId} to be locked`)
  }
}
```

### E2E Test Scenarios

```javascript
// tests/e2e/scenarios/bootstrap.spec.js

import { test, expect } from '@playwright/test'
import { TestController } from '../helpers/TestController'
import { expectCurrency, expectSkillLevel } from '../helpers/assertions'

test('Player can bootstrap economy from level 1', async ({ page }) => {
  await page.goto('/')

  // Initialize test controller
  const tc = new TestController(await page.evaluate(() => window.game))

  // Start free activity
  await tc.selectActivity('chopTree')

  // Fast-forward to complete 5 activities (10 seconds)
  await tc.fastForward(10)

  // Verify outputs
  expectCurrency(tc, 'wood', 5)
  expectSkillLevel(tc, 'woodcutting', 1)

  // Continue to level up
  await tc.fastForward(50)  // 25 more completions (30 total)

  expectCurrency(tc, 'wood', 30)
  expectSkillLevel(tc, 'woodcutting', 2)  // Should have leveled
})
```

```javascript
// tests/e2e/scenarios/production-chain.spec.js

test('Complex production chain works end-to-end', async ({ page }) => {
  await page.goto('/')
  const tc = new TestController(await page.evaluate(() => window.game))

  // Phase 1: Gather base resources
  await tc.selectActivity('chopTree')
  await tc.fastForward(20)  // Get 10 wood
  expectCurrency(tc, 'wood', 10)

  await tc.selectActivity('hunt')
  await tc.fastForward(30)  // Get 10 meat
  expectCurrency(tc, 'meat', 10)

  // Phase 2: Process resources
  await tc.selectActivity('cookMeat')
  await tc.fastForward(15)  // Cook 5 meat
  expectCurrency(tc, 'cookedMeat', 5)
  expectCurrency(tc, 'meat', 5)  // 5 remaining

  // Phase 3: Use processed goods in advanced activity
  await tc.setSkillLevel('dogHandling', 5)  // Unlock dog training
  await tc.selectActivity('findPuppy')
  await tc.fastForward(3)
  expectCurrency(tc, 'puppy', 1)

  await tc.selectActivity('trainGuardDog')
  await tc.fastForward(5)

  expectCurrency(tc, 'puppy', 0)      // Consumed
  expectCurrency(tc, 'cookedMeat', 2) // Consumed 3
  expectCurrency(tc, 'guardDog', 1)   // Produced
})
```

```javascript
// tests/e2e/scenarios/leveling.spec.js

test('Leveling unlocks new activities', async ({ page }) => {
  await page.goto('/')
  const tc = new TestController(await page.evaluate(() => window.game))

  // Check initial state
  expectActivityUnlocked(tc, 'chopTree')      // Level 1
  expectActivityLocked(tc, 'chopOak')         // Level 5
  expectActivityLocked(tc, 'chopMagic')       // Level 30

  // Grind to level 5
  await tc.selectActivity('chopTree')
  await tc.enableAutoMode('chopTree')
  await tc.fastForward(200)  // 100 completions

  // Verify level 5 activity unlocked
  expectSkillLevel(tc, 'woodcutting', 5)
  expectActivityUnlocked(tc, 'chopOak')
  expectActivityLocked(tc, 'chopMagic')  // Still locked

  // Switch to better activity
  await tc.stopActivity('chopTree')
  await tc.selectActivity('chopOak')
  await tc.enableAutoMode('chopOak')
  await tc.fastForward(1000)  // More grinding

  // Verify high level activity unlocked
  expectSkillLevel(tc, 'woodcutting', 30)
  expectActivityUnlocked(tc, 'chopMagic')
})
```

```javascript
// tests/e2e/scenarios/offline-progress.spec.js

test('Offline progress calculates correctly', async ({ page }) => {
  await page.goto('/')
  const tc = new TestController(await page.evaluate(() => window.game))

  // Set up auto-activities
  await tc.setCurrency('wood', 100)
  await tc.selectActivity('chopTree')
  await tc.enableAutoMode('chopTree')

  // Simulate saving and leaving
  await page.evaluate(() => window.game.saveManager.save())

  // Simulate 1 hour offline (3600 seconds)
  // Activity takes 2s, so should complete 1800 times
  await page.evaluate(() => {
    const saveData = window.game.saveManager.load()
    window.game.saveManager.calculateOfflineProgress(3600 * 1000)
  })

  // Verify gains
  expectCurrency(tc, 'wood', 1900)  // 100 + 1800
  expect(tc.getSkillLevel('woodcutting')).toBeGreaterThan(5)
})
```

---

## Test Organization

### Directory Structure
```
tests/
├── unit/
│   ├── managers/
│   │   ├── CurrencyManager.test.js
│   │   ├── SkillManager.test.js
│   │   ├── ActivityManager.test.js
│   │   └── UpgradeManager.test.js
│   └── utils/
│       └── calculations.test.js
├── integration/
│   ├── activity-execution.test.js
│   ├── skill-leveling.test.js
│   ├── upgrade-effects.test.js
│   └── save-load.test.js
└── e2e/
    ├── helpers/
    │   ├── TestController.js
    │   └── assertions.js
    └── scenarios/
        ├── bootstrap.spec.js
        ├── production-chain.spec.js
        ├── leveling.spec.js
        └── offline-progress.spec.js
```

### Running Tests

```bash
# Unit tests (fast)
npm test:unit

# Integration tests
npm test:integration

# E2E tests
npm test:e2e

# All tests
npm test

# Watch mode during development
npm test:watch

# Coverage report
npm test:coverage
```

---

## Test Coverage Goals

| Component | Unit | Integration | E2E |
|-----------|------|-------------|-----|
| CurrencyManager | 100% | ✓ | ✓ |
| SkillManager | 100% | ✓ | ✓ |
| ActivityManager | 100% | ✓ | ✓ |
| UpgradeManager | 100% | ✓ | ✓ |
| SaveManager | 100% | ✓ | ✓ |
| Calculations | 100% | - | - |
| UI Components | 80% | - | ✓ |

---

## Testing Best Practices

### 1. Write Tests First (TDD)
Always write the test before the implementation. This ensures:
- You think about the API design
- You catch edge cases early
- Code is naturally testable

### 2. Test Behavior, Not Implementation
```javascript
// BAD - Testing implementation details
expect(cm.currencies.wood).toBe(10)

// GOOD - Testing public API
expect(cm.get('wood')).toBe(10)
```

### 3. Use Descriptive Test Names
```javascript
// BAD
it('test 1', () => { ... })

// GOOD
it('should add currency to empty manager', () => { ... })
```

### 4. Arrange-Act-Assert Pattern
```javascript
it('should subtract currency', () => {
  // Arrange
  const cm = new CurrencyManager()
  cm.add('wood', 10)

  // Act
  const success = cm.subtract('wood', 3)

  // Assert
  expect(success).toBe(true)
  expect(cm.get('wood')).toBe(7)
})
```

### 5. Test Edge Cases
- Empty states
- Negative numbers
- Very large numbers
- Invalid inputs
- Boundary conditions

### 6. Keep Tests Independent
Each test should be able to run in isolation. Use `beforeEach` for setup.

### 7. Use Test Helpers
Extract common setup/assertions to helpers to reduce duplication.

---

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

---

## Performance Testing (Future)

Track metrics:
- Time to complete 1000 activities
- Memory usage with 100+ currencies
- Frame rate with animations
- Save/load time

---

**Document Version:** 1.0.0
**Last Updated:** 2025-10-14
