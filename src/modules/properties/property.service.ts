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

  if (query.city || query.state || query.country) {
    where.address = {
      is: {
        ...(query.city && { city: insensitive(query.city) }),
        ...(query.state && { state: insensitive(query.state) }),
        ...(query.country && { country: insensitive(query.country) }),
      },
    };
  }

  if (query.search) {
    const contains = { contains: query.search, mode: 'insensitive' as const };
    where.OR = [
      { title: contains },
      { description: contains },
      { address: { is: { city: contains } } },
      { address: { is: { street: contains } } },
    ];
  }

  return where;
};

const findPropertyOrThrow = async (id: string) => {
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) throw ApiError.notFound('Property not found');
  return property;
};

/** Only the owner of a listing (or an admin) may modify it. */
const assertCanModify = (ownerId: string, user: JwtPayload) => {
  if (ownerId !== user.sub && user.role !== 'ADMIN') {
    throw ApiError.forbidden('You can only modify your own listings');
  }
};

export const propertyService = {
  async create(input: CreatePropertyInput, user: JwtPayload) {
    // Only admins can feature a listing.
    const isFeatured = user.role === 'ADMIN' ? input.isFeatured : false;

    const property = await prisma.property.create({
      data: { ...input, isFeatured, ownerId: user.sub },
      include: { owner: ownerSelect },
    });

    void emailService.sendPropertyListedEmail(property.owner, {
      id: property.id,
      title: property.title,
      price: property.price,
      currency: property.currency,
      city: property.address.city,
    });

    return property;
  },

  async list(query: ListPropertiesQuery, ownerId?: string) {
    const where = buildWhere(query, ownerId);
    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
        include: { owner: ownerSelect },
      }),
      prisma.property.count({ where }),
    ]);

    const meta: PaginationMeta = {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };

    return { items, meta };
  },

  async getById(id: string) {
    const property = await prisma.property.findUnique({
      where: { id },
      include: { owner: ownerSelect },
    });
    if (!property) throw ApiError.notFound('Property not found');
    return property;
  },

  async update(id: string, input: UpdatePropertyInput, user: JwtPayload) {
    const existing = await findPropertyOrThrow(id);
    assertCanModify(existing.ownerId, user);

    const { address, isFeatured, ...rest } = input;
    const data: Prisma.PropertyUpdateInput = { ...rest };

    // Address is an embedded document: merge partial updates into the existing one.
    if (address) data.address = { set: { ...existing.address, ...address } };
    if (isFeatured !== undefined) {
      if (user.role !== 'ADMIN') throw ApiError.forbidden('Only admins can feature a listing');
      data.isFeatured = isFeatured;
    }

    return prisma.property.update({
      where: { id },
      data,
      include: { owner: ownerSelect },
    });
  },

  async remove(id: string, user: JwtPayload) {
    const existing = await prisma.property.findUnique({
      where: { id },
      include: { owner: ownerSelect },
    });
    if (!existing) throw ApiError.notFound('Property not found');
    assertCanModify(existing.ownerId, user);

    await prisma.property.delete({ where: { id } });

    void emailService.sendPropertyDeletedEmail(existing.owner, existing.title);
  },
};
