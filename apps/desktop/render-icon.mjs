/**
 * One-shot: rasterize icon.svg to icon.png through Electron (Windows cannot
 * use SVG as a BrowserWindow icon) and wrap that PNG as icon.ico.
 */
import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { app, BrowserWindow } from 'electron'

const root = dirname(fileURLToPath(import.meta.url))
const svg = pathToFileURL(join(root, 'icon.svg')).href

/**
 * Vista+ PNG-in-ICO container. Width/height bytes are 0 (256+); Windows
 * reads the PNG IHDR for the real size.
 * @param png - captured 512×512 PNG bytes.
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

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    frame: false,
    useContentSize: true,
    webPreferences: { offscreen: true },
  })
  await window.loadURL(svg)
  const image = await window.webContents.capturePage()
  const png = image.toPNG()
  await writeFile(join(root, 'icon.png'), png)
  await writeFile(join(root, 'icon.ico'), pngToIco(png))
  app.quit()
}).catch((error) => {
  console.error(error)
  app.exit(1)
})
