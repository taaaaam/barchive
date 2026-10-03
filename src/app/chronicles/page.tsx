"use client";
import Link from "next/link";
import Image from "next/image";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import EditPostModal from "@/components/EditPostModal";

export default function ChroniclesPage() {
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  // "feed" shows the Chronicles; "archive" shows the current user's archived posts
  const [view, setView] = useState<"feed" | "archive">("feed");
  const router = useRouter();

  useEffect(() => {
    async function fetchPosts() {
      try {
        // Query posts ordered by creation date (most recent first)
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        // Cache author lookups so each author is only fetched once
        const authorPictures = new Map<string, Promise<string | null>>();
        const getAuthorPicture = (authorId: string) => {
          if (!authorPictures.has(authorId)) {
            authorPictures.set(
              authorId,
              getDoc(doc(db, "users", authorId))
                .then((authorDoc) => authorDoc.data()?.profilePicture || null)
                .catch((error) => {
                  console.error("Error fetching author profile:", error);
                  return null;
                })
            );
          }
          return authorPictures.get(authorId)!;
        };

        const countSubcollection = (postId: string, name: string) =>
          getDocs(collection(db, "posts", postId, name))
            .then((s) => s.size)
            .catch((error) => {
              console.error(`Error fetching ${name} count:`, error);
              return 0;
            });

        // Fetch author pictures, comment and like counts for all posts in parallel
        const postsData = await Promise.all(
          snapshot.docs.map(async (postDoc) => {
            const data = postDoc.data();
            const [authorProfilePicture, commentCount, likeCount] =
              await Promise.all([
                data.authorId ? getAuthorPicture(data.authorId) : null,
                countSubcollection(postDoc.id, "comments"),
                countSubcollection(postDoc.id, "likes"),
              ]);

            return {
              id: postDoc.id,
              slug: postDoc.id, // Use document ID as slug
              title: data.title || postDoc.id,
              content: data.content || "",
              date:
                data.createdAt?.toDate?.()?.toISOString() ||
                new Date().toISOString(),
              excerpt: data.excerpt || "",
              authorName: data.authorName || "Unknown Author",
              authorId: data.authorId,
              authorProfilePicture,
              featuredImage: data.featuredImage || null,
              commentCount,
              likeCount,
              private: data.private || false,
              archived: data.archived || false,
            };
          })
        );

        setAllPosts(postsData);
      } catch (error) {
        console.error("Error fetching posts:", error);
        setAllPosts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      } else {
        setUserProfile(null);
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Private posts are only visible to their author; archived posts are hidden
  // from the feed and only listed in their author's archive
  const archivedPosts = allPosts.filter(
    (post) => post.archived && post.authorId === user?.uid
  );
  useEffect(() => {
    setPosts(
      view === "archive"
        ? allPosts.filter((post) => post.archived && post.authorId === user?.uid)
        : allPosts.filter(
            (post) =>
              !post.archived && (!post.private || post.authorId === user?.uid)
          )
    );
  }, [allPosts, user, view]);

  // Leave the archive view once it's empty
  useEffect(() => {
    if (view === "archive" && !loading && archivedPosts.length === 0) {
      setView("feed");
    }
  }, [view, loading, archivedPosts.length]);

  const handleArchivePost = async (post: any, archived: boolean) => {
    try {
      await updateDoc(doc(db, "posts", post.id), {
        archived,
        archivedAt: archived ? new Date() : null,
      });
      setAllPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, archived } : p))
      );
    } catch (error) {
      console.error("Error updating archive status:", error);
      alert(
        `Failed to ${archived ? "archive" : "restore"} post. Please try again.`
      );
    }
  };

  const handleEditPost = (post: any) => {
    setEditingPost(post);
    setEditModalOpen(true);
  };

  const handleDeletePost = async (post: any) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${post.title}"? This action cannot be undone.`
      )
    ) {
      try {
        await deleteDoc(doc(db, "posts", post.id));
        setAllPosts(allPosts.filter((p) => p.id !== post.id));
        alert("Post deleted successfully!");
      } catch (error) {
        console.error("Error deleting post:", error);
        alert("Failed to delete post. Please try again.");
      }
    }
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingPost(null);
  };

  const handleSavePost = async (updatedPost: any) => {
    try {
      const postRef = doc(db, "posts", updatedPost.id);
      await updateDoc(postRef, {
        title: updatedPost.title,
        content: updatedPost.content,
        excerpt: updatedPost.excerpt,
        featuredImage: updatedPost.featuredImage,
        private: updatedPost.private || false,
        updatedAt: new Date(),
      });

      setAllPosts(
        allPosts.map((p) =>
          p.id === updatedPost.id ? { ...p, ...updatedPost } : p
        )
      );
      setEditModalOpen(false);
      setEditingPost(null);
      alert("Post updated successfully!");
    } catch (error) {
      console.error("Error updating post:", error);
      alert("Failed to update post. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-green">
      {/* Header */}
      <header className="page-header-enter bg-green relative">
        <div className="relative max-w-7xl mx-auto px-8 py-8">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center text-white hover:text-gray-light font-serif font-semibold text-lg transition-all duration-300 group"
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
              Back to Home
            </Link>
          </div>
          <div className="text-center mt-8">
            <h1 className="text-5xl font-serif font-bold text-white mb-4">
              The Chronicles
            </h1>
            <p className="text-white/80 text-xl font-light">
              Stories, reflections and dispatches from members
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-16">
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
              <p className="mt-6 text-white/75 font-serif text-lg">
                Loading the chronicles...
              </p>
            </div>
          </div>
        ) : posts.length === 0 && view === "feed" && archivedPosts.length === 0 ? (
          <div className="page-main-enter text-center py-32">
            <div className="mb-8">
              <div className="inline-block p-6 bg-white/10 rounded-full mb-6">
                <svg
                  className="w-16 h-16 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
              </div>
            </div>
            <h2 className="text-4xl font-serif font-bold text-white mb-6">
              The Chronicle Awaits
            </h2>
            <p className="text-xl text-white/75 mb-12 max-w-2xl mx-auto leading-relaxed">
              Be the first to inscribe your wisdom into our distinguished
              collection of knowledge.
            </p>
            <Link
              href="/create"
              className="inline-flex items-center px-8 py-4 bg-white text-green font-serif font-semibold text-lg rounded-lg hover:bg-gray-light transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
            >
              <svg
                className="mr-3 w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Begin the Chronicle
            </Link>
          </div>
        ) : (
          <div className="page-main-enter">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              {/* Feed / archive switch, shown once the user has archived something */}
              {archivedPosts.length > 0 ? (
                <div className="inline-flex rounded-lg bg-white/10 p-1 text-sm font-semibold">
                  {(["feed", "archive"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setView(option)}
                      className={`px-4 py-1.5 rounded-md transition-colors ${
                        view === option
                          ? "bg-white text-green shadow-sm"
                          : "text-white/75 hover:text-white"
                      }`}
                    >
                      {option === "feed"
                        ? "All posts"
                        : `Your archive (${archivedPosts.length})`}
                    </button>
                  ))}
                </div>
              ) : (
                <div />
              )}
              <Link
                href="/create"
                className="inline-flex items-center px-4 py-2 bg-white text-green font-serif font-semibold text-sm rounded-lg hover:bg-gray-light transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <svg
                  className="mr-1.5 w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create a post
              </Link>
            </div>
            {view === "archive" && (
              <p className="mb-4 text-sm text-white/75">
                Archived posts are hidden from The Chronicles and only visible
                to you. Restore a post to put it back.
              </p>
            )}
            {posts.length === 0 && (
              <p className="py-16 text-center text-white/75">
                No posts to show yet.
              </p>
            )}
            <div className="space-y-0">
              {posts.map((post) => (
                <article
                  key={post.slug}
                  className="group hover:bg-white/10 transition-colors duration-200 py-8"
                >
                  <div className="flex gap-8">
                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <time className="text-sm text-white/75 font-medium">
                          {new Date(post.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </time>
                        <div className="flex items-center gap-2">
                          {post.authorProfilePicture ? (
                            <div className="w-5 h-5 rounded-full overflow-hidden">
                              <Image
                                src={post.authorProfilePicture}
                                alt={post.authorName}
                                width={20}
                                height={20}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                              <svg
                                className="w-3 h-3 text-white/75"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                            </div>
                          )}
                          <span className="text-sm text-white/75">
                            by{" "}
                            <span className="font-medium text-white">
                              {post.authorName}
                            </span>
                          </span>
                          {post.private && post.authorId === user?.uid && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                              </svg>
                              Private
                            </span>
                          )}
                        </div>
                        {user &&
                          userProfile &&
                          post.authorId === user.uid && (
                            <div className="flex items-center gap-1 ml-auto">
                              <button
                                onClick={() =>
                                  handleArchivePost(post, !post.archived)
                                }
                                className="p-1.5 text-white/60 hover:text-white/80 hover:bg-white/10 rounded transition-all duration-200"
                                title={post.archived ? "Restore post" : "Archive post"}
                              >
                                {post.archived ? (
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M3 10h10a5 5 0 015 5v2M3 10l5 5m-5-5l5-5"
                                    />
                                  </svg>
                                ) : (
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                                    />
                                  </svg>
                                )}
                              </button>
                              <button
                                onClick={() => handleEditPost(post)}
                                className="p-1.5 text-white/60 hover:text-white/80 hover:bg-white/10 rounded transition-all duration-200"
                                title="Edit post"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeletePost(post)}
                                className="p-1.5 text-white/60 hover:text-red-200 hover:bg-white/10 rounded transition-all duration-200"
                                title="Delete post"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          )}
                      </div>

                      <h3 className="text-2xl font-serif font-bold text-white mb-3 hover:text-white/80 transition-colors leading-tight">
                        <Link href={`/posts/${post.slug}`} className="block">
                          {post.title}
                        </Link>
                      </h3>

                      {post.excerpt && (
                        <p className="text-white/75 leading-relaxed mb-4 line-clamp-2">
                          {post.excerpt}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <Link
                          href={`/posts/${post.slug}`}
                          className="inline-flex items-center text-white hover:text-white/80 font-medium text-sm transition-colors duration-200 group"
                        >
                          Read more
                          <svg
                            className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </Link>

                        {/* Like and Comment Count */}
                        <div className="flex items-center gap-4 text-white/75 text-sm">
                          {/* Cheers Count */}
                          <div className="flex items-center gap-1">
                            <i className="fas fa-martini-glass w-4 h-4"></i>
                            <span>{post.likeCount || 0}</span>
                          </div>

                          {/* Comment Count */}
                          <div className="flex items-center gap-1">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                              />
                            </svg>
                            <span>{post.commentCount || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Featured Image */}
                    {post.featuredImage && (
                      <div className="flex-shrink-0 w-40 h-28 overflow-hidden rounded-lg transition-colors duration-200">
                        <img
                          src={post.featuredImage}
                          alt={post.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </main>


      {/* Edit Post Modal */}
      {editModalOpen && editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={handleCloseEditModal}
          onSave={handleSavePost}
        />
      )}
    </div>
  );
}
