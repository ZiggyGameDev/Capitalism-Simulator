import { test, expect } from '@playwright/test';

test.describe('Cookie Clicker Game', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear localStorage before each test
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should load the game with initial state', async ({ page }) => {
    // Check that the title is visible
    await expect(page.locator('h1')).toContainText('Cookie Clicker Pro');
    
    // Check initial cookie count is 0
    const cookieCount = page.getByTestId('cookie-count');
    await expect(cookieCount).toHaveText('0');
    
    // Check cookies per second is 0
    const cookiesPerSecond = page.getByTestId('cookies-per-second');
    await expect(cookiesPerSecond).toHaveText('0.0');
    
    // Check total clicks is 0
    const totalClicks = page.getByTestId('total-clicks');
    await expect(totalClicks).toHaveText('0');
  });

  test('should increment cookies when clicking the cookie button', async ({ page }) => {
    const cookieButton = page.getByTestId('cookie-button');
    const cookieCount = page.getByTestId('cookie-count');
    const totalClicks = page.getByTestId('total-clicks');
    
    // Click the cookie 5 times
    for (let i = 0; i < 5; i++) {
      await cookieButton.click();
    }
    
    // Check that cookies increased
    await expect(cookieCount).toHaveText('5');
    await expect(totalClicks).toHaveText('5');
  });

  test('should allow buying shop items when you have enough cookies', async ({ page }) => {
    const cookieButton = page.getByTestId('cookie-button');
    const cookieCount = page.getByTestId('cookie-count');
    
    // Click cookie 20 times to get enough for Auto-Clicker (costs 15)
    for (let i = 0; i < 20; i++) {
      await cookieButton.click();
    }
    
    await expect(cookieCount).toHaveText('20');
    
    // Buy an Auto-Clicker
    const autoClickerItem = page.getByTestId('shop-item-cursor');
    await autoClickerItem.click();
    
    // Check that cookies decreased by the cost (15)
    await expect(cookieCount).toHaveText('5');
    
    // Check that the item count increased
    const itemCount = autoClickerItem.locator('.shop-item-count');
    await expect(itemCount).toHaveText('1');
  });

  test('should not allow buying items when you dont have enough cookies', async ({ page }) => {
    const cookieCount = page.getByTestId('cookie-count');
    
    // Try to click on a shop item (they should be disabled)
    const autoClickerItem = page.getByTestId('shop-item-cursor');
    
    // Item should have disabled class
    await expect(autoClickerItem).toHaveClass(/disabled/);
    
    // Cookies should still be 0
    await expect(cookieCount).toHaveText('0');
  });

  test('should generate cookies automatically after buying production items', async ({ page }) => {
    const cookieButton = page.getByTestId('cookie-button');
    const cookieCount = page.getByTestId('cookie-count');
    const cookiesPerSecond = page.getByTestId('cookies-per-second');
    
    // Click enough to buy an Auto-Clicker (costs 15)
    for (let i = 0; i < 20; i++) {
      await cookieButton.click();
    }
    
    // Buy an Auto-Clicker
    const autoClickerItem = page.getByTestId('shop-item-cursor');
    await autoClickerItem.click();
    
    // Check that CPS increased
    await expect(cookiesPerSecond).toHaveText('0.1');
    
    // Wait a bit and check that cookies increased automatically
    await page.waitForTimeout(2000);
    
    const currentCount = parseInt(await cookieCount.textContent());
    expect(currentCount).toBeGreaterThan(5);
  });

  test('should save game state to localStorage', async ({ page }) => {
    const cookieButton = page.getByTestId('cookie-button');
    const saveButton = page.getByTestId('save-button');
    
    // Click cookie 10 times
    for (let i = 0; i < 10; i++) {
      await cookieButton.click();
    }
    
    // Click save button
    await saveButton.click();
    
    // Check that save feedback appears
    await expect(saveButton).toContainText('Saved!');
    
    // Verify localStorage has the save data
    const saveData = await page.evaluate(() => {
      return localStorage.getItem('clickerGameSave');
    });
    
    expect(saveData).toBeTruthy();
    const parsed = JSON.parse(saveData);
    expect(parsed.cookies).toBe(10);
    expect(parsed.totalClicks).toBe(10);
  });

  test('should load saved game state on page reload', async ({ page }) => {
    const cookieButton = page.getByTestId('cookie-button');
    const cookieCount = page.getByTestId('cookie-count');
    
    // Click cookie 15 times
    for (let i = 0; i < 15; i++) {
      await cookieButton.click();
    }
    
    await expect(cookieCount).toHaveText('15');
    
    // Save the game
    await page.getByTestId('save-button').click();
    
    // Reload the page
    await page.reload();
    
    // Wait a moment for the game to load
    await page.waitForTimeout(500);
    
    // Check that cookies are still 15
    await expect(cookieCount).toHaveText('15');
  });

  test('should reset game when clicking reset button', async ({ page }) => {
    const cookieButton = page.getByTestId('cookie-button');
    const cookieCount = page.getByTestId('cookie-count');
    const resetButton = page.getByTestId('reset-button');
    
    // Click cookie 10 times
    for (let i = 0; i < 10; i++) {
      await cookieButton.click();
    }
    
    await expect(cookieCount).toHaveText('10');
    
    // Setup dialog handler to confirm reset
    page.on('dialog', dialog => dialog.accept());
    
    // Click reset
    await resetButton.click();
    
    // Check that everything is reset
    await expect(cookieCount).toHaveText('0');
    await expect(page.getByTestId('total-clicks')).toHaveText('0');
    await expect(page.getByTestId('cookies-per-second')).toHaveText('0.0');
  });

  test('should increase item cost after each purchase', async ({ page }) => {
    const cookieButton = page.getByTestId('cookie-button');
    
    // Click many times to get enough cookies
    for (let i = 0; i < 50; i++) {
      await cookieButton.click();
    }
    
    const autoClickerItem = page.getByTestId('shop-item-cursor');
    
    // Get initial cost (should be 15)
    let costText = await autoClickerItem.locator('.shop-item-cost').textContent();
    expect(costText).toContain('15');
    
    // Buy the item
    await autoClickerItem.click();
    
    // Wait for shop to re-render
    await page.waitForTimeout(200);
    
    // Get new cost (should be higher, approximately 15 * 1.15 = 17)
    costText = await autoClickerItem.locator('.shop-item-cost').textContent();
    expect(costText).toContain('17');
  });

  test('should display multiple shop items with different costs', async ({ page }) => {
    // Check that multiple shop items are visible
    const shopItems = page.locator('.shop-item');
    
    // Should have at least 6 shop items
    await expect(shopItems).toHaveCount(6);
    
    // Check that different items have different names
    await expect(page.getByTestId('shop-item-cursor')).toBeVisible();
    await expect(page.getByTestId('shop-item-grandma')).toBeVisible();
    await expect(page.getByTestId('shop-item-farm')).toBeVisible();
    await expect(page.getByTestId('shop-item-factory')).toBeVisible();
    await expect(page.getByTestId('shop-item-mine')).toBeVisible();
    await expect(page.getByTestId('shop-item-spaceship')).toBeVisible();
  });

  test('should handle rapid clicking without losing counts', async ({ page }) => {
    const cookieButton = page.getByTestId('cookie-button');
    const cookieCount = page.getByTestId('cookie-count');
    
    // Rapidly click 100 times
    for (let i = 0; i < 100; i++) {
      await cookieButton.click({ delay: 10 });
    }
    
    // Check that all clicks were counted
    await expect(cookieCount).toHaveText('100');
    await expect(page.getByTestId('total-clicks')).toHaveText('100');
  });
});


