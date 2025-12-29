const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("app", {
  name: "Biblia Multi-Idiomas",
});
