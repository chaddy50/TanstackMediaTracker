import { config } from 'dotenv'
config({ path: ['.env.local', '.env'] })

// Dynamic imports so dotenv runs before the db connection is initialized
const { db } = await import('./index.ts')
const { mediaItems, mediaInstances, userEntries } = await import('./schema.ts')

async function seed() {
  console.log('Clearing existing data...')
  await db.delete(mediaInstances)
  await db.delete(userEntries)
  await db.delete(mediaItems)

  console.log('Seeding database...')

  // --- Media Items ---

  const [nameOfTheWind, dune, projectHailMary] = await db
    .insert(mediaItems)
    .values([
      {
        type: 'book',
        title: 'The Name of the Wind',
        description: 'A young man grows up to be the most notorious wizard his world has ever seen.',
        coverImageUrl: 'https://covers.openlibrary.org/b/id/8384083-L.jpg',
        releaseDate: '2007-03-27',
        externalId: 'OL8765735W',
        externalSource: 'openlibrary',
        metadata: { author: 'Patrick Rothfuss', pageCount: 662, genres: ['Fantasy'] },
      },
      {
        type: 'book',
        title: 'Dune',
        description: 'A desert planet, a prophecy, and the fate of an empire.',
        coverImageUrl: 'https://covers.openlibrary.org/b/id/8225284-L.jpg',
        releaseDate: '1965-08-01',
        externalId: 'OL102749W',
        externalSource: 'openlibrary',
        metadata: { author: 'Frank Herbert', pageCount: 412, genres: ['Science Fiction'] },
      },
      {
        type: 'book',
        title: 'Project Hail Mary',
        description: 'A lone astronaut must save the earth from disaster.',
        coverImageUrl: 'https://covers.openlibrary.org/b/id/10527843-L.jpg',
        releaseDate: '2021-05-04',
        externalId: 'OL24368533W',
        externalSource: 'openlibrary',
        metadata: { author: 'Andy Weir', pageCount: 476, genres: ['Science Fiction'] },
      },
    ])
    .returning()

  const [shawshank, oppenheimer, inception] = await db
    .insert(mediaItems)
    .values([
      {
        type: 'movie',
        title: 'The Shawshank Redemption',
        description: 'Two imprisoned men bond over years, finding solace and eventual redemption.',
        coverImageUrl: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
        releaseDate: '1994-09-23',
        externalId: '278',
        externalSource: 'tmdb',
        metadata: { director: 'Frank Darabont', runtime: 142, genres: ['Drama'] },
      },
      {
        type: 'movie',
        title: 'Oppenheimer',
        description: 'The story of American scientist J. Robert Oppenheimer and the Manhattan Project.',
        coverImageUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
        releaseDate: '2023-07-21',
        externalId: '872585',
        externalSource: 'tmdb',
        metadata: { director: 'Christopher Nolan', runtime: 180, genres: ['Drama', 'History'] },
      },
      {
        type: 'movie',
        title: 'Inception',
        description: 'A thief who steals corporate secrets through dream-sharing technology.',
        coverImageUrl: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
        releaseDate: '2010-07-16',
        externalId: '27205',
        externalSource: 'tmdb',
        metadata: { director: 'Christopher Nolan', runtime: 148, genres: ['Action', 'Science Fiction'] },
      },
    ])
    .returning()

  const [breakingBad, lastOfUs, severance] = await db
    .insert(mediaItems)
    .values([
      {
        type: 'tv_show',
        title: 'Breaking Bad',
        description: 'A high school chemistry teacher turns to manufacturing methamphetamine.',
        coverImageUrl: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
        releaseDate: '2008-01-20',
        externalId: '1396',
        externalSource: 'tmdb',
        metadata: { creator: 'Vince Gilligan', seasons: 5, genres: ['Drama', 'Crime'] },
      },
      {
        type: 'tv_show',
        title: 'The Last of Us',
        description: 'A smuggler and a teenage girl traverse a post-apocalyptic United States.',
        coverImageUrl: 'https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg',
        releaseDate: '2023-01-15',
        externalId: '100088',
        externalSource: 'tmdb',
        metadata: { creator: 'Craig Mazin', seasons: 2, genres: ['Drama', 'Action'] },
      },
      {
        type: 'tv_show',
        title: 'Severance',
        description: 'A company offers a radical work-life balance by surgically dividing employees\' memories.',
        coverImageUrl: 'https://image.tmdb.org/t/p/w500/lOSdUkGQmbAl5JQ3QoHqBZUbZhC.jpg',
        releaseDate: '2022-02-18',
        externalId: '95396',
        externalSource: 'tmdb',
        metadata: { creator: 'Dan Erickson', seasons: 2, genres: ['Drama', 'Mystery'] },
      },
    ])
    .returning()

  const [hollowKnight, eldenRing, bg3] = await db
    .insert(mediaItems)
    .values([
      {
        type: 'video_game',
        title: 'Hollow Knight',
        description: 'A challenging action-adventure game set in a vast underground kingdom of insects.',
        coverImageUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1rgi.jpg',
        releaseDate: '2017-02-24',
        externalId: '27770',
        externalSource: 'igdb',
        metadata: { developer: 'Team Cherry', platforms: ['PC', 'Switch', 'PS4', 'Xbox One'], genres: ['Action', 'Platformer'] },
      },
      {
        type: 'video_game',
        title: 'Elden Ring',
        description: 'An action RPG set in a vast world with deep lore and punishing combat.',
        coverImageUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg',
        releaseDate: '2022-02-25',
        externalId: '119133',
        externalSource: 'igdb',
        metadata: { developer: 'FromSoftware', platforms: ['PC', 'PS5', 'Xbox Series X'], genres: ['Action RPG'] },
      },
      {
        type: 'video_game',
        title: "Baldur's Gate 3",
        description: 'An epic RPG set in the Forgotten Realms with deep choices and consequences.',
        coverImageUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co6li5.jpg',
        releaseDate: '2023-08-03',
        externalId: '119171',
        externalSource: 'igdb',
        metadata: { developer: 'Larian Studios', platforms: ['PC', 'PS5', 'Xbox Series X'], genres: ['RPG'] },
      },
    ])
    .returning()

  // --- User Entries ---

  const [
    entryNameOfTheWind,
    entryDune,
    _entryProjectHailMary,
    entryShawshank,
    entryOppenheimer,
    _entryInception,
    entryBreakingBad,
    entryLastOfUs,
    _entrySeverance,
    entryHollowKnight,
    entryEldenRing,
    entryBg3,
  ] = await db
    .insert(userEntries)
    .values([
      { mediaItemId: nameOfTheWind.id, status: 'completed' },
      { mediaItemId: dune.id, status: 'in_progress' },      // re-read in progress
      { mediaItemId: projectHailMary.id, status: 'backlog' },
      { mediaItemId: shawshank.id, status: 'completed' },
      { mediaItemId: oppenheimer.id, status: 'completed' },
      { mediaItemId: inception.id, status: 'backlog' },
      { mediaItemId: breakingBad.id, status: 'completed' },
      { mediaItemId: lastOfUs.id, status: 'in_progress' },
      { mediaItemId: severance.id, status: 'backlog' },
      { mediaItemId: hollowKnight.id, status: 'completed' },
      { mediaItemId: eldenRing.id, status: 'in_progress' },
      { mediaItemId: bg3.id, status: 'on_hold' },
    ])
    .returning()

  // --- Media Instances ---

  await db.insert(mediaInstances).values([
    // The Name of the Wind — one completed read
    {
      userEntryId: entryNameOfTheWind.id,
      rating: '9.0',
      reviewText: 'One of the best fantasy novels I\'ve ever read. Kvothe\'s voice is incredible.',
      startedAt: '2023-01-10',
      completedAt: '2023-02-01',
    },
    // Dune — first read completed, re-read currently in progress
    {
      userEntryId: entryDune.id,
      rating: '9.5',
      reviewText: 'A masterpiece. The world-building is unmatched.',
      startedAt: '2022-06-01',
      completedAt: '2022-07-15',
    },
    {
      userEntryId: entryDune.id,
      rating: null,
      reviewText: null,
      startedAt: '2024-11-01',
      completedAt: null, // still in progress
    },
    // Shawshank — one completed watch
    {
      userEntryId: entryShawshank.id,
      rating: '10.0',
      reviewText: 'A perfect film. Gets better every time.',
      startedAt: '2022-03-15',
      completedAt: '2022-03-15',
    },
    // Oppenheimer — one completed watch
    {
      userEntryId: entryOppenheimer.id,
      rating: '8.5',
      reviewText: 'Stunning cinematography and a gripping story. Cillian Murphy is phenomenal.',
      startedAt: '2023-07-22',
      completedAt: '2023-07-22',
    },
    // Breaking Bad — one completed watch
    {
      userEntryId: entryBreakingBad.id,
      rating: '9.5',
      reviewText: 'The greatest TV show ever made. Walter White\'s arc is unrivaled.',
      startedAt: '2021-09-01',
      completedAt: '2021-11-30',
    },
    // The Last of Us — currently watching, no rating yet
    {
      userEntryId: entryLastOfUs.id,
      rating: null,
      reviewText: null,
      startedAt: '2024-12-01',
      completedAt: null,
    },
    // Hollow Knight — one completed playthrough
    {
      userEntryId: entryHollowKnight.id,
      rating: '9.0',
      reviewText: 'Brutally difficult but incredibly rewarding. The atmosphere is unmatched.',
      startedAt: '2023-05-01',
      completedAt: '2023-06-20',
    },
    // Elden Ring — currently playing
    {
      userEntryId: entryEldenRing.id,
      rating: null,
      reviewText: null,
      startedAt: '2024-10-15',
      completedAt: null,
    },
    // BG3 — on hold
    {
      userEntryId: entryBg3.id,
      rating: null,
      reviewText: 'Put this on hold — it deserves a long uninterrupted run.',
      startedAt: '2024-01-05',
      completedAt: null,
    },
  ])

  console.log('Done! Seeded 12 media items across all types.')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
