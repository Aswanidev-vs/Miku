package api

// Trending queries

const QueryTrendingAnime = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: TRENDING_DESC, type: ANIME) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        large
        medium
      }
      bannerImage
      format
      status
      episodes
      averageScore
      popularity
      trending
      genres
      description(asHtml: false)
      nextAiringEpisode {
        episode
        airingAt
      }
    }
  }
}`

const QueryTrendingManga = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: TRENDING_DESC, type: MANGA) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        large
        medium
      }
      bannerImage
      format
      status
      chapters
      volumes
      averageScore
      popularity
      trending
      genres
      description(asHtml: false)
    }
  }
}`

// Search queries

const QuerySearchAnime = `
query ($search: String, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        large
        medium
      }
      format
      status
      episodes
      averageScore
      genres
    }
  }
}`

const QuerySearchManga = `
query ($search: String, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(search: $search, type: MANGA, sort: SEARCH_MATCH) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        large
        medium
      }
      format
      status
      chapters
      volumes
      averageScore
      genres
    }
  }
}`

// User list queries

const QueryUserAnimeList = `
query ($userId: Int, $status: MediaListStatus) {
  MediaListCollection(userId: $userId, type: ANIME, status: $status) {
    lists {
      name
      status
      entries {
        id
        mediaId
        status
        score
        progress
        repeat
        startedAt {
          year
          month
          day
        }
        completedAt {
          year
          month
          day
        }
        media {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
            medium
          }
          format
          episodes
          status
        }
      }
    }
  }
}`

const QueryUserMangaList = `
query ($userId: Int, $status: MediaListStatus) {
  MediaListCollection(userId: $userId, type: MANGA, status: $status) {
    lists {
      name
      status
      entries {
        id
        mediaId
        status
        score
        progress
        repeat
        startedAt {
          year
          month
          day
        }
        completedAt {
          year
          month
          day
        }
        media {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
            medium
          }
          format
          chapters
          volumes
          status
        }
      }
    }
  }
}`

// Activity feed query

const QueryActivityFeed = `
query ($userId: Int, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    activities(userId: $userId, sort: ID_DESC) {
      ... on ListActivity {
        id
        type
        status
        progress
        createdAt
        user {
          id
          name
          avatar {
            medium
          }
        }
        media {
          id
          title {
            romaji
          }
          coverImage {
            medium
          }
        }
      }
      ... on TextActivity {
        id
        type
        text
        createdAt
        user {
          id
          name
          avatar {
            medium
          }
        }
      }
      ... on MediaListActivity {
        id
        type
        status
        progress
        createdAt
        user {
          id
          name
          avatar {
            medium
          }
        }
        media {
          id
          title {
            romaji
          }
          coverImage {
            medium
          }
        }
      }
    }
  }
}`

// Media detail query

const QueryMediaDetails = `
query ($id: Int) {
  Media(id: $id) {
    id
    title {
      romaji
      english
      native
    }
    coverImage {
      large
      medium
    }
    bannerImage
    format
    status
    episodes
    chapters
    volumes
    duration
    averageScore
    meanScore
    popularity
    trending
    genres
    tags {
      name
      rank
    }
    description(asHtml: false)
    season
    seasonYear
    nextAiringEpisode {
      episode
      airingAt
    }
    relations {
      edges {
        relationType
        node {
          id
          title {
            romaji
          }
          coverImage {
            medium
          }
          format
        }
      }
    }
    recommendations {
      edges {
        node {
          id
          rating
          media {
            id
            title {
              romaji
            }
            coverImage {
              medium
            }
          }
        }
      }
    }
  }
}`

// User profile query

const QueryUserProfile = `
query ($name: String) {
  User(name: $name) {
    id
    name
    about(asHtml: false)
    avatar {
      large
      medium
    }
    bannerImage
    statistics {
      anime {
        count
        meanScore
        minutesWatched
        episodesWatched
      }
      manga {
        count
        meanScore
        chaptersRead
        volumesRead
      }
    }
    favourites {
      anime {
        nodes {
          id
          title {
            romaji
          }
          coverImage {
            medium
          }
        }
      }
      manga {
        nodes {
          id
          title {
            romaji
          }
          coverImage {
            medium
          }
        }
      }
    }
  }
}`
