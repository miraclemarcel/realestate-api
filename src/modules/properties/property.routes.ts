import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { propertyController } from './property.controller';
import {
  createPropertySchema,
  listPropertiesQuerySchema,
  propertyIdParamSchema,
  updatePropertySchema,
} from './property.validation';

const router = Router();

// Every property endpoint requires a valid JWT.
router.use(authenticate);

router
  .route('/')
  .get(validate(listPropertiesQuerySchema, 'query'), propertyController.list)
  .post(validate(createPropertySchema), propertyController.create);

// Must be registered before '/:id' so "me" isn't treated as an ID.
router.get('/me', validate(listPropertiesQuerySchema, 'query'), propertyController.listMine);

router
  .route('/:id')
  .get(validate(propertyIdParamSchema, 'params'), propertyController.getById)
  .patch(
    validate(propertyIdParamSchema, 'params'),
    validate(updatePropertySchema),
    propertyController.update,
  )
  .delete(validate(propertyIdParamSchema, 'params'), propertyController.remove);

export default router;
