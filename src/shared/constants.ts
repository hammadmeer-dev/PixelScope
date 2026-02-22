import type { Platform } from './types';

export const PIXEL_GLOBALS: Record<string, Platform> = {
  fbq: 'meta',
  ttq: 'tiktok',
  snaptr: 'snapchat',
  uetq: 'ms_uet',
  twq: 'twitter',
  lintrk: 'linkedin',
  pintrk: 'pinterest',
};

export const ENDPOINT_PATTERNS: Array<{ pattern: RegExp; platform: Platform }> = [
  { pattern: /facebook\.com\/tr/, platform: 'meta' },
  { pattern: /analytics\.tiktok\.com/, platform: 'tiktok' },
  { pattern: /tr\.snapchat\.com/, platform: 'snapchat' },
  { pattern: /bat\.bing\.com\/action/, platform: 'ms_uet' },
  { pattern: /t\.co\/i\/adsct/, platform: 'twitter' },
  { pattern: /px\.ads\.linkedin\.com/, platform: 'linkedin' },
  { pattern: /ct\.pinterest\.com/, platform: 'pinterest' },
  { pattern: /google-analytics\.com\/g\/collect/, platform: 'ga4' },
  { pattern: /googletagmanager\.com\/gtm\.js/, platform: 'gtm' },
];

export const PLATFORM_META: Record<Platform, { name: string; color: string; emoji: string }> = {
  meta: { name: 'Meta Pixel', color: '#1877f2', emoji: '📘' },
  tiktok: { name: 'TikTok Pixel', color: '#ff0050', emoji: '🎵' },
  snapchat: { name: 'Snapchat Pixel', color: '#fffc00', emoji: '👻' },
  ms_uet: { name: 'Microsoft UET', color: '#00a4ef', emoji: '🪟' },
  twitter: { name: 'Twitter/X Pixel', color: '#1da1f2', emoji: '𝕏' },
  linkedin: { name: 'LinkedIn Insight', color: '#0077b5', emoji: '💼' },
  pinterest: { name: 'Pinterest Tag', color: '#e60023', emoji: '📌' },
  ga4: { name: 'Google Analytics 4', color: '#e37400', emoji: '📊' },
  gtm: { name: 'Google Tag Manager', color: '#4285f4', emoji: '🏷' },
};

