import {ExpressRouter} from "./types.js"

const isExpressRouter = (obj: any): obj is ExpressRouter => {
  return Boolean(obj.router)
}

export {
  isExpressRouter
}
