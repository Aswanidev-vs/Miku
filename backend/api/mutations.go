package api

// List entry mutations

const MutationSaveMediaListEntry = `
mutation ($mediaId: Int, $status: MediaListStatus, $score: Float, $progress: Int, $repeat: Int) {
  SaveMediaListEntry(
    mediaId: $mediaId
    status: $status
    score: $score
    progress: $progress
    repeat: $repeat
  ) {
    id
    mediaId
    status
    score
    progress
    repeat
    media {
      id
      title {
        romaji
      }
    }
  }
}`

const MutationDeleteMediaListEntry = `
mutation ($id: Int) {
  DeleteMediaListEntry(id: $id) {
    deleted
  }
}`

// Activity mutations

const MutationCreateTextActivity = `
mutation ($text: String) {
  CreateTextActivity(text: $text) {
    id
    type
    text
    createdAt
    user {
      id
      name
    }
  }
}`

const MutationUpdateTextActivity = `
mutation ($id: Int, $text: String) {
  UpdateTextActivity(id: $id, text: $text) {
    id
    type
    text
    updatedAt
  }
}`

const MutationDeleteActivity = `
mutation ($id: Int) {
  DeleteActivity(id: $id) {
    deleted
  }
}`

// Follow mutations

const MutationToggleFollow = `
mutation ($userId: Int) {
  ToggleFollow(userId: $userId) {
    id
    name
    isFollowing
  }
}`

// Favourite mutations

const MutationToggleFavourite = `
mutation ($animeId: Int, $mangaId: Int) {
  ToggleFavourite(animeId: $animeId, mangaId: $mangaId) {
    anime {
      nodes {
        id
        title {
          romaji
        }
      }
    }
    manga {
      nodes {
        id
        title {
          romaji
        }
      }
    }
  }
}`

// Rating mutations

const MutationRateReview = `
mutation ($reviewId: Int, $rating: ReviewRating) {
  RateReview(reviewId: $reviewId, rating: $rating) {
    id
    rating
    userRatings {
      score
    }
  }
}`
