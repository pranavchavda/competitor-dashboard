const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Add other API methods as needed
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Environment detection for API utility
  isElectron: () => true
})

// Make sure the app knows it's running in Electron
contextBridge.exposeInMainWorld('__ELECTRON__', true)