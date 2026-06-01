'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const AUTH_KEY = 'rentadmin-authenticated';

type Post = {
  postid: string;
  title: string | null;
  description: string | null;
  city: string | null;
  locality: string | null;
  propertytype: string | null;
  type: string | null;
  raise: boolean | null;
  created_at?: string | null;
  price?: string | null;
  rent?: string | null;
};

export default function Page() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingPostId, setSavingPostId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const authValue = window.localStorage.getItem(AUTH_KEY);

    if (authValue !== 'true') {
      router.replace('/');
      return;
    }

    setIsAuthenticated(true);
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const endpoint = query.trim().length > 0
          ? `${API_BASE_URL}/raise/api/search?query=${encodeURIComponent(query)}`
          : `${API_BASE_URL}/raise/api/posts`;

        const response = await fetch(endpoint, { signal: controller.signal });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to load posts');
        }

        setPosts(result.data || []);
      } catch (fetchError) {
        if ((fetchError as Error).name === 'AbortError') {
          return;
        }

        console.error('Failed to load posts:', fetchError);
        setError('Unable to load posts right now.');
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [query, isAuthenticated]);

  const raisedCount = useMemo(
    () => posts.filter((post) => Boolean(post.raise)).length,
    [posts]
  );

  const handleToggleRaise = async (postId: string) => {
    setSavingPostId(postId);

    try {
      const response = await fetch(`${API_BASE_URL}/raise/api/raise/${postId}`, {
        method: 'PUT',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update raise state');
      }

      const updatedPost = result.data as Post;
      setPosts((currentPosts) =>
        currentPosts.map((post) => (post.postid === postId ? updatedPost : post))
      );
    } catch (toggleError) {
      console.error('Failed to toggle raise:', toggleError);
      setError(
        toggleError instanceof Error ? toggleError.message : 'Unable to update raise state.'
      );
    } finally {
      setSavingPostId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-sm text-slate-600">
        Checking authentication...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#eff6ff,_#f8fafc_40%,_#ffffff_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
              Admin Panel
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Property search and raise control</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Search across the post table, view every listing, and toggle the raised state from one place.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-blue-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Total Posts</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{posts.length}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Raised</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{raisedCount}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <label className="block text-sm font-medium text-slate-700 mb-2">Search all posts</label>
          <div className="relative">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, description, city, locality, property type, post id..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
            <svg className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-sm">
            Loading posts...
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-sm">
            No posts found.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <article key={post.postid} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Post ID</p>
                      <p className="mt-1 break-all text-sm font-semibold text-slate-800">{post.postid}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${post.raise ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {post.raise ? 'Raised' : 'Not Raised'}
                    </span>
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-slate-900">{post.title || 'Untitled Property'}</h2>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{post.description || 'No description available.'}</p>
                </div>

                <div className="space-y-3 p-5 text-sm text-slate-700">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">City</p>
                      <p className="mt-1 font-semibold text-slate-900">{post.city || 'N/A'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Locality</p>
                      <p className="mt-1 font-semibold text-slate-900">{post.locality || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Type</p>
                      <p className="mt-1 font-semibold text-slate-900">{post.type || 'N/A'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Property</p>
                      <p className="mt-1 font-semibold text-slate-900">{post.propertytype || 'N/A'}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleRaise(post.postid)}
                    disabled={savingPostId === post.postid}
                    className={`mt-2 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${post.raise ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-700 hover:bg-blue-800'}`}
                  >
                    {savingPostId === post.postid ? 'Updating...' : post.raise ? 'Unraise' : 'Raise'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}