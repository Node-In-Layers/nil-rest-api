import { assert } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { create } from '../../../src/express/features.js'

const createContext = () => {
  const wrappedLogger = {
    error: sinon.stub(),
    getIds: () => [{ functionCallId: 'fc-1' }],
  }

  return {
    log: {
      _logWrapAsync:
        (_name: string, func: any) =>
        (...args: any[]) =>
          func(wrappedLogger, ...args),
      getInnerLogger: () => ({
        error: sinon.stub(),
      }),
    },
  }
}

const createRequest = () => {
  const storedCrossLayerProps = {
    logging: {
      ids: [{ requestId: 'req-1' }],
    },
    requestInfo: {
      headers: {
        authorization: 'Bearer token-1',
      },
      body: {
        name: 'Widget',
      },
      query: {
        page: '1',
      },
      params: {
        id: 'widget-1',
      },
      path: '/widgets/widget-1',
      method: 'POST',
      url: '/widgets/widget-1?page=1',
      protocol: 'https',
    },
  }

  return {
    body: {
      name: 'Widget',
    },
    headers: {
      authorization: 'Bearer token-1',
    },
    query: {
      page: '1',
    },
    params: {
      id: 'widget-1',
    },
    path: '/widgets/widget-1',
    method: 'POST',
    originalUrl: '/widgets/widget-1?page=1',
    protocol: 'https',
    _crossLayerProps: storedCrossLayerProps,
    getRequestCrossLayerProps: () => storedCrossLayerProps,
  }
}

const createResponse = () => {
  const json = sinon.stub()
  const status = sinon.stub().returns({
    json,
  })

  return {
    json,
    status,
  }
}

describe('/src/express/features.ts', () => {
  describe('#modelCrudsController()', () => {
    it('should pass request crossLayerProps into create()', async () => {
      const input = {
        context: createContext(),
        req: createRequest(),
        res: createResponse(),
        modelCrudsInterface: {
          getModel: () => ({
            getModelDefinition: () => ({
              namespace: 'inventory',
              pluralName: 'Widgets',
            }),
            getName: () => 'inventory.Widgets',
          }),
          create: sinon.stub().resolves({
            toObj: sinon.stub().resolves({
              id: 'widget-1',
            }),
          }),
          retrieve: sinon.stub(),
          update: sinon.stub(),
          delete: sinon.stub(),
          search: sinon.stub(),
          bulkInsert: sinon.stub(),
          bulkDelete: sinon.stub(),
        },
      }

      const expressFeatures = create(input.context as any)
      const controller = expressFeatures.modelCrudsController(
        input.modelCrudsInterface as any
      )

      await controller.create(input.req as any, input.res as any)

      const actual = input.modelCrudsInterface.create.firstCall.args[1] as any

      assert.equal(input.modelCrudsInterface.create.callCount, 1)
      assert.equal(actual.requestInfo.path, input.req.path)
      assert.deepEqual(actual.logging.ids, [
        { requestId: 'req-1' },
        { functionCallId: 'fc-1' },
      ])
    })

    it('should pass request crossLayerProps into bulkInsert()', async () => {
      const input = {
        context: createContext(),
        req: createRequest(),
        res: createResponse(),
        modelCrudsInterface: {
          getModel: () => ({
            getModelDefinition: () => ({
              namespace: 'inventory',
              pluralName: 'Widgets',
            }),
            getName: () => 'inventory.Widgets',
          }),
          create: sinon.stub(),
          retrieve: sinon.stub(),
          update: sinon.stub(),
          delete: sinon.stub(),
          search: sinon.stub(),
          bulkInsert: sinon.stub().resolves(),
          bulkDelete: sinon.stub(),
        },
      }

      const expressFeatures = create(input.context as any)
      const controller = expressFeatures.modelCrudsController(
        input.modelCrudsInterface as any
      )

      await controller.bulkInsert(input.req as any, input.res as any)

      const actual = input.modelCrudsInterface.bulkInsert.firstCall
        .args[1] as any

      assert.equal(input.modelCrudsInterface.bulkInsert.callCount, 1)
      assert.equal(actual.requestInfo.url, input.req.originalUrl)
      assert.deepEqual(actual.logging.ids, [
        { requestId: 'req-1' },
        { functionCallId: 'fc-1' },
      ])
    })
  })
})
