import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import get from 'lodash/get.js'
import {
  combineCrossLayerProps,
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
} from '@node-in-layers/rest-client/core/libs/index.js'
import type {
  RestFeatureRouteOptions,
  RestHttpMethod,
  RouteRegistry,
} from '@node-in-layers/rest-client/core/types.js'
import { RestApiNamespace } from '../common/types.js'
import type {
  ExpressCrossLayerProps,
  ExpressControllerFunc,
  ExpressFunctions,
} from '../express/types.js'
import { crossLayerPropsFromExpressRequest } from './expressLibs.js'
import type {
  RegisterAnnotatedFeaturesOptions,
  RestApiFeaturesConfigLayer,
} from './types.js'

const EXPRESS_NAMESPACE = RestApiNamespace.express

type RegisterableFeature = ((
  args: Record<string, unknown>,
  crossLayerProps?: Parameters<typeof crossLayerPropsFromExpressRequest>[1]
) => Promise<unknown>) &
  Parameters<typeof annotationPropsFromNilFunction>[0]

type FeatureRegistrationConfig = Readonly<{
  urlPrefix: string
  allowDomains?: readonly string[]
  hideDomains?: readonly string[]
  hideFeatures?: Readonly<Record<string, readonly string[]>>
  featureRoutes: Readonly<Record<string, RestFeatureRouteOptions>>
}>

type FeatureRegistrationEntry = Readonly<{
  domainName: string
  featureName: string
  feature: RegisterableFeature
}>

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

const _isRegisterableFeature = (
  feature: unknown
): feature is RegisterableFeature =>
  typeof feature === 'function' && isNilAnnotatedFunction(feature)

const _isFrameworkDomain = (domainName: string): boolean =>
  domainName.startsWith('@node-in-layers/rest-api')

const _shouldRegisterDomain = (
  domainName: string,
  config: FeatureRegistrationConfig
): boolean => {
  if (config.allowDomains && !config.allowDomains.includes(domainName)) {
    return false
  }
  if (_isDomainHidden(domainName, config.hideDomains)) {
    return false
  }
  return !_isFrameworkDomain(domainName)
}

const _shouldRegisterFeature = (
  domainName: string,
  featureName: string,
  feature: unknown,
  config: FeatureRegistrationConfig
): feature is RegisterableFeature => {
  if (!_isRegisterableFeature(feature)) {
    return false
  }
  return !_isFeatureHidden(domainName, featureName, config.hideFeatures)
}

const _resolveRegistrationConfig = (
  context: FeaturesContext<Config & RestApiFeaturesConfigLayer>,
  options?: RegisterAnnotatedFeaturesOptions
): FeatureRegistrationConfig => {
  const featuresConfig = context.config[RestApiNamespace.features]
  return {
    urlPrefix:
      options?.urlPrefix ??
      featuresConfig?.urlPrefix ??
      context.config[RestApiNamespace.express]?.urlPrefix ??
      '/',
    allowDomains: options?.domains ?? featuresConfig?.domains,
    hideDomains: options?.hideDomains ?? featuresConfig?.hideDomains,
    hideFeatures: options?.hideFeatures ?? featuresConfig?.hideFeatures,
    featureRoutes: {
      ...(featuresConfig?.featureRoutes ?? {}),
      ...(options?.featureRoutes ?? {}),
    },
  }
}

const _getExpressHost = (
  context: FeaturesContext<Config & RestApiFeaturesConfigLayer>
): ExpressFunctions => {
  const expressHost = context[EXPRESS_NAMESPACE] as ExpressFunctions | undefined
  if (!expressHost?.addRoute) {
    throw new Error(
      `registerAnnotatedFeatures requires express layer "${EXPRESS_NAMESPACE}" on context`
    )
  }
  return expressHost
}

const _collectFeatureRegistrationEntries = (
  context: FeaturesContext<Config & RestApiFeaturesConfigLayer>,
  config: FeatureRegistrationConfig
): ReadonlyArray<FeatureRegistrationEntry> => {
  const allFeatures = context.features as Record<
    string,
    Record<string, unknown>
  >

  return Object.entries(allFeatures).flatMap(([domainName, domainFeatures]) => {
    if (!_shouldRegisterDomain(domainName, config)) {
      return []
    }

    return Object.entries(domainFeatures).flatMap(([featureName, feature]) => {
      if (!_shouldRegisterFeature(domainName, featureName, feature, config)) {
        return []
      }

      return [
        {
          domainName,
          featureName,
          feature,
        },
      ]
    })
  })
}

const _sendFeatureResult = (res: Response, result: unknown): void => {
  if (isErrorObject(result)) {
    res.status(StatusCodes.BAD_REQUEST).json(result)
    return
  }

  res.status(StatusCodes.OK).json(result)
}

const _sendFeatureError = (res: Response, error: unknown): void => {
  if (isErrorObject(error)) {
    res.status(StatusCodes.BAD_REQUEST).json(error)
    return
  }

  res
    .status(StatusCodes.INTERNAL_SERVER_ERROR)
    .json(
      createErrorObject(
        'UNCAUGHT_EXCEPTION',
        'An uncaught exception occurred while executing the feature.',
        error
      ) as ErrorObject
    )
}

const _createFeatureHandler = (
  feature: RegisterableFeature
): ExpressControllerFunc => {
  return (
    req: Request,
    res: Response,
    crossLayerProps?: ExpressCrossLayerProps
  ) => {
    const body = (req.body ?? {}) as {
      args?: Record<string, unknown>
      crossLayerProps?: Record<string, unknown>
    }
    const args = (body.args ?? body) as Record<string, unknown>
    const mergedCrossLayerProps = combineCrossLayerProps(
      body.crossLayerProps || {},
      crossLayerProps || crossLayerPropsFromExpressRequest(req)
    )

    return feature(args, mergedCrossLayerProps)
      .then(result => {
        _sendFeatureResult(res, result)
      })
      .catch(error => {
        _sendFeatureError(res, error)
      })
  }
}

const _registerFeatureEntry = (
  registry: RouteRegistry,
  expressHost: ExpressFunctions,
  config: FeatureRegistrationConfig,
  entry: FeatureRegistrationEntry
): RouteRegistry => {
  const routeKey = featureRouteKey(entry.domainName, entry.featureName)
  const routeOptions: RestFeatureRouteOptions = {
    urlPrefix: config.urlPrefix,
    ...(config.featureRoutes[routeKey] ?? {}),
  }
  const props = annotationPropsFromNilFunction(entry.feature)
  const route = resolveFeatureRestRoute(props, routeOptions)
  const nextRegistry = registerRoute(registry, {
    method: route.method,
    path: route.path,
    source: `feature ${routeKey}`,
  })

  expressHost.addRoute(
    route.method,
    route.path,
    _createFeatureHandler(entry.feature)
  )

  return nextRegistry
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

  const expressHost = _getExpressHost(context)
  const config = _resolveRegistrationConfig(context, options)

  if (Object.keys(config.featureRoutes).length > 0) {
    _validateFeatureRoutesConfig(config.featureRoutes, config.urlPrefix)
  }

  const baseRegistry =
    options?.registry ?? _sharedRegistry ?? createRouteRegistry()
  const seededRegistry = seedRouteRegistry(
    baseRegistry,
    _collectModelCrudSeeds(context)
  )
  const registeredRegistry = _collectFeatureRegistrationEntries(
    context,
    config
  ).reduce((registry, entry) => {
    return _registerFeatureEntry(registry, expressHost, config, entry)
  }, seededRegistry)

  _sharedRegistry = registeredRegistry
}
