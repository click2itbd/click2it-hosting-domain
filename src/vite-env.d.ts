/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEV_BYPASS?: string;
}

declare module "*.json" {
  const value: any;
  export default value;
}
