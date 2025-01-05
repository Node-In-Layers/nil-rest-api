import { Request, Response, Router } from 'express'
import {ORMType} from "functional-models-orm"

type ExpressServices = Readonly<object>
enum ExpressNamespace {
  root = '@node-in-layers/express',
}

type ExpressServicesLayer = Readonly<{
  [ExpressNamespace.root]: ExpressServices
}>

type ExpressFeatures = Readonly<object>

type ExpressFeaturesLayer = Readonly<{
  [ExpressNamespace.root]: ExpressFeatures
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
}
