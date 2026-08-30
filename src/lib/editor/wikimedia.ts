// Random open-licensed image from Wikimedia Commons.
//
// Strategy: ask the Commons API for a batch of random File-namespace pages,
// keep the first raster image, fetch its (scaled) thumbnail as a blob and turn
// it into a data: URL. Using a data: URL means the picture behaves exactly like
// an uploaded one — same-origin for display (CSP `data:`), no canvas taint, so
// PNG export keeps working — and only `connect-src` must allow the two
// Wikimedia hosts (see the nginx CSP). Both hosts send `ACAO: *`.
//
// Note: Commons files carry varying licences (PD, CC-BY, CC-BY-SA, OGL…), some
// requiring attribution — we surface title/author/licence + a link to the file
// page so the user can credit the source.

export interface CommonsPick {
  dataUrl: string;
  title: string;
  pageUrl: string;
  license: string;
  author: string;
}

const API = 'https://commons.wikimedia.org/w/api.php';

function stripTags(s: string): string {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function blobToDataURL(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error('lecture image'));
    fr.readAsDataURL(b);
  });
}

/** Pick a random open-licensed raster image from Wikimedia Commons. */
export async function randomCommonsImage(): Promise<CommonsPick> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const qs = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      generator: 'random',
      grnnamespace: '6', // File:
      grnlimit: '12',
      prop: 'imageinfo',
      iiprop: 'url|extmetadata|mime',
      iiurlwidth: '900', // scaled thumbnail, not the full original
    });
    const r = await fetch(`${API}?${qs.toString()}`);
    if (!r.ok) throw new Error(`Commons ${r.status}`);
    const j = await r.json();
    const pages = (j?.query?.pages ?? {}) as Record<string, any>;
    for (const page of Object.values(pages)) {
      const info = page?.imageinfo?.[0];
      // Skip non-images (PDF/audio/video/DjVu…) — they also expose a thumburl.
      if (!info?.thumburl || !/^image\//.test(info.mime || '')) continue;
      let blob: Blob;
      try {
        const ir = await fetch(info.thumburl);
        if (!ir.ok) continue;
        blob = await ir.blob();
      } catch {
        continue;
      }
      if (!/^image\//.test(blob.type)) continue;
      const meta = info.extmetadata ?? {};
      return {
        dataUrl: await blobToDataURL(blob),
        title: String(page.title || '').replace(/^File:/, ''),
        pageUrl: info.descriptionurl || '',
        license: stripTags(meta.LicenseShortName?.value || meta.License?.value || ''),
        author: stripTags(meta.Artist?.value || ''),
      };
    }
  }
  throw new Error('Aucune image trouvée — réessaie.');
}
