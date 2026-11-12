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
        const suit = t.page.locator('button.suitbtn');
        if (await suit.count()) { await tryTap(suit); await sleep(200); }
        const take = t.page.locator('button.seal').filter({ hasText: 'prends' });
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

    // 7. the style sheet at /template
    {
      const { ctx, page } = await makePage(browser, 'template');
      tabs.push({ ctx, page });
      const res = await page.goto(`${BASE}/template`, { waitUntil: 'networkidle', timeout: 30000 });
      console.log('/template : HTTP', res && res.status());
      if (!res || res.status() >= 400) problems.push(`[template] /template repond ${res && res.status()}`);
      await sleep(900);
      await page.screenshot({ path: `${OUT}/7-template.png`, fullPage: false });
      // The full-page shot scrolls a very long page carrying infinite
      // animations, which makes the default stability wait time out. Freezing
      // the animations is both faster and gives a cleaner plate.
      try {
        await page.screenshot({
          path: `${OUT}/8-template-entier.png`,
          fullPage: true,
          animations: 'disabled',
          timeout: 90000,
        });
      } catch (e) {
        // A missing screenshot must not abort the checks that follow it.
        console.log('capture pleine page /template:', e.message.split('\n')[0]);
      }
      await assertNoPlaceholders(page, 'template');

      // The swatches are read from the live stylesheet, so an empty one means a
      // token was renamed out from under the page.
      const empty = await page.locator('.sw .hex').evaluateAll(
        (els) => els.filter((e) => !e.textContent.trim() || e.textContent.trim() === '…').length,
      );
      if (empty) problems.push(`[template] ${empty} jeton(s) sans valeur lue`);
      const counts = await page.evaluate(() => ({
        jetons: document.querySelectorAll('.sw').length,
        enseignes: document.querySelectorAll('.v svg.suit').length,
        animations: document.querySelectorAll('.tile').length,
        icones: document.querySelectorAll('figure .ico').length,
        sons: document.querySelectorAll('#sons button').length,
      }));
      console.log('/template :', JSON.stringify(counts));
      for (const [k, v] of Object.entries(counts)) {
        if (!v) problems.push(`[template] section vide : ${k}`);
      }
      // The icons are masks, so a 404 leaves an invisible square rather than a
      // broken-image marker: fetch every one. Checking only the first let a
      // phantom entry through, parsed out of the credits file's URL line.
      const icoBad = await page.evaluate(async () => {
        const out = [];
        for (const el of document.querySelectorAll('figure .ico')) {
          const m = getComputedStyle(el).getPropertyValue('--src').match(/url\("?([^")]+)"?\)/);
          if (!m) { out.push('sans url'); continue; }
          try {
            const r = await fetch(m[1]);
            if (!r.ok) out.push(`${m[1].split('/').pop()} HTTP ${r.status}`);
          } catch { out.push(`${m[1].split('/').pop()} injoignable`); }
        }
        return out;
      });
      console.log('/template : icones en defaut =', icoBad.length);
      for (const b of icoBad.slice(0, 5)) problems.push(`[template] icone: ${b}`);

      // Capture the one-shot effects deterministically. Racing them in a live
      // game means the banner has already faded by the time the shot is taken,
      // which is exactly what happened: 3b-banniere.png caught an empty table.
      for (const [label, text, wait] of [
        ['9-cachet', 'Cachet de cire', 420],
        ['10-banniere', 'Bannière', 320],
        ['11-braises', 'Braises', 700],
      ]) {
        // .fxrow, not #animations: hasText matches descendants, and the demo
        // tile labelled "cachet de cire, en service" is also inside #animations,
        // so the looser selector tapped the tile and no banner ever appeared.
        const b = page.locator('#animations .fxrow button').filter({ hasText: text });
        const n = await b.count();
        if (n !== 1) { problems.push(`[template] bouton "${text}" : ${n} correspondance(s), attendu 1`); continue; }
        await b.first().tap({ force: true });
        await sleep(wait);
        await page.screenshot({ path: `${OUT}/${label}.png` });
        await sleep(2600);   // let the banner clear before the next one
      }
    }

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
