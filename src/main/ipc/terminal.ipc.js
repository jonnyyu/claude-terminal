/**
 * Terminal IPC Handlers
 * Handles terminal-related IPC communication
 */

const { ipcMain, clipboard } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const terminalService = require('../services/TerminalService');
const { sendFeaturePing } = require('../services/TelemetryService');

/**
 * Register terminal IPC handlers
 */
function registerTerminalHandlers() {
  // Create terminal
  ipcMain.handle('terminal-create', (event, { cwd, runClaude, skipPermissions, resumeSessionId, projectId, projectPath }) => {
    try {
      sendFeaturePing('terminal:create');
      return terminalService.create({ cwd, runClaude, skipPermissions, resumeSessionId, projectId, projectPath });
    } catch (error) {
      console.error('[Terminal IPC] Create error:', error);
      return { success: false, error: error.message };
    }
  });

  // Terminal input
  ipcMain.on('terminal-input', (event, { id, data }) => {
    terminalService.write(id, data);
  });

  // Terminal resize
  ipcMain.on('terminal-resize', (event, { id, cols, rows }) => {
    terminalService.resize(id, cols, rows);
  });

  // Kill terminal
  ipcMain.on('terminal-kill', (event, { id }) => {
    terminalService.kill(id);
  });

  // Save the current clipboard image to a temp PNG and return its path.
  // The Claude CLI can't read a clipboard image from an embedded terminal
  // (Cmd+V is intercepted before it reaches the CLI), so we hand it a file
  // path to paste into the prompt instead. Returns null when there's no image.
  ipcMain.handle('terminal-save-clipboard-image', () => {
    try {
      const image = clipboard.readImage();
      if (!image || image.isEmpty()) return null;
      const png = image.toPNG();
      if (!png || png.length === 0) return null;
      const dir = path.join(os.tmpdir(), 'claude-terminal-paste');
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `clip-${Date.now()}.png`);
      fs.writeFileSync(file, png);
      return file;
    } catch (error) {
      console.error('[Terminal IPC] Save clipboard image error:', error);
      return null;
    }
  });
}

module.exports = { registerTerminalHandlers };
