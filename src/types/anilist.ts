export interface AniListTitle {
  romaji: string | null
  english: string | null
  native: string | null
}

export interface CoverImage {
  large: string | null
  medium: string | null
  extraLarge: string | null
}

export type MediaStatus = 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS'
export type MediaFormat = 'TV' | 'TV_SHORT' | 'MOVIE' | 'SPECIAL' | 'OVA' | 'ONA' | 'MUSIC' | 'MANGA' | 'NOVEL' | 'ONE_SHOT'

export interface Media {
  id: number
  idMal: number | null
  title: AniListTitle
  coverImage: CoverImage
  bannerImage: string | null
  meanScore: number | null
  popularity: number | null
  episodes: number | null
  status: MediaStatus | null
  format: MediaFormat | null
  description: string | null
  genres: string[]
}

export type MediaListStatus = 'CURRENT' | 'PLANNING' | 'COMPLETED' | 'DROPPED' | 'PAUSED' | 'REPEATING'

export interface MediaListEntry {
  id: number
  mediaId: number
  status: MediaListStatus
  score: number | null
  progress: number
  progressVolumes: number | null
}

export interface User {
  id: number
  name: string
  avatar: { large: string | null } | null
}

export interface Activity {
  id: number
  type: string
  user: User
  text: string | null
  createdAt: number
}

export interface Page<T> {
  pageInfo: { hasNextPage: boolean; nextPage: number | null }
  media?: T[]
  activities?: Activity[]
}
