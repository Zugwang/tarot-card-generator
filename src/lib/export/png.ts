// PNG export: rasterize card/back SVG strings to PNG, client-side.
// External <image href="/art/..."> refs must be inlined as data-URLs first,
// otherwise they don't load inside an <img>-loaded SVG (and would taint canvas).

import { downloadBlob } from './download';

/** Fetch every same-origin/http image ref in the SVG and inline it as data-URL. */
async function inlineImages(svg: string): Promise<string> {
  const urls = new Set<string>();
  for (const m of svg.matchAll(/(?:xlink:href|href)="([^"]+)"/g)) {
    const u = m[1];
    if (u.startsWith('data:')) continue;
    if (u.startsWith('/') || u.startsWith('http')) urls.add(u);
  }
  let out = svg;
  await Promise.all(
    [...urls].map(async (u) => {
      const res = await fetch(u);
      const blob = await res.blob();
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      out = out.split(`"${u}"`).join(`"${dataUrl}"`);
    }),
  );
  return out;
}

function svgSize(svg: string): { w: number; h: number } {
  const w = Number(svg.match(/width="(\d+(?:\.\d+)?)"/)?.[1] ?? 250);
  const h = Number(svg.match(/height="(\d+(?:\.\d+)?)"/)?.[1] ?? 350);
  return { w, h };
}

function loadImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/** Rasterize one SVG string to a PNG blob at the given pixel scale. */
export async function svgToPngBlob(svg: string, scale = 3): Promise<Blob> {
  const inlined = await inlineImages(svg);
  const { w, h } = svgSize(inlined);
  const img = await loadImage(inlined);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
  );
}

/** Export a single SVG (card or back) as a downloaded PNG. */
export async function exportPng(svg: string, filename: string, scale = 3): Promise<void> {
  downloadBlob(await svgToPngBlob(svg, scale), filename);
}

/** Compose many card SVGs into one contact-sheet PNG. */
export async function exportSheetPng(
  svgs: string[],
  cols: number,
  filename: string,
  scale = 1.6,
): Promise<void> {
  const inlined = await Promise.all(svgs.map(inlineImages));
  const imgs = await Promise.all(inlined.map(loadImage));
  const { w, h } = svgSize(inlined[0]);
  const pad = 8;
  const cw = Math.round(w * scale);
  const ch = Math.round(h * scale);
  const rows = Math.ceil(imgs.length / cols);
  const canvas = document.createElement('canvas');
  canvas.width = cols * cw + (cols + 1) * pad;
  canvas.height = rows * ch + (rows + 1) * pad;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#2b2b30';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  imgs.forEach((img, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    ctx.drawImage(img, pad + col * (cw + pad), pad + row * (ch + pad), cw, ch);
  });
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
  );
  downloadBlob(blob, filename);
}
