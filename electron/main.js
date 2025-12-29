const { app, BrowserWindow } = require("electron");
const path = require("path");
const { startServer } = require("./server");

let mainWindow;
let serverRef;

async function createWindow() {
  serverRef = await startServer(0);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await mainWindow.loadURL(`http://127.0.0.1:${serverRef.port}/index.html`);

  // opcional: abrir devtools automaticamente no dev
  // mainWindow.webContents.openDevTools({ mode: "detach" });

  mainWindow.on("closed", () => (mainWindow = null));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (serverRef?.server) serverRef.server.close();
});
