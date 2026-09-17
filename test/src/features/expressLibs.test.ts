import { assert } from 'chai'
import { describe, it } from 'mocha'
import { crossLayerPropsFromExpressRequest } from '../../../src/features/expressLibs.js'

describe('/src/features/expressLibs.ts', () => {
  describe('#crossLayerPropsFromExpressRequest()', () => {
    it('should preserve request-scoped props and merge existing client props', () => {
      const storedCrossLayerProps = {
        logging: {
          ids: [{ requestId: 'req-1' }],
        },
        authInfo: {
          token: 'server-token',
        },
        requestInfo: {
          headers: {
            authorization: 'Bearer token-1',
          },
          body: {
            hello: 'world',
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
      const input = {
        req: {
          headers: {
            authorization: 'Bearer token-1',
          },
          body: {
            hello: 'world',
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
        },
        existing: {
          logging: {
            ids: [{ clientRequestId: 'client-1' }],
          },
          clientValue: 'abc-123',
          requestInfo: {
            headers: {},
            body: {},
            query: {},
            params: {},
            path: '/fake',
            method: 'GET',
            url: '/fake',
            protocol: 'http',
          },
        },
      }

      const actual = crossLayerPropsFromExpressRequest(
        input.req as any,
        input.existing as any
      ) as any

      assert.deepEqual(actual.logging.ids, [
        { clientRequestId: 'client-1' },
        { requestId: 'req-1' },
      ])
      assert.equal(actual.clientValue, input.existing.clientValue)
      assert.equal(actual.authInfo.token, 'server-token')
      assert.equal(actual.requestInfo.path, input.req.path)
      assert.equal(actual.requestInfo.url, input.req.originalUrl)
    })
  })
})
