import { app, BrowserWindow, utilityProcess } from 'electron'
import path from 'path'
import { existsSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isDev = process.env.NODE_ENV === 'development'
const PROD_SERVER_PORT = 3456

// Theme colors matching DM Hero
const THEME = {
  dark: {
    background: '#1A1D29',
    titleBarOverlay: {
      color: '#1A1D29',
      symbolColor: '#D4A574', // warm gold for window controls
    },
  },
  light: {
    background: '#F5F1E8',
    titleBarOverlay: {
      color: '#F5F1E8',
      symbolColor: '#8B4513', // saddle brown for window controls
    },
  },
}

let mainWindow = null
let serverProcess = null

/**
 * Get user data paths for database and uploads
 * In production, these are in app.getPath('userData')
 * In dev mode, these are not used (Nuxt dev server uses default paths)
 */
function getDataPaths() {
  if (isDev) {
    return null // Dev mode uses default paths
  }

  const userDataPath = app.getPath('userData')
  const dataDir = path.join(userDataPath, 'data')
  const uploadsDir = path.join(userDataPath, 'uploads')

  // Ensure directories exist
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true })
  }

  return {
    databasePath: path.join(dataDir, 'dm-hero.db'),
    uploadPath: uploadsDir,
  }
}

/**
 * Start the Nitro server as a utility process (production only)
 */
async function startServer() {
  if (isDev) {
    console.log('[Electron] Dev mode - using external Nuxt dev server')
    return
  }

  const paths = getDataPaths()
  const serverPath = path.join(__dirname, '..', '.output', 'server', 'index.mjs')

  if (!existsSync(serverPath)) {
    console.error('[Electron] Server not found at:', serverPath)
    console.error('[Electron] Run "pnpm build" first!')
    app.quit()
    return
  }

  console.log('[Electron] Starting Nitro server...')
  console.log('[Electron]   Server path:', serverPath)
  console.log('[Electron]   DATABASE_PATH:', paths.databasePath)
  console.log('[Electron]   UPLOAD_PATH:', paths.uploadPath)

  // Start server as utility process with environment variables
  serverProcess = utilityProcess.fork(serverPath, [], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: String(PROD_SERVER_PORT),
      DATABASE_PATH: paths.databasePath,
      UPLOAD_PATH: paths.uploadPath,
    },
    stdio: 'pipe',
  })

  // Log server output
  serverProcess.stdout?.on('data', (data) => {
    console.log('[Server]', data.toString().trim())
  })

  serverProcess.stderr?.on('data', (data) => {
    console.error('[Server Error]', data.toString().trim())
  })

  serverProcess.on('exit', (code) => {
    console.log('[Electron] Server process exited with code:', code)
    serverProcess = null
  })

  // Wait for server to be ready
  await waitForServer(`http://127.0.0.1:${PROD_SERVER_PORT}`, 30000)
  console.log('[Electron] Server is ready!')
}

/**
 * Wait for server to respond
 */
async function waitForServer(url, timeout = 30000) {
  const start = Date.now()

  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      if (response.ok || response.status === 404) {
        return true
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error(`Server did not start within ${timeout}ms`)
}

/**
 * Stop the server process
 */
function stopServer() {
  if (serverProcess) {
    console.log('[Electron] Stopping server...')
    serverProcess.kill()
    serverProcess = null
  }
}

function createWindow() {
  console.log('[Electron] Creating window...')
  console.log('[Electron] isDev:', isDev)

  // Start with dark theme (default)
  const currentTheme = THEME.dark

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: currentTheme.background,
    show: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: currentTheme.titleBarOverlay,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    console.log('[Electron] Window ready to show')
    mainWindow.show()
  })

  // Inject CSS variables for Electron-specific styling (persistent)
  mainWindow.webContents.on('dom-ready', () => {
    // macOS has window controls on the left, Windows/Linux on the right
    const isMac = process.platform === 'darwin'
    mainWindow.webContents.insertCSS(`:root {
      --electron-hide-inline: none !important;
      --electron-show-badge: inline-flex !important;
      --electron-badge-offset: ${isMac ? '0px' : '18px'} !important;
      --electron-btn-margin: ${isMac ? '0px' : '40px'} !important;
    }

`)
  })

  mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
    console.error(`[Electron] Failed to load: ${errorCode} ${errorDescription}`)
  })

  // Load the appropriate URL
  const serverUrl = isDev ? 'http://localhost:3000' : `http://127.0.0.1:${PROD_SERVER_PORT}`
  console.log('[Electron] Loading URL:', serverUrl)
  mainWindow.loadURL(serverUrl)

  if (isDev) {
    mainWindow.webContents.openDevTools()
  }
}

// App lifecycle
app.whenReady().then(async () => {
  try {
    await startServer()
    createWindow()
  } catch (error) {
    console.error('[Electron] Failed to start:', error)
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopServer()
})

app.on('quit', () => {
  stopServer()
})
