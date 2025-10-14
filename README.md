# 🎮 Incremental Game - Skill Training Adventure

A modern, feature-rich incremental/idle game built with vanilla JavaScript following Test-Driven Development (TDD) principles.

## 🌟 Features

### Core Gameplay
- **5 Skills** with unique progression paths
- **14 Activities** with time-based completion
- **15 Currency Types** - everything is a currency (no inventory complexity)
- **12 Upgrades** - boost speed, outputs, or reduce costs
- **Auto-Mode** for hands-free grinding
- **Offline Progress** - earn resources while away (up to 8 hours)
- **Save/Load System** with localStorage persistence
- **Production Chains** - advanced activities require outputs from others

### Skills
- 🪓 **Woodcutting** - Gather wood from trees
- ⛏️ **Mining** - Extract ores and minerals
- 🎣 **Fishing** - Catch fish from water
- 🍳 **Cooking** - Transform raw food into meals
- 🐕 **Dog Handling** - Find and train dogs

### Technical Excellence
- ✅ **155 Unit Tests** with 100% pass rate
- ✅ **Test-Driven Development** throughout
- ✅ **Event-Driven Architecture** with pub/sub
- ✅ **Separation of Concerns** - clean architecture
- ✅ **Real-Time Updates** with game loop
- ✅ **Offline Progress** - up to 8 hours simulation
- ✅ **Upgrade System** - 3 types with prerequisites
- ✅ **Responsive Design** - works on mobile

## 🚀 Getting Started

### Installation

```bash
npm install
```

### Development

Start the dev server:
```bash
npm run dev
```

Then open your browser to `http://localhost:5173`

### Building

```bash
npm run build
```

### Testing

```bash
# Run all unit tests
npm run test:unit

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## 🎯 How to Play

1. **Start a Free Activity** - Begin with Woodcutting, Mining, or Fishing
2. **Gather Resources** - Complete activities to gain currencies and XP
3. **Level Up Skills** - Earn XP to unlock new activities
4. **Create Production Chains** - Use resources from one skill in another
5. **Enable Auto-Mode** - Let activities run automatically
6. **Advance Through Tiers** - Progress from gathering to complex production

### Progression Example

1. Chop trees → Get wood
2. Catch shrimp → Get raw shrimp
3. Cook shrimp → Get cooked shrimp
4. Find puppy + cooked shrimp → Train guard dog

## 📊 Test Coverage

```
Test Files: 7 passed (7)
Tests:      155 passed (155)

✅ XP Calculations (17 tests)
✅ EventBus (10 tests)
✅ CurrencyManager (29 tests)
✅ SkillManager (25 tests)
✅ ActivityManager (33 tests)
✅ UpgradeManager (28 tests)
✅ Offline Progress (13 tests)
```

## 🏗️ Architecture

### Core Systems

**GameEngine** - Main game loop and system coordinator
- Manages game state and loop
- Coordinates all managers
- Handles save/load

**EventBus** - Pub/sub for decoupled communication
- Skills, currencies, activities communicate via events
- UI subscribes to game events

**CurrencyManager** - All resource management
- Everything is a currency (no inventory)
- Atomic transactions
- Balance checking

**SkillManager** - XP and leveling
- Track XP per skill
- Calculate levels automatically
- Check unlock requirements

**ActivityManager** - Time-based actions
- Update activities with deltaTime
- Handle completion and rewards
- Support auto-mode
- Apply upgrade effects to duration, costs, and outputs

**UpgradeManager** - Permanent improvements
- Purchase upgrades with currency
- Speed boosts (reduce duration)
- Output bonuses (increase rewards)
- Cost reduction (reduce inputs)

### File Structure

```
clicker-game/
├── docs/              # Design documentation
├── src/
│   ├── core/          # GameEngine, EventBus
│   ├── managers/      # Game system managers
│   ├── data/          # Game content definitions
│   ├── utils/         # Calculation utilities
│   └── main.js        # Entry point & UI
├── tests/
│   ├── unit/          # Unit tests (114 tests)
│   ├── integration/   # Integration tests
│   └── e2e/           # End-to-end tests
└── CLAUDE.md          # AI development guide
```

## 🎨 Design Philosophy

### Core Principles
- **Everything is Currency** - No complex inventory management
- **Time-Based Activities** - Each activity takes 2-8 seconds
- **Free Bootstrap** - Level 1 activities are always FREE
- **Interconnected Economy** - Skills depend on each other
- **Progressive Complexity** - Start simple, unlock depth

### Technical Principles
- **Test-Driven Development** - Tests written before code
- **100% Test Coverage** - All core systems fully tested
- **Event-Driven** - Loose coupling via pub/sub
- **Pure Functions** - Predictable, testable code
- **Separation of Concerns** - Clean architecture

## 🔧 Development

### TDD Workflow

1. **RED** - Write failing test
2. **GREEN** - Write minimal code to pass
3. **REFACTOR** - Improve code quality
4. **COMMIT** - Save working state

### Adding New Content

**New Currency:**
```javascript
// src/data/currencies.js
export const currencies = {
  newItem: {
    id: 'newItem',
    name: 'New Item',
    description: 'Description',
    icon: '🎁'
  }
}
```

**New Activity:**
```javascript
// src/data/activities.js
{
  id: 'newActivity',
  name: 'New Activity',
  skillId: 'woodcutting',
  levelRequired: 10,
  inputs: { wood: 5 },
  outputs: { newItem: 1 },
  duration: 3,
  xpGained: 15,
  description: 'Do something cool'
}
```

## 📈 Future Enhancements

- [x] ~~Offline progress calculation~~ ✅ Completed!
- [x] ~~Upgrade system for boosting activities~~ ✅ Completed!
- [ ] More skills (Smithing, Crafting, Alchemy, Trading)
- [ ] Achievement system
- [ ] Prestige/rebirth mechanics
- [ ] Visual effects and animations
- [ ] Sound effects
- [ ] Mobile app version

## 🤝 Contributing

This project follows strict TDD principles:
1. Write tests first
2. Make tests pass
3. Refactor
4. Commit

See `CLAUDE.md` for detailed development guidelines.

## 📝 License

ISC

## 🙏 Acknowledgments

Built following the design documents in `docs/`:
- DESIGN.md - System architecture
- TESTING.md - Testing strategy
- EXAMPLES.md - Skill/activity examples

Developed with Claude Code using Test-Driven Development throughout.
