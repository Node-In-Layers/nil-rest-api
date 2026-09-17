import { Request } from 'express'
import {
  ExpressLogIgnorePattern,
  ExpressRouter,
  ExpressRoute,
  ExpressRouteOptions,
  ExpressRouteLoggingOptions,
} from './types.js'

const isExpressRouter = (obj: any): obj is ExpressRouter => {
  return Boolean(obj.router)
}

const getRequestPath = (req: Pick<Request, 'originalUrl' | 'url'>) => {
  const url = req.originalUrl || req.url || '/'
  return url.split('?')[0]
}

const matchesIgnoredEndpointPattern = (
  pattern: ExpressLogIgnorePattern,
  requestPath: string
) => {
  if (typeof pattern === 'string') {
    return requestPath.startsWith(pattern)
  }

  return new RegExp(pattern.source, pattern.flags).test(requestPath)
}

const shouldIgnoreLoggingForRequest = (
  args: Readonly<{
    req: Pick<Request, 'originalUrl' | 'url'>
    patterns?: readonly ExpressLogIgnorePattern[]
  }>
) => {
  const requestPath = getRequestPath(args.req)
  const patterns = args.patterns || []

  return patterns.some(pattern => {
    return matchesIgnoredEndpointPattern(pattern, requestPath)
  })
}

const shouldOmitLoggingData = (
  omitRequestData: boolean,
  omitResponseData: boolean
): ExpressRouteOptions => {
  return {
    logging: {
      request: {
        omitData: omitRequestData,
      },
      response: {
        omitData: omitResponseData,
      },
    },
  }
}

const doesExpressRouteMatchRequest = (
  args: Readonly<{
    route: ExpressRoute
    req: Pick<Request, 'method' | 'originalUrl' | 'url'>
  }>
) => {
  const requestPath = getRequestPath(args.req)
  const requestMethod = args.req.method.toLowerCase()
  const methodMatches =
    args.route.method === requestMethod ||
    (requestMethod === 'head' && args.route.method === 'get')

  if (!methodMatches) {
    return false
  }

  const routeSegments = args.route.route.split('/').filter(Boolean)
  const requestSegments = requestPath.split('/').filter(Boolean)

  if (routeSegments.length !== requestSegments.length) {
    return false
  }

  return routeSegments.every((segment, index) => {
    if (segment === '*' || segment.startsWith(':')) {
      return true
    }

    return segment === requestSegments[index]
  })
}

const getRouteLoggingOptionsForRequest = (
  args: Readonly<{
    req: Pick<Request, 'method' | 'originalUrl' | 'url'>
    routes: readonly ExpressRoute[]
  }>
): ExpressRouteLoggingOptions | undefined => {
  return args.routes.find(route => {
    return doesExpressRouteMatchRequest({
      route,
      req: args.req,
    })
  })?.options?.logging
}

export {
  isExpressRouter,
  getRequestPath,
  matchesIgnoredEndpointPattern,
  shouldIgnoreLoggingForRequest,
  shouldOmitLoggingData,
  doesExpressRouteMatchRequest,
  getRouteLoggingOptionsForRequest,
}
