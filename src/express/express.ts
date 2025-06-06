import { randomUUID } from 'node:crypto'
import { StatusCodes } from 'http-status-codes'
import { DataDescription } from 'functional-models'
import Express, { Request, Response, Router } from 'express'
import {
  ServicesContext,
  FeaturesContext,
  ModelCrudsFunctions,
  LogLevelNames,
} from '@node-in-layers/core'
import { DataConfig } from '@node-in-layers/data/index.js'
import bodyParser from 'body-parser'
import get from 'lodash/get.js'
import pickBy from 'lodash/pickBy.js'
import cors from 'cors'
import compression from 'http-compression'
import { RestApiNamespace } from '../common/types.js'
import {
  ExpressConfig,
  ExpressMethod,
  ExpressRouter,
  ExpressMiddleware,
  ExpressControllerFunc,
  ExpressRoute,
  ExpressFeaturesLayer,
  ExpressFunctions,
  ExpressContext,
  ExpressLoggedControllerFunc,
} from './types.js'
import { isExpressRouter } from './libs.js'

const DEFAULT_BODY_SIZE = 10
const MAX_NORMAL_RESPONSE_LENGTH = 8192
const BAD_REQUEST_INT = 400
const DEFAULT_RESPONSE_REQUEST_LOG_LEVEL = LogLevelNames.info

const requestIdMiddleware = (req: Request, _, next: () => void) => {
  // eslint-disable-next-line functional/immutable-data
  req.requestId = randomUUID()
  next()
}

const create = (
  context: FeaturesContext<
    DataConfig & ExpressConfig,
    ServicesContext,
    ExpressFeaturesLayer
  >
): ExpressFunctions => {
  const logRequestMiddleware = (
    req: Request,
    res: Response,
    next: () => void
  ) => {
    const logger = context.log
      .getIdLogger('logRequest', 'requestId', req.requestId)
      .applyData({
        requestId: req.requestId,
      })
    const requestLogDataCallback =
      context.config[RestApiNamespace.express].logging
        ?.requestLogDataCallback || (() => ({}))
    const requestLogData = requestLogDataCallback(req)
    const level =
      context.config[RestApiNamespace.express].logging?.requestLogLevel ||
      DEFAULT_RESPONSE_REQUEST_LOG_LEVEL
    logger[level]('Request received', {
      method: req.method,
      url: req.url,
      body: req.body,
      callerIp: req.ip,
      ...requestLogData,
    })
    next()
  }

  /**
   * This middleware wraps the "res" object, so that values of
   * status, json, send and redirect are captured and stored, accessible for
   * downstream middleware. This MUST be included BEFORE the routes that handle
   * the request.
   * @param req
   * @param res
   * @param next
   */
  const responseWrap = async (req, res, next) => {
    const originalStatus = res.status.bind(res)
    const originalSend = res.send.bind(res)
    const originalJson = res.json.bind(res)
    const originalRedirect = res.redirect.bind(res)
    type StatusSetter = () => void
    const json = (doStatus: StatusSetter) => {
      return (data: any) => {
        doStatus()
        // eslint-disable-next-line functional/immutable-data
        res.actualSentJson = data
        return originalJson(data)
      }
    }
    const send = (doStatus: StatusSetter) => {
      return (data: any) => {
        doStatus()
        // eslint-disable-next-line functional/immutable-data
        res.actualSent = data
        return originalSend(data)
      }
    }
    const status = (code: number) => {
      const r = originalStatus(code)
      // eslint-disable-next-line functional/immutable-data
      res.actualStatus = code

      return {
        json: json(() => r),
        send: send(() => r),
        redirect: redirect(() => r),
      }
    }
    const redirect = (doStatus: StatusSetter) => {
      return (...args: any[]) => {
        doStatus()
        const hasStatus = parseInt(args[0], 10) > 0
        const inputs = hasStatus ? [parseInt(args[0], 10), args[1]] : [args[0]]
        if (hasStatus) {
          // eslint-disable-next-line functional/immutable-data
          res.actualStatus = args[0]
        }
        // eslint-disable-next-line functional/immutable-data
        res.redirectPath = hasStatus ? args[1] : args[0]
        return originalRedirect(...inputs)
      }
    }

    /* eslint-disable functional/immutable-data */
    res.status = status
    res.redirect = redirect(() =>
      status(res.actualStatus || StatusCodes.MOVED_TEMPORARILY)
    )
    res.json = json(() => status(res.actualStatus || StatusCodes.OK))
    res.send = send(() => status(res.actualStatus || StatusCodes.OK))
    next()
    /* eslint-enable functional/immutable-data */
  }

  const logResponse = async (req, res, next) => {
    res.on('finish', () => {
      const logger = context.log
        .getIdLogger('logResponse', 'requestId', req.requestId)
        .applyData({
          requestId: req.requestId,
        })
      const level =
        context.config[RestApiNamespace.express].logging?.responseLogLevel ||
        DEFAULT_RESPONSE_REQUEST_LOG_LEVEL
      const responseLogDataCallback =
        context.config[RestApiNamespace.express].logging
          ?.responseLogDataCallback || (() => ({}))
      const responseLogData = responseLogDataCallback(req)
      const _getResponse = () => {
        const response = res.actualSentJson
          ? res.actualSentJson
          : res.actualSent
            ? { text: res.actualSent }
            : {}
        if (res.actualStatus < BAD_REQUEST_INT) {
          const asString = JSON.stringify(response)
          if (asString.length >= MAX_NORMAL_RESPONSE_LENGTH) {
            return undefined
          }
        }
        return response
      }

      const data = {
        ...pickBy({
          redirectPath: res.redirectPath,
        }),
        status: res.actualStatus,
        response: _getResponse(),
        ...responseLogData,
      }

      logger[level]('Request Response', data)
    })
    next()
  }

  const options = context.config[RestApiNamespace.express]
  if (!options) {
    throw new Error(`Must include ${RestApiNamespace.express} in the config`)
  }
  if (!options.port) {
    throw new Error(
      `Must include ${RestApiNamespace.express}.port in the config`
    )
  }
  const routes: (ExpressRoute | ExpressRouter)[] = []
  const _preRouteMiddleware: ExpressMiddleware[] = [
    requestIdMiddleware,
    logRequestMiddleware,
    responseWrap,
    logResponse,
  ]
  const preRouteMiddleware: ExpressMiddleware[] = []
  const postRouteMiddleware: ExpressMiddleware[] = [
    // @ts-ignore
    (err, req, res, next) => {
      console.error(err.stack)
      // @ts-ignore
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: {
          code: 'InternalServerError',
          message: 'An unhandled exception occurred',
        },
      })
    },
  ]
  const expressUses: any[] = []

  const addLoggedRoute = (
    method: ExpressMethod,
    route: string,
    func: ExpressLoggedControllerFunc
  ) => {
    const loggedRoute = async (req: Request, res: Response) => {
      const name = func.name || `${method.toUpperCase()}:${route}`
      const logger = context.log
        .getIdLogger('logRoute', 'requestId', req.requestId)
        .getIdLogger(name, 'functionCallId', randomUUID())
        .applyData({
          method,
          route,
        })

      logger.info('Executing route')
      return Promise.resolve()
        .then(async () => {

          return func(logger, req, res)
        })
        .then(() => {
          logger.info('Route executed')
        })
        .catch(e => {
          logger.error('Error executing route', {
            error: e,
          })
          res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: {
              code: 'InternalServerError',
              message: 'An unhandled exception occurred',
            },
          })
          throw e
        })
    }
    // eslint-disable-next-line functional/immutable-data
    routes.push({ method, route, func: loggedRoute })
  }

  const addRoute = (
    method: ExpressMethod,
    route: string,
    func: ExpressControllerFunc
  ) => {
    // eslint-disable-next-line functional/immutable-data
    routes.push({ method, route, func })
  }

  const addRouter = (router: Router) => {
    // eslint-disable-next-line functional/immutable-data
    routes.push({ router })
  }

  const addPreRouteMiddleware = (middleware: ExpressMiddleware) => {
    // eslint-disable-next-line functional/immutable-data
    preRouteMiddleware.push(middleware)
  }
  const addPostRouteMiddleware = (middleware: ExpressMiddleware) => {
    // eslint-disable-next-line functional/immutable-data
    postRouteMiddleware.push(middleware)
  }

  const addUse = (obj: any) => {
    // eslint-disable-next-line functional/immutable-data
    expressUses.push(obj)
  }

  const addModelCrudsInterface = <T extends DataDescription>(
    modelCrudsInterface: ModelCrudsFunctions<T>,
    urlPrefix?: string
  ) => {
    const model = modelCrudsInterface.getModel()
    const controller =
      context.features[RestApiNamespace.express].modelCrudsController(
        modelCrudsInterface
      )
    const router = context.features[RestApiNamespace.express].modelCrudsRouter(
      model,
      controller,
      urlPrefix
    )
    addRouter(router)
    return
  }

  const listen = () => {
    const express = getApp()
    context.log.info(`Starting server listening on ${options.port}`)
    express.listen(options.port)
  }

  const getApp = () => {
    const express = Express()
    expressUses.forEach(express.use)
    if (!options.noTrustProxy) {
      express.set('trust proxy', true)
    }
    if (!options.noCors) {
      express.use(cors())
    }
    if (!options.noCompression) {
      express.use(compression())
    }
    if (options.session) {
      express.use({
        session: options.session,
      })
    }
    const jsonLimit = options.jsonBodySizeLimitInMb
      ? `${options.jsonBodySizeLimitInMb}mb`
      : `${DEFAULT_BODY_SIZE}mb`
    const encodedLimit = options.encodedBodySizeLimitInMb
      ? `${options.encodedBodySizeLimitInMb}mb`
      : `${DEFAULT_BODY_SIZE}mb`
    express.use(
      bodyParser.urlencoded({
        limit: encodedLimit,
        extended: false,
      })
    )
    express.use(
      bodyParser.json({
        limit: jsonLimit,
      })
    )
    preRouteMiddleware.forEach(m => {
      express.use(m)
    })
    // We want the ability to run our own before we run the default ones.
    _preRouteMiddleware.forEach(m => {
      express.use(m)
    })
    routes.forEach(r => {
      if (isExpressRouter(r)) {
        express.use(r.router)
      } else {
        express[r.method](r.route, r.func)
      }
    })
    postRouteMiddleware.forEach(m => {
      express.use(m)
    })
    return express
  }

  return {
    listen,
    getApp,
    addUse,
    addRoute,
    addRouter,
    addLoggedRoute,
    addPreRouteMiddleware,
    addPostRouteMiddleware,
    addModelCrudsInterface,
  }
}

const expressModels =
  (namespace: string) => (context: FeaturesContext & ExpressContext) => {
    const prefix = context.config[RestApiNamespace.express].urlPrefix
    const expressFunctions = context.express[RestApiNamespace.express]
    const namedFeatures = get(context, `features.${namespace}`)
    if (!namedFeatures) {
      throw new Error(
        `features.${namespace} does not exist on context needed for express.`
      )
    }
    // Look for CRUDS functions.
    Object.entries(namedFeatures).forEach(
      ([key, value]: [key: string, value: any]) => {
        if (typeof value === 'object') {
          if (key === 'cruds') {
            Object.entries(value).forEach(([, modelCrudFuncs]) => {
              // @ts-ignore
              expressFunctions.addModelCrudsInterface(modelCrudFuncs, prefix)
            })
          }
        }
      },
      {}
    )

    return {}
  }

export { create, expressModels }
