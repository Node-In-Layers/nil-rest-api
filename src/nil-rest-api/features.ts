import { Config, FeaturesContext } from '@node-in-layers/core/index.js'
import { NilRestApiServicesLayer, NilRestApiFeaturesLayer } from './types.js'

const create = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: FeaturesContext<
    Config,
    NilRestApiServicesLayer,
    NilRestApiFeaturesLayer
  >
) => {
  return {}
}

export { create }
