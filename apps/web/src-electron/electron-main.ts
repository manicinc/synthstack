/**
 * SynthStack Electron Main Process
 *
 * This is the main entry point for the Electron desktop application.
 * It handles window creation, native menus, auto-updates, and IPC communication.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const { app, BrowserWindow, Menu, shell, ipcMain, nativeTheme, Tray } = require('electron');
const path = require('path');
const os = require('os');

// AutoUpdater stub for dev mode
const autoUpdater = {
  autoDownload: false,
  autoInstallOnAppQuit: false,
  on: (_event: string, _handler: (...args: unknown[]) => void) => {},
  checkForUpdatesAndNotify: () => Promise.resolve(null),
  checkForUpdates: () => Promise.resolve(null),
  downloadUpdate: () => Promise.resolve(null),
  quitAndInstall: () => {},
};

// Needed for Quasar - in dev mode, files are one level up; in production, same directory
process.env.DIST = process.env.DEV ? path.join(__dirname, '../') : __dirname;

// Icon path - use source path in dev, built path in production
const iconPath = process.env.DEV
  ? path.join(__dirname, '../../src-electron/icons/icon.png')
  : path.join(__dirname, 'icons/icon.png');

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// Window state persistence
interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

const DEFAULT_WINDOW_STATE: WindowState = {
  width: 1200,
  height: 800,
  isMaximized: false,
};

function getWindowState(): WindowState {
  try {
    const Store = require('electron-store');
    const store = new Store();
    return store.get('windowState', DEFAULT_WINDOW_STATE);
  } catch {
    return DEFAULT_WINDOW_STATE;
  }
}

function saveWindowState(window: BrowserWindow): void {
  try {
    const Store = require('electron-store');
    const store = new Store();

    const bounds = window.getBounds();
    const state: WindowState = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: window.isMaximized(),
    };

    store.set('windowState', state);
  } catch {
    // Ignore storage errors
  }
}

function createWindow(): void {
  const windowState = getWindowState();

  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: false,
    backgroundColor: '#0D0D0D',
    icon: iconPath,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload', 'electron-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  // Restore maximized state
  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  // Load the app
  if (process.env.DEV) {
    mainWindow.loadURL(process.env.APP_URL || 'http://localhost:3050');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(process.env.DIST, 'index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Save window state on close
  mainWindow.on('close', (e) => {
    if (!isQuitting && process.platform === 'darwin') {
      e.preventDefault();
      mainWindow?.hide();
      return;
    }

    if (mainWindow) {
      saveWindowState(mainWindow);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Handle navigation
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const appUrl = process.env.APP_URL || 'http://localhost:3050';
    if (!url.startsWith(appUrl) && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

function createMenu(): void {
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        {
          label: 'Preferences...',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow?.webContents.send('navigate', '/app/settings');
          },
        },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const },
      ],
    }] : []),

    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('navigate', '/app/generate');
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },

    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' as const },
          { role: 'delete' as const },
          { role: 'selectAll' as const },
        ] : [
          { role: 'delete' as const },
          { type: 'separator' as const },
          { role: 'selectAll' as const },
        ]),
      ],
    },

    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },

    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' as const },
          { role: 'front' as const },
          { type: 'separator' as const },
          { role: 'window' as const },
        ] : [
          { role: 'close' as const },
        ]),
      ],
    },

    // Help menu
    {
      role: 'help',
      submenu: [
        {
          label: 'Documentation',
          click: async () => {
            await shell.openExternal('https://docs.synthstack.app');
          },
        },
        {
          label: 'Report an Issue',
          click: async () => {
            await shell.openExternal('https://github.com/synthstack/synthstack/issues');
          },
        },
        { type: 'separator' },
        {
          label: 'Check for Updates...',
          click: () => {
            autoUpdater.checkForUpdatesAndNotify();
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createTray(): void {
  if (process.platform === 'darwin') {
    // macOS uses dock, no tray needed
    return;
  }

  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show SynthStack',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('SynthStack');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

function setupAutoUpdater(): void {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('update-status', 'checking');
  });

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-status', 'available', info);
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('update-status', 'not-available');
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update-progress', progress);
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update-status', 'downloaded');
  });

  autoUpdater.on('error', (error) => {
    mainWindow?.webContents.send('update-status', 'error', error.message);
  });

  // Check for updates on startup (production only)
  if (!process.env.DEV) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 5000);
  }
}

function setupIPC(): void {
  // Get app info
  ipcMain.handle('get-app-info', () => ({
    version: app.getVersion(),
    name: app.getName(),
    platform: process.platform,
    arch: process.arch,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
  }));

  // Get system info
  ipcMain.handle('get-system-info', () => ({
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    cpus: os.cpus().length,
    memory: os.totalmem(),
    freeMemory: os.freemem(),
    userInfo: os.userInfo(),
  }));

  // Theme
  ipcMain.handle('get-system-theme', () => {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  });

  ipcMain.handle('set-native-theme', (_, theme: 'dark' | 'light' | 'system') => {
    nativeTheme.themeSource = theme;
    return true;
  });

  // Window controls
  ipcMain.handle('window-minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle('window-close', () => {
    mainWindow?.close();
  });

  ipcMain.handle('window-is-maximized', () => {
    return mainWindow?.isMaximized() ?? false;
  });

  // Auto-updater controls
  ipcMain.handle('check-for-updates', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return result;
    } catch (error) {
      return null;
    }
  });

  ipcMain.handle('download-update', () => {
    autoUpdater.downloadUpdate();
  });

  ipcMain.handle('install-update', () => {
    isQuitting = true;
    autoUpdater.quitAndInstall();
  });

  // Open external URLs
  ipcMain.handle('open-external', (_, url: string) => {
    shell.openExternal(url);
  });

  // Show item in folder
  ipcMain.handle('show-item-in-folder', (_, path: string) => {
    shell.showItemInFolder(path);
  });
}

// App lifecycle
app.whenReady().then(() => {
  // Set dock icon on macOS
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(iconPath);
  }

  createWindow();
  createMenu();
  createTray();
  setupAutoUpdater();
  setupIPC();

  // macOS: recreate window when dock icon clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle before-quit for macOS
app.on('before-quit', () => {
  isQuitting = true;
});

// Security: Prevent new webview creation
app.on('web-contents-created', (_, contents) => {
  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
});

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (process.env.DEV) {
    // In development, ignore certificate errors for localhost
    if (url.startsWith('https://localhost')) {
      event.preventDefault();
      callback(true);
      return;
    }
  }
  callback(false);
});
