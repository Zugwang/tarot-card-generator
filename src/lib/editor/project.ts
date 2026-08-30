// Project save / load: serialize the editor state to JSON and back.
// The state is plain and serializable by design (custom suit PNGs are already
// data-URLs, so they travel inside the file).

import { editor } from './store.svelte';
import { downloadText } from '../export/download';

const VERSION = 1;
const KEYS = [
  'tab',
  'deckSize',
  'deckKind',
  'imageSet',
  'viewMode',
  'format',
  'customFormat',
  'suitVariants',
  'suitColors',
  'cardBg',
  'customSuitImages',
  'pipSize',
  'pipTemplateId',
  'courtStyle',
  'atoutStyle',
  'indexFont',
  'cornerCount',
  'contrastPips',
  'illustrationFit',
  'back',
  'freeCards',
] as const;

export function serializeProject(): string {
  const out: Record<string, unknown> = { version: VERSION };
  for (const k of KEYS) out[k] = editor[k];
  return JSON.stringify(out, null, 2);
}

export function saveProject(filename = 'tarotier-projet.json'): void {
  downloadText(serializeProject(), filename);
}

/** Apply a parsed project object onto the editor (defensive, key by key). */
export function applyProject(data: unknown): void {
  if (!data || typeof data !== 'object') throw new Error('Projet invalide');
  const d = data as Record<string, unknown>;
  for (const k of KEYS) {
    if (k in d && d[k] != null) {
      // Structured clone detaches from the parsed object.
      (editor as Record<string, unknown>)[k] = structuredClone(d[k]);
    }
  }
  editor.selectedId = null;
}

export function loadProjectFromFile(file: File): Promise<void> {
  return file.text().then((text) => applyProject(JSON.parse(text)));
}
