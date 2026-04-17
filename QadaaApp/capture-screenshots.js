const puppeteer = require('puppeteer');

(async () => {
  // Start browser
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 0,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set device dimensions to simulate mobile
  await page.setViewport({ width: 375, height: 667 });
  
  // Navigate to app
  const url = 'http://localhost:8081/?turbomode=false';
  console.log('Navigating to:', url);
  await page.goto(url, { waitUntil: 'networkidle2' });
  
  // Wait for React app to fully render
  console.log('Waiting for app to load...');
  await new Promise(r => setTimeout(r, 3000));
  
  // Capture screenshots
  const screenshots = [
    { name: 'onboarding.png', delay: 1000 },
    { name: 'home.png', delay: 1000 },
    { name: 'backlog.png', delay: 500 }
  ];
  
  for (const { name, delay } of screenshots) {
    await page.waitForSelector('div.qadaa', { timeout: 5000 }).catch(() => {});
    await new Promise(r => setTimeout(r, delay));
    await page.screenshot({ 
      path: `./screenshots/${name}`, 
      fullPage: false,
      quality: 90 
    });
    console.log(`✓ Captured: ${name}`);
  }
  
  await browser.close();
  console.log('\nAll screenshots saved to ./screenshots/');
})();
