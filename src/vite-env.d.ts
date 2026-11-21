/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** 'false' hides the demo accounts on the sign-in page. */
  readonly VITE_DEMO_ACCOUNTS?: string
  /** 'false' hides the demo tools (Reset, API status) in the top bar; employees never see them. */
  readonly VITE_DEMO_TOOLS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
