import type { RequestCrossLayerProps } from '../features/expressLibs.js'

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string
    _crossLayerProps?: RequestCrossLayerProps
    getRequestCrossLayerProps?: () => RequestCrossLayerProps | undefined
  }

  interface Response {
    actualSentJson?: unknown
    actualSent?: unknown
    actualStatus?: number
    redirectPath?: string
  }
}
