import { LayerContext, Config } from '@node-in-layers/core'
import Express, { Request, Response, Router } from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import compression from 'http-compression'
import {
  ExpressConfig,
  ExpressMethod,
  ExpressRouter,
  ExpressMiddleware,
  ExpressControllerFunc,
  ExpressRoute,
} from './types.js'
import { isExpressRouter } from './libs.js'

const DEFAULT_BODY_SIZE = 10

const create = (context: LayerContext<Config & ExpressConfig>) => {
  const options = context.config['@node-in-layers/express']
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
  }
}

export { create }
