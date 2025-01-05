import { Router, Request, Response } from 'express'
import kebabCase from 'lodash/kebabCase.js'
import {Config, FeaturesContext } from '@node-in-layers/core/index.js'
import { NilDbServicesLayer, SimpleCrudsService } from '@node-in-layers/db/types.js'
import {ExpressFeaturesLayer, ExpressControllerFunc} from './types.js'
import { OrmModel, OrmQuery } from "functional-models-orm"
import {FunctionalModel} from "functional-models/interfaces.js"

type SimpleCrudsController = Readonly<{
  create: ExpressControllerFunc,
  retrieve: ExpressControllerFunc,
  update: ExpressControllerFunc,
  delete: ExpressControllerFunc,
  search: ExpressControllerFunc,
}>

const create = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: FeaturesContext<Config, NilDbServicesLayer, ExpressFeaturesLayer>
) => {
  const modelCrudsRouter = <T extends FunctionalModel>(model: OrmModel<T>, controller: SimpleCrudsController, urlPrefix='/') => {
    const router = Router()
    const name =  kebabCase(model.getName())
    const modelUrl = `${urlPrefix}${name}`
    const modelIdUrl = `${urlPrefix}${name}/:id`
    router.put(modelUrl, controller.create)
    router.post(modelUrl, controller.search)

    router.get(modelIdUrl, controller.retrieve)
    router.put(modelIdUrl, controller.update)
    router.delete(modelIdUrl, controller.delete)
  }


  const modelCrudsController = <T extends FunctionalModel>(simpleCrudsService: SimpleCrudsService<T>) => {
    const create = async (req: Request, res: Response) => {
      const data = req.body
      const response = await simpleCrudsService.create(data)
      res.status(200).json(response)
    }

    const update = async (req: Request, res: Response) => {
      const data = req.body
      const response = await simpleCrudsService.update(data)
      res.status(200).json(response)
    }

    const retrieve = async (req: Request, res: Response) => {
      const data = req.params.id
      const response = await simpleCrudsService.retrieve(data)
      if (response) {
        res.status(200).json(response)
      } else {
        res.status(404)
      }
    }

    const del = async (req: Request, res: Response) => {
      const data = req.params.id
      await simpleCrudsService.delete(data)
      res.status(200)
    }

    const search = async (req: Request, res: Response) => {
      const data = req.body as OrmQuery
      const response = await simpleCrudsService.search(data)
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
