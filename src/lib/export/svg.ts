// SVG export (lossless master format). Images are inlined as data-URLs so the
// file is self-contained and opens anywhere.

import { inlineAssets, svgSize } from './png';
import { downloadBlob } from './download';

function download(svg: string, filename: string) {
  downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), filename);
}

/** Export a single card/back SVG (self-contained). */
export async function exportSvg(svg: string, filename: string): Promise<void> {
  download(await inlineAssets(svg), filename);
}

/** Compose many card SVGs into one contact-sheet SVG. */
export async function exportSheetSvg(svgs: string[], cols: number, filename: string): Promise<void> {
  const inlined = await Promise.all(svgs.map(inlineAssets));
  const { w, h } = svgSize(inlined[0]);
  const pad = 8;
  const rows = Math.ceil(inlined.length / cols);
  const W = cols * (w + pad) + pad;
  const H = rows * (h + pad) + pad;

  const cells = inlined
    .map((svg, i) => {
      const x = pad + (i % cols) * (w + pad);
      const y = pad + Math.floor(i / cols) * (h + pad);
      // Remove the root width/height FIRST, then inject positioned ones.
      return svg
        .replace(/ width="[\d.]+" height="[\d.]+"/, '')
        .replace(/^<svg /, `<svg x="${x}" y="${y}" width="${w}" height="${h}" `);
    })
    .join('');

  const sheet =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<rect width="${W}" height="${H}" fill="#2b2b30"/>` +
    cells +
    `</svg>`;
  download(sheet, filename);
}
