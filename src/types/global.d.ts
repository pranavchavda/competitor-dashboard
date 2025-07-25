// Global type declarations

declare global {
  interface Window {
    __TAURI__?: any;
    __ELECTRON__?: boolean;
    electronAPI?: {
      getAppVersion: () => Promise<string>;
      openExternal: (url: string) => Promise<void>;
      isElectron: () => boolean;
    };
  }
}

export {};