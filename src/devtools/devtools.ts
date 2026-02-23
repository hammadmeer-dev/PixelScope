// DevTools page bootstrap (Step 1).
// The panel UI will be implemented in later steps.

// Guard so this file can be imported/built in non-devtools contexts without throwing.
if (typeof chrome !== 'undefined' && chrome.devtools?.panels) {
  chrome.devtools.panels.create('PixelScope', '', '/src/devtools/panel/panel.html');
}

export {};

