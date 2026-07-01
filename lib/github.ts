import { Octokit } from "@octokit/rest";
import { graphql } from "@octokit/graphql";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/crypto";
import { subDays } from "date-fns";

function makeOctokit(token: string) {
  return new Octokit({ auth: token });
}

export async function getOctokitForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accessToken: true },
  });
  if (!user?.accessToken) throw new Error("No GitHub token for user");
  const token = await decryptToken(user.accessToken);
  return { octokit: makeOctokit(token), token };
}

export async function syncUserRepos(userId: string) {
  const { octokit } = await getOctokitForUser(userId);

  const repos = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
    per_page: 100,
    sort: "pushed",
    visibility: "public",
  });

  for (const repo of repos) {
    await prisma.repository.upsert({
      where: { userId_fullName: { userId, fullName: repo.full_name } },
      create: {
        userId,
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        isPrivate: repo.private,
      },
      update: { isPrivate: repo.private },
    });
  }
}

export async function syncSelectedRepos(userId: string, lookbackDays = 30) {
  const { token } = await getOctokitForUser(userId);
  const gql = graphql.defaults({ headers: { authorization: `token ${token}` } });

  const selectedRepos = await prisma.repository.findMany({
    where: { userId, selectedForSync: true },
  });

  const since = subDays(new Date(), lookbackDays).toISOString();

  for (const repo of selectedRepos) {
    await syncRepoActivity(userId, repo.id, repo.owner, repo.name, since, gql);
    await prisma.repository.update({
      where: { id: repo.id },
      data: { lastSyncedAt: new Date() },
    });
  }
}

// Fetch all commits since `since` using cursor pagination (100 per page)
async function fetchAllCommits(
  owner: string,
  name: string,
  since: string,
  gql: typeof graphql
): Promise<any[]> {
  const query = `
    query($owner: String!, $name: String!, $since: GitTimestamp!, $after: String) {
      repository(owner: $owner, name: $name) {
        defaultBranchRef {
          target {
            ... on Commit {
              history(first: 100, since: $since, after: $after) {
                nodes {
                  oid message committedDate additions deletions url
                  author { user { login } }
                }
                pageInfo { hasNextPage endCursor }
              }
            }
          }
        }
      }
    }
  `;

  const all: any[] = [];
  let after: string | null = null;

  for (let page = 0; page < 20; page++) { // cap at 2000 commits per repo per sync
    let data: any;
    try {
      data = await gql(query, { owner, name, since, after });
    } catch {
      break;
    }
    const history = data?.repository?.defaultBranchRef?.target?.history;
    if (!history) break;
    all.push(...(history.nodes ?? []));
    if (!history.pageInfo?.hasNextPage) break;
    after = history.pageInfo.endCursor;
  }
  return all;
}

// Fetch all PRs using cursor pagination (50 per page), filtered client-side by `since`
async function fetchAllPRs(
  owner: string,
  name: string,
  since: string,
  gql: typeof graphql
): Promise<any[]> {
  const query = `
    query($owner: String!, $name: String!, $after: String) {
      repository(owner: $owner, name: $name) {
        pullRequests(first: 50, orderBy: {field: CREATED_AT, direction: DESC}, after: $after) {
          nodes { number title state createdAt mergedAt url author { login } }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  `;

  const all: any[] = [];
  let after: string | null = null;
  const sinceDate = new Date(since);

  for (let page = 0; page < 10; page++) { // cap at 500 PRs
    let data: any;
    try {
      data = await gql(query, { owner, name, after });
    } catch {
      break;
    }
    const prs = data?.repository?.pullRequests;
    if (!prs) break;
    const nodes: any[] = prs.nodes ?? [];
    // PRs are newest-first; stop paginating once we pass the since date
    const inWindow = nodes.filter((p: any) => new Date(p.createdAt) >= sinceDate);
    all.push(...inWindow);
    if (inWindow.length < nodes.length || !prs.pageInfo?.hasNextPage) break;
    after = prs.pageInfo.endCursor;
  }
  return all;
}

// Fetch all issues using cursor pagination (50 per page), filtered by `since`
async function fetchAllIssues(
  owner: string,
  name: string,
  since: string,
  gql: typeof graphql
): Promise<any[]> {
  const query = `
    query($owner: String!, $name: String!, $after: String) {
      repository(owner: $owner, name: $name) {
        issues(first: 50, orderBy: {field: CREATED_AT, direction: DESC}, after: $after) {
          nodes { number title state createdAt closedAt url author { login } }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  `;

  const all: any[] = [];
  let after: string | null = null;
  const sinceDate = new Date(since);

  for (let page = 0; page < 10; page++) {
    let data: any;
    try {
      data = await gql(query, { owner, name, after });
    } catch {
      break;
    }
    const issues = data?.repository?.issues;
    if (!issues) break;
    const nodes: any[] = issues.nodes ?? [];
    const inWindow = nodes.filter((i: any) => new Date(i.createdAt) >= sinceDate);
    all.push(...inWindow);
    if (inWindow.length < nodes.length || !issues.pageInfo?.hasNextPage) break;
    after = issues.pageInfo.endCursor;
  }
  return all;
}

async function syncRepoActivity(
  userId: string,
  repoId: string,
  owner: string,
  name: string,
  since: string,
  gql: typeof graphql
) {
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { githubLogin: true },
  });
  const login = userRecord?.githubLogin;

  const [commits, prs, issues] = await Promise.all([
    fetchAllCommits(owner, name, since, gql),
    fetchAllPRs(owner, name, since, gql),
    fetchAllIssues(owner, name, since, gql),
  ]);

  for (const c of commits) {
    if (login && c.author?.user?.login !== login) continue;
    await prisma.commitRecord.upsert({
      where: { repoId_sha: { repoId, sha: c.oid } },
      create: {
        userId,
        repoId,
        sha: c.oid,
        message: c.message.split("\n")[0].slice(0, 280),
        authoredAt: new Date(c.committedDate),
        additions: c.additions,
        deletions: c.deletions,
        url: c.url,
      },
      update: {},
    });
  }

  for (const pr of prs) {
    if (login && pr.author?.login !== login) continue;
    await prisma.pullRequestRecord.upsert({
      where: { repoId_number: { repoId, number: pr.number } },
      create: {
        userId,
        repoId,
        number: pr.number,
        title: pr.title,
        state: pr.mergedAt ? "merged" : pr.state.toLowerCase(),
        createdAt: new Date(pr.createdAt),
        mergedAt: pr.mergedAt ? new Date(pr.mergedAt) : null,
        url: pr.url,
      },
      update: {
        state: pr.mergedAt ? "merged" : pr.state.toLowerCase(),
        mergedAt: pr.mergedAt ? new Date(pr.mergedAt) : null,
      },
    });
  }

  for (const issue of issues) {
    if (login && issue.author?.login !== login) continue;
    await prisma.issueRecord.upsert({
      where: { repoId_number: { repoId, number: issue.number } },
      create: {
        userId,
        repoId,
        number: issue.number,
        title: issue.title,
        state: issue.state.toLowerCase(),
        createdAt: new Date(issue.createdAt),
        closedAt: issue.closedAt ? new Date(issue.closedAt) : null,
        url: issue.url,
      },
      update: {
        state: issue.state.toLowerCase(),
        closedAt: issue.closedAt ? new Date(issue.closedAt) : null,
      },
    });
  }
}
