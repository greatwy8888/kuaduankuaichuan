const { app, BrowserWindow, nativeImage } = require('electron');
const path = require('node:path');
const { startServer } = require('../server');
let server;
function createWindow() {
  const win = new BrowserWindow({ width: 1000, height: 760, minWidth: 720, minHeight: 560, title: '跨端快传', autoHideMenuBar: true, backgroundColor: '#f4f9ff', icon: path.join(__dirname, '..', 'assets', 'icon.png'), webPreferences: { contextIsolation: true, nodeIntegration: false } });
  win.loadURL('http://127.0.0.1:3210');
}
app.whenReady().then(async () => { server = await startServer({ port: 3210 }); createWindow(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { if (server) server.close(); });
