const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("phobosSupport", {
  collect: (includeDetails, source) => ipcRenderer.invoke("phobos:support-collect", { includeDetails, source }),
  copy: (request) => ipcRenderer.invoke("phobos:support-copy", request),
  save: (request) => ipcRenderer.invoke("phobos:support-save", request),
  openIssue: (request) => ipcRenderer.invoke("phobos:support-issue", request),
});
