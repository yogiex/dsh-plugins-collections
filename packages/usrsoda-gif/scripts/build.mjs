import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * One entry per GIF, with the agent state it represents.
 * `state` is `idle`, `working`, or `complete`; entries without a state are kept
 * here as spare artwork and are not embedded in the built client module.
 */
export const ITEMS = [
  {
    id: 'copy-gif',
    state: 'idle',
    post: 'https://x.com/usrsoda/status/2120295290528039382',
    video: 'media/usrsoda-gif.mp4',
    poster: 'media/poster-256.jpg',
  },
  {
    id: 'cute-3-typing',
    state: 'working',
    post: 'https://x.com/usrsoda/status/2119997289972559887',
    video: 'media/HWu-QuYasAAb-Rv.mp4',
    poster: 'media/HWu-QuYasAAb-Rv-256.jpg',
  },
  {
    id: 'cute-4-cheer',
    state: 'complete',
    post: 'https://x.com/usrsoda/status/2119997289972559887',
    video: 'media/HWu-SHwbUAA7EuH.mp4',
    poster: 'media/HWu-SHwbUAA7EuH-256.jpg',
  },
  {
    id: 'cute-1-fish',
    state: null,
    post: 'https://x.com/usrsoda/status/2119997289972559887',
    video: 'media/HWu-N4QasAAY0Tq.mp4',
    poster: 'media/HWu-N4QasAAY0Tq-256.jpg',
  },
  {
    id: 'cute-2-wand',
    state: null,
    post: 'https://x.com/usrsoda/status/2119997289972559887',
    video: 'media/HWu-PYCbUAEHz5P.mp4',
    poster: 'media/HWu-PYCbUAEHz5P-256.jpg',
  },
];

const toDataUri = (relative, mime) =>
  `data:${mime};base64,${readFileSync(join(root, relative)).toString('base64')}`;

const states = {};
for (const item of ITEMS) {
  if (!item.state) continue;
  states[item.state] = {
    id: item.id,
    post: item.post,
    video: toDataUri(item.video, 'video/mp4'),
    poster: toDataUri(item.poster, 'image/jpeg'),
  };
}
for (const required of ['idle', 'working', 'complete']) {
  if (!states[required]) throw new Error(`missing GIF for state "${required}"`);
}

const template = readFileSync(join(root, 'src/client.template.js'), 'utf8');
if (!template.includes('__STATES_JSON__')) throw new Error('template marker __STATES_JSON__ missing');

const output = template.replace('__STATES_JSON__', JSON.stringify(states));
writeFileSync(join(root, 'client.js'), output);
console.log(`client.js: ${Object.keys(states).length} states, ${output.length} bytes`);
