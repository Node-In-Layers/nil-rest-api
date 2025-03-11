# REST API - A Node In Layers Package

This package contains useful out-of-the-box tools for building REST APIS rapidly.

It includes boilerplate code for starting a modern production JSON REST API Express server, as well as code for making model based apis, with minimal boilerplate.

## How to Install

`npm install @node-in-layers/rest-api@latest`

### How To Use

There are three main components of this express package.

- Model Based Express Controller
- Model Based Router Controller
- Custom Layer - `express`

## Model Based Express Controller

A model based express controller is an express controller that can wrap around a model from the [functional-models](https://github.com/monolithst/functional-models) model system. It connects to the CRUDS functionality inside [@node-in-layers/db](https://github.com/node-in-layers/data) for you (create, retrieve, update, delete, search). This pairs very well with the model based express router, although is not required.

## Model Based Express Router

The model based express router is an express router that provides routing to a CRUDS controller. This handles all the pathing and takes this format:

#### Create:

`PUT: /namespace/my-model-name`

#### Retrieve:

`GET: /namespace/my-model-name/:id`

#### Update:

`PUT: /namespace/my-model-name/:id`

#### Delete:

`DELETE: /namespace/my-model-name/:id`

#### Search:

`POST: /namespace/my-model-name`

### A Quick note on search

The search endpoint is a POST instead of a GET because it uses a JSON body for the search. The JSON body is a JSONified version of the OrmSearch object from `functional-models`.

### Url Prefix

You can append a prefix to the url by adding it as an argument to the router. This can be useful for adding a service level name before all of your models.

## Custom Layer - "express"

This package adds a custom layer called "express". This layer is intended to be a composite layer with the `entries` layer. This is for systems that use express as the final top layer. One example would be a REST API Backend. This custom layer, adds a number of functions that are useful for setting up an express server. (Setting routes, adding middleware, starting the server with listen).

To add your own routes and middleware you need to create a `express` layer (such as a file named `express.ts` that has a `create()` function in it).

### How To Use

In order to use the express layer, you need to add it as a composite layer inside the configuration file, as well as this app itself.

```javascript
// Example config.dev.mjs
import { CoreNamespace } from '@node-in-layers/core/index.js'
import { DataNamespace } from '@node-in-layers/data/index.js'
import { RestApiNamespace } from '@node-in-layers/rest-api/index.js'
import { peteSdkLogger } from './dist/logging.js'

const core = {
  apps: await Promise.all([
    import(`@node-in-layers/data/index.js`),
    // Import here
    import(`@node-in-layers/rest-api/express/index.js`),
  ]),
  // NOTE: The composite layer with entries.
  layerOrder: ['services', 'features', ['entries', 'express']],
  logging: {
    logLevel: 'debug',
    logFormat: 'full',
  },
  modelFactory: '@node-in-layers/data',
  modelCruds: true,
}

const data = {
  databases: {
    default: {
      datastoreType: 'memory',
    },
  },
}

const express = {
  port: 8000,
  urlPrefix: '/my-service/',
}

export default () => ({
  environment: 'dev-low',
  systemName: 'my-system',
  [CoreNamespace.root]: core,
  [DataNamespace.root]: data,
  [RestApiNamespace.express]: express,
})
```

### Model CRUDS

In order to CRUDS functionality to the REST interface you need to create this express layer in your app, and use the express functions provided by this library. A useful function called `expressModels` can be used that automatically adds all model CRUDS from your namespace.

### Example Use

We want to create a model and provide CRUDS routes to it. The easiest way to do this is to create our
There is a helper method on the custom express layer called `#addModel()` that makes this really easy.

```typescript
// /src/your-app/express.ts
import { FeaturesContext } from '@node-in-layers/core/index.js'
import {
  ExpressContext,
  expressModels,
} from '@node-in-layers/rest-api/index.js'

const express = {
  create: (context: ExpressContext & FeaturesContext) => {
    // Automatically adds all cruds models feature functions to express.
    expressModels('your-namespace')(context)
  },
}

export { express }
```

### Troubleshooting

#### Model endpoints aren't working

Make sure that your app has the following layers (even if they are only an empty create):

1. Services - Can be empty
1. Features - Can be empty
1. Express - See above
1. modelCruds is set to true - See core configurations.
