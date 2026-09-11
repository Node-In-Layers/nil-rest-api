import type {
  RestFeatureRouteOptions,
  RouteRegistry,
} from '@node-in-layers/rest-client'
import { RestApiNamespace } from '../common/types.js'

export type RestApiFeaturesConfig = Readonly<{
  enabled?: boolean
  urlPrefix?: string
  hideDomains?: readonly string[]
  hideFeatures?: Readonly<Record<string, readonly string[]>>
  domains?: readonly string[]
  featureRoutes?: Readonly<Record<string, RestFeatureRouteOptions>>
}>

export type RegisterAnnotatedFeaturesOptions = Readonly<{
  urlPrefix?: string
  hideDomains?: readonly string[]
  hideFeatures?: Readonly<Record<string, readonly string[]>>
  domains?: readonly string[]
  featureRoutes?: Readonly<Record<string, RestFeatureRouteOptions>>
  registry?: RouteRegistry
}>

export type RestApiFeaturesConfigLayer = Readonly<{
  [RestApiNamespace.features]?: RestApiFeaturesConfig
}>
