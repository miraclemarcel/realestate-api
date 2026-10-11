import { z } from 'zod';

const PROPERTY_TYPES = ['APARTMENT', 'HOUSE', 'CONDO', 'TOWNHOUSE', 'LAND', 'COMMERCIAL', 'OFFICE'] as const;
const LISTING_TYPES = ['SALE', 'RENT'] as const;
const PROPERTY_STATUSES = ['AVAILABLE', 'PENDING', 'SOLD', 'RENTED'] as const;

export const propertyIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid property ID'),
});

const addressSchema = z.object({
  street: z.string().trim().min(1, 'Street is required').max(200),
  city: z.string().trim().min(1, 'City is required').max(100),
  state: z.string().trim().min(1, 'State is required').max(100),
  country: z.string().trim().min(1, 'Country is required').max(100),
  zipCode: z.string().trim().max(20).optional(),
});

const propertyFields = {
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(150),
  description: z.string().trim().min(20, 'Description must be at least 20 characters').max(5000),
  price: z.number().positive('Price must be greater than 0'),
  currency: z.string().trim().length(3, 'Currency must be a 3-letter ISO code').toUpperCase(),
  propertyType: z.enum(PROPERTY_TYPES),
  listingType: z.enum(LISTING_TYPES),
  status: z.enum(PROPERTY_STATUSES),
  bedrooms: z.number().int().min(0).max(100),
  bathrooms: z.number().int().min(0).max(100),
  areaSqft: z.number().positive(),
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear() + 5),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  amenities: z.array(z.string().trim().min(1).max(50)).max(50),
  images: z.array(z.url('Each image must be a valid URL')).max(30),
  isFeatured: z.boolean(),
};

export const createPropertySchema = z.object({
  title: propertyFields.title,
  description: propertyFields.description,
  price: propertyFields.price,
  currency: propertyFields.currency.default('USD'),
  propertyType: propertyFields.propertyType,
  listingType: propertyFields.listingType,
  status: propertyFields.status.default('AVAILABLE'),
  bedrooms: propertyFields.bedrooms.default(0),
  bathrooms: propertyFields.bathrooms.default(0),
  areaSqft: propertyFields.areaSqft.optional(),
  yearBuilt: propertyFields.yearBuilt.optional(),
  address: addressSchema,
  latitude: propertyFields.latitude.optional(),
  longitude: propertyFields.longitude.optional(),
  amenities: propertyFields.amenities.default([]),
  images: propertyFields.images.default([]),
  isFeatured: propertyFields.isFeatured.default(false),
});

export const updatePropertySchema = z
  .object({
    ...propertyFields,
    areaSqft: propertyFields.areaSqft.nullable(),
    yearBuilt: propertyFields.yearBuilt.nullable(),
    latitude: propertyFields.latitude.nullable(),
    longitude: propertyFields.longitude.nullable(),
    address: addressSchema.partial(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update' });

export const listPropertiesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().min(1).optional(),
    city: z.string().trim().min(1).optional(),
    state: z.string().trim().min(1).optional(),
    country: z.string().trim().min(1).optional(),
    propertyType: z.enum(PROPERTY_TYPES).optional(),
    listingType: z.enum(LISTING_TYPES).optional(),
    status: z.enum(PROPERTY_STATUSES).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    minBedrooms: z.coerce.number().int().min(0).optional(),
    minBathrooms: z.coerce.number().int().min(0).optional(),
    isFeatured: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
    sortBy: z.enum(['createdAt', 'price', 'bedrooms', 'areaSqft']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .refine((q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, {
    message: 'minPrice cannot be greater than maxPrice',
    path: ['minPrice'],
  });

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type ListPropertiesQuery = z.infer<typeof listPropertiesQuerySchema>;
