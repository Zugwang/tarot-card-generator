// ZIP export — one file per card (PNG or SVG), client-side via JSZip.

import { svgToPngBlob, inlineAssets } from './png';
import { downloadBlob } from './download';

export async function exportZip(
  entries: { name: string; svg: string }[],
  fmt: 'png' | 'svg',
  zipname: string,
): Promise<void> {
  const { default: JSZip } = await import('jszip'); // lazy: separate chunk
  const zip = new JSZip();
  await Promise.all(
    entries.map(async (e) => {
      if (fmt === 'png') zip.file(`${e.name}.png`, await svgToPngBlob(e.svg));
      else zip.file(`${e.name}.svg`, await inlineAssets(e.svg));
    }),
  );
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, zipname);
}
