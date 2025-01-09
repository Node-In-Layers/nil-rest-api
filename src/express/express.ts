import { randomUUID } from 'node:crypto'
import { CommonContext, Logger, LayerContext, Config, ServicesContext, FeaturesContext } from '@node-in-layers/core'
import Express, { Request, Response, Router } from 'express'
import cors from 'cors'
import session from 'express-session'
import bodyParser from 'body-parser'
import compression from 'http-compression'
import { RestApiNamespace } from '../types.js'
import {
  ExpressConfig,
  ExpressMethod,
  ExpressRouter,
  ExpressMiddleware,
  ExpressControllerFunc,
  ExpressRoute,
  ExpressFeaturesLayer,
} from './types.js'
import { isExpressRouter } from './libs.js'
import { FunctionalModel } from 'functional-models/interfaces.js'
import { OrmModel } from 'functional-models-orm/interfaces.js'
import { DataConfig, ModelCrudsInterface } from '@node-in-layers/data/index.js'

const DEFAULT_BODY_SIZE = 10

const requestIdMiddleware = (req: Request, _, next: () => void) => {
    console.log("request id")
  req.requestId = randomUUID()
  next()
}

const logRequestMiddleware = (context: CommonContext<ExpressConfig>) => {
  return (req: Request, res: Response, next: () => void) => {
    console.log("log request middle")
    const logger = context.log.getLogger(`Request ${req.requestId}`)
    logger.info('Request received', {
      method: req.method,
      url: req.url,
      body: req.body,
    })
    next()
  }
}

const create = (
  context: FeaturesContext<
    DataConfig & ExpressConfig,
    ServicesContext,
    ExpressFeaturesLayer
  >
) => {
  const options = context.config[RestApiNamespace.express]
  if (!options) {
    throw new Error(`Must include ${context.config[RestApiNamespace.express]} in the config`)
  }
  if (!options.port) {
    throw new Error(`Must include ${context.config[RestApiNamespace.express]}.port in the config`)
  }
  const routes: (ExpressRoute | ExpressRouter)[] = []
  const preRouteMiddleware: ExpressMiddleware[] = [
    requestIdMiddleware,
    logRequestMiddleware(context)
  ]
  const postRouteMiddleware: ExpressMiddleware[] = [
    // @ts-ignore
    (err, req, res, next) => {
      console.error(err.stack)
      res.status(500).json({
        error: 'Internal Error'
      })
    }
  ]
  const expressUses: any[] = []

  const addRoute = (
    method: ExpressMethod,
    route: string,
    func: ExpressControllerFunc
  ) => {
    routes.push({ method, route, func })
  }

  const addRouter = (router: Router) => {
    routes.push({ router })
  }

  const addPreRouteMiddleware = (middleware: ExpressMiddleware) => {
    preRouteMiddleware.push(middleware)
  }
  const addPostRouteMiddleware = (middleware: ExpressMiddleware) => {
    postRouteMiddleware.push(middleware)
  }

  const addUse = (obj: any) => {
    expressUses.push(obj)
  }

  const addModelCrudsInterface = <T extends FunctionalModel>(
    modelCrudsInterface: ModelCrudsInterface<T>,
    urlPrefix?: string
  ) => {
    const model = modelCrudsInterface.getModel()
    const controller =
      context.features[RestApiNamespace.express].modelCrudsController(modelCrudsInterface)
    const router = context.features[RestApiNamespace.express].modelCrudsRouter(
      model,
      controller,
      urlPrefix
    )
    addRouter(router)
    return
  }

  const listen = () => {
    const express = Express()
    expressUses.forEach(express.use)
    if (!options.noCors) {
      express.use(cors())
    }
    if (!options.noCompression) {
      express.use(compression)
    }
    if (options.session) {
      express.use({
        session: options.session
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
    const logger = context.log.getLogger('express')
    logger.info(`Starting server listening on ${options.port}`)
    express.listen(options.port)
  }

  return {
    listen,
    addUse,
    addRoute,
    addRouter,
    addPreRouteMiddleware,
    addPostRouteMiddleware,
    addModelCrudsInterface,
  }
}

export { create }
