import merge from 'lodash/merge.js'
import type { Request } from 'express'
import {
  combineCrossLayerProps,
  createCrossLayerProps,
  CrossLayerProps,
  Logger,
} from '@node-in-layers/core'

export type RequestInfo = Readonly<{
  headers: Record<string, string>
  body: Record<string, unknown>
  query: Record<string, string>
  params: Record<string, string>
  path: string
  method: string
  url: string
  protocol: string
}>

export type RequestCrossLayerProps = CrossLayerProps<
  Readonly<{
    requestInfo: RequestInfo
  }>
>

export const buildRequestInfoFromExpressRequest = (
  req: Request
): RequestInfo => {
  const headers: Record<string, string> = Object.entries(
    req.headers ?? {}
  ).reduce(
    (acc, [key, value]) => {
      if (Array.isArray(value)) {
        return merge(acc, { [key]: value.join(', ') })
      }
      if (value !== undefined) {
        return merge(acc, { [key]: String(value) })
      }
      return acc
    },
    {} as Record<string, string>
  )

  const body =
    req.body && typeof req.body === 'object' && !Array.isArray(req.body)
      ? (req.body as Record<string, unknown>)
      : {}

  const query: Record<string, string> = Object.entries(req.query ?? {}).reduce(
    (acc, [key, value]) => {
      if (Array.isArray(value)) {
        return merge(acc, { [key]: value.join(',') })
      }
      if (value !== null && value !== undefined) {
        return merge(acc, { [key]: String(value) })
      }
      return acc
    },
    {} as Record<string, string>
  )

  return {
    headers,
    body,
    query,
    params: (req.params ?? {}) as Record<string, string>,
    path: req.path ?? '',
    method: req.method ?? '',
    url: req.originalUrl ?? '',
    protocol: req.protocol ?? 'http',
  }
}

export const crossLayerPropsFromExpressRequest = (
  req: Request,
  existing?: CrossLayerProps,
  logger?: Logger
): RequestCrossLayerProps => {
  const base: RequestCrossLayerProps = req.getRequestCrossLayerProps?.() ||
    req._crossLayerProps || {
      requestInfo: buildRequestInfoFromExpressRequest(req),
    }
  const mergedCrossLayerProps = existing
    ? combineCrossLayerProps(existing, base)
    : base

  return logger
    ? (createCrossLayerProps(
        logger,
        mergedCrossLayerProps
      ) as RequestCrossLayerProps)
    : mergedCrossLayerProps
}
