import { LayerContext, Config, ServicesContext, FeaturesContext } from '@node-in-layers/core'
import Express, { Request, Response, Router } from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import compression from 'http-compression'
import {
  ExpressConfig,
  ExpressNamespace,
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

const create = (
  context: FeaturesContext<
    DataConfig & ExpressConfig,
    ServicesContext,
    ExpressFeaturesLayer
  >
) => {
  const options = context.config[ExpressNamespace.root]
  const routes: (ExpressRoute | ExpressRouter)[] = []
  const preRouteMiddleware: ExpressMiddleware[] = []
  const postRouteMiddleware: ExpressMiddleware[] = []
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
      context.features[ExpressNamespace.root].modelCrudsController(modelCrudsInterface)
    const router = context.features[ExpressNamespace.root].modelCrudsRouter(
      model,
      controller,
      urlPrefix
    )
    addRouter(router)
    return
  }

  const listen = (port: number) => {
    const express = Express()
    expressUses.forEach(express.use)
    if (options.cors) {
      express.use(cors())
    }
    if (options.compression) {
      express.use(compression)
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
      bodyParser.urlencoded({
        limit: jsonLimit,
      })
    )
    preRouteMiddleware.forEach(express.use)
    routes.forEach(r => {
      if (isExpressRouter(r)) {
        express.use(r)
      } else {
        express[r.method](r.route, r.func)
      }
    })
    postRouteMiddleware.forEach(express.use)
    express.listen(port)
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
