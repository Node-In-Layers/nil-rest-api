import { Router, Request, Response } from 'express'
import omit from 'lodash/omit.js'
import kebabCase from 'lodash/kebabCase.js'
import { StatusCodes } from 'http-status-codes'
import {
  Config,
  FeaturesContext,
  ModelCrudsFunctions,
} from '@node-in-layers/core/index.js'
import { DataServicesLayer } from '@node-in-layers/data/types.js'
import { OrmModel, DataDescription, OrmSearch } from 'functional-models'
import {
  ExpressFeaturesLayer,
  ModelCrudsController,
  ExpressFeatures,
} from './types.js'

const create = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: FeaturesContext<Config, DataServicesLayer, ExpressFeaturesLayer>
): ExpressFeatures => {
  const modelCrudsRouter = <T extends DataDescription>(
    model: OrmModel<T>,
    controller: ModelCrudsController,
    urlPrefix = '/'
  ) => {
    const router = Router()
    const def = model.getModelDefinition()
    const namespace = kebabCase(def.namespace).toLowerCase()
    const name = kebabCase(def.pluralName).toLowerCase()
    const modelUrl = `${urlPrefix}${namespace}/${name}`
    const modelUrlSearch = `${urlPrefix}${namespace}/${name}/search`
    const modelIdUrl = `${urlPrefix}${namespace}/${name}/:id`

    router.post(modelUrl, controller.create)

    router.get(modelIdUrl, controller.retrieve)
    router.put(modelIdUrl, controller.update)
    router.delete(modelIdUrl, controller.delete)

    router.post(modelUrlSearch, controller.search)
    return router
  }

  const _errorCatch = func => (req, res) => {
    Promise.resolve()
      .then(async () => {
        await func(req, res)
      })
      .catch(e => {
        const logger = context.log.getLogger(
          context,
          '@nil/rest-api/express:OverallException'
        )
        const errorObj = {
          error: {
            code: 'OverallException',
            message: 'Unhandled exception occurred',
            cause: {
              message: e.message,
              details: `${e}`,
            },
          },
        }
        logger.error('An overall exception occurred', errorObj)
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json(omit(errorObj, ['error.cause']))
      })
  }

  const modelCrudsController = <T extends DataDescription>(
    modelCrudsInterface: ModelCrudsFunctions<T>
  ) => {
    const create = _errorCatch(async (req: Request, res: Response) => {
      const data = req.body
      const response = await modelCrudsInterface.create(data)
      res.status(StatusCodes.OK).json(response)
    })

    const update = _errorCatch(async (req: Request, res: Response) => {
      const id = req.params.id
      const data = req.body
      const response = await modelCrudsInterface.update(id, data)
      res.status(StatusCodes.OK).json(response)
    })

    const retrieve = _errorCatch(async (req: Request, res: Response) => {
      const data = req.params.id
      const response = await modelCrudsInterface.retrieve(data)
      if (response) {
        res.status(StatusCodes.OK).json(response)
      } else {
        res.status(StatusCodes.NOT_FOUND).send()
      }
    })

    const del = _errorCatch(async (req: Request, res: Response) => {
      const data = req.params.id
      await modelCrudsInterface.delete(data)
      res.status(StatusCodes.OK)
    })

    const search = _errorCatch(async (req: Request, res: Response) => {
      const data = req.body as OrmSearch
      const response = await modelCrudsInterface.search(data)
      res.status(StatusCodes.OK).json(response)
    })

    return {
      create,
      retrieve,
      update,
      delete: del,
      search,
    }
  }

  return {
    modelCrudsRouter,
    modelCrudsController,
  }
}

export { create }
