/* ============================================
   Miku AniList Client — TypeScript Types
   ============================================ */

/** AniList media type */
export type MediaType = 'ANIME' | 'MANGA'

/** Format for anime/manga entries */
export type MediaFormat =
  | 'TV'
  | 'OVA'
  | 'ONA'
  | 'MOVIE'
  | 'SPECIAL'
  | 'MUSIC'
  | 'MANGA'
  | 'NOVEL'
  | 'ONE_SHOT'
  | 'MANHWA'
  | 'MANHUA'

/** Current release status */
export type MediaStatus =
  | 'FINISHED'
  | 'RELEASING'
  | 'NOT_YET_RELEASED'
  | 'CANCELLED'
  | 'HIATUS'

/** User's list status */
export type ListStatus =
  | 'CURRENT'
  | 'PLANNING'
  | 'COMPLETED'
  | 'DROPPED'
  | 'PAUSED'
  | 'REPEATING'

/** Sort direction */
export type SortDirection = 'ASCENDING' | 'DESCENDING'

/** Activity type */
export type ActivityType = 'TEXT' | 'ANIME_LIST' | 'MANGA_LIST' | 'MESSAGE' | 'FOLLOW'

/** Score format the user prefers */
export type ScoreFormat = 'POINT_100' | 'POINT_10' | 'POINT_10_DECIMAL' | 'POINT_5' | 'POINT_3' | 'SMILEY'

/* ---- Core Entities ---- */

export interface User {
  id: number
  name: string
  about?: string
  avatar: {
    medium: string
    large: string
  }
  bannerImage?: string
  statistics: UserStatistics
  options: UserOptions
  favourites?: {
    anime?: { nodes: { id: number; title: { romaji: string }; coverImage: { medium: string } }[] }
    manga?: { nodes: { id: number; title: { romaji: string }; coverImage: { medium: string } }[] }
  }
}

export interface UserOptions {
  titleLanguage?: string
  adultContent?: boolean
  scoreFormat?: ScoreFormat
  rowOrder?: string
  displayCharacters?: boolean
}

export interface UserStatistics {
  anime: {
    count: number
    meanScore: number
    minutesWatched: number
    episodesWatched: number
  }
  manga: {
    count: number
    meanScore: number
    chaptersRead: number
    volumesRead: number
  }
}

export interface Media {
  id: number
  type: MediaType
  title: MediaTitle
  coverImage: MediaCoverImage
  bannerImage?: string
  format?: MediaFormat
  status?: MediaStatus
  episodes?: number
  chapters?: number
  volumes?: number
  meanScore?: number
  averageScore?: number
  popularity?: number
  trending?: number
  favourites?: number
  description?: string
  startDate?: FuzzyDate
  endDate?: FuzzyDate
  nextAiringEpisode?: AiringEpisode
  genres: string[]
  tags: MediaTag[]
  relations?: MediaConnection
  recommendations?: MediaRecommendationConnection
  characters?: CharacterConnection
  staff?: StaffConnection
  streamingEpisodes?: StreamingEpisode[]
}

export interface MediaTitle {
  romaji?: string
  english?: string
  native?: string
  userPreferred?: string
}

export interface MediaCoverImage {
  color?: string
  medium: string
  large: string
}

export interface MediaTag {
  id: number
  name: string
  description?: string
  category?: string
  rank?: number
  isGeneralSpoiler?: boolean
  isMediaSpoiler?: boolean
  isAdult?: boolean
}

export interface FuzzyDate {
  year?: number
  month?: number
  day?: number
}

export interface AiringEpisode {
  id: number
  episode: number
  airingAt: number
  timeUntilAiring: number
}

export interface StreamingEpisode {
  title?: string
  thumbnail?: string
  site?: string
  url?: string
}

/* ---- List Entries ---- */

export interface MediaListEntry {
  id: number
  mediaId: number
  media?: Media
  status: ListStatus
  score?: number
  progress: number
  progressVolumes?: number
  repeat?: number
  priority?: number
  private?: boolean
  notes?: string
  startedAt?: FuzzyDate
  completedAt?: FuzzyDate
  updatedAt: number
  customLists?: Record<string, boolean>
}

export interface MediaListCollection {
  lists: MediaListGroup[]
}

export interface MediaListGroup {
  name: string
  isCustomList?: boolean
  isSplitCompletedList?: boolean
  status: ListStatus
  entries: MediaListEntry[]
}

/* ---- Connections ---- */

export interface MediaConnection {
  edges: MediaEdge[]
  nodes: Media[]
  pageInfo: PageInfo
}

export interface MediaEdge {
  id: number
  node: Media
  relationType?: string
  isMainStudio?: boolean
  isFavourite?: boolean
  characterRole?: string
  characterName?: string
  staffRole?: string
}

export interface MediaRecommendationConnection {
  edges: MediaRecommendationEdge[]
  nodes: MediaRecommendation[]
}

export interface MediaRecommendationEdge {
  node: MediaRecommendation
}

export interface MediaRecommendation {
  id: number
  userRating?: string
  media?: Media
  user?: User
}

export interface CharacterConnection {
  edges: CharacterEdge[]
  nodes: Character[]
  pageInfo: PageInfo
}

export interface CharacterEdge {
  id: number
  node: Character
  role?: string
  name?: string
  voiceActors?: Staff[]
}

export interface Character {
  id: number
  name: CharacterName
  image?: { medium: string; large: string }
  description?: string
  gender?: string
  dateOfBirth?: FuzzyDate
  dateOfDeath?: FuzzyDate
  age?: string
}

export interface CharacterName {
  full?: string
  native?: string
  alternative?: string[]
}

export interface StaffConnection {
  edges: StaffEdge[]
  nodes: Staff[]
  pageInfo: PageInfo
}

export interface StaffEdge {
  id: number
  node: Staff
  role?: string
}

export interface Staff {
  id: number
  name: StaffName
  image?: { medium: string; large: string }
  primaryOccupations?: string[]
  gender?: string
  dateOfBirth?: FuzzyDate
  dateOfDeath?: FuzzyDate
  age?: number
  yearsActive?: number[]
  homeTown?: string
  description?: string
}

export interface StaffName {
  full?: string
  native?: string
}

/* ---- Activity ---- */

export interface Activity {
  id: number
  type: ActivityType
  createdAt: number
  user?: User
  user2?: User
}

export interface TextActivity extends Activity {
  type: 'TEXT'
  message?: string
  replyCount: number
  siteUrl?: string
  likeCount: number
  isLocked?: boolean
  isSubscribed?: boolean
  isPinned?: boolean
}

export interface ListActivity extends Activity {
  type: 'ANIME_LIST' | 'MANGA_LIST'
  status?: string
  progress?: string
  media?: Media
  replyCount: number
  siteUrl?: string
  likeCount: number
  isSubscribed?: boolean
}

export interface MessageActivity extends Activity {
  type: 'MESSAGE'
  message?: string
  recipient?: User
  sender?: User
  replyCount: number
  siteUrl?: string
  likeCount: number
  isRead?: boolean
  isLocked?: boolean
}

export interface FollowActivity extends Activity {
  type: 'FOLLOW'
  user: User
}

/* ---- Pagination ---- */

export interface PageInfo {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  hasNextPage: boolean
}

/* ---- Season/Schedule ---- */

export interface Season {
  season: string
  year: number
}

export interface AiringSchedule {
  nodes: AiringScheduleNode[]
  pageInfo: PageInfo
}

export interface AiringScheduleNode {
  id: number
  airingAt: number
  timeUntilAiring: number
  episode: number
  media?: Media
}

/* ---- Genre ---- */

export interface Genre {
  id: number
  name: string
  description?: string
}

/* ---- Studio ---- */

export interface Studio {
  id: number
  name: string
  isAnimationStudio?: boolean
  siteUrl?: string
  favourites?: number
}

/* ---- Forum ---- */

export interface Thread {
  id: number
  title: string
  body?: string
  user?: User
  replyCount: number
  viewCount: number
  likeCount: number
  isLocked?: boolean
  isPinned?: boolean
  createdAt: number
  updatedAt: number
}

/* ---- Notification ---- */

export interface Notification {
  id: number
  type: string
  createdAt: number
  media?: Media
  user?: User
  message?: string
}

/* ---- API Response Wrappers ---- */

export interface GraphQLResponse<T> {
  data: T
  errors?: GraphQLError[]
}

export interface GraphQLError {
  message: string
  locations?: { line: number; column: number }[]
  path?: (string | number)[]
}

/* ---- App State Types ---- */

export interface AppState {
  isAuthenticated: boolean
  currentUser: User | null
  loading: boolean
  error: string | null
}
