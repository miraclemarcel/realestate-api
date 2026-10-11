import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { propertyService } from './property.service';
import { ListPropertiesQuery } from './property.validation';

// All property routes are protected by `authenticate`, so req.user is always set.
export const propertyController = {
  async create(req: Request, res: Response) {
    const property = await propertyService.create(req.body, req.user!);
    sendSuccess(res, property, 'Property listed successfully', 201);
  },

  async list(_req: Request, res: Response) {
    const query = res.locals.query as ListPropertiesQuery;
    const { items, meta } = await propertyService.list(query);
    sendSuccess(res, items, 'Properties retrieved successfully', 200, meta);
  },

  async listMine(req: Request, res: Response) {
    const query = res.locals.query as ListPropertiesQuery;
    const { items, meta } = await propertyService.list(query, req.user!.sub);
    sendSuccess(res, items, 'Your properties retrieved successfully', 200, meta);
  },

  async getById(_req: Request, res: Response) {
    const property = await propertyService.getById(res.locals.params.id);
    sendSuccess(res, property, 'Property retrieved successfully');
  },

  async update(req: Request, res: Response) {
    const property = await propertyService.update(res.locals.params.id, req.body, req.user!);
    sendSuccess(res, property, 'Property updated successfully');
  },

  async remove(req: Request, res: Response) {
    await propertyService.remove(res.locals.params.id, req.user!);
    sendSuccess(res, null, 'Property deleted successfully');
  },
};
