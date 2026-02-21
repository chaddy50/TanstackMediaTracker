import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '#/db/index'
import { entryStatusEnum, mediaInstances, mediaItems, mediaTypeEnum, userEntries } from '#/db/schema'

const libraryFiltersSchema = z.object({
  type: z.enum(mediaTypeEnum.enumValues).optional(),
  status: z.enum(entryStatusEnum.enumValues).optional(),
})

export const getLibrary = createServerFn({ method: 'GET' })
  .inputValidator(libraryFiltersSchema)
  .handler(async ({ data: { type, status } }) => {
    const entries = await db
      .select({
        entryId: userEntries.id,
        status: userEntries.status,
        mediaItemId: mediaItems.id,
        title: mediaItems.title,
        type: mediaItems.type,
        coverImageUrl: mediaItems.coverImageUrl,
      })
      .from(userEntries)
      .innerJoin(mediaItems, eq(userEntries.mediaItemId, mediaItems.id))
      .where(
        and(
          type ? eq(mediaItems.type, type) : undefined,
          status ? eq(userEntries.status, status) : undefined,
        ),
      )
      .orderBy(desc(userEntries.updatedAt))

    if (entries.length === 0) return []

    // Get the most recent completed instance per entry for the display rating
    const entryIds = entries.map((e) => e.entryId)
    const latestRatings = await db
      .selectDistinctOn([mediaInstances.userEntryId], {
        userEntryId: mediaInstances.userEntryId,
        rating: mediaInstances.rating,
      })
      .from(mediaInstances)
      .where(
        and(
          inArray(mediaInstances.userEntryId, entryIds),
          isNotNull(mediaInstances.completedAt),
        ),
      )
      .orderBy(mediaInstances.userEntryId, desc(mediaInstances.id))

    const ratingMap = new Map(latestRatings.map((r) => [r.userEntryId, r.rating]))

    return entries.map((entry) => ({
      ...entry,
      rating: ratingMap.get(entry.entryId) ?? null,
    }))
  })

export type LibraryEntry = Awaited<ReturnType<typeof getLibrary>>[number]
