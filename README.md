# 🍪 Cookie Clicker Pro

A modern, feature-rich cookie clicker game built with vanilla JavaScript and tested with Playwright automation.

## Features

- **Incremental Gameplay**: Click cookies to earn points
- **Automated Production**: Buy upgrades that generate cookies automatically
- **6 Different Upgrades**: From auto-clickers to space stations
- **Progressive Costs**: Each purchase increases the cost for the next one
- **Persistent Save System**: Your progress is automatically saved
- **Beautiful UI**: Modern, responsive design with smooth animations
- **Comprehensive Testing**: Automated browser tests using Playwright

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

### Running the Game

Start the development server:
```bash
npm run dev
```

Then open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Testing

This project uses Playwright for automated end-to-end testing.

### Run all tests (headless mode):
```bash
npm test
```

### Run tests with UI mode (interactive):
```bash
npm run test:ui
```

### Run tests in headed mode (watch browser):
```bash
npm run test:headed
```

## Game Mechanics

### Clicking
- Each click gives you 1 cookie
- Cookies are used to purchase upgrades

### Shop Items

| Item | Base Cost | Cookies/Second |
|------|-----------|----------------|
| 🖱️ Auto-Clicker | 15 | 0.1 |
| 👵 Grandma | 100 | 1 |
| 🌾 Cookie Farm | 500 | 8 |
| 🏭 Cookie Factory | 3,000 | 47 |
| ⛏️ Cookie Mine | 10,000 | 260 |
| 🚀 Space Station | 50,000 | 1,400 |

### Cost Scaling
Each time you purchase an item, its cost increases by 15% (multiplied by 1.15).

## Test Coverage

The automated tests cover:
- ✅ Initial game state
- ✅ Cookie clicking functionality
- ✅ Shop item purchasing
- ✅ Insufficient funds handling
- ✅ Automatic cookie generation
- ✅ Save/load functionality
- ✅ Game reset functionality
- ✅ Cost scaling mechanics
- ✅ Rapid clicking handling
- ✅ Multiple shop items display

## Technologies Used

- **Vite**: Fast build tool and dev server
- **Playwright**: Browser automation and testing framework
- **Vanilla JavaScript**: No framework overhead
- **CSS3**: Modern styling with animations and gradients
- **LocalStorage API**: Client-side save system

## Project Structure

```
clicker-game/
├── index.html          # Main HTML file
├── main.js            # Game logic
├── style.css          # Styling
├── playwright.config.js  # Playwright configuration
├── tests/
│   └── clicker-game.spec.js  # Test suite
└── package.json       # Project dependencies and scripts
```

## License

ISC

