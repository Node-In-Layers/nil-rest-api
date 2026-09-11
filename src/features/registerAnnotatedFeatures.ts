import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import get from 'lodash/get.js'
import {
  Config,
  createErrorObject,
  ErrorObject,
  FeaturesContext,
  isErrorObject,
} from '@node-in-layers/core'
import {
  annotationPropsFromNilFunction,
  createRouteRegistry,
  featureRouteKey,
  isNilAnnotatedFunction,
  registerRoute,
  resolveFeatureRestRoute,
  resolveModelCrudRoutes,
  seedRouteRegistry,
  type RestFeatureRouteOptions,
  type RestHttpMethod,
  type RouteRegistry,
} from '@node-in-layers/rest-client'
import { RestApiNamespace } from '../common/types.js'
import type { ExpressFunctions } from '../express/types.js'
import { crossLayerPropsFromExpressRequest } from './expressLibs.js'
import type {
  RegisterAnnotatedFeaturesOptions,
  RestApiFeaturesConfigLayer,
} from './types.js'

const EXPRESS_NAMESPACE = RestApiNamespace.express

const _isDomainHidden = (
  domain: string,
  hideDomains?: readonly string[]
): boolean => Boolean(hideDomains?.includes(domain))

const _isFeatureHidden = (
  domain: string,
  featureName: string,
  hideFeatures?: Readonly<Record<string, readonly string[]>>
): boolean => Boolean(hideFeatures?.[domain]?.includes(featureName))

const _collectModelCrudSeeds = (
  context: FeaturesContext
): ReturnType<typeof resolveModelCrudRoutes> => {
  const modelsRoot = get(context, 'models') as
    | Record<
        string,
        {
          getModels?: () => Record<
            string,
            {
              getModelDefinition: () => {
                namespace: string
                pluralName: string
              }
            }
          >
        }
      >
    | undefined
  if (!modelsRoot) {
    return []
  }
  const seeds = Object.values(modelsRoot).flatMap(domainModels => {
    const getModels = domainModels?.getModels
    if (!getModels) {
      return []
    }
    return Object.values(getModels()).map(model => {
      const def = model.getModelDefinition()
      return { namespace: def.namespace, pluralName: def.pluralName }
    })
  })
  return resolveModelCrudRoutes(seeds)
}

const _validateFeatureRoutesConfig = (
  featureRoutes: Readonly<Record<string, RestFeatureRouteOptions>>,
  urlPrefix: string
): void => {
  const registry = createRouteRegistry()
  Object.entries(featureRoutes).forEach(([key, routeOptions]) => {
    const [domain, functionName] = key.split('.')
    if (!domain || !functionName) {
      throw new Error(
        `featureRoutes key "${key}" must be "domain.functionName"`
      )
    }
    const route = resolveFeatureRestRoute(
      { domain, functionName },
      { ...routeOptions, urlPrefix }
    )
    registerRoute(registry, {
      method: route.method,
      path: route.path,
      source: `featureRoutes config: ${key}`,
    })
  })
}

export const getSharedRouteRegistry = (): RouteRegistry | undefined =>
  _sharedRegistry

export const registerExpressRoute = (
  method: RestHttpMethod,
  path: string,
  source: string
): void => {
  if (!_sharedRegistry) {
    _sharedRegistry = createRouteRegistry()
  }
  _sharedRegistry = registerRoute(_sharedRegistry, { method, path, source })
}

// eslint-disable-next-line functional/no-let
let _sharedRegistry: RouteRegistry | undefined = undefined

export const registerAnnotatedFeatures = (
  context: FeaturesContext<Config & RestApiFeaturesConfigLayer>,
  options?: RegisterAnnotatedFeaturesOptions
): void => {
  const featuresConfig = context.config[RestApiNamespace.features]
  if (featuresConfig?.enabled === false) {
    return
  }

  const expressHost = context[EXPRESS_NAMESPACE] as ExpressFunctions | undefined
  if (!expressHost?.addRoute) {
    throw new Error(
      `registerAnnotatedFeatures requires express layer "${EXPRESS_NAMESPACE}" on context`
    )
  }

  const urlPrefix =
    options?.urlPrefix ??
    featuresConfig?.urlPrefix ??
    context.config[RestApiNamespace.express]?.urlPrefix ??
    '/'

  const hideDomains = options?.hideDomains ?? featuresConfig?.hideDomains
  const hideFeatures = options?.hideFeatures ?? featuresConfig?.hideFeatures
  const allowDomains = options?.domains ?? featuresConfig?.domains
  const featureRoutes = {
    ...(featuresConfig?.featureRoutes ?? {}),
    ...(options?.featureRoutes ?? {}),
  }

  if (Object.keys(featureRoutes).length > 0) {
    _validateFeatureRoutesConfig(featureRoutes, urlPrefix)
  }

  // eslint-disable-next-line functional/no-let
  let registry = options?.registry ?? _sharedRegistry ?? createRouteRegistry()
  registry = seedRouteRegistry(registry, _collectModelCrudSeeds(context))
  _sharedRegistry = registry

  const allFeatures = context.features as Record<
    string,
    Record<string, unknown>
  >

  Object.entries(allFeatures).forEach(([domainName, domainFeatures]) => {
    if (allowDomains && !allowDomains.includes(domainName)) {
      return
    }
    if (_isDomainHidden(domainName, hideDomains)) {
      return
    }
    if (domainName.startsWith('@node-in-layers/rest-api')) {
      return
    }

    Object.entries(domainFeatures).forEach(([featureName, feature]) => {
      if (typeof feature !== 'function' || !isNilAnnotatedFunction(feature)) {
        return
      }
      if (_isFeatureHidden(domainName, featureName, hideFeatures)) {
        return
      }

      const routeKey = featureRouteKey(domainName, featureName)
      const routeOptions: RestFeatureRouteOptions = {
        urlPrefix,
        ...(featureRoutes[routeKey] ?? {}),
      }
      const props = annotationPropsFromNilFunction(feature)
      const route = resolveFeatureRestRoute(props, routeOptions)

      registry = registerRoute(registry, {
        method: route.method,
        path: route.path,
        source: `feature ${routeKey}`,
      })
      _sharedRegistry = registry

      const handler = async (req: Request, res: Response) => {
        const body = (req.body ?? {}) as {
          args?: Record<string, unknown>
          crossLayerProps?: Record<string, unknown>
        }
        const args = (body.args ?? body) as Record<string, unknown>
        const crossLayerProps = crossLayerPropsFromExpressRequest(
          req,
          body.crossLayerProps as Parameters<
            typeof crossLayerPropsFromExpressRequest
          >[1]
        )

        try {
          const result = await feature(args, crossLayerProps)
          if (isErrorObject(result)) {
            res.status(StatusCodes.BAD_REQUEST).json(result)
            return
          }
          res.status(StatusCodes.OK).json(result)
        } catch (e) {
          if (isErrorObject(e)) {
            res.status(StatusCodes.BAD_REQUEST).json(e)
            return
          }
          res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json(
              createErrorObject(
                'UNCAUGHT_EXCEPTION',
                'An uncaught exception occurred while executing the feature.',
                e
              ) as ErrorObject
            )
        }
      }

      expressHost.addRoute(route.method, route.path, handler)
    })
  })
}
