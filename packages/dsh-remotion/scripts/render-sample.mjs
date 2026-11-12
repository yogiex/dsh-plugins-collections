/**
 * Developer helper: render the bundled sample composition to media/hello-world.mp4.
 * Kept for rebuilding the committed preview after editing HelloWorld.tsx.
 */
import path from 'node:path';
import { MEDIA_DIR, detectBrowser, renderComposition, listCompositions } from '../lib/render.js';

const browser = detectBrowser();

console.log('browser:', browser ?? '(remotion-managed)');
console.log('compositions:', JSON.stringify(await listCompositions(), null, 2));

let lastReported = -1;
const result = await renderComposition({
  id: 'HelloWorld',
  format: 'mp4',
  outputLocation: path.join(MEDIA_DIR, 'hello-world.mp4'),
  onProgress: ({ progress }) => {
    const percent = Math.round(progress * 100);
    if (percent !== lastReported) {
      lastReported = percent;
      console.log(`render ${percent}%`);
    }
  },
});

console.log('done:', result.outputLocation, JSON.stringify(result.composition));
