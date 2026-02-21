import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { MediaCard } from '#/components/MediaCard'
import { entryStatusEnum, mediaTypeEnum } from '#/db/schema'
import { getLibrary, type LibraryEntry } from '#/server/library'

const searchSchema = z.object({
  type: z.enum(mediaTypeEnum.enumValues).optional(),
  status: z.enum(entryStatusEnum.enumValues).optional(),
})

const TYPE_FILTERS = [
  { value: undefined, labelKey: 'library.allTypes' },
  { value: 'book', labelKey: 'mediaType.book' },
  { value: 'movie', labelKey: 'mediaType.movie' },
  { value: 'tv_show', labelKey: 'mediaType.tv_show' },
  { value: 'video_game', labelKey: 'mediaType.video_game' },
] as const

const STATUS_FILTERS = [
  { value: undefined, labelKey: 'library.allStatuses' },
  { value: 'want_to', labelKey: 'status.want_to' },
  { value: 'in_progress', labelKey: 'status.in_progress' },
  { value: 'completed', labelKey: 'status.completed' },
  { value: 'dropped', labelKey: 'status.dropped' },
  { value: 'on_hold', labelKey: 'status.on_hold' },
] as const

export const Route = createFileRoute('/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getLibrary({ data: deps }),
  component: LibraryPage,
})

function LibraryPage() {
  const entries: LibraryEntry[] = Route.useLoaderData()
  const { type, status } = Route.useSearch()
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="px-6 py-4 border-b border-gray-800">
        <h1 className="text-2xl font-bold">{t('library.title')}</h1>
      </header>

      <div className="px-6 py-4 border-b border-gray-800 flex flex-col gap-3">
        <div className="flex gap-2 flex-wrap">
          {TYPE_FILTERS.map((filter) => (
            <Link
              key={filter.labelKey}
              to="/"
              search={(prev) => ({ ...prev, type: filter.value })}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                type === filter.value
                  ? 'bg-white text-gray-950'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {t(filter.labelKey)}
            </Link>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((filter) => (
            <Link
              key={filter.labelKey}
              to="/"
              search={(prev) => ({ ...prev, status: filter.value })}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                status === filter.value
                  ? 'bg-white text-gray-950'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {t(filter.labelKey)}
            </Link>
          ))}
        </div>
      </div>

      <main className="px-6 py-6">
        {entries.length === 0 ? (
          <p className="text-gray-500 text-center py-12">{t('library.empty')}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {entries.map((entry) => (
              <MediaCard key={entry.entryId} entry={entry} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
