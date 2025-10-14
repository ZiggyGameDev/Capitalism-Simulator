class ClickerGame {
    constructor() {
        this.cookies = 0;
        this.totalClicks = 0;
        this.cookiesPerSecond = 0;
        
        this.shopItems = [
            {
                id: 'cursor',
                name: '🖱️ Auto-Clicker',
                description: 'Clicks automatically',
                baseCost: 15,
                cps: 0.1,
                count: 0
            },
            {
                id: 'grandma',
                name: '👵 Grandma',
                description: 'Bakes cookies for you',
                baseCost: 100,
                cps: 1,
                count: 0
            },
            {
                id: 'farm',
                name: '🌾 Cookie Farm',
                description: 'Grows cookie ingredients',
                baseCost: 500,
                cps: 8,
                count: 0
            },
            {
                id: 'factory',
                name: '🏭 Cookie Factory',
                description: 'Mass produces cookies',
                baseCost: 3000,
                cps: 47,
                count: 0
            },
            {
                id: 'mine',
                name: '⛏️ Cookie Mine',
                description: 'Mines chocolate chips',
                baseCost: 10000,
                cps: 260,
                count: 0
            },
            {
                id: 'spaceship',
                name: '🚀 Space Station',
                description: 'Produces cookies in space',
                baseCost: 50000,
                cps: 1400,
                count: 0
            }
        ];

        this.init();
    }

    init() {
        this.loadGame();
        this.setupEventListeners();
        this.renderShop();
        this.updateDisplay();
        this.startAutoClicker();
        this.startAutoSave();
    }

    setupEventListeners() {
        const cookieButton = document.getElementById('cookieButton');
        const resetButton = document.getElementById('resetButton');
        const saveButton = document.getElementById('saveButton');

        cookieButton.addEventListener('click', (e) => this.handleCookieClick(e));
        resetButton.addEventListener('click', () => this.resetGame());
        saveButton.addEventListener('click', () => this.saveGame());
    }

    handleCookieClick(e) {
        this.cookies++;
        this.totalClicks++;
        this.updateDisplay();
        this.showClickEffect(e);
    }

    showClickEffect(e) {
        const effect = document.getElementById('clickEffect');
        const rect = e.target.getBoundingClientRect();
        
        effect.textContent = '+1';
        effect.style.left = `${e.clientX - rect.left}px`;
        effect.style.top = `${e.clientY - rect.top}px`;
        
        // Remove and re-add to restart animation
        effect.style.animation = 'none';
        setTimeout(() => {
            effect.style.animation = 'floatUp 1s ease-out';
        }, 10);
    }

    renderShop() {
        const shopContainer = document.getElementById('shopItems');
        shopContainer.innerHTML = '';

        this.shopItems.forEach(item => {
            const cost = this.calculateCost(item);
            const canAfford = this.cookies >= cost;

            const itemElement = document.createElement('div');
            itemElement.className = `shop-item ${!canAfford ? 'disabled' : ''}`;
            itemElement.dataset.testid = `shop-item-${item.id}`;
            
            itemElement.innerHTML = `
                <div class="shop-item-header">
                    <span class="shop-item-name">${item.name}</span>
                    <span class="shop-item-count">${item.count}</span>
                </div>
                <div class="shop-item-description">${item.description}</div>
                <div class="shop-item-cost">Cost: ${Math.floor(cost)} cookies</div>
                <div class="shop-item-cps">+${item.cps} per second</div>
            `;

            if (canAfford) {
                itemElement.addEventListener('click', () => this.buyItem(item));
            }

            shopContainer.appendChild(itemElement);
        });
    }

    calculateCost(item) {
        return Math.floor(item.baseCost * Math.pow(1.15, item.count));
    }

    buyItem(item) {
        const cost = this.calculateCost(item);
        
        if (this.cookies >= cost) {
            this.cookies -= cost;
            item.count++;
            this.updateCookiesPerSecond();
            this.updateDisplay();
            this.renderShop();
        }
    }

    updateCookiesPerSecond() {
        this.cookiesPerSecond = this.shopItems.reduce((total, item) => {
            return total + (item.cps * item.count);
        }, 0);
    }

    updateDisplay() {
        document.getElementById('cookieCount').textContent = Math.floor(this.cookies);
        document.getElementById('cookiesPerSecond').textContent = this.cookiesPerSecond.toFixed(1);
        document.getElementById('totalClicks').textContent = this.totalClicks;
    }

    startAutoClicker() {
        setInterval(() => {
            this.cookies += this.cookiesPerSecond / 10;
            this.updateDisplay();
            this.renderShop();
        }, 100); // Update 10 times per second for smooth counting
    }

    startAutoSave() {
        setInterval(() => {
            this.saveGame();
        }, 30000); // Auto-save every 30 seconds
    }

    saveGame() {
        const saveData = {
            cookies: this.cookies,
            totalClicks: this.totalClicks,
            shopItems: this.shopItems.map(item => ({
                id: item.id,
                count: item.count
            }))
        };

        localStorage.setItem('clickerGameSave', JSON.stringify(saveData));
        
        // Visual feedback
        const saveButton = document.getElementById('saveButton');
        const originalText = saveButton.textContent;
        saveButton.textContent = '✓ Saved!';
        setTimeout(() => {
            saveButton.textContent = originalText;
        }, 1000);
    }

    loadGame() {
        const saveData = localStorage.getItem('clickerGameSave');
        
        if (saveData) {
            try {
                const data = JSON.parse(saveData);
                this.cookies = data.cookies || 0;
                this.totalClicks = data.totalClicks || 0;
                
                if (data.shopItems) {
                    data.shopItems.forEach(savedItem => {
                        const item = this.shopItems.find(i => i.id === savedItem.id);
                        if (item) {
                            item.count = savedItem.count;
                        }
                    });
                }
                
                this.updateCookiesPerSecond();
            } catch (e) {
                console.error('Failed to load save data:', e);
            }
        }
    }

    resetGame() {
        if (confirm('Are you sure you want to reset your game? This cannot be undone!')) {
            this.cookies = 0;
            this.totalClicks = 0;
            this.cookiesPerSecond = 0;
            
            this.shopItems.forEach(item => {
                item.count = 0;
            });
            
            localStorage.removeItem('clickerGameSave');
            this.updateDisplay();
            this.renderShop();
        }
    }
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    window.game = new ClickerGame();
});

