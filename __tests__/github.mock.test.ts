import { getDiscussion } from '@/app/lib/github'
import { graphql } from '@octokit/graphql'
import { Festive } from 'next/font/google';

jest.mock('@octokit/graphql', () => {
  const mock = jest.fn();
  return ({
    graphql: {
      defaults: () => mock,
      mock
    }
  })
})

const mockedGraphql = jest.mocked(graphql)

describe('Github', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should call the GraphQL API with the correct parameters', async () => {
    const slug = 'example-slug';

    (graphql as typeof graphql & {mock: jest.Mock}).mock.mockResolvedValueOnce({
      search: { 
        edges: [],
      },
    })

    await getDiscussion({slug, category: "posts"})

    expect((graphql as typeof graphql & {mock: jest.Mock}).mock).toHaveBeenCalledWith(expect.any(String), {
      search: `"${slug}" in:title repo:${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPOSITORY}`,
    })
  })

  it('should return the discussion if found', async () => {
    const slug = 'example-slug'
    const discussion = {
      node: {
        title: 'example-slug',
        createdAt: '2021-01-01',
        body: 'This is an example discussion.',
        number: 1,
        category: {
          id: process.env.CATEGORY_POSTS,
        },
      },
    };

    (graphql as typeof graphql & {mock: jest.Mock}).mock.mockResolvedValueOnce({
      search: {
        edges: [discussion],
      },
    })

    const result = await getDiscussion({slug, category: "posts"})

    expect(result).toEqual(discussion.node)
  })

  it('should return undefined if no discussion is found', async () => {
    const slug = 'non-existent-slug';

    (graphql as typeof graphql & {mock: jest.Mock}).mock.mockResolvedValueOnce({
      search: {
        edges: [],
      },
    });

    const result = await getDiscussion({slug, category: "posts"})

    expect(result).toBeUndefined()
  })
})