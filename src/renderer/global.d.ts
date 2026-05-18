import type { MallangBridge } from '../preload/preload';

declare global {
  interface Window {
    mallang?: MallangBridge;
  }
}

export {};
