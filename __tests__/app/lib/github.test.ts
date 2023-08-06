import { getDiscussion } from '@/app/lib/github'

describe('Github', () => {
  it('can get discussion using graphql', async () => {
    const discussion = await getDiscussion({slug: "Welcome to azurine-sapce.github.io Discussions!", category: "posts"});
    expect(discussion).not.toBeUndefined();
  });
})