import { Request } from 'express'
import { ExpressLogIgnorePattern, ExpressRouter } from './types.js'

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

export {
  isExpressRouter,
  getRequestPath,
  matchesIgnoredEndpointPattern,
  shouldIgnoreLoggingForRequest,
}
