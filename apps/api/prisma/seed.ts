import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

type CategorySeed = {
  slug: string
  nameRu: string
  nameKy: string
  children?: CategorySeed[]
}

const TREE: CategorySeed[] = [
  {
    slug: 'transport',
    nameRu: 'Транспорт',
    nameKy: 'Транспорт',
    children: [
      { slug: 'cars', nameRu: 'Автомобили', nameKy: 'Унаалар' },
      { slug: 'motorcycles', nameRu: 'Мотоциклы', nameKy: 'Мотоциклдер' },
      { slug: 'auto-parts', nameRu: 'Запчасти и аксессуары', nameKy: 'Унаа тетиктери' },
      { slug: 'commercial-vehicles', nameRu: 'Коммерческий транспорт', nameKy: 'Коммерциялык унаа' },
    ],
  },
  {
    slug: 'real-estate',
    nameRu: 'Недвижимость',
    nameKy: 'Кыймылсыз мүлк',
    children: [
      { slug: 'apartments-sale', nameRu: 'Квартиры — продажа', nameKy: 'Батирлер — сатуу' },
      { slug: 'apartments-rent', nameRu: 'Квартиры — аренда', nameKy: 'Батирлер — ижара' },
      { slug: 'houses', nameRu: 'Дома и дачи', nameKy: 'Үйлөр жана дачалар' },
      { slug: 'commercial-real-estate', nameRu: 'Коммерческая недвижимость', nameKy: 'Коммерциялык мүлк' },
      { slug: 'land', nameRu: 'Земельные участки', nameKy: 'Жер участокторy' },
    ],
  },
  {
    slug: 'electronics',
    nameRu: 'Электроника',
    nameKy: 'Электроника',
    children: [
      { slug: 'phones', nameRu: 'Телефоны', nameKy: 'Телефондор' },
      { slug: 'computers', nameRu: 'Компьютеры и ноутбуки', nameKy: 'Компьютерлер жана ноутбуктар' },
      { slug: 'tv-audio', nameRu: 'ТВ и аудио', nameKy: 'ТВ жана аудио' },
      { slug: 'gaming', nameRu: 'Игровые приставки', nameKy: 'Оюн консолдору' },
      { slug: 'cameras', nameRu: 'Фото и видео', nameKy: 'Фото жана видео' },
    ],
  },
  {
    slug: 'home-garden',
    nameRu: 'Дом и сад',
    nameKy: 'Үй жана бакча',
    children: [
      { slug: 'furniture', nameRu: 'Мебель', nameKy: 'Эмерек' },
      { slug: 'appliances', nameRu: 'Бытовая техника', nameKy: 'Үй техникасы' },
      { slug: 'kitchenware', nameRu: 'Посуда', nameKy: 'Идиш-аяк' },
      { slug: 'garden', nameRu: 'Сад и огород', nameKy: 'Бакча' },
    ],
  },
  {
    slug: 'fashion',
    nameRu: 'Одежда и обувь',
    nameKy: 'Кийим-кече',
    children: [
      { slug: 'womens-clothing', nameRu: 'Женская одежда', nameKy: 'Аял кийими' },
      { slug: 'mens-clothing', nameRu: 'Мужская одежда', nameKy: 'Эркек кийими' },
      { slug: 'shoes', nameRu: 'Обувь', nameKy: 'Бут кийим' },
      { slug: 'accessories', nameRu: 'Аксессуары', nameKy: 'Аксессуарлар' },
    ],
  },
  {
    slug: 'kids',
    nameRu: 'Детям',
    nameKy: 'Балдарга',
    children: [
      { slug: 'kids-clothing', nameRu: 'Детская одежда', nameKy: 'Бала кийими' },
      { slug: 'toys', nameRu: 'Игрушки', nameKy: 'Оюнчуктар' },
      { slug: 'strollers', nameRu: 'Коляски', nameKy: 'Коляскалар' },
      { slug: 'kids-furniture', nameRu: 'Детская мебель', nameKy: 'Балдар эмерек' },
    ],
  },
  {
    slug: 'hobbies',
    nameRu: 'Хобби и отдых',
    nameKy: 'Хобби жана эс алуу',
    children: [
      { slug: 'sports', nameRu: 'Спортивное снаряжение', nameKy: 'Спорт буюмдары' },
      { slug: 'books', nameRu: 'Книги и журналы', nameKy: 'Китептер' },
      { slug: 'music-instruments', nameRu: 'Музыкальные инструменты', nameKy: 'Музыкалык аспаптар' },
      { slug: 'collectibles', nameRu: 'Коллекционирование', nameKy: 'Коллекциялар' },
    ],
  },
  {
    slug: 'animals',
    nameRu: 'Животные',
    nameKy: 'Жаныбарлар',
    children: [
      { slug: 'dogs', nameRu: 'Собаки', nameKy: 'Иттер' },
      { slug: 'cats', nameRu: 'Кошки', nameKy: 'Мышыктар' },
      { slug: 'livestock', nameRu: 'Сельхоз животные', nameKy: 'Мал' },
      { slug: 'pet-supplies', nameRu: 'Товары для животных', nameKy: 'Жаныбарлар үчүн буюмдар' },
    ],
  },
  {
    slug: 'services',
    nameRu: 'Услуги',
    nameKy: 'Кызматтар',
    children: [
      { slug: 'repair-services', nameRu: 'Ремонт и строительство', nameKy: 'Оңдоо жана курулуш' },
      { slug: 'transport-services', nameRu: 'Перевозки', nameKy: 'Жүк ташуу' },
      { slug: 'beauty-services', nameRu: 'Красота и здоровье', nameKy: 'Сулуулук жана ден соолук' },
      { slug: 'tutoring', nameRu: 'Обучение', nameKy: 'Окутуу' },
    ],
  },
  {
    slug: 'jobs',
    nameRu: 'Работа',
    nameKy: 'Жумуш',
    children: [
      { slug: 'jobs-offered', nameRu: 'Вакансии', nameKy: 'Вакансиялар' },
      { slug: 'jobs-wanted', nameRu: 'Резюме', nameKy: 'Резюме' },
    ],
  },
  {
    slug: 'business',
    nameRu: 'Бизнес и оборудование',
    nameKy: 'Бизнес жана жабдуулар',
    children: [
      { slug: 'office-equipment', nameRu: 'Офисное оборудование', nameKy: 'Офис жабдуулары' },
      { slug: 'industrial', nameRu: 'Промышленное оборудование', nameKy: 'Өнөр жай жабдуулары' },
      { slug: 'ready-business', nameRu: 'Готовый бизнес', nameKy: 'Даяр бизнес' },
    ],
  },
]

async function seedTree(nodes: CategorySeed[], parentId: string | null, baseSort: number): Promise<void> {
  let sort = baseSort
  for (const node of nodes) {
    const existing = await prisma.category.findUnique({ where: { slug: node.slug } })
    const category = existing
      ? await prisma.category.update({
          where: { slug: node.slug },
          data: { nameRu: node.nameRu, nameKy: node.nameKy, parentId, sortOrder: sort },
        })
      : await prisma.category.create({
          data: {
            slug: node.slug,
            nameRu: node.nameRu,
            nameKy: node.nameKy,
            parentId,
            sortOrder: sort,
          },
        })
    sort += 10
    if (node.children?.length) {
      await seedTree(node.children, category.id, 10)
    }
  }
}

async function seedDevUser(): Promise<string> {
  const passwordHash = await bcrypt.hash('devpass123', 12)
  const user = await prisma.user.upsert({
    where: { email: 'dev@kgm.local' },
    update: {},
    create: {
      email: 'dev@kgm.local',
      phone: '+996700000000',
      passwordHash,
      firstName: 'Dev',
      lastName: 'Seller',
      isPhoneVerified: true,
      status: 'ACTIVE',
    },
  })
  return user.id
}

async function seedSampleListings(sellerId: string): Promise<void> {
  const electronics = await prisma.category.findFirst({ where: { slug: 'phones' } })
  const transport = await prisma.category.findFirst({ where: { slug: 'cars' } })
  const home = await prisma.category.findFirst({ where: { slug: 'furniture' } })
  if (!electronics || !transport || !home) {
    throw new Error('seed: expected leaf categories not found; run category seed first')
  }
  const samples = [
    {
      title: 'iPhone 13 Pro 256GB',
      description:
        'Отличное состояние, полный комплект, использовался 1 год. Без царапин, батарея 95%.',
      price: '65000',
      condition: 'GOOD' as const,
      categoryId: electronics.id,
      location: 'Бишкек',
    },
    {
      title: 'Toyota Camry 2019',
      description:
        'Автомобиль в идеальном состоянии. Один владелец, сервисная история, без ДТП.',
      price: '1450000',
      condition: 'GOOD' as const,
      categoryId: transport.id,
      location: 'Бишкек',
    },
    {
      title: 'Диван угловой новый',
      description:
        'Новый диван из салона, доставка по городу. Материал: экокожа, цвет бежевый.',
      price: '42000',
      condition: 'NEW' as const,
      categoryId: home.id,
      location: 'Ош',
    },
  ]
  for (const s of samples) {
    await prisma.listing.upsert({
      where: { id: `seed-${s.title.slice(0, 20)}` },
      update: {},
      create: {
        id: `seed-${s.title.slice(0, 20)}`,
        title: s.title,
        description: s.description,
        price: s.price,
        currency: 'KGS',
        condition: s.condition,
        status: 'ACTIVE',
        location: s.location,
        sellerId,
        categoryId: s.categoryId,
      },
    })
  }
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.warn('[seed] seeding categories...')
  await seedTree(TREE, null, 10)
  const count = await prisma.category.count()
  // eslint-disable-next-line no-console
  console.warn(`[seed] done. total categories: ${count}`)
  const devUserId = await seedDevUser()
  await seedSampleListings(devUserId)
  // eslint-disable-next-line no-console
  console.warn('✓ seeded dev user and sample listings')
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
