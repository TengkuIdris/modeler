import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

// Check for dev server - vite-plugin-electron sets this
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'] || 
  (process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : undefined)

const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL 
  ? path.join(process.env.APP_ROOT, 'public') 
  : RENDERER_DIST

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    icon: path.join(process.env.VITE_PUBLIC!, 'modeler.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0d0d10',
  })

  // Load the app
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// IPC Handlers
ipcMain.handle('save-stl', async (_event, { filename, data }: { filename: string; data: ArrayBuffer }) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    title: 'Export STL',
    defaultPath: filename,
    filters: [
      { name: 'STL Files', extensions: ['stl'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (!result.canceled && result.filePath) {
    await fs.promises.writeFile(result.filePath, Buffer.from(data))
    return { success: true, path: result.filePath }
  }
  return { success: false }
})

ipcMain.handle('load-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Load Sketch Image',
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }
    ],
    properties: ['openFile']
  })

  if (!result.canceled && result.filePaths[0]) {
    const filePath = result.filePaths[0]
    const data = await fs.promises.readFile(filePath)
    const base64 = data.toString('base64')
    const ext = path.extname(filePath).slice(1)
    return { success: true, data: `data:image/${ext};base64,${base64}` }
  }
  return { success: false }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    mainWindow = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)

