import { Request, Response, Router } from 'express'
import {
  Config,
  CrossLayerLoggingOverrides,
  FeaturesContext,
  Logger,
  LogLevelNames,
  ModelCrudsFunctions,
} from '@node-in-layers/core'
import { DataDescription, OrmModel } from 'functional-models'
import { RestApiNamespace } from '../common/types.js'
import type { RequestCrossLayerProps } from '../features/expressLibs.js'
import type { RestApiFeaturesConfigLayer } from '../features/types.js'

export type ExpressServices = Readonly<object>

export type ExpressServicesLayer = Readonly<{
  [RestApiNamespace.express]: ExpressServices
}>

export type ModelCrudsController = Readonly<{
  create: ExpressControllerFunc
  retrieve: ExpressControllerFunc
  update: ExpressControllerFunc
  delete: ExpressControllerFunc
  search: ExpressControllerFunc
  bulkInsert: ExpressControllerFunc
  bulkDelete: ExpressControllerFunc
}>

export type ExpressFeatures = Readonly<{
  modelCrudsRouter: <T extends DataDescription>(
    model: OrmModel<T>,
    controller: ModelCrudsController,
    urlPrefix?: string
  ) => Router
  modelCrudsController: <T extends DataDescription>(
    modelCrudsInterface: ModelCrudsFunctions<T>
  ) => ModelCrudsController
}>

export type ExpressFeaturesLayer = Readonly<{
  [RestApiNamespace.express]: ExpressFeatures
}>

export type ExpressAutoRegistrationContext = FeaturesContext<
  Config & RestApiFeaturesConfigLayer
>

export type ExpressFunctions = Readonly<{
  listen: (systemContext: ExpressAutoRegistrationContext) => void
  getApp: (systemContext: ExpressAutoRegistrationContext) => any
  addUse: (obj: any) => void
  addRoute: (
    method: ExpressMethod,
    route: string,
    func: ExpressControllerFunc,
    options?: ExpressRouteOptions
  ) => void
  addRouter: (router: Router) => void
  /**
   * Adds a route that is logged, and gives a logger as the first argument.
   * @param method
   * @param route
   * @param func
   * @returns
   */
  addLoggedRoute: (
    method: ExpressMethod,
    route: string,
    func: ExpressLoggedControllerFunc,
    options?: ExpressRouteOptions
  ) => void
  addPreRouteMiddleware: (middleware: ExpressMiddleware) => void
  addPostRouteMiddleware: (middleware: ExpressMiddleware) => void
  addModelCrudsInterface: <T extends DataDescription>(
    modelCrudsInterface: ModelCrudsFunctions<T>,
    urlPrefix?: string
  ) => void
}>

export type ExpressLayer = Readonly<{
  [RestApiNamespace.express]: ExpressFunctions
}>

export type ExpressContext<T extends object = object> = Readonly<{
  express: ExpressLayer & T
}>

export type ExpressLogIgnorePattern = string | RegExp

export type ExpressLoggingOptions = Readonly<{
  requestLogLevel: LogLevelNames
  responseLogLevel: LogLevelNames
  requestLogDataCallback?: (req: Request) => object
  responseLogDataCallback?: (req: Request) => object
  ignoreEndpointPatterns?: readonly ExpressLogIgnorePattern[]
}>

export type ExpressRouteLoggingOptions = Readonly<{
  request?: CrossLayerLoggingOverrides
  response?: CrossLayerLoggingOverrides
}>

export type ExpressRouteOptions = Readonly<{
  logging?: ExpressRouteLoggingOptions
}>

export type ExpressOptions = Readonly<{
  port: number
  urlPrefix?: string
  noCors?: boolean
  noCompression?: boolean
  noTrustProxy?: boolean
  /**
   * This object is taken directly from:
   * https://expressjs.com/en/resources/middleware/session.html
   */
  session?: object
  logging?: ExpressLoggingOptions
  jsonBodySizeLimitInMb?: number
  encodedBodySizeLimitInMb?: number
}>

export type ExpressConfig = Config &
  Readonly<{
    [RestApiNamespace.express]: ExpressOptions
  }>

export type ExpressCrossLayerProps = RequestCrossLayerProps

export type ExpressControllerFunc = (
  req: Request,
  res: Response,
  crossLayerProps?: ExpressCrossLayerProps
) => Promise<void> | void

export type ExpressLoggedControllerFunc = (
  log: Logger,
  req: Request,
  res: Response,
  crossLayerProps?: ExpressCrossLayerProps
) => Promise<void> | void

export type ExpressMiddleware = (
  req: Request,
  res: Response,
  next: () => void
) => Promise<void> | void

export type ExpressMethod = 'get' | 'put' | 'post' | 'delete' | 'patch' | 'head'

export type ExpressRoute = Readonly<{
  method: ExpressMethod
  route: string
  func: ExpressControllerFunc
  options?: ExpressRouteOptions
}>

export type ExpressRouter = Readonly<{
  router: Router
}>
