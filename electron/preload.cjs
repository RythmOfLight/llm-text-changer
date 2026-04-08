const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronApi', {
  loadState: () => ipcRenderer.invoke('state:load'),
  saveState: (state) => ipcRenderer.invoke('state:save', state),
  validateFile: (filePath) => ipcRenderer.invoke('files:validate', filePath),
  readFile: (filePath) => ipcRenderer.invoke('files:read', filePath),
  writeFile: (filePath, text) => ipcRenderer.invoke('files:write', filePath, text),
  appendFile: (filePath, text) => ipcRenderer.invoke('files:append', filePath, text),
  watchFile: (filePath) => ipcRenderer.invoke('files:watch', filePath),
  unwatchFile: (filePath) => ipcRenderer.invoke('files:unwatch', filePath),
  pickTargetFile: () => ipcRenderer.invoke('files:pick-target'),
  pickDocxExportPath: (suggestedName) => ipcRenderer.invoke('files:pick-docx-export', suggestedName),
  exportDocx: (args) => ipcRenderer.invoke('files:export-docx', args),
  generateText: (args) => ipcRenderer.invoke('providers:generate', args),
  onFileChanged: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('files:changed', listener);

    return () => {
      ipcRenderer.removeListener('files:changed', listener);
    };
  }
});
