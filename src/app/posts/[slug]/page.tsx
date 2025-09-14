"use client";
// src/app/posts/[slug]/page.tsx
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import Comments from "@/components/Comments";
import { useEffect, useState } from "react";

export default function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState<string>("");

  useEffect(() => {
    const fetchParams = async () => {
      const resolvedParams = await params;
      setSlug(resolvedParams.slug);
    };
    fetchParams();
  }, [params]);

  useEffect(() => {
    if (slug) {
      fetchPost();
    }
  }, [slug]);

  const fetchPost = async () => {
    try {
      const docRef = doc(db, "posts", slug);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        notFound();
      }

      setPost(docSnap.data());
    } catch (error) {
      console.error("Error fetching post:", error);
      notFound();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-light to-white">
        <div className="max-w-6xl mx-auto px-8 py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-green border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-medium">Loading post...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-light to-white">
      {/* Header */}
      <header className="bg-green shadow-2xl border-b-4 border-green-light relative">
        <div className="absolute inset-0 bg-gradient-to-r from-green via-green-dark to-green opacity-90"></div>
        <div className="relative max-w-7xl mx-auto px-8 py-12">
          <Link
            href="/"
            className="inline-flex items-center text-white hover:text-gray-light font-serif font-semibold text-lg transition-all duration-300 mb-6 group"
          >
            <svg
              className="mr-3 w-6 h-6 transition-transform group-hover:-translate-x-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Go Back
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-8 py-20">
        <article className="bg-white rounded-3xl shadow-2xl border-2 border-green/20 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-green/5 to-transparent"></div>
          {/* Article Header */}
          <div className="relative px-12 py-16 border-b-2 border-green/20 bg-gradient-to-r from-green/5 to-green/5">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-6">
                <time className="text-sm text-gray-dark font-medium bg-green/10 px-5 py-3 rounded-full border border-green/20">
                  {post.createdAt
                    ? new Date(
                        post.createdAt.seconds * 1000
                      ).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "No date"}
                </time>
                <span className="text-sm text-gray-medium">
                  by{" "}
                  <span className="font-semibold text-gray-dark">
                    {post.authorName || "Unknown Author"}
                  </span>
                </span>
              </div>
              <span className="inline-flex items-center px-5 py-3 rounded-full text-sm font-semibold bg-green text-white border border-green/30">
                Chronicle
              </span>
            </div>

            <h1 className="text-6xl font-serif font-bold text-gray-dark mb-8 leading-tight">
              {post.title || slug}
            </h1>

            {post.excerpt && (
              <p className="text-2xl text-gray-medium leading-relaxed font-light">
                {post.excerpt}
              </p>
            )}
          </div>

          {/* Featured Image */}
          {post.featuredImage && (
            <div className="px-12 pb-8">
              <div className="relative overflow-hidden rounded-2xl border-2 border-green/20">
                <img
                  src={post.featuredImage}
                  alt={post.title}
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
          )}

          {/* Article Content */}
          <div className="relative px-12 py-16">
            <div
              className="prose prose-2xl max-w-none prose-headings:text-gray-dark prose-headings:font-serif prose-headings:font-bold prose-p:text-gray-dark prose-p:leading-relaxed prose-p:text-lg prose-a:text-green prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-dark prose-code:text-gray-dark prose-code:bg-green/10 prose-code:px-3 prose-code:py-2 prose-code:rounded prose-code:font-mono prose-pre:bg-gray-dark prose-pre:text-white prose-blockquote:border-l-green prose-blockquote:bg-green/5 prose-blockquote:pl-8 prose-blockquote:py-6 prose-blockquote:rounded-r prose-blockquote:text-gray-dark prose-li:text-gray-dark prose-ul:text-gray-dark prose-ol:text-gray-dark"
              style={{ color: "#1f2937" }}
            >
              <ReactMarkdown>
                {post.content
                  ?.replace(/\n/g, "\n\n") // Convert single newlines to double newlines
                  ?.replace(/\n\n\n+/g, (match: string) => {
                    // Replace multiple consecutive newlines with paragraphs containing non-breaking spaces
                    const newlineCount = match.length - 2;
                    return (
                      "\n\n" + "&nbsp;\n\n".repeat(Math.floor(newlineCount / 2))
                    );
                  }) || ""}
              </ReactMarkdown>
            </div>
          </div>
        </article>

        {/* Comments Section */}
        <Comments postId={slug} />

        {/* Navigation */}
        <div className="mt-20 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center px-10 py-5 bg-green text-white font-serif font-semibold text-lg rounded-xl hover:bg-green-dark transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 border-2 border-green/20"
          >
            <svg
              className="mr-4 w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Go Back
          </Link>
        </div>
      </main>
    </div>
  );
}
