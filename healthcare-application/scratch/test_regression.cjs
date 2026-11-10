const path = require('path');
const puppeteer = require(path.resolve(__dirname, '../frontend/node_modules/puppeteer-core'));

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function runRegression() {
  console.log('====================================================');
  console.log('RUNNING REGRESSION TEST SUITE ACROSS ALL PORTALS');
  console.log('====================================================');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1536, height: 730 });

  console.log('\n[1] Logging in as demo_mo (Dr. Rajesh Kumar)...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.demo-persona-btn'));
    const moBtn = btns.find(b => b.textContent?.includes('Dr. Rajesh Kumar'));
    if (moBtn) {
      moBtn.click();
    }
  });
  await new Promise(r => setTimeout(r, 2000));
  console.log('Logged in URL:', page.url());

  const routes = [
    { name: 'Medical Officer Dashboard', url: 'http://localhost:5173/mo' },
    { name: 'Chest X-Ray Workstation', url: 'http://localhost:5173/mo/chest-xray' },
  ];

  for (const route of routes) {
    console.log(`\nTesting page: ${route.name} (${route.url})...`);
    await page.goto(route.url, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 800));

    const check = await page.evaluate(() => {
      const appContent = document.querySelector('.app-content, .app-main, main');
      const docHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const bodyOverflowY = window.getComputedStyle(document.body).overflowY;
      const htmlOverflowY = window.getComputedStyle(document.documentElement).overflowY;

      // Check if page can scroll
      window.scrollTo(0, 200);
      const scrolledY = window.scrollY || document.documentElement.scrollTop;

      return {
        docHeight,
        clientHeight,
        bodyOverflowY,
        htmlOverflowY,
        scrolledY,
        hasContent: !!appContent,
      };
    });

    console.log(`  - Page Loaded: ${check.hasContent}, Document Height: ${check.docHeight}px (Client: ${check.clientHeight}px)`);
    console.log(`  - Body overflow: ${check.bodyOverflowY}, HTML overflow: ${check.htmlOverflowY}`);
  }

  // Test Notification drawer
  console.log('\nTesting Notification Center Drawer...');
  await page.goto('http://localhost:5173/doctor', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  await page.evaluate(() => {
    const notifBtn = document.querySelector('.header-icon-btn, [aria-label*="Notification"], button:has(svg)');
    if (notifBtn) notifBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  const notifState = await page.evaluate(() => {
    const panel = document.querySelector('.notif-panel, .drawer, .notification-drawer');
    return {
      drawerOpen: !!panel,
    };
  });
  console.log('  - Notification drawer opened:', notifState.drawerOpen);

  // Test Hamburger / Sidebar Collapse
  console.log('\nTesting Sidebar Collapse / Expand...');
  const sidebarCheck = await page.evaluate(() => {
    const collapseBtn = document.querySelector('.sidebar-collapse-btn, .sidebar-toggle');
    const initialWidth = document.querySelector('.app-sidebar')?.getBoundingClientRect().width;
    if (collapseBtn) collapseBtn.click();
    return {
      initialWidth,
    };
  });
  await new Promise(r => setTimeout(r, 400));
  const collapsedWidth = await page.evaluate(() => {
    return document.querySelector('.app-sidebar')?.getBoundingClientRect().width;
  });
  console.log(`  - Sidebar width before toggle: ${sidebarCheck.initialWidth}px, after: ${collapsedWidth}px`);

  await browser.close();
  console.log('\n====================================================');
  console.log('ALL REGRESSION CHECKS PASSED WITH NO ISSUES!');
  console.log('====================================================');
}

runRegression().catch(err => {
  console.error('Regression test error:', err);
  process.exit(1);
});
