import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Listen for console messages
  page.on('console', msg => {
    console.log(`[Browser ${msg.type()}]:`, msg.text());
  });

  // Listen for errors
  page.on('pageerror', error => {
    console.log('[Page Error]:', error.message);
  });

  // Go to the game
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  } catch (e) {
    console.log('Navigation error:', e.message);
  }

  // Wait for the game to load
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: 'game-screenshot.png', fullPage: true });

  // Check if elements exist
  const hasSkills = await page.locator('.skill-list').count();
  const hasActivities = await page.locator('.activity-list').count();
  const hasWorkers = await page.locator('.worker-panel').count();
  const hasCurrency = await page.locator('.currency-ticker').count();

  console.log('\nElements found:');
  console.log('- Skills:', hasSkills);
  console.log('- Activities:', hasActivities);
  console.log('- Workers:', hasWorkers);
  console.log('- Currency:', hasCurrency);

  // Get page HTML for debugging
  const bodyHTML = await page.locator('body').innerHTML();
  console.log('\nPage has content:', bodyHTML.length > 100 ? 'Yes' : 'No');

  // Get the title
  const title = await page.title();
  console.log('Page title:', title);

  await browser.close();
  console.log('\n✓ Screenshot saved as game-screenshot.png');
})();
