export const MediaItemStatus = {
	BACKLOG: "backlog",
	NEXT_UP: "next_up",
	IN_PROGRESS: "in_progress",
	ON_HOLD: "on_hold",
	WAITING_FOR_NEXT_RELEASE: "waiting_for_next_release",
	COMPLETED: "done",
	DROPPED: "dropped",
} as const;

export type MediaItemStatus =
	(typeof MediaItemStatus)[keyof typeof MediaItemStatus];

export const NextItemStatus = {
	WAITING_FOR_RELEASE: "waiting_for_release",
	PURCHASED: "purchased",
	AVAILABLE: "available",
} as const;

export type NextItemStatus =
	(typeof NextItemStatus)[keyof typeof NextItemStatus];

export const PurchaseStatus = {
	NOT_PURCHASED: "not_purchased",
	WANT_TO_BUY: "want_to_buy",
	PURCHASED: "purchased",
} as const;

export type PurchaseStatus = (typeof PurchaseStatus)[keyof typeof PurchaseStatus];

export const MediaItemType = {
	BOOK: "book",
	MOVIE: "movie",
	TV_SHOW: "tv_show",
	VIDEO_GAME: "video_game",
	PODCAST: "podcast",
} as const;

export type MediaItemType = (typeof MediaItemType)[keyof typeof MediaItemType];

export const BookConsumptionMethod = {
	HARDCOVER: "hardcover",
	PAPERBACK: "paperback",
	EBOOK: "ebook",
	AUDIOBOOK: "audiobook",
} as const;

export type BookConsumptionMethod =
	(typeof BookConsumptionMethod)[keyof typeof BookConsumptionMethod];

export const MovieConsumptionMethod = {
	THEATER: "theater",
	STREAMING: "streaming",
	LOCAL_COPY: "local_copy",
} as const;

export type MovieConsumptionMethod =
	(typeof MovieConsumptionMethod)[keyof typeof MovieConsumptionMethod];

export const TvShowConsumptionMethod = {
	STREAMING: "streaming",
	LOCAL_COPY: "local_copy",
} as const;

export type TvShowConsumptionMethod =
	(typeof TvShowConsumptionMethod)[keyof typeof TvShowConsumptionMethod];

export const GamePlatform = {
	PC: "pc",
	PS5: "ps5",
	PS4: "ps4",
	XBOX_SERIES_X: "xbox_series_x",
	XBOX_ONE: "xbox_one",
	NINTENDO_SWITCH_2: "nintendo_switch_2",
	NINTENDO_SWITCH: "nintendo_switch",
} as const;

export type GamePlatform = (typeof GamePlatform)[keyof typeof GamePlatform];

export const GameControlMethod = {
	MOUSE_AND_KEYBOARD: "mouse_and_keyboard",
	CONTROLLER: "controller",
	WHEEL_AND_PEDALS: "wheel_and_pedals",
	VIRTUAL_REALITY: "virtual_reality",
} as const;

export type GameControlMethod =
	(typeof GameControlMethod)[keyof typeof GameControlMethod];
