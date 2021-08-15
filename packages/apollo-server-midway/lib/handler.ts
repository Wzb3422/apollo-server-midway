import {
  GraphQLOptions,
  runHttpQuery,
  convertNodeHttpToRequest,
} from 'apollo-server-core';
import { ValueOrPromise } from 'apollo-server-types';
import { IncomingMessage } from 'http';
import { MidwayReq, MidwayRes } from './types';
import { handleResponse } from './utils';
import typeis from 'type-is';

export interface GraphQLOptionsFunction {
  (req?: MidwayReq): ValueOrPromise<GraphQLOptions>;
}

function setHeaders(res: MidwayRes, headers: Record<string, string>): void {
  for (const [header, value] of Object.entries(headers)) {
    res.set(header, value);
  }
}

export function graphqlCoreHandler(
  options: GraphQLOptions | GraphQLOptionsFunction
) {
  const graphqlHandler = async (req: MidwayReq, res: MidwayRes) => {
    const contentType = req.headers['content-type'];

    const query = req.method === 'GET' ? req.query : req.body;

    try {
      const { graphqlResponse, responseInit } = await runHttpQuery([req, res], {
        method: req.method,
        options,
        query,
        request: convertNodeHttpToRequest(req as unknown as IncomingMessage),
      });

      setHeaders(res, responseInit.headers!);
      const statusCode = responseInit.status || 200;
      return handleResponse(res, statusCode, graphqlResponse);
    } catch (error) {
      if ('HttpQueryError' === error.name && error.headers) {
        setHeaders(res, error.headers);
      }

      const statusCode = error.statusCode ?? 500;

      return handleResponse(res, statusCode, error.message);
    }
  };

  return graphqlHandler;
}
