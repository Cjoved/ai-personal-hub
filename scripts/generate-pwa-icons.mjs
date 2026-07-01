import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(root, 'public', 'favicon.svg'))
const background = '#0f172a'

async function writeIcon(size, filename) {
  await sharp(svg)
    .resize(size, size, { fit: 'contain', background })
    .png()
    .toFile(join(root, 'public', filename))
}

await writeIcon(192, 'pwa-192.png')
await writeIcon(512, 'pwa-512.png')
console.log('Generated public/pwa-192.png and public/pwa-512.png')
