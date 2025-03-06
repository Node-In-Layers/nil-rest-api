# REST API - A Node In Layers Package
This package contains useful out of the box tools for building REST APIS rapidly.

It includes boilerplate code for starting a modern production JSON REST API Express server, as well as code for making model based apis.

## How to Install
`npm install @node-in-layers/rest-api@latest`

### How To Use
There are three main components of this express package.
- Model Based Express Controller
- Model Based Router Controller
- Custom Layer - `express`

## Model Based Express Controller
A model based express controller is an express controller that can wrap around a model from the [functional-models](https://github.com/monolithst/functional-models) model system. It connects to the CRUDS functionality inside [@node-in-layers/db](https://github.com/node-in-layers/db) for you (create, retrieve, update, delete, search). This pairs very well with the model based express router, although is not required.

## Model Based Express Router 
The model based express router is an express router that provides routing to a CRUDS controller. This handles all the pathing and takes this format:

#### Create:
`PUT: /my-model-name`
#### Retrieve:
`GET: /my-model-name/:id`
#### Update:
`PUT: /my-model-name/:id`
#### Delete:
`DELETE: /my-model-name/:id`
#### Search:
`POST: /my-model-name`

### A Quick note on search
The search endpoint is a POST instead of a GET because it uses a JSON body for the search. The JSON body is a JSONified version of the OrmQuery object from `functional-models-orm`.

## Custom Layer - "express"

This package adds a custom layer called "express". This is for systems that use express as the final top layer. One example would be a REST API Backend. This custom layer, adds a number of functions that are useful for setting up an express server. (Setting routes, adding middleware, starting the server with listen).

To add your own routes and middleware you need to create a `express` layer (such as a file named `express.ts` that has a `create()` function in it).

### Example Use
We want to create a model and provide CRUDS routes to it. The easiest way to do this is to create our
There is a helper method on the custom express layer called `#addModel()` that makes this really easy.

```typescript
import {} from ''
import {ExpressContext, ExpressNamespace} from "./types"

const express = {
  create: (context: ExpressContext) => {
    context.express[ExpressNamespace.root].addModel(model)
  }
}

export {
  express
}

```

