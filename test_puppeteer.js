const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    
    const fileUrl = 'file:///' + path.resolve('chess.html').replace(/\\/g, '/');
    console.log('Navigating to', fileUrl);
    
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });
    
    await page.screenshot({ path: 'chess_debug.png' });
    console.log('Screenshot saved to chess_debug.png');
    
    // Check if modal is active
    const modalActive = await page.evaluate(() => {
      const modal = document.getElementById('chessSetupModal');
      return modal ? modal.classList.contains('active') : false;
    });
    console.log('Modal active:', modalActive);
    
    // If active, try clicking start
    if (modalActive) {
        await page.evaluate(() => startChessGame());
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'chess_debug2.png' });
        console.log('Screenshot after start saved to chess_debug2.png');
    }
    
    await browser.close();
  } catch (e) {
    console.error(e);
  }
})();
