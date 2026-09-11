import { assert } from 'chai'
import { describe, it } from 'mocha'
import {
  getRequestPath,
  matchesIgnoredEndpointPattern,
  shouldIgnoreLoggingForRequest,
} from '../../../src/express/libs.js'

describe('/src/express/libs.ts', () => {
  describe('#getRequestPath()', () => {
    it('should remove query parameters from the request url', () => {
      const input = {
        req: {
          originalUrl: '/health/live?verbose=true',
          url: '/health/live?verbose=true',
        },
      }

      const actual = getRequestPath(input.req as any)
      const expected = '/health/live'

      assert.equal(actual, expected)
    })
  })

  describe('#matchesIgnoredEndpointPattern()', () => {
    it('should match string patterns as path prefixes', () => {
      const input = {
        pattern: '/health',
        requestPath: '/health/live',
      }

      const actual = matchesIgnoredEndpointPattern(
        input.pattern,
        input.requestPath
      )
      const expected = true

      assert.equal(actual, expected)
    })

    it('should match regex patterns without leaking regex state', () => {
      const input = {
        pattern: /^\/metrics/gi,
        requestPath: '/metrics/system',
      }

      const actual = [
        matchesIgnoredEndpointPattern(input.pattern, input.requestPath),
        matchesIgnoredEndpointPattern(input.pattern, input.requestPath),
      ]
      const expected = [true, true]

      assert.deepEqual(actual, expected)
    })
  })

  describe('#shouldIgnoreLoggingForRequest()', () => {
    it('should return true when the request matches an ignored endpoint pattern', () => {
      const input = {
        req: {
          originalUrl: '/internal/healthz?full=true',
          url: '/internal/healthz?full=true',
        },
        patterns: [/^\/internal\/healthz$/],
      }

      const actual = shouldIgnoreLoggingForRequest(input)
      const expected = true

      assert.equal(actual, expected)
    })

    it('should return false when the request does not match an ignored endpoint pattern', () => {
      const input = {
        req: {
          originalUrl: '/api/users',
          url: '/api/users',
        },
        patterns: ['/health', /^\/metrics$/],
      }

      const actual = shouldIgnoreLoggingForRequest(input)
      const expected = false

      assert.equal(actual, expected)
    })
  })
})
