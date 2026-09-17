import { describe, it } from 'mocha'
import { assert } from 'chai'
import { create } from '../../../src/express/express.js'
import { RestApiNamespace } from '../../../src/common/types.js'

const createLogger = (ids: readonly Record<string, string>[] = []) => {
  const logger: any = {
    trace: () => undefined,
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    applyData: () => logger,
    getIdLogger: (_name: string, key: string, id?: string) => {
      return createLogger(id ? ids.concat([{ [key]: id }]) : ids)
    },
    getSubLogger: () => logger,
    getIds: () => ids,
    getInnerLogger: (_name: string, crossLayerProps?: any) => {
      return createLogger(crossLayerProps?.logging?.ids || ids)
    },
  }

  return logger
}

const getPort = (server: any): number => {
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Expected http server to expose a numeric port')
  }
  return address.port
}

const closeServer = (server: any) => {
  return new Promise<void>((resolve, reject) => {
    server.close((error?: Error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

describe('/src/express/express.ts', () => {
  describe('#addRoute() / #addLoggedRoute()', () => {
    it('should build the same crossLayerProps shape for plain and logged routes', async () => {
      const input = {
        context: {
          config: {
            [RestApiNamespace.express]: {
              port: 3000,
              logging: {
                requestLogLevel: 'info',
                responseLogLevel: 'info',
              },
            },
          },
          log: createLogger(),
          features: {},
        },
      }

      const expressFunctions = create(input.context as any)
      expressFunctions.addRoute(
        'post',
        '/plain',
        (_req, res, crossLayerProps) => {
          res.status(200).json(crossLayerProps)
        }
      )
      expressFunctions.addLoggedRoute(
        'post',
        '/logged',
        (_log, _req, res, crossLayerProps) => {
          res.status(200).json(crossLayerProps)
        }
      )

      const app = expressFunctions.getApp(input.context as any)
      const server = await new Promise<any>(resolve => {
        const startedServer = app.listen(0, () => resolve(startedServer))
      })
      const port = getPort(server)

      const plainResponse = await fetch(`http://127.0.0.1:${port}/plain`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ hello: 'world' }),
      })
      const loggedResponse = await fetch(`http://127.0.0.1:${port}/logged`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ hello: 'world' }),
      })

      await closeServer(server)

      const actual = {
        plain: await plainResponse.json(),
        logged: await loggedResponse.json(),
      } as any

      assert.equal(actual.plain.requestInfo.path, '/plain')
      assert.equal(actual.logged.requestInfo.path, '/logged')
      assert.equal(actual.plain.requestInfo.method, 'POST')
      assert.equal(actual.logged.requestInfo.method, 'POST')
      assert.equal(actual.plain.requestInfo.body.hello, 'world')
      assert.equal(actual.logged.requestInfo.body.hello, 'world')
      assert.equal(
        actual.plain.requestInfo.headers['content-type'],
        'application/json'
      )
      assert.equal(
        actual.logged.requestInfo.headers['content-type'],
        'application/json'
      )
      assert.lengthOf(actual.plain.logging.ids, 2)
      assert.lengthOf(actual.logged.logging.ids, 2)
      assert.deepEqual(Object.keys(actual.plain.logging.ids[0]), ['requestId'])
      assert.deepEqual(Object.keys(actual.logged.logging.ids[0]), ['requestId'])
      assert.deepEqual(Object.keys(actual.plain.logging.ids[1]), [
        'functionCallId',
      ])
      assert.deepEqual(Object.keys(actual.logged.logging.ids[1]), [
        'functionCallId',
      ])
      assert.isString(actual.plain.logging.ids[0].requestId)
      assert.isString(actual.logged.logging.ids[0].requestId)
      assert.isString(actual.plain.logging.ids[1].functionCallId)
      assert.isString(actual.logged.logging.ids[1].functionCallId)
    })
  })
})
