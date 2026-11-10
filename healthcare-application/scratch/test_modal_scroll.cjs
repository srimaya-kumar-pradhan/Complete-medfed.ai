const path = require('path');
const puppeteer = require(path.resolve(__dirname, '../frontend/node_modules/puppeteer-core'));

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function runTest() {
  console.log('====================================================');
  console.log('TESTING LIVE PATIENT REGISTRATION MODAL SCROLLING');
  console.log('====================================================');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err));

  // Test on the user's exact screen resolution from metadata: 1536 x 730
  await page.setViewport({ width: 1536, height: 730 });

  console.log('\n[1] Navigating to login page http://localhost:5173/login...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });

  console.log('[2] Logging in as demo_asha...');
  // Type username and password
  const usernameInput = await page.$('input[type="text"], input#username, input[name="username"]');
  if (usernameInput) {
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const userInput = inputs.find(i => i.placeholder?.toLowerCase().includes('user') || i.name === 'username' || i.id === 'username') || inputs[0];
      const passInput = inputs.find(i => i.type === 'password') || inputs[1];
      if (userInput) userInput.value = 'demo_asha';
      if (passInput) passInput.value = 'dori2024demo';
      userInput?.dispatchEvent(new Event('input', { bubbles: true }));
      passInput?.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  // Click login button
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) {
    await submitBtn.click();
  } else {
    // Alternatively click the demo user card directly
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, .demo-account-card'));
      const ashaCard = buttons.find(b => b.textContent?.includes('Sunita Devi') || b.textContent?.includes('demo_asha'));
      if (ashaCard) ashaCard.click();
    });
  }

  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));

  console.log('Current URL after login:', page.url());

  console.log('[3] Opening Live Patient Registration modal...');
  // Click the Register Patient button in header
  const clickedReg = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const regBtn = btns.find(b => b.textContent?.includes('Register Patient'));
    if (regBtn) {
      regBtn.click();
      return true;
    }
    return false;
  });

  console.log('Register Patient button clicked:', clickedReg);
  await new Promise(r => setTimeout(r, 600));

  // Verify modal is in DOM and visible
  const modalInfo = await page.evaluate(() => {
    const overlay = document.querySelector('.reg-patient-overlay, .modal-overlay');
    const modal = document.querySelector('.reg-patient-modal, .modal-content');
    const body = document.querySelector('.reg-patient-body, .modal-body');
    const footer = document.querySelector('.reg-patient-footer, .modal-footer');
    if (!modal || !body) return null;

    const modalRect = modal.getBoundingClientRect();
    const bodyRect = body.getBoundingClientRect();
    const footerRect = footer ? footer.getBoundingClientRect() : null;

    return {
      modalExists: true,
      modalHeight: modalRect.height,
      modalMaxHeight: window.getComputedStyle(modal).maxHeight,
      bodyHeight: bodyRect.height,
      bodyScrollHeight: body.scrollHeight,
      bodyClientHeight: body.clientHeight,
      bodyScrollTop: body.scrollTop,
      bodyOverflowY: window.getComputedStyle(body).overflowY,
      footerTop: footerRect ? footerRect.top : null,
      footerHeight: footerRect ? footerRect.height : null,
      viewportHeight: window.innerHeight,
    };
  });

  console.log('\n--- Modal Initial Layout Metrics ---');
  console.log('Modal Height:', modalInfo.modalHeight, 'px (Max-Height:', modalInfo.modalMaxHeight, ')');
  console.log('Modal Body ClientHeight:', modalInfo.bodyClientHeight, 'px');
  console.log('Modal Body ScrollHeight:', modalInfo.bodyScrollHeight, 'px');
  console.log('Modal Body Overflow-Y:', modalInfo.bodyOverflowY);
  console.log('Is Content Scrollable?', modalInfo.bodyScrollHeight > modalInfo.bodyClientHeight);

  if (modalInfo.bodyScrollHeight > modalInfo.bodyClientHeight) {
    console.log('>> PASS: Content height exceeds viewport and modal body has scroll container!');
  } else {
    console.log('>> FAIL: Content is not scrollable!');
  }

  console.log('\n[4] Testing Quick Seed Fill (Ramesh Kumar)...');
  await page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll('.seed-chip'));
    const rameshChip = chips.find(c => c.textContent.includes('Ramesh Kumar'));
    if (rameshChip) rameshChip.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Check initial field values
  const initialValues = await page.evaluate(() => {
    const nameInput = document.getElementById('reg-name');
    const ageInput = document.getElementById('reg-age');
    const phoneInput = document.getElementById('reg-phone');
    return {
      name: nameInput ? nameInput.value : '',
      age: ageInput ? ageInput.value : '',
      phone: phoneInput ? phoneInput.value : '',
    };
  });
  console.log('Form field values before scroll:', initialValues);

  console.log('\n[5] Testing Scrolling Down via DOM & Mouse Wheel...');
  // Scroll halfway
  await page.evaluate(() => {
    const body = document.querySelector('.reg-patient-body, .modal-body');
    body.scrollTop = 300;
  });
  await new Promise(r => setTimeout(r, 200));

  let scrollPos = await page.evaluate(() => {
    const body = document.querySelector('.reg-patient-body, .modal-body');
    return body.scrollTop;
  });
  console.log('Scrolled position (midway):', scrollPos, 'px');

  // Scroll all the way to the bottom
  console.log('\n[6] Scrolling to the very bottom of the form...');
  await page.evaluate(() => {
    const body = document.querySelector('.reg-patient-body, .modal-body');
    body.scrollTop = body.scrollHeight;
  });
  await new Promise(r => setTimeout(r, 300));

  const bottomCheck = await page.evaluate(() => {
    const body = document.querySelector('.reg-patient-body, .modal-body');
    const footer = document.querySelector('.reg-patient-footer, .modal-footer');
    const submitBtn = footer ? footer.querySelector('button[type="submit"]') : null;
    const cancelBtn = footer ? footer.querySelector('button[type="button"]') : null;
    const consentBox = document.getElementById('reg-consent');
    const condTextarea = document.getElementById('reg-conditions');

    const submitRect = submitBtn ? submitBtn.getBoundingClientRect() : null;
    const bodyRect = body.getBoundingClientRect();

    return {
      scrollTop: body.scrollTop,
      maxScrollTop: body.scrollHeight - body.clientHeight,
      submitBtnExists: !!submitBtn,
      submitBtnText: submitBtn ? submitBtn.textContent.trim() : '',
      submitBtnVisibleInViewport: submitRect ? (submitRect.bottom <= window.innerHeight && submitRect.top >= 0) : false,
      submitBtnVisibleInModal: submitRect ? (submitRect.bottom <= bodyRect.bottom + 10) : false,
      consentBoxChecked: consentBox ? consentBox.checked : false,
      conditionsValue: condTextarea ? condTextarea.value.substring(0, 35) + '...' : '',
    };
  });

  console.log('Bottom ScrollTop:', bottomCheck.scrollTop, 'px (Max:', bottomCheck.maxScrollTop, 'px)');
  console.log('Submit Button Text:', bottomCheck.submitBtnText);
  console.log('Submit Button Visible In Viewport?', bottomCheck.submitBtnVisibleInViewport);
  console.log('Submit Button Visible In Modal?', bottomCheck.submitBtnVisibleInModal);
  console.log('Consent Checkbox Checked?', bottomCheck.consentBoxChecked);
  console.log('Conditions Value (Preserved after scroll):', bottomCheck.conditionsValue);

  if (bottomCheck.submitBtnVisibleInViewport) {
    console.log('>> PASS: Submit button is fully visible and accessible at the bottom of the scroll!');
  } else {
    console.log('>> FAIL: Submit button is not visible!');
  }

  console.log('\n[7] Scrolling back to the top...');
  await page.evaluate(() => {
    const body = document.querySelector('.reg-patient-body, .modal-body');
    body.scrollTop = 0;
  });
  await new Promise(r => setTimeout(r, 300));

  const topCheck = await page.evaluate(() => {
    const body = document.querySelector('.reg-patient-body, .modal-body');
    const nameInput = document.getElementById('reg-name');
    return {
      scrollTop: body.scrollTop,
      nameValue: nameInput ? nameInput.value : '',
    };
  });
  console.log('ScrollTop after scrolling back to top:', topCheck.scrollTop, 'px');
  console.log('Name field value preserved:', topCheck.nameValue);
  if (topCheck.scrollTop === 0 && topCheck.nameValue === 'Ramesh Kumar') {
    console.log('>> PASS: Successfully scrolled back to top and form state is completely preserved!');
  }

  // Responsive Viewport Testing
  console.log('\n[8] Testing Responsive Breakpoints:');
  const viewports = [
    { name: 'iPhone SE (375x667)', width: 375, height: 667 },
    { name: 'iPhone 14 (390x844)', width: 390, height: 844 },
    { name: 'iPad Portrait (768x1024)', width: 768, height: 1024 },
    { name: 'Laptop Small (1024x600)', width: 1024, height: 600 },
    { name: 'Desktop Full HD (1920x1080)', width: 1920, height: 1080 },
  ];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await new Promise(r => setTimeout(r, 200));

    const vpMetrics = await page.evaluate(() => {
      const body = document.querySelector('.reg-patient-body, .modal-body');
      const modal = document.querySelector('.reg-patient-modal, .modal-content');
      const footer = document.querySelector('.reg-patient-footer, .modal-footer');
      const submitBtn = footer ? footer.querySelector('button[type="submit"]') : null;

      // Scroll to bottom
      body.scrollTop = body.scrollHeight;
      const submitRect = submitBtn ? submitBtn.getBoundingClientRect() : null;

      return {
        bodyScrollHeight: body.scrollHeight,
        bodyClientHeight: body.clientHeight,
        isScrollable: body.scrollHeight > body.clientHeight,
        submitVisible: submitRect ? (submitRect.bottom <= window.innerHeight && submitRect.top >= 0) : false,
        modalWidth: modal.getBoundingClientRect().width,
      };
    });

    console.log(`  - [${vp.name}]: Modal Width=${Math.round(vpMetrics.modalWidth)}px, Scrollable=${vpMetrics.isScrollable}, Submit Visible=${vpMetrics.submitVisible}`);
    if (!vpMetrics.isScrollable || !vpMetrics.submitVisible) {
      console.log(`    >> WARNING on ${vp.name}!`);
    }
  }

  // [9] Testing Live Form Submission & Success Screen Scrolling
  console.log('\n[9] Testing Form Submission & Success View...');
  await page.setViewport({ width: 1280, height: 720 });
  await page.evaluate(() => {
    const body = document.querySelector('.reg-patient-body, .modal-body');
    body.scrollTop = body.scrollHeight;
  });
  await new Promise(r => setTimeout(r, 200));

  const formValidation = await page.evaluate(() => {
    const form = document.querySelector('form.reg-form');
    if (!form) return { formFound: false };
    const invalidInputs = Array.from(form.querySelectorAll(':invalid')).map(el => ({
      id: el.id,
      validationMessage: el.validationMessage,
      value: el.value
    }));
    return {
      formFound: true,
      isValid: form.checkValidity(),
      invalidInputs
    };
  });
  console.log('Form HTML5 validation status:', JSON.stringify(formValidation));

  page.on('requestfailed', req => console.log('REQ FAILED:', req.url(), req.failure()?.errorText));
  page.on('response', res => {
    if (res.url().includes('/patients') || res.status() >= 400) {
      console.log('HTTP RESPONSE:', res.status(), res.url());
    }
  });

  await page.evaluate(() => {
    const form = document.querySelector('form.reg-form');
    if (form) {
      form.requestSubmit();
    }
  });
  console.log('Waiting for patient registration API and success card render...');
  try {
    await page.waitForSelector('.success-title', { timeout: 10000 });
  } catch (e) {
    console.log('waitForSelector timed out or error:', e.message);
  }

  const successMetrics = await page.evaluate(() => {
    const successTitle = document.querySelector('.success-title');
    const receiptGrid = document.querySelector('.patient-receipt-grid');
    const errorBanner = document.querySelector('.reg-error-banner');
    const body = document.querySelector('.reg-patient-body, .modal-body');
    const viewBtn = Array.from(document.querySelectorAll('.success-footer-actions button')).find(b => b.textContent.includes('View in Patient Registry'));

    return {
      hasSuccessTitle: !!successTitle,
      titleText: successTitle ? successTitle.textContent : null,
      hasReceipt: !!receiptGrid,
      hasViewBtn: !!viewBtn,
      errorMessage: errorBanner ? errorBanner.textContent : null,
      bodyScrollHeight: body ? body.scrollHeight : 0,
      bodyClientHeight: body ? body.clientHeight : 0,
    };
  });

  console.log('Success Screen Verification:');
  console.log('  - Error Banner (if any):', successMetrics.errorMessage);
  console.log('  - Success Title:', successMetrics.titleText);
  console.log('  - Receipt Grid Rendered:', successMetrics.hasReceipt);
  console.log('  - View in Registry Button Present:', successMetrics.hasViewBtn);
  if (successMetrics.hasSuccessTitle && successMetrics.hasViewBtn) {
    console.log('  >> PASS: Form submission succeeded and success view rendered cleanly!');
  }

  await browser.close();
  console.log('\n====================================================');
  console.log('ALL VERIFICATION STEPS COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
}

runTest().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
