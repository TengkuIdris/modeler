import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  saveSTL: (filename: string, data: ArrayBuffer) => 
    ipcRenderer.invoke('save-stl', { filename, data }),
  
  loadImage: () => 
    ipcRenderer.invoke('load-image'),
  
  platform: process.platform,
})

// Type declaration for TypeScript
declare global {
  interface Window {
    electronAPI: {
      saveSTL: (filename: string, data: ArrayBuffer) => Promise<{ success: boolean; path?: string }>
      loadImage: () => Promise<{ success: boolean; data?: string }>
      platform: NodeJS.Platform
    }
  }
}


