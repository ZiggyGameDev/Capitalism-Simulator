# Worker Visual System - Architecture Plan

## Overview
Transform the game from an abstract activity automation system to a visual worker simulation where individual workers physically move, harvest resources, and return with goods.

---

## Current System (To Be Removed)

### What Exists Now
- **ActivityManager**: Activities have durations, workers reduce duration
- **WorkerManager**: Assigns workers to activities, calculates speed multipliers
- **Activity Cards**: Shows progress bars and automation status
- **Active Activities Panel**: Lists running activities
- **Automation Model**: Workers make activities complete faster

### Problems with Current System
- Abstract/invisible - no visual feedback
- Workers are just speed multipliers
- No sense of individual worker behavior
- No resource scarcity or management
- Activities complete instantly if resources available

---

## New System (To Be Implemented)

### Core Concepts

#### 1. Resource Nodes
Resources are physical locations that regenerate over time:

```javascript
{
  id: 'wheatField',
  type: 'wheat',
  position: { x: 100, y: 200 },
  available: 15,        // Current amount available
  capacity: 20,         // Maximum that can exist
  spawnRate: 0.5,       // Units per second regeneration
  harvestTime: 2,       // Seconds per unit to harvest
  upgrades: {
    capacity: 0,        // Upgrade level for max capacity
    spawnRate: 0        // Upgrade level for regeneration speed
  }
}
```

**Key Features:**
- Resources regenerate passively (spawn rate)
- Resources have a cap (capacity)
- Can't harvest if available = 0
- Upgrades increase capacity and spawn rate

#### 2. Worker Entities
Workers are individual actors with state and position:

```javascript
{
  id: 'worker_1',
  type: 'basicWorker',
  state: 'walking_to',  // idle, walking_to, harvesting, walking_back, depositing
  position: { x: 800, y: 300 },
  target: 'wheatField',
  carrying: null,       // What resource they're carrying
  speeds: {
    walkSpeed: 100,     // pixels/second
    carrySpeed: 60,     // pixels/second when carrying
    harvestSpeed: 1     // multiplier for harvest time
  },
  stateTimer: 0,        // Time in current state
  randomOffset: 0.2     // Random delay (0-0.5s) to prevent stacking
}
```

**State Machine:**
1. **idle**: Worker at home base, waiting for assignment
2. **walking_to**: Moving from right → left toward resource node
3. **harvesting**: At resource, playing harvest animation
4. **walking_back**: Moving left → right carrying resource (slower)
5. **depositing**: At home base, delivering resource

**Worker AI Logic:**
```
Loop:
  1. Check assigned resource node
  2. If node has available resources:
     - Walk to node
     - Harvest 1 unit (check if still available when arrive)
     - Walk back to base
     - Deposit resource
     - Apply random offset delay
     - Repeat
  3. If node empty:
     - Wait at base (idle state)
     - Check again periodically
```

#### 3. Visual Rendering System
Canvas-based rendering for smooth animations:

```javascript
// Game world coordinates
const WORLD = {
  width: 1000,
  height: 600,
  homeBase: { x: 900, y: 300 },  // Right side
  resourceZone: { x: 100, y: 300 } // Left side
}

// Each frame:
render() {
  // Draw background
  // Draw resource nodes (with available count)
  // Draw workers (sprite + position)
  // Draw UI overlays
}
```

**Visual Elements:**
- Worker sprites (emoji or simple graphics)
- Resource node graphics
- Movement animations
- Harvest animations
- Particle effects for deposits

#### 4. Simulation System
Under-the-hood calculations:

```javascript
// Time calculations
movementTime = distance / speed
harvestTime = baseHarvestTime / workerHarvestSpeed
totalCycleTime = (movementTime * 2) + harvestTime + randomOffset

// Resource regeneration
everySecond: node.available = Math.min(
  node.available + node.spawnRate,
  node.capacity
)

// Throughput
with 2 workers: ~2x throughput (not 2x speed)
each worker operates independently
```

---

## Migration Plan

### Phase 1: Core Systems (Foundation)
**Priority: Critical | Estimated: 4 hours**

#### 1.1 Resource Node System
- [ ] Create `ResourceNode` class
- [ ] Create `ResourceNodeManager` class
- [ ] Implement spawn rate regeneration
- [ ] Implement capacity caps
- [ ] Define resource node data structure
- [ ] Add unit tests for regeneration logic

#### 1.2 Worker Entity System
- [ ] Create `WorkerEntity` class with state machine
- [ ] Create `WorkerEntityManager` class
- [ ] Implement movement calculations
- [ ] Implement state transitions
- [ ] Implement harvest logic
- [ ] Add unit tests for worker AI

#### 1.3 Simulation Integration
- [ ] Create `SimulationEngine` to coordinate nodes + workers
- [ ] Implement worker assignment to nodes
- [ ] Implement harvest checks (is resource available?)
- [ ] Implement deposit callbacks
- [ ] Add integration tests

### Phase 2: Visual Layer (Rendering)
**Priority: High | Estimated: 3 hours**

#### 2.1 Canvas Setup
- [ ] Add canvas element to HTML
- [ ] Create `Renderer` class
- [ ] Set up coordinate system
- [ ] Implement camera/viewport

#### 2.2 Resource Node Rendering
- [ ] Draw resource nodes at fixed positions
- [ ] Show available count
- [ ] Add visual indicators (full/empty/regenerating)
- [ ] Add hover tooltips

#### 2.3 Worker Rendering
- [ ] Draw worker sprites
- [ ] Implement position interpolation for smooth movement
- [ ] Add walking animation
- [ ] Add harvesting animation
- [ ] Add carrying indicator

### Phase 3: Game Loop Integration
**Priority: High | Estimated: 2 hours**

#### 3.1 Update GameEngine
- [ ] Replace ActivityManager with ResourceNodeManager
- [ ] Replace WorkerManager with WorkerEntityManager
- [ ] Add SimulationEngine to game loop
- [ ] Update tick rate for smooth animation (60 FPS)

#### 3.2 UI Changes
- [ ] Remove activity cards UI
- [ ] Remove active activities panel
- [ ] Add resource node info panel
- [ ] Add worker assignment UI (click to assign/unassign)
- [ ] Add resource regeneration indicators

### Phase 4: Upgrade System
**Priority: Medium | Estimated: 2 hours**

#### 4.1 Resource Node Upgrades
- [ ] Create upgrade definitions for capacity
- [ ] Create upgrade definitions for spawn rate
- [ ] Integrate with UpgradeManager
- [ ] Add UI for node-specific upgrades
- [ ] Add visual feedback for upgraded nodes

### Phase 5: Cleanup & Migration
**Priority: High | Estimated: 3 hours**

#### 5.1 Remove Old Systems
- [ ] Delete ActivityManager (or repurpose)
- [ ] Remove old WorkerManager assignment logic
- [ ] Remove activity card rendering
- [ ] Remove active activities panel
- [ ] Clean up unused CSS

#### 5.2 Update Tests
- [ ] Remove tests for old activity system
- [ ] Remove tests for old worker assignments
- [ ] Add tests for ResourceNodeManager
- [ ] Add tests for WorkerEntityManager
- [ ] Add tests for SimulationEngine
- [ ] Update E2E tests for new UI

#### 5.3 Data Migration
- [ ] Convert activity definitions → resource node definitions
- [ ] Update save/load system for new structure
- [ ] Provide migration path for old saves

### Phase 6: Polish & Optimization
**Priority: Low | Estimated: 2 hours**

#### 6.1 Performance
- [ ] Optimize rendering (only redraw changed areas)
- [ ] Implement worker pooling
- [ ] Add FPS counter
- [ ] Test with 100+ workers

#### 6.2 Visual Polish
- [ ] Add particle effects
- [ ] Add sound effects
- [ ] Improve animations
- [ ] Add visual feedback for full nodes

---

## New File Structure

```
src/
├── core/
│   ├── GameEngine.js          # Updated to use new managers
│   ├── SimulationEngine.js    # NEW: Coordinates resources + workers
│   └── Renderer.js             # NEW: Canvas rendering
├── entities/
│   ├── WorkerEntity.js         # NEW: Individual worker with AI
│   └── ResourceNode.js         # NEW: Resource with regeneration
├── managers/
│   ├── ResourceNodeManager.js  # NEW: Manages all resource nodes
│   ├── WorkerEntityManager.js  # NEW: Manages all worker entities
│   ├── CurrencyManager.js      # Keep (for inventory)
│   ├── SkillManager.js         # Keep (for unlocks)
│   └── UpgradeManager.js       # Update (for node upgrades)
├── rendering/
│   ├── ResourceRenderer.js     # NEW: Draws resource nodes
│   ├── WorkerRenderer.js       # NEW: Draws workers
│   └── UIRenderer.js           # NEW: Draws overlays
├── data/
│   ├── resourceNodes.js        # NEW: Resource node definitions
│   ├── workerTypes.js          # NEW: Worker type definitions
│   └── nodeUpgrades.js         # NEW: Resource upgrade definitions
└── utils/
    └── movement.js             # NEW: Movement calculations
```

---

## Technical Specifications

### Worker Movement
```javascript
// Calculate movement time
function calculateTravelTime(from, to, speed) {
  const distance = Math.sqrt(
    Math.pow(to.x - from.x, 2) +
    Math.pow(to.y - from.y, 2)
  )
  return distance / speed
}

// Interpolate position
function lerp(start, end, t) {
  return start + (end - start) * t
}
```

### Resource Regeneration
```javascript
// In GameEngine update loop
function updateResourceRegeneration(deltaTime) {
  resourceNodes.forEach(node => {
    if (node.available < node.capacity) {
      const amountToAdd = node.spawnRate * (deltaTime / 1000)
      node.available = Math.min(
        node.available + amountToAdd,
        node.capacity
      )
    }
  })
}
```

### Worker AI
```javascript
class WorkerEntity {
  update(deltaTime) {
    switch (this.state) {
      case 'idle':
        this.checkForWork()
        break
      case 'walking_to':
        this.updateMovement(deltaTime)
        if (this.reachedTarget()) {
          this.startHarvesting()
        }
        break
      case 'harvesting':
        this.stateTimer += deltaTime
        if (this.stateTimer >= this.harvestDuration) {
          this.pickupResource()
        }
        break
      case 'walking_back':
        this.updateMovement(deltaTime)
        if (this.reachedHome()) {
          this.startDepositing()
        }
        break
      case 'depositing':
        this.depositResource()
        this.applyRandomDelay()
        this.state = 'idle'
        break
    }
  }
}
```

---

## Breaking Changes

### For Users
- **Save files**: Old saves may need migration
- **UI**: Complete visual overhaul
- **Gameplay**: Resources don't spawn instantly anymore
- **Strategy**: Need to balance workers vs resource availability

### For Developers
- **API Changes**: ActivityManager → ResourceNodeManager
- **Event System**: New events (worker:moved, resource:harvested, etc.)
- **Data Format**: Activities → Resource Nodes
- **Tests**: Most existing tests will break

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance with many workers | High | Object pooling, efficient rendering |
| Complex state management | Medium | Clear state machine, thorough testing |
| Breaking existing gameplay | High | Feature flag, allow rollback |
| Test coverage gaps | Medium | Write tests incrementally |
| Save file corruption | High | Version saves, provide migration |

---

## Success Criteria

### Must Have
- [ ] Workers visually move across screen
- [ ] Resources regenerate over time
- [ ] Multiple workers = higher throughput
- [ ] Resources have caps
- [ ] Basic animations work
- [ ] Game is playable start-to-finish
- [ ] All tests pass

### Nice to Have
- [ ] Smooth 60 FPS animations
- [ ] Particle effects
- [ ] Sound effects
- [ ] Advanced worker AI (optimal pathing)
- [ ] Resource node skins/themes

---

## Timeline

**Total Estimated Time: 16 hours**

- **Day 1 (4h)**: Phase 1 - Core Systems
- **Day 2 (3h)**: Phase 2 - Visual Layer
- **Day 3 (2h)**: Phase 3 - Game Loop Integration
- **Day 4 (2h)**: Phase 4 - Upgrade System
- **Day 5 (3h)**: Phase 5 - Cleanup & Migration
- **Day 6 (2h)**: Phase 6 - Polish

---

## Next Steps

1. **Get approval** on this architectural plan
2. **Create feature branch**: `feature/visual-worker-system`
3. **Start with Phase 1.1**: ResourceNode system
4. **Build incrementally**: Each phase should be testable
5. **Keep main branch stable**: Don't merge until feature is complete

---

## Questions to Resolve

1. **Graphics**: Simple emojis or sprite sheets?
2. **Camera**: Fixed view or follow workers?
3. **Scaling**: How many workers max? (impacts performance)
4. **Save migration**: Auto-migrate or fresh start?
5. **Skills**: How do skills affect the new system?
6. **Multiple resources**: Can one worker harvest multiple types?
7. **Pathfinding**: Simple straight lines or A* pathfinding?
