// Real-browser check of Belotier: four mobile viewports, a game actually started,
// screenshots, plus console errors and failed requests (which is what catches a
// broken card image).
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'https://belotier.e1000.dev';
const OUT = '/tmp/belotier-shots';
const SEATS = ['nord', 'est', 'sud', 'ouest'];
const problems = [];

// Event payload fields are dynamic, so a typo like e.suit instead of e.trump
// type-checks fine and only shows up as "undefined" painted on the screen.
async function assertNoPlaceholders(page, label) {
  const text = await page.evaluate(() => document.body.innerText);
  for (const bad of ['undefined', 'NaN', '[object Object]', 'null']) {
    if (text.includes(bad)) problems.push(`[${label}] "${bad}" affiche a l'ecran`);
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function makePage(browser, label) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`[${label}] console: ${m.text().slice(0, 160)}`);
  });
  page.on('pageerror', (e) => problems.push(`[${label}] pageerror: ${String(e).slice(0, 160)}`));
  page.on('requestfailed', (r) => problems.push(`[${label}] requete echouee: ${r.url().slice(-70)}`));
  page.on('response', (r) => {
    if (r.status() >= 400) problems.push(`[${label}] HTTP ${r.status()}: ${r.url().slice(-70)}`);
  });
  return { ctx, page };
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const tabs = [];
  try {
    for (const seat of SEATS) {
      const t = await makePage(browser, seat);
      tabs.push(t);
      await t.page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    }

    // 1. the lobby, before anyone sits
    await tabs[0].page.screenshot({ path: `${OUT}/1-salon.png` });
    const chairs = await tabs[0].page.locator('button.chair').count();
    console.log('salon : chaises affichees =', chairs);

    // 2. everyone takes a seat
    for (let i = 0; i < SEATS.length; i++) {
      await tabs[i].page.locator(`button.chair.${SEATS[i]}`).tap();
      await sleep(600);
      if (i === 0) await tabs[0].page.screenshot({ path: `${OUT}/2-attente.png` });
    }
    await sleep(1800);

    // 3. the table, now in the bidding phase
    await tabs[0].page.screenshot({ path: `${OUT}/3-encheres.png` });
    for (const t of tabs) await assertNoPlaceholders(t.page, 'encheres');
    const phase = await tabs[0].page.evaluate(() => document.body.innerText.slice(0, 220));
    console.log('apres 4 arrivees, ecran de Nord :', JSON.stringify(phase.replace(/\s+/g, ' ').slice(0, 150)));

    // 4. bid until someone takes, so the hand is dealt and playable.
    // Every tap is best-effort: the panel belongs to whoever has the turn and
    // vanishes from under us the moment the server moves on.
    const tryTap = async (loc) => {
      try { await loc.first().tap({ timeout: 2500 }); return true; } catch { return false; }
    };
    for (let round = 0; round < 14; round++) {
      let acted = false;
      for (const t of tabs) {
        if (await t.page.locator('.trump').count()) { acted = false; break; }
        const suit = t.page.locator('button.suit');
        if (await suit.count()) { await tryTap(suit); await sleep(200); }
        const take = t.page.locator('button.primary').filter({ hasText: 'prends' });
        const pass = t.page.locator('button').filter({ hasText: 'Je passe' });
        if (round >= 2 && (await take.count())) {
          if (await tryTap(take)) { acted = true; await sleep(500); continue; }
        }
        if (await pass.count()) {
          if (await tryTap(pass)) { acted = true; await sleep(500); }
        }
      }
      if (await tabs[0].page.locator('.trump').count()) {
        await tabs[0].page.screenshot({ path: `${OUT}/3b-banniere.png` });
        break;
      }
      if (!acted) await sleep(400);
    }
    await sleep(1400);
    await tabs[0].page.screenshot({ path: `${OUT}/4-table.png` });
    for (const t of tabs) await assertNoPlaceholders(t.page, 'table');

    // 5. play one card from whoever has the turn
    for (const t of tabs) {
      const playable = t.page.locator('.card.playable');
      if (await playable.count()) {
        try {
          await playable.first().tap({ timeout: 4000, force: true });   // raise (cards float forever, so skip the stability wait)
          await sleep(500);
          await t.page.screenshot({ path: `${OUT}/5-carte-levee.png` });
          await t.page.locator('.card.selected, .card.playable').first().tap({ timeout: 4000, force: true });
          await sleep(1200);
        } catch (e) { console.log('tap carte:', e.message.split('\n')[0]); }
        break;
      }
    }
    await tabs[0].page.screenshot({ path: `${OUT}/6-pli.png` });
    for (const t of tabs) await assertNoPlaceholders(t.page, 'pli');

    const cardsShown = await tabs[0].page.locator('.card img').count();
    console.log('images de cartes rendues chez Nord :', cardsShown);
    const hand = await tabs[0].page.locator('.hand .card').count();
    console.log('cartes en main chez Nord :', hand);
  } finally {
    for (const t of tabs) await t.ctx.close().catch(() => {});
    await browser.close();
  }

  console.log('\n--- problemes detectes ---');
  const uniq = [...new Set(problems)];
  if (!uniq.length) console.log('(aucun)');
  else uniq.slice(0, 20).forEach((p) => console.log(' -', p));
  process.exit(uniq.length ? 1 : 0);
})().catch((e) => { console.error('ECHEC:', e.message.split('\n')[0]); process.exit(2); });
