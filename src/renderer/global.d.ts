import type { MallangBridge } from '../preload';

declare global {
  interface Window {
    mallang: MallangBridge;
  }
}

export {};
