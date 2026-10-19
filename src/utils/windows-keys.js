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

    const script = `
Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void keybd_event(byte b, byte s, int f, int e);' -Name 'K' -Namespace 'WinMedia' -ErrorAction SilentlyContinue
[WinMedia.K]::keybd_event(${vkCode}, 0, 0, 0)
[WinMedia.K]::keybd_event(${vkCode}, 0, 2, 0)
`;
    const encoded = Buffer.from(script, 'utf16le').toString('base64');

    return new Promise((resolve) => {
      exec(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`, (err) => {
        if (err) {
          console.error(`[KeyController] Failed to send media key ${action}:`, err.message);
        }
        resolve(!err);
      });
    });
  }

  /**
   * Send hardware-level global hotkey (interception by background apps like Discord, OBS, games)
   * Examples: 'ctrl+shift+m', 'ctrl+shift+d', 'f13', 'f14', 'alt+f4'
   */
  sendGlobalHotKey(comboStr) {
    if (!comboStr) return Promise.resolve(false);

    const vkMap = {
      'ctrl': 0x11, 'control': 0x11,
      'shift': 0x10,
      'alt': 0x12, 'menu': 0x12,
      'win': 0x5B, 'windows': 0x5B,
      'f1': 0x70, 'f2': 0x71, 'f3': 0x72, 'f4': 0x73, 'f5': 0x74, 'f6': 0x75,
      'f7': 0x76, 'f8': 0x77, 'f9': 0x78, 'f10': 0x79, 'f11': 0x7A, 'f12': 0x7B,
      'f13': 0x7C, 'f14': 0x7D, 'f15': 0x7E, 'f16': 0x7F,
      'f17': 0x80, 'f18': 0x81, 'f19': 0x82, 'f20': 0x83,
      'f21': 0x84, 'f22': 0x85, 'f23': 0x86, 'f24': 0x87,
      'space': 0x20, 'enter': 0x0D, 'escape': 0x1B, 'tab': 0x09
    };

    const parts = comboStr.toLowerCase().replace(/[\s\+]+/g, '+').split('+').map(p => p.trim()).filter(Boolean);
    const codes = [];

    for (const part of parts) {
      if (vkMap[part]) {
        codes.push(vkMap[part]);
      } else if (part.length === 1) {
        const code = part.toUpperCase().charCodeAt(0);
        codes.push(code);
      }
    }

    if (codes.length === 0) {
      console.warn(`[KeyController] Aucun code VK valide pour: ${comboStr}`);
      return Promise.resolve(false);
    }

    let lines = [
      "Add-Type -MemberDefinition '[DllImport(\"user32.dll\")] public static extern void keybd_event(byte b, byte s, int f, int e);' -Name 'K' -Namespace 'WinMedia' -ErrorAction SilentlyContinue"
    ];

    // Key downs
    codes.forEach(c => lines.push(`[WinMedia.K]::keybd_event(${c}, 0, 0, 0)`));
    // Key ups in reverse order
    [...codes].reverse().forEach(c => lines.push(`[WinMedia.K]::keybd_event(${c}, 0, 2, 0)`));

    const script = lines.join('\n');
    const encoded = Buffer.from(script, 'utf16le').toString('base64');

    return new Promise((resolve) => {
      exec(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`, (err) => {
        if (err) {
          console.error(`[KeyController] Failed to send global hotkey ${comboStr}:`, err.message);
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
