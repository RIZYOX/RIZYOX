const { exec, spawn } = require('child_process');

/**
 * Windows Keystroke and Media Key simulator
 */
class WindowsKeyController {
  constructor() {
    this.mediaKeyMap = {
      'play_pause': 0xB3,
      'next': 0xB0,
      'prev': 0xB1,
      'vol_up': 0xAF,
      'vol_down': 0xAE,
      'mute': 0xAD,
      'stop': 0xB2
    };
  }

  /**
   * Send a media key event using Windows API
   * @param {string} action Key name (play_pause, next, prev, vol_up, vol_down, mute)
   */
  sendMediaKey(action) {
    const vkCode = this.mediaKeyMap[action];
    if (!vkCode) {
      console.warn(`[KeyController] Unknown media key: ${action}`);
      return Promise.reject(new Error(`Unknown media key: ${action}`));
    }

    const psCommand = `Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinMedia {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    public static void Tap(byte vk) {
        keybd_event(vk, 0, 0, UIntPtr.Zero);
        keybd_event(vk, 0, 2, UIntPtr.Zero);
    }
}
"@; [WinMedia]::Tap(${vkCode})`;

    return new Promise((resolve) => {
      exec(`powershell -NoProfile -NonInteractive -Command "${psCommand.replace(/\n/g, ' ')}"`, (err) => {
        if (err) {
          console.error(`[KeyController] Failed to send media key ${action}:`, err.message);
        }
        resolve(!err);
      });
    });
  }

  /**
   * Send standard SendKeys string (e.g., "^c" for Ctrl+C, "%{F4}" for Alt+F4, "{ENTER}")
   * @param {string} keys 
   */
  sendShortcut(keys) {
    // Sanitize quotes
    const safeKeys = keys.replace(/"/g, '""');
    const cmd = `powershell -NoProfile -NonInteractive -Command "(New-Object -ComObject WScript.Shell).SendKeys('${safeKeys}')"`;
    
    return new Promise((resolve) => {
      exec(cmd, (err) => {
        if (err) {
          console.error(`[KeyController] Failed to send shortcut ${keys}:`, err.message);
        }
        resolve(!err);
      });
    });
  }

  /**
   * Launch application, URL, or file
   * @param {string} target 
   */
  launch(target) {
    return new Promise((resolve) => {
      exec(`start "" "${target}"`, { shell: 'cmd.exe' }, (err) => {
        if (err) {
          console.error(`[KeyController] Failed to launch ${target}:`, err.message);
        }
        resolve(!err);
      });
    });
  }

  /**
   * Execute custom shell command
   * @param {string} command 
   */
  executeCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, { shell: 'powershell.exe' }, (err, stdout, stderr) => {
        if (err) {
          return reject(err);
        }
        resolve(stdout || stderr);
      });
    });
  }
}

module.exports = new WindowsKeyController();
