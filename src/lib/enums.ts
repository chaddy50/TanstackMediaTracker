export const MediaItemStatus = {
	BACKLOG: "backlog",
	NEXT_UP: "next_up",
	IN_PROGRESS: "in_progress",
	ON_HOLD: "on_hold",
	WAITING_FOR_NEXT_RELEASE: "waiting_for_next_release",
	COMPLETED: "completed",
	DROPPED: "dropped",
} as const;

export type MediaItemStatus = (typeof MediaItemStatus)[keyof typeof MediaItemStatus];

// Statuses that should only appear on series, not on individual media items
export const SERIES_ONLY_STATUSES = new Set<string>([
	MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
]);

export const MediaItemType = {
	BOOK: "book",
	MOVIE: "movie",
	TV_SHOW: "tv_show",
	VIDEO_GAME: "video_game",
} as const;

export type MediaItemType = (typeof MediaItemType)[keyof typeof MediaItemType];
