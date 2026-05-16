import path from 'node:path';
import type { BrowserWindow } from 'electron';

export function loadRenderer(window: BrowserWindow, route: string) {
  const devUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL;
  if (devUrl) {
    window.loadURL(`${devUrl}#${route}`);
    return;
  }

  const indexPath = path.join(
    __dirname,
    `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`,
  );
  window.loadFile(indexPath, { hash: route });
}
