"use client";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import ImageUpload from "@/components/ImageUpload";

export default function CreatePost() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const router = useRouter();

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
        // Redirect to login if not authenticated
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Add document to Firestore
      const docRef = await addDoc(collection(db, "posts"), {
        title,
        content,
        excerpt,
        featuredImage: featuredImage || null,
        authorId: user?.uid,
        authorName: userProfile?.username || user?.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log("Document written with ID: ", docRef.id);

      // Redirect to the new post using document ID
      router.push(`/posts/${docRef.id}`);
    } catch (error) {
      console.error("Error adding document: ", error);
      setError("Failed to create post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
          <div className="text-center">
            <h1 className="text-5xl font-serif font-bold text-white mb-4">
              Contribute to The Chronicles
            </h1>
            <p className="text-white/80 text-xl font-light">
              Inscribe your wisdom into our distinguished collection
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-green/20 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-green/5 to-transparent"></div>
          <div className="relative px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title Field */}
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-semibold text-gray-dark mb-2"
                >
                  Post Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark placeholder-gray-medium font-medium transition-colors"
                  placeholder="Enter your post title..."
                />
              </div>

              {/* Excerpt Field */}
              <div>
                <label
                  htmlFor="excerpt"
                  className="block text-sm font-semibold text-gray-dark mb-2"
                >
                  Excerpt
                </label>
                <textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark placeholder-gray-medium font-medium transition-colors resize-none"
                  placeholder="Brief description of your post (optional)..."
                />
              </div>

              {/* Featured Image Field */}
              <ImageUpload
                onImageUpload={setFeaturedImage}
                onImageRemove={() => setFeaturedImage("")}
                currentImage={featuredImage}
                disabled={loading}
              />

              {/* Content Field */}
              <div>
                <label
                  htmlFor="content"
                  className="block text-sm font-semibold text-gray-dark mb-2"
                >
                  Content *
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={15}
                  className="w-full px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark placeholder-gray-medium font-medium transition-colors resize-none"
                  placeholder="Write your post content here... (Markdown supported)"
                />
                <p className="text-sm text-green mt-2">
                  💡 Tip: You can use Markdown formatting for rich text
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green text-white font-serif font-semibold text-lg py-3 px-6 rounded-lg hover:bg-green-dark disabled:bg-green/50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Creating Post...
                    </span>
                  ) : (
                    "Create Post"
                  )}
                </button>
                <Link
                  href="/"
                  className="px-6 py-3 border-2 border-green/30 text-green font-semibold rounded-lg hover:bg-green/10 transition-colors duration-200"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
