import { Router, Request, Response } from 'express'
import omit from 'lodash/omit.js'
import kebabCase from 'lodash/kebabCase.js'
import { StatusCodes } from 'http-status-codes'
import { asyncMap } from 'modern-async'
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
    const modelUrlBulk = `${urlPrefix}${namespace}/${name}/bulk`
    const modelUrlSearch = `${urlPrefix}${namespace}/${name}/search`
    const modelIdUrl = `${urlPrefix}${namespace}/${name}/:id`

    router.post(modelUrl, controller.create)
    router.post(modelUrlBulk, controller.bulkInsert)
    router.get(modelIdUrl, controller.retrieve)
    router.put(modelIdUrl, controller.update)
    router.delete(modelIdUrl, controller.delete)
    router.delete(modelUrlBulk, controller.bulkDelete)
    router.post(modelUrlSearch, controller.search)
    return router
  }

  const _errorCatch = (model, functionName, func) => (req, res) => {
    const name = `${model.getName()}:${functionName}`
    return context.log
      ._logWrapAsync(name, async (log, req, res) => {
        await func(req, res)
      })(req, res)
      .catch(e => {
        const logger = context.log.getFunctionLogger(
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
    const model = modelCrudsInterface.getModel()
    const create = _errorCatch(
      model,
      'create',
      async (log, req: Request, res: Response) => {
        const data = req.body
        const response = await modelCrudsInterface.create(data)
        res.status(StatusCodes.OK).json(await response.toObj<T>())
      }
    )

    const update = _errorCatch(
      model,
      'update',
      async (log, req: Request, res: Response) => {
        const id = req.params.id
        const data = req.body
        const response = await modelCrudsInterface.update(id, data)
        res.status(StatusCodes.OK).json(await response.toObj<T>())
      }
    )

    const retrieve = _errorCatch(
      model,
      'retrieve',
      async (log, req: Request, res: Response) => {
        const data = req.params.id
        const response = await modelCrudsInterface.retrieve(data)
        if (response) {
          res.status(StatusCodes.OK).json(await response.toObj<T>())
        } else {
          res.status(StatusCodes.NOT_FOUND).send()
        }
      }
    )

    const del = _errorCatch(
      model,
      'delete',
      async (log, req: Request, res: Response) => {
        const data = req.params.id
        await modelCrudsInterface.delete(data)
        res.status(StatusCodes.OK)
      }
    )

    const search = _errorCatch(
      model,
      'search',
      async (log, req: Request, res: Response) => {
        const data = req.body as OrmSearch
        const response = await modelCrudsInterface.search(data)
        const instances = await asyncMap(
          response.instances,
          i => i.toObj<T>(),
          1
        )
        res.status(StatusCodes.OK).json({
          instances,
          page: response.page,
        })
      }
    )

    const bulkInsert = _errorCatch(
      model,
      'bulkInsert',
      async (log, req: Request, res: Response) => {
        const data = req.body
        await modelCrudsInterface.bulkInsert(data)
        res.status(StatusCodes.OK)
      }
    )

    const bulkDelete = _errorCatch(
      model,
      'bulkDelete',
      async (log, req: Request, res: Response) => {
        const data = req.body
        await modelCrudsInterface.bulkDelete(data)
        res.status(StatusCodes.OK)
      }
    )

    return {
      create,
      retrieve,
      update,
      delete: del,
      search,
      bulkInsert,
      bulkDelete,
    }
  }

  return {
    modelCrudsRouter,
    modelCrudsController,
  }
}

export { create }
