"use client";
// src/app/posts/[slug]/page.tsx
import {
  doc,
  getDoc,
  collection,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { notFound } from "next/navigation";
// import ReactMarkdown from "react-markdown"; // Removed - now using HTML rendering
import Link from "next/link";
import Comments from "@/components/Comments";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";

export default function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

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
      fetchLikes();
    }
  }, [slug]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && slug) {
        checkIfLiked();
      }
    });
    return () => unsubscribe();
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

  const fetchLikes = async () => {
    try {
      const likesSnapshot = await getDocs(
        collection(db, "posts", slug, "likes")
      );
      setLikeCount(likesSnapshot.size);
    } catch (error) {
      console.error("Error fetching likes:", error);
    }
  };

  const checkIfLiked = async () => {
    if (!user || !slug) return;

    try {
      const likesQuery = query(
        collection(db, "posts", slug, "likes"),
        where("userId", "==", user.uid)
      );
      const likesSnapshot = await getDocs(likesQuery);
      setIsLiked(!likesSnapshot.empty);
    } catch (error) {
      console.error("Error checking if liked:", error);
    }
  };

  const handleLike = async () => {
    if (!user || !slug || likeLoading) return;

    setLikeLoading(true);
    try {
      if (isLiked) {
        // Unlike: find and delete the like document
        const likesQuery = query(
          collection(db, "posts", slug, "likes"),
          where("userId", "==", user.uid)
        );
        const likesSnapshot = await getDocs(likesQuery);

        if (!likesSnapshot.empty) {
          await deleteDoc(likesSnapshot.docs[0].ref);
          setLikeCount((prev) => prev - 1);
          setIsLiked(false);
        }
      } else {
        // Like: add a new like document
        await addDoc(collection(db, "posts", slug, "likes"), {
          userId: user.uid,
          createdAt: new Date(),
        });
        setLikeCount((prev) => prev + 1);
        setIsLiked(true);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setLikeLoading(false);
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

            {/* Cheers Button */}
            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={handleLike}
                disabled={likeLoading}
                className={`flex items-center gap-3 px-6 py-3 rounded-full border-2 transition-all duration-200 ${
                  isLiked
                    ? "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100"
                    : "bg-white border-gray-200 text-gray-600 hover:border-amber-200 hover:text-amber-600"
                } ${
                  likeLoading
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:shadow-md"
                }`}
              >
                <i
                  className={`fas fa-martini-glass w-5 h-5 transition-all duration-200 ${
                    isLiked ? "text-amber-600" : "text-gray-600"
                  }`}
                ></i>
                <span className="font-medium">
                  {likeLoading ? "..." : likeCount}{" "}
                  {likeCount === 1 ? "Cheers!" : "Cheers!"}
                </span>
              </button>

              {!user && (
                <p className="text-sm text-gray-500">
                  <Link href="/login" className="text-green hover:underline">
                    Sign in
                  </Link>{" "}
                  to cheer this post
                </p>
              )}
            </div>
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
              dangerouslySetInnerHTML={{ __html: post.content || "" }}
            />
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
