import { RestApiNamespace } from '../common/types.js'

export const name = RestApiNamespace.features
export {
  registerAnnotatedFeatures,
  getSharedRouteRegistry,
  registerExpressRoute,
} from './registerAnnotatedFeatures.js'
export * from './types.js'
export * from './expressLibs.js'
