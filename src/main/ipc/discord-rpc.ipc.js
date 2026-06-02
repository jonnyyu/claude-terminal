/**
 * Discord Rich Presence IPC Handlers
 * Bridges the renderer settings toggle with DiscordRpcService.
 */

const { ipcMain } = require('electron');
const discordRpcService = require('../services/DiscordRpcService');

function registerDiscordRpcHandlers() {
  // Apply a live settings change (enable/disable, show project name)
  ipcMain.handle('discord-rpc:apply-settings', async (_event, params) => {
    try {
      discordRpcService.applySettings(params || {});
      return { success: true, connected: discordRpcService.isConnected() };
    } catch (err) {
      console.error('[discord-rpc:apply-settings] Error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Report current connection status (for the settings UI badge)
  ipcMain.handle('discord-rpc:status', async () => {
    return {
      enabled: discordRpcService.enabled,
      connected: discordRpcService.isConnected(),
    };
  });
}

module.exports = { registerDiscordRpcHandlers };
