# nil-rest-api - a Node In Layers Package

## How to Install
`npm install @node-in-layers/express@latest`

### How To Use
There are three main components of this express package.
- Custom Layer - `express`
- Model Based Express Controller
- Model Based Router Controller

## Custom Layer - "express"

This package adds a custom layer called "express". This is for systems that use express as the final top layer. One example would be a REST API Backend.

## Model Based Express Controller
Available is an express controller that can wrap around a model from the `functional-models-orm` system. It provides all of the CRUDS (create, retrieve, update, delete, search) functionality. This pairs very well with the Model Based Express Router, although is not required.

## Model Based Express Router 
This is an express router that automatically provides routing to a cruds controller. This handles all the pathing and takes this format:
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

