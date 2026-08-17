/**
 * One-shot: rasterize icon.svg to icon.png with a transparent background
 * (Windows cannot use SVG as a BrowserWindow icon) and wrap it as icon.ico.
 */
import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = dirname(fileURLToPath(import.meta.url))
const svgPath = join(root, 'icon.svg')

/**
 * Vista+ PNG-in-ICO container. Width/height bytes are 0 (256+); Windows
 * reads the PNG IHDR for the real size.
 * @param png - rendered 512×512 PNG bytes.
 * @returns ICO bytes.
 */
function pngToIco(png) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)
  const entry = Buffer.alloc(16)
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(png.length, 8)
  entry.writeUInt32LE(22, 12)
  return Buffer.concat([header, entry, png])
}

async function renderIcon() {
  const png = await sharp(svgPath).resize(512, 512).png().toBuffer()
  await writeFile(join(root, 'icon.png'), png)
  await writeFile(join(root, 'icon.ico'), pngToIco(png))
}

renderIcon().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
