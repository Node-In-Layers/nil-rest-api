import type { CrossLayerProps } from '@node-in-layers/core'

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string
    _crossLayerProps?: CrossLayerProps
    getRequestCrossLayerProps?: () => CrossLayerProps | undefined
  }

  interface Response {
    actualSentJson?: unknown
    actualSent?: unknown
    actualStatus?: number
    redirectPath?: string
  }
}
