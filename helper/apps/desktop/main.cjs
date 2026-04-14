const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 920,
    minWidth: 1100,
    minHeight: 760,
    backgroundColor: "#0b1020",
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  });

  const devUrl = process.env.DESKTOP_START_URL || "http://localhost:5188";
  const prodIndex = path.resolve(__dirname, "../web/dist/index.html");
  if (process.env.NODE_ENV === "production" && require("fs").existsSync(prodIndex)) {
    mainWindow.loadFile(prodIndex);
  } else {
    mainWindow.loadURL(devUrl);
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
