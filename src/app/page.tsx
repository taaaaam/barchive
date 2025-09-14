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
import ProfileDropdown from "@/components/ProfileDropdown";
import EditPostModal from "@/components/EditPostModal";
import { useRouter } from "next/navigation";

export default function Home() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showLogo, setShowLogo] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchPosts() {
      // Fetch posts from Firestore
      const postsData: any[] = [];

      try {
        // Try without ordering first to see if documents exist
        const q = collection(db, "posts");
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          console.log("No documents found in posts collection!");
        }

        // Fetch posts with author profile pictures and comment counts
        for (const postDoc of snapshot.docs) {
          const data = postDoc.data();
          let authorProfilePicture = null;
          let commentCount = 0;

          // Fetch author's profile picture if authorId exists
          if (data.authorId) {
            try {
              const authorDoc = await getDoc(doc(db, "users", data.authorId));
              if (authorDoc.exists()) {
                const authorData = authorDoc.data();
                authorProfilePicture = authorData?.profilePicture || null;
              }
            } catch (error) {
              console.error("Error fetching author profile:", error);
            }
          }

          // Fetch comment count
          try {
            const commentsSnapshot = await getDocs(
              collection(db, "posts", postDoc.id, "comments")
            );
            commentCount = commentsSnapshot.size;
          } catch (error) {
            console.error("Error fetching comment count:", error);
          }

          postsData.push({
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
            authorProfilePicture: authorProfilePicture,
            featuredImage: data.featuredImage || null,
            commentCount: commentCount,
          });
        }
        setPosts(postsData);
      } catch (error) {
        console.error("Error fetching posts:", error);
        // Fallback to empty array if Firebase fails
        setPosts([]);
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
        // Fetch user profile
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      } else {
        setUserProfile(null);
        // Don't redirect to login - allow non-authenticated users to view home page
      }
      // Hide initial loading overlay once auth is resolved
      setIsInitialLoad(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Trigger logo fade-in after initial load completes
  useEffect(() => {
    if (!isInitialLoad) {
      // Small delay to ensure smooth transition from loading spinner
      const timer = setTimeout(() => {
        setShowLogo(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isInitialLoad]);

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
        // Remove the post from the local state
        setPosts(posts.filter((p) => p.id !== post.id));
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
      // Update the post in Firestore
      const postRef = doc(db, "posts", updatedPost.id);
      await updateDoc(postRef, {
        title: updatedPost.title,
        content: updatedPost.content,
        excerpt: updatedPost.excerpt,
        featuredImage: updatedPost.featuredImage,
        updatedAt: new Date(),
      });

      // Update the local state
      setPosts(
        posts.map((p) =>
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
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-light to-white">
      {/* Loading Overlay */}
      {isInitialLoad && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="relative">
            {/* Spinning border */}
            <div className="w-32 h-32 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            {/* Logo in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Image
                src="/assets/bar_logo_no_bg.png"
                alt="BaR Logo"
                width={80}
                height={80}
                className="w-20 h-20"
              />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header
        className={`bg-green shadow-2xl ${
          user ? "border-b-4 border-green-light" : ""
        } min-h-screen flex items-center`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-green via-green-dark to-green opacity-90"></div>
        <div className="relative max-w-7xl mx-auto px-8 py-8 w-full flex flex-col justify-between min-h-screen">
          {/* Navigation */}
          {/* Desktop Layout */}
          <div className="hidden md:flex justify-between items-center mb-8">
            {/* Left side - Navigation Links or empty space */}
            <div className="flex items-center gap-6">
              {user && userProfile && (
                <nav className="flex items-center gap-6">
                  <Link
                    href="/memories"
                    className="text-white hover:text-gray-light font-medium text-lg transition-colors duration-300"
                  >
                    Memories
                  </Link>
                  <Link
                    href="/members"
                    className="text-white hover:text-gray-light font-medium text-lg transition-colors duration-300"
                  >
                    Delegations
                  </Link>
                </nav>
              )}
            </div>

            {/* Center Title */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <h1 className="text-2xl font-serif font-bold text-white">
                The BaRchive
              </h1>
            </div>

            {/* Right side - Auth Status */}
            <div className="flex items-center gap-4">
              {user && userProfile && (
                <Link
                  href="/newsletters"
                  className="text-white hover:text-gray-light font-medium text-lg transition-colors duration-300"
                >
                  Newsletters
                </Link>
              )}
              {user && userProfile ? (
                <ProfileDropdown
                  username={userProfile?.username}
                  profilePicture={userProfile?.profilePicture}
                />
              ) : user ? (
                <div className="px-6 py-3 bg-white/20 text-white rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="px-6 py-3 text-white hover:text-gray-light transition-all duration-300 text-sm font-semibold"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden mb-8">
            {/* Title */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-serif font-bold text-white">
                The BaRchive
              </h1>
            </div>

            {/* Navigation Links */}
            {user && userProfile && (
              <div className="flex flex-wrap justify-center items-center gap-4 mb-4">
                <Link
                  href="/memories"
                  className="text-white hover:text-gray-light font-medium text-lg transition-colors duration-300"
                >
                  Memories
                </Link>
                <Link
                  href="/members"
                  className="text-white hover:text-gray-light font-medium text-lg transition-colors duration-300"
                >
                  Delegations
                </Link>
                <Link
                  href="/newsletters"
                  className="text-white hover:text-gray-light font-medium text-lg transition-colors duration-300"
                >
                  Newsletters
                </Link>
              </div>
            )}

            {/* Auth Status */}
            <div className="flex justify-center">
              {user && userProfile ? (
                <ProfileDropdown
                  username={userProfile?.username}
                  profilePicture={userProfile?.profilePicture}
                />
              ) : user ? (
                <div className="px-6 py-3 bg-white/20 text-white rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="px-6 py-3 text-white hover:text-gray-light transition-all duration-300 text-sm font-semibold"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>

          {/* Main Content - Centered */}
          <div className="flex-1 flex flex-col justify-center items-center text-center">
            <div className="mb-8">
              <Image
                src="/assets/bar_logo_no_bg.png"
                alt="BaR Logo"
                width={300}
                height={300}
                className={`w-80 h-80 mx-auto transition-opacity duration-1000 ease-in-out ${
                  showLogo ? "opacity-100" : "opacity-0"
                }`}
              />
            </div>

            {user && userProfile && (
              <div>
                <Link
                  href="/create"
                  className="text-white hover:text-gray-light font-serif font-semibold text-lg transition-colors duration-300 underline hover:no-underline"
                >
                  Contribute to The Chronicles
                </Link>
              </div>
            )}
          </div>

          {/* Footer Space */}
          <div className="h-16"></div>
        </div>
      </header>

      {/* Main Content - Only show for authenticated users */}
      {user && (
        <main className="max-w-7xl mx-auto px-8 py-24">
          {loading ? (
            <div className="flex justify-center items-center py-32">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-green border-t-transparent"></div>
                <p className="mt-6 text-gray-medium font-serif text-lg">
                  Loading the chronicles...
                </p>
              </div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-32">
              <div className="mb-8">
                <div className="inline-block p-6 bg-green/5 rounded-full border-2 border-green/20 mb-6">
                  <svg
                    className="w-16 h-16 text-green"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-4xl font-serif font-bold text-gray-dark mb-6">
                The Chronicle Awaits
              </h2>
              <p className="text-xl text-gray-medium mb-12 max-w-2xl mx-auto leading-relaxed">
                Be the first to inscribe your wisdom into our distinguished
                collection of knowledge.
              </p>
              <Link
                href="/create"
                className="inline-flex items-center px-8 py-4 bg-green text-white font-serif font-semibold text-lg rounded-lg hover:bg-green-dark transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 border-2 border-green/20"
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
            <div className="space-y-16">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-serif font-bold text-gray-dark mb-6">
                  The Chronicles
                </h2>
              </div>
              <div className="space-y-0">
                {posts.map((post, index) => (
                  <article
                    key={post.slug}
                    className="group border-b border-gray-200 hover:bg-gray-50/50 transition-colors duration-200 py-8"
                  >
                    <div className="flex gap-8">
                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-3">
                          <time className="text-sm text-gray-500 font-medium">
                            {new Date(post.date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </time>
                          <div className="flex items-center gap-2">
                            {post.authorProfilePicture ? (
                              <div className="w-5 h-5 rounded-full overflow-hidden">
                                <img
                                  src={post.authorProfilePicture}
                                  alt={post.authorName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
                                <svg
                                  className="w-3 h-3 text-gray-600"
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
                            <span className="text-sm text-gray-600">
                              by{" "}
                              <span className="font-medium text-gray-900">
                                {post.authorName}
                              </span>
                            </span>
                          </div>
                          {user &&
                            userProfile &&
                            post.authorId === user.uid && (
                              <div className="flex items-center gap-1 ml-auto">
                                <button
                                  onClick={() => handleEditPost(post)}
                                  className="p-1.5 text-gray-400 hover:text-green hover:bg-green/10 rounded transition-all duration-200"
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
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all duration-200"
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

                        <h3 className="text-2xl font-serif font-bold text-gray-900 mb-3 hover:text-green transition-colors leading-tight">
                          <Link href={`/posts/${post.slug}`} className="block">
                            {post.title}
                          </Link>
                        </h3>

                        {post.excerpt && (
                          <p className="text-gray-600 leading-relaxed mb-4 line-clamp-2">
                            {post.excerpt}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <Link
                            href={`/posts/${post.slug}`}
                            className="inline-flex items-center text-green hover:text-green-dark font-medium text-sm transition-colors duration-200 group"
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

                          {/* Comment Count */}
                          <div className="flex items-center gap-1 text-gray-500 text-sm">
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

                      {/* Featured Image */}
                      {post.featuredImage && (
                        <div className="flex-shrink-0 w-40 h-28 overflow-hidden rounded-lg border-2 border-green/20 hover:border-green/40 transition-colors duration-200">
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
      )}

      {/* Footer - Only show for authenticated users */}
      {user && (
        <footer className="bg-green text-white mt-32 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-green via-green-dark to-green opacity-95"></div>
          <div className="relative max-w-7xl mx-auto px-8 py-16">
            <div className="text-center">
              <h3 className="text-3xl font-serif font-bold mb-6">BaR</h3>
              <p className="text-white/80 mb-8 max-w-3xl mx-auto text-lg leading-relaxed">
                Preserving the wisdom of Yale's coolest society
              </p>

              <p className="text-white/60 font-serif">
                &copy; 2025 BaR. Est. 2011. Built with Next.js, Tailwind CSS &
                Firebase.
              </p>
            </div>
          </div>
        </footer>
      )}

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
