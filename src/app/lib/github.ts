import { graphql } from '@octokit/graphql'
import { Discussion } from './discussion'

const gql = (s: TemplateStringsArray): string => s.toString()

const owner = process.env.GITHUB_OWNER
const repo = process.env.GITHUB_REPOSITORY

const categoryIds = {
  posts: process.env.CATEGORY_POSTS,
  offtopic: process.env.CATEGORY_OFFTOPIC,
  drafts: process.env.CATEGORY_DRAFTS,
} as const

type CategoryKeys = keyof typeof categoryIds

export function getCategoryNameFromId(id: string) {
  if (id === categoryIds.offtopic) return 'offtopic' as const
  if (id === categoryIds.posts) return 'posts' as const
  return undefined
}

const api = graphql.defaults({
  headers: {
    authorization: 'token '.concat(process.env.GITHUB_ACCESS_TOKEN!),
  }
})

type ListDiscussionsResult = {
  repository: {
    discussions: {
      pageInfo: {
        endCursor: string
        hasNextPage: boolean
      }
      nodes: Discussion[]
    }
  }
}

type ListDiscussions = {
  category: CategoryKeys
}

export async function listDiscussions({ category }: ListDiscussions, size: number = 100) {
  let hasNextPage = true
  let after: string | null = null
  let discussions: Discussion[] = []

  do {
    const result: ListDiscussionsResult = await api(
      gql`
      query list($owner: String!, $repo: String!, $categoryId: ID! $after: String, $size: Int) {
        repository(owner: $owner, name: $repo) {
          discussions(
            first: $size,
            after: $after,
            categoryId: $categoryId,
            orderBy: { field: CREATED_AT, direction: DESC }
          ) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              title
              createdAt
              updatedAt
              body
              bodyHTML
              number
              category {
                id
              }
            }
          }
        }
      }
    `,
      { owner, repo, categoryId: categoryIds[category], after, size }
    )

    const { pageInfo, nodes } = result.repository.discussions

    discussions.push(...nodes)
    hasNextPage = pageInfo.hasNextPage
    after = pageInfo.endCursor
  } while (hasNextPage)

  const sorted = discussions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return sorted
}

type SearchDiscussionResult = {
  search: {
    edges: {
      node: Discussion
    }[]
  }
}

type GetDiscussion = {
  slug: string
  category: CategoryKeys
}

export async function getDiscussion({ slug, category }: GetDiscussion) {
  const result: SearchDiscussionResult = await api(
    gql`
    query postBySlug($search: String!) {
      search(
        query: $search
        type: DISCUSSION
        first: 100
      ) {
        edges {
          node {
            ... on Discussion {
              title
              createdAt
              updatedAt
              body
              bodyHTML
              number
              category {
                id
              }
            }
          }
        }
      }
    }
  `,
    { search: `"${slug}" in:title repo:${owner}/${repo}` }
  )

  // In case we find discussions with similar titles, find the exact one
  const discussion = result.search.edges.find((result) => {
    return (
      result.node.title === slug &&
      result.node.category.id === categoryIds[category]
    )
  })?.node

  return discussion
}

const github = {
  getCategoryNameFromId,
  getDiscussion,
  listDiscussions,
};
export default github;