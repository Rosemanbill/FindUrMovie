import { PrismaClient, Role, TitleStatus, TitleType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const sampleVideoUrl =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

const titles = [
  {
    slug: 'midnight-signal',
    name: 'Midnight Signal',
    description:
      'A radio astronomer follows a strange transmission across abandoned desert towns.',
    aiSummary:
      'A tense sci-fi mystery about obsession, isolation, and the signal that refuses to fade.',
    type: TitleType.MOVIE,
    releaseYear: 2025,
    runtimeMinutes: 118,
    maturityRating: 'PG-13',
    language: 'English',
    cast: ['Nora Vale', 'Owen Reyes', 'Mina Hart'],
    moods: ['mysterious', 'tense', 'smart'],
    tags: ['sci-fi', 'signal', 'desert', 'conspiracy'],
    genres: ['Sci-Fi', 'Thriller'],
    popularity: 96
  },
  {
    slug: 'harbor-lights',
    name: 'Harbor Lights',
    description:
      'A chef returns to her coastal hometown and rebuilds a family restaurant before the summer rush.',
    aiSummary:
      'A warm coastal drama about food, family, and second chances.',
    type: TitleType.SERIES,
    releaseYear: 2024,
    runtimeMinutes: 42,
    maturityRating: 'TV-PG',
    language: 'English',
    cast: ['Alia Brooks', 'Mateo Quinn', 'June Park'],
    moods: ['hopeful', 'romantic', 'comforting'],
    tags: ['food', 'family', 'coastal', 'small town'],
    genres: ['Drama', 'Romance'],
    popularity: 88
  },
  {
    slug: 'orbit-kids',
    name: 'Orbit Kids',
    description:
      'Three curious siblings turn a backyard telescope into a doorway for interstellar adventures.',
    aiSummary:
      'A bright family adventure with space puzzles, brave kids, and gentle comedy.',
    type: TitleType.SERIES,
    releaseYear: 2023,
    runtimeMinutes: 28,
    maturityRating: 'TV-Y7',
    language: 'English',
    cast: ['Ivy Chen', 'Leo Stone', 'Sam Patel'],
    moods: ['funny', 'family', 'adventurous'],
    tags: ['kids', 'space', 'siblings', 'aliens'],
    genres: ['Family', 'Adventure', 'Sci-Fi'],
    popularity: 82
  },
  {
    slug: 'the-last-platform',
    name: 'The Last Platform',
    description:
      'Commuters trapped in a futuristic transit hub uncover the truth behind a citywide evacuation.',
    aiSummary:
      'A compact, high-pressure thriller built around trust, survival, and hidden systems.',
    type: TitleType.MOVIE,
    releaseYear: 2026,
    runtimeMinutes: 101,
    maturityRating: 'PG-13',
    language: 'English',
    cast: ['Theo Grant', 'Sana Moore', 'Felix Ash'],
    moods: ['intense', 'dark', 'suspenseful'],
    tags: ['transit', 'survival', 'future', 'evacuation'],
    genres: ['Thriller', 'Action'],
    popularity: 91
  },
  {
    slug: 'wild-note',
    name: 'Wild Note',
    description:
      'A touring violinist and a wildlife documentarian cross paths while recording the sound of a rainforest.',
    aiSummary:
      'A lyrical nature romance about listening closely to the world and to each other.',
    type: TitleType.MOVIE,
    releaseYear: 2022,
    runtimeMinutes: 109,
    maturityRating: 'PG',
    language: 'English',
    cast: ['Rhea Moon', 'Jon Bell', 'Amara Singh'],
    moods: ['romantic', 'calming', 'inspiring'],
    tags: ['music', 'nature', 'rainforest', 'travel'],
    genres: ['Romance', 'Documentary'],
    popularity: 74
  },
  {
    slug: 'zero-day-chef',
    name: 'Zero Day Chef',
    description:
      'A chaotic culinary competition turns into a cyber-heist when contestants find a hidden terminal.',
    aiSummary:
      'A fast, funny genre mashup where knives are sharp and passwords are sharper.',
    type: TitleType.SERIES,
    releaseYear: 2025,
    runtimeMinutes: 35,
    maturityRating: 'TV-14',
    language: 'English',
    cast: ['Kai Moreno', 'Lena Moss', 'Priya Das'],
    moods: ['funny', 'fast', 'clever'],
    tags: ['food', 'hackers', 'competition', 'heist'],
    genres: ['Comedy', 'Action'],
    popularity: 86
  }
];

function image(seed: string, width: number, height: number) {
  return `https://picsum.photos/seed/streamverse-${seed}/${width}/${height}`;
}

function vectorFor(text: string) {
  const buckets = Array.from({ length: 12 }, () => 0);
  for (const [index, char] of Array.from(text.toLowerCase()).entries()) {
    buckets[index % buckets.length] += char.charCodeAt(0) / 255;
  }
  return buckets.map((value) => Number(value.toFixed(4)));
}

async function main() {
  const passwordHash = await argon2.hash('Password123!');

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@streamverse.test' },
    update: {},
    create: {
      email: 'demo@streamverse.test',
      name: 'Demo Viewer',
      passwordHash,
      role: Role.USER,
      profiles: {
        create: [
          {
            name: 'Ritik',
            avatarUrl: image('avatar-ritik', 240, 240),
            maturityRating: 'PG-13'
          },
          {
            name: 'Kids',
            avatarUrl: image('avatar-kids', 240, 240),
            maturityRating: 'TV-Y7'
          }
        ]
      }
    },
    include: { profiles: true }
  });

  await prisma.user.upsert({
    where: { email: 'admin@streamverse.test' },
    update: { role: Role.ADMIN },
    create: {
      email: 'admin@streamverse.test',
      name: 'Admin',
      passwordHash,
      role: Role.ADMIN
    }
  });

  for (const title of titles) {
    const genres = await Promise.all(
      title.genres.map((name) =>
        prisma.genre.upsert({
          where: { slug: name.toLowerCase().replace(/\s+/g, '-') },
          update: {},
          create: { name, slug: name.toLowerCase().replace(/\s+/g, '-') }
        })
      )
    );

    const created = await prisma.title.upsert({
      where: { slug: title.slug },
      update: {
        name: title.name,
        description: title.description,
        aiSummary: title.aiSummary,
        status: TitleStatus.PUBLISHED,
        popularity: title.popularity,
        genres: { set: genres.map((genre) => ({ id: genre.id })) }
      },
      create: {
        slug: title.slug,
        name: title.name,
        description: title.description,
        aiSummary: title.aiSummary,
        type: title.type,
        status: TitleStatus.PUBLISHED,
        releaseYear: title.releaseYear,
        runtimeMinutes: title.runtimeMinutes,
        maturityRating: title.maturityRating,
        language: title.language,
        cast: title.cast,
        moods: title.moods,
        tags: title.tags,
        popularity: title.popularity,
        genres: { connect: genres.map((genre) => ({ id: genre.id })) },
        assets: {
          create: [
            {
              kind: 'POSTER',
              url: image(`${title.slug}-poster`, 720, 1080),
              altText: `${title.name} poster`
            },
            {
              kind: 'BACKDROP',
              url: image(`${title.slug}-backdrop`, 1600, 900),
              altText: `${title.name} backdrop`
            },
            {
              kind: 'TRAILER',
              url: sampleVideoUrl,
              altText: `${title.name} trailer`
            },
            {
              kind: 'VIDEO',
              url: sampleVideoUrl,
              altText: `${title.name} feature video`
            }
          ]
        },
        embeddings: {
          create: {
            source: 'catalog-seed',
            text: `${title.name} ${title.description} ${title.genres.join(' ')} ${title.moods.join(' ')}`,
            vector: vectorFor(`${title.name} ${title.description} ${title.tags.join(' ')}`)
          }
        }
      }
    });

    if (title.type === TitleType.SERIES) {
      await prisma.episode.upsert({
        where: {
          titleId_seasonNumber_episodeNumber: {
            titleId: created.id,
            seasonNumber: 1,
            episodeNumber: 1
          }
        },
        update: { videoUrl: sampleVideoUrl },
        create: {
          titleId: created.id,
          seasonNumber: 1,
          episodeNumber: 1,
          name: 'Pilot',
          description: `The first chapter of ${title.name}.`,
          runtimeMinutes: title.runtimeMinutes ?? 30,
          videoUrl: sampleVideoUrl
        }
      });
    }
  }

  const allTitles = await prisma.title.findMany({
    where: { status: TitleStatus.PUBLISHED },
    orderBy: { popularity: 'desc' }
  });

  const rowSpecs = [
    { key: 'trending', label: 'Trending Now', strategy: 'POPULARITY' },
    { key: 'new-releases', label: 'New Releases', strategy: 'RECENT' },
    { key: 'weekend', label: 'Weekend Binge', strategy: 'MOOD' }
  ];

  for (const [rowIndex, row] of rowSpecs.entries()) {
    const createdRow = await prisma.featuredRow.upsert({
      where: { key: row.key },
      update: { label: row.label, strategy: row.strategy, position: rowIndex },
      create: { ...row, position: rowIndex }
    });

    await prisma.featuredRowItem.deleteMany({ where: { rowId: createdRow.id } });
    await prisma.featuredRowItem.createMany({
      data: allTitles.slice(0, 6).map((title, index) => ({
        rowId: createdRow.id,
        titleId: title.id,
        position: index
      })),
      skipDuplicates: true
    });
  }

  const activeProfile = demoUser.profiles[0];
  const firstTitle = allTitles[0];
  if (activeProfile && firstTitle) {
    await prisma.watchProgress.upsert({
      where: {
        profileId_titleId: {
          profileId: activeProfile.id,
          titleId: firstTitle.id
        }
      },
      update: {
        positionSeconds: 420,
        durationSeconds: 6000,
        completed: false
      },
      create: {
        profileId: activeProfile.id,
        titleId: firstTitle.id,
        positionSeconds: 420,
        durationSeconds: 6000,
        completed: false
      }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
