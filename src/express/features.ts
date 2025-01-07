import { Router, Request, Response } from 'express'
import kebabCase from 'lodash/kebabCase.js'
import { Config, FeaturesContext } from '@node-in-layers/core/index.js'
import {
  DataServicesLayer,
  ModelCrudsInterface,
} from '@node-in-layers/data/types.js'
import { OrmModel, OrmQuery } from 'functional-models-orm'
import { FunctionalModel } from 'functional-models/interfaces.js'
import {
  ExpressFeaturesLayer,
  ModelCrudsController,
  ExpressFeatures,
} from './types.js'

const create = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: FeaturesContext<Config, DataServicesLayer, ExpressFeaturesLayer>
): ExpressFeatures => {
  const modelCrudsRouter = <T extends FunctionalModel>(
    model: OrmModel<T>,
    controller: ModelCrudsController,
    urlPrefix = '/'
  ) => {
    const router = Router()
    const name = kebabCase(model.getName())
    const modelUrl = `${urlPrefix}${name}`
    const modelUrlSearch = `${urlPrefix}${name}/search`
    const modelIdUrl = `${urlPrefix}${name}/:id`

    router.post(modelUrl, controller.create)

    router.get(modelIdUrl, controller.retrieve)
    router.put(modelIdUrl, controller.update)
    router.delete(modelIdUrl, controller.delete)

    router.post(modelUrlSearch, controller.search)
    return router
  }

  const modelCrudsController = <T extends FunctionalModel>(
    modelCrudsInterface: ModelCrudsInterface<T>
  ) => {
    const create = async (req: Request, res: Response) => {
      const data = req.body
      const response = await modelCrudsInterface.create(data)
      res.status(200).json(response)
    }

    const update = async (req: Request, res: Response) => {
      const data = req.body
      const response = await modelCrudsInterface.update(data)
      res.status(200).json(response)
    }

    const retrieve = async (req: Request, res: Response) => {
      const data = req.params.id
      const response = await modelCrudsInterface.retrieve(data)
      if (response) {
        res.status(200).json(response)
      } else {
        res.status(404)
      }
    }

    const del = async (req: Request, res: Response) => {
      const data = req.params.id
      await modelCrudsInterface.delete(data)
      res.status(200)
    }

    const search = async (req: Request, res: Response) => {
      const data = req.body as OrmQuery
      const response = await modelCrudsInterface.search(data)
      res.status(200).json(response)
    }

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
