import { cache } from "react"
import github from "./github"
import { Discussion } from "./discussion"

export const getPost = cache(async (slug: string) => {
  const discussion = await github.getDiscussion({ slug, category: 'posts' })
  return discussion && toPost(discussion)
})