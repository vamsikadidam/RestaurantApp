/* eslint-disable no-console */
import { PrismaClient, UserRoleType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Phase 1 seed: creates one demo restaurant, one location, hours, a couple of
 * menu categories/items with modifiers, and a restaurant admin user so the API
 * and later the mobile app / admin portal have something real to point at in
 * local development. This is NOT synced from Clover - real Clover sync
 * services are implemented in Phase 2.
 */
async function main() {
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'demo-restaurant' },
    update: {},
    create: {
      name: 'Demo Restaurant',
      slug: 'demo-restaurant',
      description: 'A sample restaurant used for local development and testing.',
      currency: 'USD',
      country: 'US',
    },
  });

  const location = await prisma.restaurantLocation.upsert({
    where: { id: 'seed-location-1' },
    update: {},
    create: {
      id: 'seed-location-1',
      restaurantId: restaurant.id,
      name: 'Demo Restaurant - Main Street',
      addressLine1: '123 Main Street',
      city: 'Springfield',
      state: 'IL',
      postalCode: '62701',
      country: 'US',
      phone: '+15555550100',
      isPrimary: true,
      pickupEnabled: true,
      deliveryEnabled: true,
      deliveryRadiusMeters: 8000,
      minimumOrderAmountCents: 1000,
      deliveryFeeCents: 399,
      defaultPrepTimeMinutes: 25,
    },
  });

  const hoursByDay = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    restaurantLocationId: location.id,
    dayOfWeek,
    opensAtMinutes: 10 * 60,
    closesAtMinutes: 22 * 60,
    isClosed: false,
  }));

  for (const hours of hoursByDay) {
    await prisma.restaurantHours.upsert({
      where: {
        id: `seed-hours-${hours.dayOfWeek}`,
      },
      update: {},
      create: {
        id: `seed-hours-${hours.dayOfWeek}`,
        ...hours,
      },
    });
  }

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo-restaurant.test' },
    update: {},
    create: {
      email: 'admin@demo-restaurant.test',
      // Password hash for the placeholder password "ChangeMe123!" - Argon2 hashing
      // is implemented in Phase 2 (auth module). This is a local-dev-only seed value.
      passwordHash: null,
      firstName: 'Demo',
      lastName: 'Admin',
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_role_restaurantId_restaurantLocationId: {
        userId: adminUser.id,
        role: UserRoleType.RESTAURANT_ADMIN,
        restaurantId: restaurant.id,
        restaurantLocationId: null as unknown as string,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      role: UserRoleType.RESTAURANT_ADMIN,
      restaurantId: restaurant.id,
    },
  });

  const category = await prisma.menuCategory.upsert({
    where: { id: 'seed-category-burgers' },
    update: {},
    create: {
      id: 'seed-category-burgers',
      restaurantId: restaurant.id,
      name: 'Burgers',
      description: 'Signature burgers made fresh to order.',
      displayOrder: 1,
    },
  });

  const modifierGroup = await prisma.modifierGroup.upsert({
    where: { id: 'seed-modgroup-toppings' },
    update: {},
    create: {
      id: 'seed-modgroup-toppings',
      restaurantId: restaurant.id,
      name: 'Extra Toppings',
      minSelect: 0,
      maxSelect: 5,
      isRequired: false,
    },
  });

  await prisma.modifierOption.upsert({
    where: { id: 'seed-modopt-cheese' },
    update: {},
    create: {
      id: 'seed-modopt-cheese',
      modifierGroupId: modifierGroup.id,
      name: 'Extra Cheese',
      priceCents: 100,
      displayOrder: 1,
    },
  });

  await prisma.modifierOption.upsert({
    where: { id: 'seed-modopt-bacon' },
    update: {},
    create: {
      id: 'seed-modopt-bacon',
      modifierGroupId: modifierGroup.id,
      name: 'Bacon',
      priceCents: 200,
      displayOrder: 2,
    },
  });

  const menuItem = await prisma.menuItem.upsert({
    where: { id: 'seed-item-classic-burger' },
    update: {},
    create: {
      id: 'seed-item-classic-burger',
      restaurantId: restaurant.id,
      categoryId: category.id,
      name: 'Classic Cheeseburger',
      description: 'Beef patty, cheddar, lettuce, tomato, house sauce on a brioche bun.',
      priceCents: 1099,
      taxRateBasisPoints: 875,
      isFeatured: true,
      featuredOrder: 1,
    },
  });

  await prisma.menuItemModifierGroup.upsert({
    where: {
      menuItemId_modifierGroupId: {
        menuItemId: menuItem.id,
        modifierGroupId: modifierGroup.id,
      },
    },
    update: {},
    create: {
      menuItemId: menuItem.id,
      modifierGroupId: modifierGroup.id,
      displayOrder: 1,
    },
  });

  console.log('Seed complete:', {
    restaurant: restaurant.slug,
    location: location.name,
    adminUser: adminUser.email,
    menuItem: menuItem.name,
  });
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
