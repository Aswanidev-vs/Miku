export const POPULAR_ANIME = /* GraphQL */ `
  query PopularAnime($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage nextPage }
      media(sort: POPULARITY_DESC, type: ANIME) {
        id idMal title { romaji english native }
        coverImage { large medium extraLarge }
        bannerImage meanScore popularity episodes status format description genres
      }
    }
  }
`

export const TRENDING_ANIME = /* GraphQL */ `
  query TrendingAnime($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage nextPage }
      media(sort: TRENDING_DESC, type: ANIME) {
        id idMal title { romaji english native }
        coverImage { large medium extraLarge }
        bannerImage meanScore popularity episodes status format genres
      }
    }
  }
`

export const SEARCH_ANIME = /* GraphQL */ `
  query SearchAnime($search: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage nextPage }
      media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
        id idMal title { romaji english native }
        coverImage { large medium }
        meanScore episodes status format
      }
    }
  }
`

export const MEDIA_DETAIL = /* GraphQL */ `
  query MediaDetail($id: Int) {
    Media(id: $id, type: ANIME) {
      id idMal title { romaji english native }
      coverImage { large extraLarge } bannerImage
      meanScore popularity episodes status format description genres
    }
  }
`

export const USER_LIST = /* GraphQL */ `
  query UserList($userId: Int, $status: MediaListStatus) {
    MediaListCollection(userId: $userId, type: ANIME, status: $status) {
      lists {
        status
        entries {
          id mediaId status score progress progressVolumes
          media { id title { romaji english } coverImage { medium } episodes }
        }
      }
    }
  }
`

export const SAVE_LIST_ENTRY = /* GraphQL */ `
  mutation SaveListEntry($mediaId: Int, $status: MediaListStatus, $score: Float, $progress: Int) {
    SaveMediaListEntry(mediaId: $mediaId, status: $status, scoreRaw: $score, progress: $progress) {
      id mediaId status score progress
    }
  }
`

export const ACTIVITY_FEED = /* GraphQL */ `
  query ActivityFeed($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage nextPage }
      activities(sort: ID_DESC, type: TEXT) {
        id type createdAt text
        user { id name avatar { large } }
      }
    }
  }
`

export const VIEWER = /* GraphQL */ `
  query Viewer {
    Viewer { id name avatar { large } }
  }
`
