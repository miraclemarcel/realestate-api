import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { JwtPayload } from '../../utils/jwt';
import { PaginationMeta } from '../../utils/response';
import { emailService } from '../email';
import { CreatePropertyInput, ListPropertiesQuery, UpdatePropertyInput } from './property.validation';

const ownerSelect = {
  select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true },
} satisfies Prisma.UserDefaultArgs;

const withOwner = { owner: ownerSelect } satisfies Prisma.PropertyInclude;

type PropertyWithOwner = Prisma.PropertyGetPayload<{ include: typeof withOwner }>;

/**
 * Address fields are stored as flat columns but exposed to clients as a nested
 * `address` object. Price is stored as an exact DECIMAL and returned as a number.
 */
const toResponse = (property: PropertyWithOwner) => {
  const { street, city, state, country, zipCode, price, ...rest } = property;
  return {
    ...rest,
    price: price.toNumber(),
    address: { street, city, state, country, zipCode },
  };
};

const buildWhere = (query: ListPropertiesQuery, ownerId?: string): Prisma.PropertyWhereInput => {
  const where: Prisma.PropertyWhereInput = {};
  const insensitive = (value: string) => ({ equals: value, mode: 'insensitive' as const });

  if (ownerId) where.ownerId = ownerId;
  if (query.propertyType) where.propertyType = query.propertyType;
  if (query.listingType) where.listingType = query.listingType;
  if (query.status) where.status = query.status;
  if (query.isFeatured !== undefined) where.isFeatured = query.isFeatured;

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.price = { gte: query.minPrice, lte: query.maxPrice };
  }
  if (query.minBedrooms !== undefined) where.bedrooms = { gte: query.minBedrooms };
  if (query.minBathrooms !== undefined) where.bathrooms = { gte: query.minBathrooms };

  if (query.city) where.city = insensitive(query.city);
  if (query.state) where.state = insensitive(query.state);
  if (query.country) where.country = insensitive(query.country);

  if (query.search) {
    const contains = { contains: query.search, mode: 'insensitive' as const };
    where.OR = [{ title: contains }, { description: contains }, { city: contains }, { street: contains }];
  }

  return where;
};

const buildOrderBy = (query: ListPropertiesQuery): Prisma.PropertyOrderByWithRelationInput[] => {
  // areaSqft is optional: keep listings without an area at the end in both directions.
  const primary: Prisma.PropertyOrderByWithRelationInput =
    query.sortBy === 'areaSqft'
      ? { areaSqft: { sort: query.sortOrder, nulls: 'last' } }
      : { [query.sortBy]: query.sortOrder };

  // Tie-breaker on id keeps pagination stable when sort values are equal.
  return [primary, { id: 'asc' }];
};

/** Only the owner of a listing (or an admin) may modify it. */
const assertCanModify = (ownerId: string, user: JwtPayload) => {
  if (ownerId !== user.sub && user.role !== 'ADMIN') {
    throw ApiError.forbidden('You can only modify your own listings');
  }
};

export const propertyService = {
  async create(input: CreatePropertyInput, user: JwtPayload) {
    const { address, isFeatured, ...rest } = input;

    const property = await prisma.property.create({
      data: {
        ...rest,
        ...address,
        // Only admins can feature a listing.
        isFeatured: user.role === 'ADMIN' ? isFeatured : false,
        ownerId: user.sub,
      },
      include: withOwner,
    });

    const result = toResponse(property);

    void emailService.sendPropertyListedEmail(property.owner, {
      id: result.id,
      title: result.title,
      price: result.price,
      currency: result.currency,
      city: result.address.city,
    });

    return result;
  },

  async list(query: ListPropertiesQuery, ownerId?: string) {
    const where = buildWhere(query, ownerId);

    const [items, total] = await prisma.$transaction([
      prisma.property.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: buildOrderBy(query),
        include: withOwner,
      }),
      prisma.property.count({ where }),
    ]);

    const meta: PaginationMeta = {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };

    return { items: items.map(toResponse), meta };
  },

  async getById(id: string) {
    const property = await prisma.property.findUnique({ where: { id }, include: withOwner });
    if (!property) throw ApiError.notFound('Property not found');
    return toResponse(property);
  },

  async update(id: string, input: UpdatePropertyInput, user: JwtPayload) {
    const existing = await prisma.property.findUnique({ where: { id }, select: { ownerId: true } });
    if (!existing) throw ApiError.notFound('Property not found');
    assertCanModify(existing.ownerId, user);

    const { address, isFeatured, ...rest } = input;
    // Address fields are columns, so a partial address only updates the fields provided.
    const data: Prisma.PropertyUpdateInput = { ...rest, ...address };

    if (isFeatured !== undefined) {
      if (user.role !== 'ADMIN') throw ApiError.forbidden('Only admins can feature a listing');
      data.isFeatured = isFeatured;
    }

    const property = await prisma.property.update({ where: { id }, data, include: withOwner });
    return toResponse(property);
  },

  async remove(id: string, user: JwtPayload) {
    const existing = await prisma.property.findUnique({ where: { id }, include: withOwner });
    if (!existing) throw ApiError.notFound('Property not found');
    assertCanModify(existing.ownerId, user);

    await prisma.property.delete({ where: { id } });

    void emailService.sendPropertyDeletedEmail(existing.owner, existing.title);
  },
};
