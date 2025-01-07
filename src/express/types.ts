import { Request, Response, Router } from 'express'
import { ORMType, OrmModel } from 'functional-models-orm'
import { FunctionalModel } from 'functional-models/interfaces.js'
import { ModelCrudsInterface } from '@node-in-layers/data/types.js'

type ExpressServices = Readonly<object>
enum ExpressNamespace {
  root = '@node-in-layers/express',
}

type ExpressServicesLayer = Readonly<{
  [ExpressNamespace.root]: ExpressServices
}>

type ModelCrudsController = Readonly<{
  create: ExpressControllerFunc
  retrieve: ExpressControllerFunc
  update: ExpressControllerFunc
  delete: ExpressControllerFunc
  search: ExpressControllerFunc
}>

type ExpressFeatures = Readonly<{
  modelCrudsRouter: <T extends FunctionalModel>(
    model: OrmModel<T>,
    controller: ModelCrudsController,
    urlPrefix?: string
  ) => Router
  modelCrudsController: <T extends FunctionalModel>(
    modelCrudsInterface: ModelCrudsInterface<T>
  ) => ModelCrudsController
}>

type ExpressFeaturesLayer = Readonly<{
  [ExpressNamespace.root]: ExpressFeatures
}>

type ExpressFunctions = Readonly<{
  listen: (port: number) => void
  addUse: (obj: any) => void
  addRoute: (
    method: ExpressMethod,
    route: string,
    func: ExpressControllerFunc
  ) => void
  addRouter: (router: Router) => void
  addPreRouteMiddleware: (middleware: ExpressMiddleware) => void
  addPostRouteMiddleware: (middleware: ExpressMiddleware) => void
  addModelCrudsInterface: <T extends FunctionalModel>(modelCrudsInterface: ModelCrudsInterface<T>) => void
}>

type ExpressLayer = Readonly<{
  [ExpressNamespace.root]: ExpressFunctions
}>

type ExpressContext<T extends object = object> = Readonly<{
  express: ExpressLayer & T
}>

type ExpressOptions = {
  cors?: boolean
  compression?: boolean
  jsonBodySizeLimitInMb?: number
  encodedBodySizeLimitInMb?: number
}

type ExpressConfig = Readonly<{
  [ExpressNamespace.root]: ExpressOptions
}>

type ExpressControllerFunc = (
  req: Request,
  res: Response
) => Promise<void> | void
type ExpressMiddleware = (
  req: Request,
  res: Response,
  next: () => void
) => Promise<void> | void
type ExpressMethod = 'get' | 'put' | 'post' | 'delete' | 'patch' | 'head'

type ExpressRoute = Readonly<{
  method: ExpressMethod
  route: string
  func: ExpressControllerFunc
}>

type ExpressRouter = Readonly<{
  router: Router
}>

export {
  ExpressServices,
  ExpressServicesLayer,
  ExpressFeatures,
  ExpressFeaturesLayer,
  ExpressConfig,
  ExpressOptions,
  ExpressRouter,
  ExpressMethod,
  ExpressMiddleware,
  ExpressRoute,
  ExpressControllerFunc,
  ExpressNamespace,
  ExpressLayer,
  ExpressFunctions,
  ExpressContext,
  ModelCrudsController,
}
