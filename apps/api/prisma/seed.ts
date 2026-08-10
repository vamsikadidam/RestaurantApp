/* eslint-disable no-console */
import * as argon2 from 'argon2';
import { PrismaClient, UserRoleType } from '@prisma/client';

const prisma = new PrismaClient();

/** Stable ID so the Flutter app's default `RESTAURANT_ID` matches local seed data. */
const RESTAURANT_ID = 'demo-restaurant-id';
/** Local-dev only password for `admin@indiagardenscv.test`. */
const ADMIN_PASSWORD = 'ChangeMe123!';

const IMG = {
  logo: 'https://indiagardenscv.com/wp-content/uploads/2025/04/IGLogo.jpeg',
  banner: 'https://indiagardenscv.com/wp-content/uploads/revslider/Modern-Restaurant-Slider-Design/b1.jpg',
  chickenLollipop: 'https://indiagardenscv.com/wp-content/uploads/2025/05/Chicken_Lollipop-scaled.jpg',
  fishPomfret: 'https://indiagardenscv.com/wp-content/uploads/2025/05/Fish_Pompret-scaled.jpg',
  lambChops: 'https://indiagardenscv.com/wp-content/uploads/2025/05/Lamb_Chops-scaled.jpg',
  chickenBiryani: 'https://indiagardenscv.com/wp-content/uploads/2025/05/Hyderabadi_Chicken_Dum_Biryani-scaled.jpg',
  kadaiChicken: 'https://indiagardenscv.com/wp-content/uploads/2025/05/Kadai_Chicken-scaled.jpg',
  butterChicken: 'https://indiagardenscv.com/wp-content/uploads/2025/05/Butter_Chicken-scaled.jpg',
  chilliChicken: 'https://indiagardenscv.com/wp-content/uploads/2025/05/Chilli_Chicken-scaled-e1746305741348.jpg',
  chicken65: 'https://indiagardenscv.com/wp-content/uploads/2025/05/Chicken_65-scaled-e1746305679761.jpg',
  palakPaneer: 'https://indiagardenscv.com/wp-content/uploads/2025/05/Creamy_Palak_Paneer-scaled-e1746305777674.jpg',
  plainDosa: 'https://indiagardenscv.com/wp-content/uploads/2025/05/Plain_Dosa-scaled.jpg',
  idli: 'https://indiagardenscv.com/wp-content/uploads/2025/05/Idly-scaled.jpg',
  mangoCustard: 'https://indiagardenscv.com/wp-content/uploads/2025/05/Mango_Custard-scaled.jpg',
} as const;

type SeedItem = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl?: string;
  isFeatured?: boolean;
  featuredOrder?: number;
};

/**
 * Seeds India Garden (Santa Clarita) restaurant data from indiagardenscv.com /
 * Clover online ordering prices, for local mobile + admin testing.
 */
async function main() {
  const existingBySlug = await prisma.restaurant.findUnique({ where: { slug: 'india-garden-scv' } });
  if (existingBySlug && existingBySlug.id !== RESTAURANT_ID) {
    await prisma.restaurant.delete({ where: { id: existingBySlug.id } });
  }
  // Also remove leftover demo-restaurant slug if present under a different id.
  const oldDemo = await prisma.restaurant.findUnique({ where: { slug: 'demo-restaurant' } });
  if (oldDemo && oldDemo.id !== RESTAURANT_ID) {
    await prisma.restaurant.delete({ where: { id: oldDemo.id } });
  }

  const restaurant = await prisma.restaurant.upsert({
    where: { id: RESTAURANT_ID },
    update: {
      name: 'India Garden',
      slug: 'india-garden-scv',
      description:
        'Authentic South Indian & Indian cuisine in Santa Clarita. Open 11am–3pm & 5pm–9:30pm.',
      logoUrl: IMG.logo,
      bannerUrl: IMG.banner,
    },
    create: {
      id: RESTAURANT_ID,
      name: 'India Garden',
      slug: 'india-garden-scv',
      description:
        'Authentic South Indian & Indian cuisine in Santa Clarita. Open 11am–3pm & 5pm–9:30pm.',
      logoUrl: IMG.logo,
      bannerUrl: IMG.banner,
      currency: 'USD',
      country: 'US',
    },
  });

  const location = await prisma.restaurantLocation.upsert({
    where: { id: 'seed-location-1' },
    update: {
      name: 'India Garden - Santa Clarita',
      addressLine1: '24341 Magic Mountain Pkwy',
      city: 'Santa Clarita',
      state: 'CA',
      postalCode: '91355',
      country: 'US',
      phone: '+16612003055',
      timezone: 'America/Los_Angeles',
      isPrimary: true,
      pickupEnabled: true,
      deliveryEnabled: true,
      deliveryRadiusMeters: 12000,
      minimumOrderAmountCents: 1500,
      deliveryFeeCents: 399,
      defaultPrepTimeMinutes: 30,
    },
    create: {
      id: 'seed-location-1',
      restaurantId: restaurant.id,
      name: 'India Garden - Santa Clarita',
      addressLine1: '24341 Magic Mountain Pkwy',
      city: 'Santa Clarita',
      state: 'CA',
      postalCode: '91355',
      country: 'US',
      phone: '+16612003055',
      timezone: 'America/Los_Angeles',
      isPrimary: true,
      pickupEnabled: true,
      deliveryEnabled: true,
      deliveryRadiusMeters: 12000,
      minimumOrderAmountCents: 1500,
      deliveryFeeCents: 399,
      defaultPrepTimeMinutes: 30,
    },
  });

  // Clear old hours / menu for a clean reseed.
  await prisma.restaurantHours.deleteMany({ where: { restaurantLocationId: location.id } });
  await prisma.menuItemModifierGroup.deleteMany({
    where: { menuItem: { restaurantId: restaurant.id } },
  });
  await prisma.menuItem.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.modifierOption.deleteMany({
    where: { modifierGroup: { restaurantId: restaurant.id } },
  });
  await prisma.modifierGroup.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.menuCategory.deleteMany({ where: { restaurantId: restaurant.id } });

  // Lunch 11:00–15:00 and dinner 17:00–21:30 (matches website hours).
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    await prisma.restaurantHours.createMany({
      data: [
        {
          id: `seed-hours-${dayOfWeek}-lunch`,
          restaurantLocationId: location.id,
          dayOfWeek,
          opensAtMinutes: 11 * 60,
          closesAtMinutes: 15 * 60,
          isClosed: false,
        },
        {
          id: `seed-hours-${dayOfWeek}-dinner`,
          restaurantLocationId: location.id,
          dayOfWeek,
          opensAtMinutes: 17 * 60,
          closesAtMinutes: 21 * 60 + 30,
          isClosed: false,
        },
      ],
    });
  }

  const passwordHash = await argon2.hash(ADMIN_PASSWORD, { type: argon2.argon2id });
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@indiagardenscv.test' },
    update: { passwordHash },
    create: {
      email: 'admin@indiagardenscv.test',
      passwordHash,
      firstName: 'India Garden',
      lastName: 'Admin',
      emailVerifiedAt: new Date(),
    },
  });
  // Keep the old demo admin working too for anyone already using it.
  await prisma.user.upsert({
    where: { email: 'admin@demo-restaurant.test' },
    update: { passwordHash },
    create: {
      email: 'admin@demo-restaurant.test',
      passwordHash,
      firstName: 'Demo',
      lastName: 'Admin',
      emailVerifiedAt: new Date(),
    },
  });

  const existingAdminRole = await prisma.userRole.findFirst({
    where: {
      userId: adminUser.id,
      role: UserRoleType.RESTAURANT_ADMIN,
      restaurantId: restaurant.id,
      restaurantLocationId: null,
    },
  });
  if (!existingAdminRole) {
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        role: UserRoleType.RESTAURANT_ADMIN,
        restaurantId: restaurant.id,
      },
    });
  }

  const spiceGroup = await prisma.modifierGroup.create({
    data: {
      id: 'seed-modgroup-spice',
      restaurantId: restaurant.id,
      name: 'Spice Level',
      minSelect: 1,
      maxSelect: 1,
      isRequired: true,
    },
  });
  const spiceOptions = [
    { id: 'seed-spice-mild', name: 'Mild', priceCents: 0, displayOrder: 1 },
    { id: 'seed-spice-medium', name: 'Medium', priceCents: 0, displayOrder: 2 },
    { id: 'seed-spice-hot', name: 'Hot', priceCents: 0, displayOrder: 3 },
    { id: 'seed-spice-extra', name: 'Extra Hot', priceCents: 0, displayOrder: 4 },
  ];
  for (const opt of spiceOptions) {
    await prisma.modifierOption.create({
      data: { ...opt, modifierGroupId: spiceGroup.id },
    });
  }

  const categories: Array<{ id: string; name: string; description: string; order: number; items: SeedItem[] }> = [
    {
      id: 'seed-cat-soups',
      name: 'Soups & Salads',
      description: 'Light starters to warm you up.',
      order: 1,
      items: [
        {
          id: 'seed-item-sweet-corn-soup',
          name: 'Sweet Corn Soup',
          description: 'A light, comforting soup made with sweet corn and mild seasonings.',
          priceCents: 659,
        },
        {
          id: 'seed-item-sweet-corn-chicken-soup',
          name: 'Sweet Corn Chicken Soup',
          description: 'A warm, hearty soup with sweet corn, shredded chicken, and flavorful broth.',
          priceCents: 659,
        },
      ],
    },
    {
      id: 'seed-cat-apps',
      name: 'Appetizers',
      description: 'Start bold with our South Indian appetizers.',
      order: 2,
      items: [
        {
          id: 'seed-item-chicken-lollipop',
          name: 'Chicken Lollipop',
          description: 'A crispy and juicy Indo-Chinese chicken appetizer with a flavorful coating.',
          priceCents: 2089,
          imageUrl: IMG.chickenLollipop,
          isFeatured: true,
          featuredOrder: 1,
        },
        {
          id: 'seed-item-chicken-65',
          name: 'Chicken 65 (Dry/Wet)',
          description: 'A crispy deep-fried chicken dish with bold South Indian flavors.',
          priceCents: 1869,
          imageUrl: IMG.chicken65,
          isFeatured: true,
          featuredOrder: 2,
        },
        {
          id: 'seed-item-chilli-chicken',
          name: 'Chilli Chicken',
          description: 'A tangy Indo-Chinese chicken dish with bold flavors.',
          priceCents: 1979,
          imageUrl: IMG.chilliChicken,
          isFeatured: true,
          featuredOrder: 3,
        },
        {
          id: 'seed-item-fish-65',
          name: 'Fish 65',
          description: 'A crispy deep-fried fish appetizer with bold South Indian flavors.',
          priceCents: 1979,
        },
        {
          id: 'seed-item-pepper-chicken',
          name: 'Pepper Chicken Fry',
          description: 'Dry-fried chicken with bold black pepper and aromatic spices.',
          priceCents: 1979,
        },
        {
          id: 'seed-item-ig-special-fry',
          name: 'India Garden Special Chicken Fry',
          description: 'Crispy and flavorful fried chicken with aromatic spices.',
          priceCents: 1869,
        },
        {
          id: 'seed-item-goat-sukka',
          name: 'Goat Sukka - Roast',
          description: 'A dry-roasted goat dish with aromatic spices and coconut.',
          priceCents: 2089,
        },
        {
          id: 'seed-item-lamb-pepper',
          name: 'Lamb Pepper Fry',
          description: 'Stir-fried lamb with black pepper and aromatic spices.',
          priceCents: 2089,
        },
        {
          id: 'seed-item-chilli-shrimp',
          name: 'Chilli Shrimp',
          description: 'Tangy crispy shrimp tossed in a flavorful chili sauce.',
          priceCents: 2089,
        },
      ],
    },
    {
      id: 'seed-cat-apps-veg',
      name: 'Appetizers - Vegetarian',
      description: 'Crispy vegetarian starters and chaats.',
      order: 3,
      items: [
        {
          id: 'seed-item-samosa',
          name: 'Samosa',
          description: 'A crispy golden pastry filled with a savory potato and pea mixture.',
          priceCents: 769,
        },
        {
          id: 'seed-item-samosa-chaat',
          name: 'Samosa Chaat',
          description: 'Crispy samosas topped with tangy chutneys, yogurt, and spices.',
          priceCents: 1319,
        },
        {
          id: 'seed-item-onion-pakora',
          name: 'Onion Pakora',
          description: 'Crispy golden-brown fritters made with sliced onions and gram flour.',
          priceCents: 1429,
        },
        {
          id: 'seed-item-gobi-65',
          name: 'Gobi 65',
          description: 'Crispy deep-fried cauliflower florets tossed in flavorful seasoning.',
          priceCents: 1759,
        },
        {
          id: 'seed-item-chilli-paneer',
          name: 'Chilli Paneer',
          description: 'Crispy paneer tossed in a mildly tangy sauce.',
          priceCents: 1869,
        },
        {
          id: 'seed-item-peri-peri-fries',
          name: 'Peri Peri Fries',
          description: 'Crispy fries coated in flavorful peri peri seasoning.',
          priceCents: 989,
        },
      ],
    },
    {
      id: 'seed-cat-tandoori',
      name: 'Tandoori',
      description: 'Smoky, yogurt-marinated specialties from the tandoor.',
      order: 4,
      items: [
        {
          id: 'seed-item-tandoori-chicken',
          name: 'Tandoori Chicken',
          description: 'Juicy, smoky, yogurt-marinated chicken cooked in a tandoor.',
          priceCents: 2089,
        },
        {
          id: 'seed-item-lamb-chops',
          name: 'Lamb Chops',
          description: 'Juicy tender lamb ribs grilled with aromatic spices.',
          priceCents: 3299,
          imageUrl: IMG.lambChops,
          isFeatured: true,
          featuredOrder: 4,
        },
        {
          id: 'seed-item-fish-pomfret',
          name: 'Fish Pomfret',
          description: 'Coastal-style pomfret, charred and spiced.',
          priceCents: 2199,
          imageUrl: IMG.fishPomfret,
          isFeatured: true,
          featuredOrder: 5,
        },
        {
          id: 'seed-item-chicken-tikka',
          name: 'Chicken Tikka Kabab',
          description: 'Tender chicken tikka kebabs with a spiced marinade.',
          priceCents: 2089,
        },
        {
          id: 'seed-item-paneer-tikka',
          name: 'Paneer Tikka Kabab',
          description: 'Soft paneer kebabs with a rich flavorful marinade.',
          priceCents: 1979,
        },
        {
          id: 'seed-item-malai-kabab',
          name: 'Murg Malai Kabab',
          description: 'Creamy, mildly spiced chicken kebabs with a rich marinade.',
          priceCents: 2089,
        },
      ],
    },
    {
      id: 'seed-cat-curries',
      name: 'Curries',
      description: 'Spice-rich, creamy classics.',
      order: 5,
      items: [
        {
          id: 'seed-item-butter-chicken',
          name: 'Butter Chicken',
          description: 'Creamy, rich, mildly spiced tomato-based curry with tender chicken.',
          priceCents: 1869,
          imageUrl: IMG.butterChicken,
          isFeatured: true,
          featuredOrder: 6,
        },
        {
          id: 'seed-item-kadai-chicken',
          name: 'Kadai Chicken',
          description: 'Flavorful chicken cooked with tomatoes and bell peppers.',
          priceCents: 1979,
          imageUrl: IMG.kadaiChicken,
          isFeatured: true,
          featuredOrder: 7,
        },
        {
          id: 'seed-item-chicken-tikka-masala',
          name: 'Chicken Tikka Masala',
          description: 'Grilled chicken tikka in a creamy tomato-based sauce.',
          priceCents: 1869,
        },
        {
          id: 'seed-item-chicken-chettinad',
          name: 'Chicken Chettinad',
          description: 'South Indian chicken curry with a rich coconut-based gravy.',
          priceCents: 1869,
        },
        {
          id: 'seed-item-goat-rogan',
          name: 'Goat Rogan Josh',
          description: 'Rich slow-cooked goat curry with a tomato-based gravy.',
          priceCents: 2089,
        },
        {
          id: 'seed-item-lamb-curry',
          name: 'Lamb Curry',
          description: 'Tender lamb slow-cooked in a rich flavorful gravy.',
          priceCents: 1979,
        },
        {
          id: 'seed-item-saag-paneer',
          name: 'Saag Paneer (Creamy)',
          description: 'Soft paneer cooked in a smooth spinach-based gravy.',
          priceCents: 1869,
          imageUrl: IMG.palakPaneer,
          isFeatured: true,
          featuredOrder: 8,
        },
        {
          id: 'seed-item-paneer-makhani',
          name: 'Paneer Makhani',
          description: 'Paneer in a rich creamy tomato-based gravy.',
          priceCents: 1869,
        },
        {
          id: 'seed-item-dal-fry',
          name: 'Dal Fry',
          description: 'Creamy lentils cooked with garlic, tomatoes, and mild seasoning.',
          priceCents: 1539,
        },
        {
          id: 'seed-item-chana-masala',
          name: 'Chana Masala',
          description: 'Chickpeas cooked in a flavorful tomato-based gravy.',
          priceCents: 1759,
        },
      ],
    },
    {
      id: 'seed-cat-biryani',
      name: 'Biryani',
      description: 'Fragrant dum biryanis — a taste of home.',
      order: 6,
      items: [
        {
          id: 'seed-item-chicken-dum-biryani',
          name: 'Hyderabadi Chicken Dum Biryani',
          description: 'Fragrant rice slow-cooked with tender chicken.',
          priceCents: 1869,
          imageUrl: IMG.chickenBiryani,
          isFeatured: true,
          featuredOrder: 9,
        },
        {
          id: 'seed-item-goat-dum-biryani',
          name: 'Hyderabadi Goat Dum Biryani',
          description: 'Fragrant rice slow-cooked with tender goat meat.',
          priceCents: 2199,
        },
        {
          id: 'seed-item-veg-dum-biryani',
          name: 'Hyderabadi Vegetable Dum Biryani',
          description: 'Fragrant rice slow-cooked with mixed vegetables.',
          priceCents: 1649,
        },
        {
          id: 'seed-item-boneless-chicken-biryani',
          name: 'Boneless Chicken Biryani',
          description: 'Fragrant rice cooked with tender boneless chicken.',
          priceCents: 1979,
        },
        {
          id: 'seed-item-shrimp-biryani',
          name: 'Shrimp Biryani',
          description: 'Fragrant rice cooked with shrimp and mild seasoning.',
          priceCents: 2199,
        },
        {
          id: 'seed-item-paneer-biryani',
          name: 'Paneer Biryani',
          description: 'Fragrant rice cooked with soft paneer and spices.',
          priceCents: 1979,
        },
      ],
    },
    {
      id: 'seed-cat-dosa',
      name: 'Dosas & Tiffins',
      description: 'Simply South — crispy dosas and fluffy idlis.',
      order: 7,
      items: [
        {
          id: 'seed-item-plain-dosa',
          name: 'Plain Dosa',
          description: 'Crispy golden South Indian rice crepe.',
          priceCents: 1539,
          imageUrl: IMG.plainDosa,
          isFeatured: true,
          featuredOrder: 10,
        },
        {
          id: 'seed-item-masala-dosa',
          name: 'Masala Dosa',
          description: 'Crispy dosa filled with a spiced potato mixture.',
          priceCents: 1979,
        },
        {
          id: 'seed-item-mysore-masala',
          name: 'Mysore Masala Dosa',
          description: 'Crispy dosa with spicy chutney and potato filling.',
          priceCents: 1979,
        },
        {
          id: 'seed-item-ghee-dosa',
          name: 'Ghee Dosa',
          description: 'Crispy dosa coated with fragrant ghee.',
          priceCents: 1759,
        },
        {
          id: 'seed-item-onion-dosa',
          name: 'Onion Dosa',
          description: 'Crispy dosa topped with finely chopped onions.',
          priceCents: 1869,
        },
        {
          id: 'seed-item-idli',
          name: 'Idli Affair',
          description: 'Soft steamed rice cakes served with chutney and sambar.',
          priceCents: 1099,
          imageUrl: IMG.idli,
        },
      ],
    },
    {
      id: 'seed-cat-rice-noodles',
      name: 'Rice & Noodles',
      description: 'Indo-Chinese favorites and fragrant rice.',
      order: 8,
      items: [
        {
          id: 'seed-item-jeera-rice',
          name: 'Jeera Rice',
          description: 'Fragrant rice cooked with cumin seeds.',
          priceCents: 989,
        },
        {
          id: 'seed-item-chicken-fried-rice',
          name: 'Chicken Fried Rice',
          description: 'Stir-fried rice with chicken, vegetables, and mild seasoning.',
          priceCents: 1979,
        },
        {
          id: 'seed-item-veg-noodles',
          name: 'Vegetable Noodles',
          description: 'Stir-fried noodles with mixed vegetables and mild seasoning.',
          priceCents: 1759,
        },
        {
          id: 'seed-item-chicken-noodles',
          name: 'Chicken Noodles',
          description: 'Stir-fried noodles with chicken, vegetables, and mild seasoning.',
          priceCents: 1979,
        },
      ],
    },
    {
      id: 'seed-cat-desserts',
      name: 'Desserts',
      description: 'Soulful sweets to finish your meal.',
      order: 9,
      items: [
        {
          id: 'seed-item-mango-custard',
          name: 'Mango Custard',
          description: 'Creamy mango custard — a sweet indulgence.',
          priceCents: 769,
          imageUrl: IMG.mangoCustard,
          isFeatured: true,
          featuredOrder: 11,
        },
      ],
    },
  ];

  for (const cat of categories) {
    const category = await prisma.menuCategory.create({
      data: {
        id: cat.id,
        restaurantId: restaurant.id,
        name: cat.name,
        description: cat.description,
        displayOrder: cat.order,
      },
    });

    for (const item of cat.items) {
      const created = await prisma.menuItem.create({
        data: {
          id: item.id,
          restaurantId: restaurant.id,
          categoryId: category.id,
          name: item.name,
          description: item.description,
          priceCents: item.priceCents,
          imageUrl: item.imageUrl,
          taxRateBasisPoints: 975, // ~9.75% CA estimate for local testing
          isFeatured: item.isFeatured ?? false,
          featuredOrder: item.featuredOrder ?? null,
          isAvailable: true,
        },
      });

      // Attach spice level to savory categories (not soups/desserts/rice sides).
      if (!['seed-cat-soups', 'seed-cat-desserts', 'seed-cat-rice-noodles'].includes(cat.id)) {
        await prisma.menuItemModifierGroup.create({
          data: {
            menuItemId: created.id,
            modifierGroupId: spiceGroup.id,
            displayOrder: 1,
          },
        });
      }
    }
  }

  console.log('Seed complete:', {
    restaurantId: restaurant.id,
    restaurant: restaurant.name,
    location: location.name,
    phone: location.phone,
    adminUser: adminUser.email,
    adminPassword: ADMIN_PASSWORD,
    categories: categories.length,
    items: categories.reduce((n, c) => n + c.items.length, 0),
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
