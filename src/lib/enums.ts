export const MediaItemStatus = {
	BACKLOG: "backlog",
	IN_PROGRESS: "in_progress",
	COMPLETED: "completed",
	DROPPED: "dropped",
	ON_HOLD: "on_hold",
} as const;

export type MediaItemStatus = (typeof MediaItemStatus)[keyof typeof MediaItemStatus];

export const MediaItemType = {
	BOOK: "book",
	MOVIE: "movie",
	TV_SHOW: "tv_show",
	VIDEO_GAME: "video_game",
} as const;

export type MediaItemType = (typeof MediaItemType)[keyof typeof MediaItemType];
