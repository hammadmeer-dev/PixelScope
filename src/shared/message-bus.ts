import type { ExtensionMessage } from './types';

// Typed wrapper around chrome.runtime.sendMessage
export function sendToBackground(message: ExtensionMessage): Promise<unknown> {
  return chrome.runtime.sendMessage(message);
}

export function sendToTab(tabId: number, message: ExtensionMessage): Promise<unknown> {
  return chrome.tabs.sendMessage(tabId, message);
}

export function onMessage(
  handler: (msg: ExtensionMessage, sender: chrome.runtime.MessageSender) => void | Promise<unknown>,
): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const result = handler(message as ExtensionMessage, sender);
    if (result instanceof Promise) {
      result.then(sendResponse);
      return true; // keep channel open
    }
  });
}

