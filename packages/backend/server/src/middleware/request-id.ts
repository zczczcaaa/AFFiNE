import { NextFunction, Request, Response } from 'express';
import { ClsServiceManager } from 'nestjs-cls';
import onHeaders from 'on-headers';

export const responseRequestIdHeader = (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  onHeaders(res, () => {
    const requestId = ClsServiceManager.getClsService().getId();
    res.setHeader('X-Request-Id', requestId);
  });

  next();
};
