"use client";
import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { extractPublicId, deleteCloudinaryImages } from "@/lib/cloudinary";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  classYear: string;
  isClaimed: boolean;
  claimedBy?: string;
  username?: string;
}

interface Post {
  id: string;
  title: string;
  excerpt: string;
  authorName: string;
  authorId: string;
  createdAt: any;
  featuredImage?: string;
}

export default function AdminDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"members" | "posts">("members");
  const [newMembers, setNewMembers] = useState({
    names: "",
    classYear: "2025",
  });
  const [parsedMembers, setParsedMembers] = useState<
    { firstName: string; lastName: string }[]
  >([]);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingPost, setDeletingPost] = useState<string | null>(null);
  const [cloudinaryUsage, setCloudinaryUsage] = useState<any>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [classYears, setClassYears] = useState<string[]>([]);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [newClassYear, setNewClassYear] = useState("");

  useEffect(() => {
    fetchMembers();
    fetchPosts();
    fetchClassYears();
    fetchCloudinaryUsage();
  }, []);

  const fetchMembers = async () => {
    try {
      const membersQuery = query(
        collection(db, "members"),
        orderBy("lastName", "asc")
      );
      const snapshot = await getDocs(membersQuery);

      const membersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Member[];

      setMembers(membersData);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const postsQuery = query(
        collection(db, "posts"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(postsQuery);

      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[];

      setPosts(postsData);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  const fetchClassYears = async () => {
    try {
      const classesQuery = query(
        collection(db, "classes"),
        orderBy("year", "asc")
      );
      const snapshot = await getDocs(classesQuery);

      if (snapshot.empty) {
        // Fallback to default years if no classes exist
        setClassYears(["2025", "2026", "2027", "2028", "2029"]);
      } else {
        const years = snapshot.docs.map((doc) => doc.data().year);
        setClassYears(years);
      }
    } catch (error) {
      console.error("Error fetching class years:", error);
      // Fallback to default years
      setClassYears(["2025", "2026", "2027", "2028", "2029"]);
    }
  };

  const fetchCloudinaryUsage = async () => {
    setUsageLoading(true);
    try {
      const response = await fetch("/api/cloudinary-usage");
      console.log("API response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Cloudinary usage data received:", data);
        setCloudinaryUsage(data);
      } else {
        const errorData = await response.json();
        console.error("Failed to fetch Cloudinary usage:", errorData);
      }
    } catch (error) {
      console.error("Error fetching Cloudinary usage:", error);
    } finally {
      setUsageLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this post? This action cannot be undone. This will also delete any associated images from Cloudinary."
      )
    ) {
      return;
    }

    setDeletingPost(postId);
    try {
      // Find the post to get its images
      const postToDelete = posts.find((post) => post.id === postId);

      // Delete the post from Firestore first
      await deleteDoc(doc(db, "posts", postId));

      // Delete associated images from Cloudinary
      if (postToDelete?.featuredImage) {
        const imageUrls = [postToDelete.featuredImage];
        const deleteResult = await deleteCloudinaryImages(imageUrls);

        if (deleteResult.failed > 0) {
          console.warn(
            `Failed to delete ${deleteResult.failed} image(s) from Cloudinary`
          );
        }

        if (deleteResult.success > 0) {
          console.log(
            `Successfully deleted ${deleteResult.success} image(s) from Cloudinary`
          );
        }
      }

      // Remove from local state
      setPosts(posts.filter((post) => post.id !== postId));
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Error deleting post. Please try again.");
    } finally {
      setDeletingPost(null);
    }
  };

  const parseMemberNames = (namesString: string) => {
    const names = namesString
      .split("\n")
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    const parsed = names.map((name) => {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return {
          firstName: parts[0],
          lastName: parts.slice(1).join(" "),
        };
      } else {
        return {
          firstName: parts[0] || "",
          lastName: "",
        };
      }
    });

    setParsedMembers(parsed);
    return parsed;
  };

  const handleAddMembers = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);

    try {
      const membersToAdd = parseMemberNames(newMembers.names);

      // Add all members to Firebase
      const addPromises = membersToAdd.map((member) =>
        addDoc(collection(db, "members"), {
          firstName: member.firstName,
          lastName: member.lastName,
          classYear: newMembers.classYear,
          isClaimed: false,
          createdAt: new Date(),
        })
      );

      await Promise.all(addPromises);

      setNewMembers({
        names: "",
        classYear: "2025",
      });
      setParsedMembers([]);
      setShowAddForm(false);
      fetchMembers();
    } catch (error) {
      console.error("Error adding members:", error);
      alert("Error adding members");
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddNewClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newClassYear && !classYears.includes(newClassYear)) {
      try {
        // Save new class to Firebase
        await addDoc(collection(db, "classes"), {
          year: newClassYear,
          createdAt: new Date(),
        });

        // Update local state
        const updatedClassYears = [...classYears, newClassYear].sort();
        setClassYears(updatedClassYears);
        setNewMembers({ ...newMembers, classYear: newClassYear });

        setShowAddClassModal(false);
        setNewClassYear("");
      } catch (error) {
        console.error("Error adding new class:", error);
        alert("Error adding new class. Please try again.");
      }
    }
  };

  const handleCancelAddClass = () => {
    setShowAddClassModal(false);
    setNewClassYear("");
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-10 bg-white rounded-2xl shadow-2xl border-2 border-green/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-medium">Loading members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-10 bg-white rounded-2xl shadow-2xl border-2 border-green/20 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-green/5 to-transparent rounded-2xl"></div>
      <div className="relative">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-green/5 rounded-full border-2 border-green/30 mb-6">
            <svg
              className="w-10 h-10 text-green"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12,4A4,4 0 0,0 8,8A4,4 0 0,0 12,12A4,4 0 0,0 16,8A4,4 0 0,0 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
            </svg>
          </div>
          <h2 className="text-3xl font-serif font-bold text-gray-dark mb-2">
            Admin Dashboard
          </h2>
          <p className="text-gray-medium font-light">
            Manage society members and posts
          </p>
        </div>

        {/* Cloudinary Storage Usage */}
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-serif font-bold text-gray-dark flex items-center">
              <i className="fas fa-cloud mr-3 text-blue-600"></i>
              Cloudinary Storage
            </h3>
            <button
              onClick={fetchCloudinaryUsage}
              disabled={usageLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {usageLoading ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-sync-alt"></i>
              )}
            </button>
          </div>

          {cloudinaryUsage ? (
            <div className="space-y-4">
              {/* Storage Usage */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-dark">
                    Storage Used
                  </span>
                  <span className="text-sm text-gray-medium">
                    {cloudinaryUsage.storage.usedGB.toFixed(2)} GB /{" "}
                    {cloudinaryUsage.storage.limitGB.toFixed(2)} GB
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      cloudinaryUsage.storage.percentage > 80
                        ? "bg-red-500"
                        : cloudinaryUsage.storage.percentage > 60
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{
                      width: `${Math.min(
                        cloudinaryUsage.storage.percentage,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-medium mt-1">
                  <span>{cloudinaryUsage.storage.percentage}% used</span>
                  <span>{cloudinaryUsage.plan} Plan</span>
                </div>
              </div>

              {/* Objects and Bandwidth */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-lg border border-blue-200">
                  <div className="flex items-center mb-2">
                    <i className="fas fa-images text-blue-600 mr-2"></i>
                    <span className="text-sm font-semibold text-gray-dark">
                      Objects
                    </span>
                  </div>
                  <div className="text-lg font-bold text-gray-dark">
                    {cloudinaryUsage.objects.used.toLocaleString()} /{" "}
                    {cloudinaryUsage.objects.limit.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 bg-white rounded-lg border border-blue-200">
                  <div className="flex items-center mb-2">
                    <i className="fas fa-tachometer-alt text-blue-600 mr-2"></i>
                    <span className="text-sm font-semibold text-gray-dark">
                      Bandwidth
                    </span>
                  </div>
                  <div className="text-lg font-bold text-gray-dark">
                    {(
                      cloudinaryUsage.bandwidth.used /
                      (1024 * 1024 * 1024)
                    ).toFixed(2)}{" "}
                    GB /{" "}
                    {(
                      cloudinaryUsage.bandwidth.limit /
                      (1024 * 1024 * 1024)
                    ).toFixed(2)}{" "}
                    GB
                  </div>
                </div>
              </div>

              {/* Debug: Show raw data */}
              {cloudinaryUsage.rawData && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                  <details>
                    <summary className="text-sm font-semibold text-gray-dark cursor-pointer">
                      Debug: Raw API Response
                    </summary>
                    <pre className="text-xs text-gray-600 mt-2 overflow-auto">
                      {JSON.stringify(cloudinaryUsage.rawData, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          ) : usageLoading ? (
            <div className="text-center py-4">
              <i className="fas fa-spinner fa-spin text-blue-600 text-xl mb-2"></i>
              <p className="text-gray-medium">Loading storage data...</p>
            </div>
          ) : (
            <div className="text-center py-4">
              <i className="fas fa-exclamation-triangle text-yellow-500 text-xl mb-2"></i>
              <p className="text-gray-medium">Failed to load storage data</p>
              <button
                onClick={fetchCloudinaryUsage}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 bg-gray-light rounded-lg p-1">
          <button
            onClick={() => setActiveTab("members")}
            className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all duration-300 ${
              activeTab === "members"
                ? "bg-green text-white shadow-lg"
                : "text-gray-medium hover:text-gray-dark"
            }`}
          >
            Members ({members.length})
          </button>
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all duration-300 ${
              activeTab === "posts"
                ? "bg-green text-white shadow-lg"
                : "text-gray-medium hover:text-gray-dark"
            }`}
          >
            Posts ({posts.length})
          </button>
        </div>

        {activeTab === "members" && (
          <div className="mb-6">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-6 py-3 bg-green text-white font-semibold rounded-lg hover:bg-green-dark transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              {showAddForm ? "Cancel" : "Add New Members"}
            </button>
          </div>
        )}

        {showAddForm && (
          <div className="mb-8 p-6 bg-gray-light rounded-lg border-2 border-green/20">
            <h3 className="text-xl font-serif font-bold text-gray-dark mb-4">
              Add New Members
            </h3>

            <form onSubmit={handleAddMembers} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-dark mb-2">
                  Member Names (one per line)
                </label>
                <textarea
                  value={newMembers.names}
                  onChange={(e) => {
                    setNewMembers({ ...newMembers, names: e.target.value });
                    parseMemberNames(e.target.value);
                  }}
                  required
                  rows={6}
                  className="w-full px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark font-medium"
                  placeholder="Enter names one per line, e.g.&#10;Jack Smith&#10;Harley Davidson&#10;Jane Doe"
                />
                <p className="text-sm text-gray-medium mt-1">
                  Enter full names one per line. Each name will be split into
                  first and last name.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-dark mb-2">
                  Class Year
                </label>
                <div className="flex gap-2">
                  <select
                    value={newMembers.classYear}
                    onChange={(e) =>
                      setNewMembers({
                        ...newMembers,
                        classYear: e.target.value,
                      })
                    }
                    className="flex-1 px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark font-medium"
                  >
                    {classYears.map((year) => (
                      <option key={year} value={year}>
                        Class of {year}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddClassModal(true)}
                    className="px-4 py-3 bg-green/10 hover:bg-green/20 border-2 border-green/30 hover:border-green/50 rounded-lg transition-all duration-300 text-green font-semibold"
                    title="Add new class"
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                </div>
              </div>

              {/* Preview of parsed members */}
              {parsedMembers.length > 0 && (
                <div className="bg-white p-4 rounded-lg border-2 border-green/20">
                  <h4 className="text-sm font-semibold text-gray-dark mb-2">
                    Preview ({parsedMembers.length} members):
                  </h4>
                  <div className="space-y-1">
                    {parsedMembers.map((member, index) => (
                      <div key={index} className="text-sm text-gray-medium">
                        {member.firstName} {member.lastName}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isAdding || parsedMembers.length === 0}
                className="w-full py-4 px-6 bg-green text-white font-serif font-semibold text-lg rounded-lg hover:bg-green-dark focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                {isAdding
                  ? "Adding Members..."
                  : `Add ${parsedMembers.length} Members`}
              </button>
            </form>
          </div>
        )}

        {/* Members Tab Content */}
        {activeTab === "members" && (
          <div className="space-y-4">
            <h3 className="text-xl font-serif font-bold text-gray-dark">
              All Members ({members.length})
            </h3>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-200">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="px-4 py-3 hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="font-semibold text-gray-dark">
                            {member.firstName} {member.lastName}
                          </div>
                          <div className="text-sm text-gray-medium">
                            Class of {member.classYear}
                          </div>
                          {member.email && (
                            <div className="text-sm text-gray-500">
                              {member.email}
                            </div>
                          )}
                          {member.username && (
                            <div className="text-sm text-green">
                              @{member.username}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        {member.isClaimed ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green text-white">
                            Claimed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Available
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Posts Tab Content */}
        {activeTab === "posts" && (
          <div className="space-y-4">
            <h3 className="text-xl font-serif font-bold text-gray-dark">
              All Posts ({posts.length})
            </h3>

            <div className="grid gap-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="p-6 bg-white rounded-lg border-2 border-green/20 hover:border-green/40 transition-all duration-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-xl font-serif font-bold text-gray-dark mb-2">
                        {post.title}
                      </h4>
                      {post.excerpt && (
                        <p className="text-gray-medium mb-3 line-clamp-2">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-medium">
                        <span>By {post.authorName}</span>
                        <span>•</span>
                        <span>
                          {post.createdAt?.toDate?.()?.toLocaleDateString() ||
                            "No date"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <a
                        href={`/posts/${post.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-green text-white text-sm font-medium rounded hover:bg-green-dark transition-colors"
                      >
                        View
                      </a>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        disabled={deletingPost === post.id}
                        className="px-3 py-1 bg-red-500 text-white text-sm font-medium rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingPost === post.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {posts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-medium text-lg">No posts found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add New Class Modal */}
        {showAddClassModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-green/20 max-w-md w-full p-8 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green/5 to-transparent rounded-2xl"></div>
              <div className="relative">
                <div className="text-center mb-6">
                  <div className="inline-block p-3 bg-green/10 rounded-full border-2 border-green/30 mb-4">
                    <i className="fas fa-plus text-green text-xl"></i>
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-gray-dark mb-2">
                    Add New Class
                  </h3>
                  <p className="text-gray-medium font-light">
                    Enter the graduation year for the new class
                  </p>
                </div>

                <form onSubmit={handleAddNewClass} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-dark mb-2">
                      Graduation Year
                    </label>
                    <input
                      type="text"
                      value={newClassYear}
                      onChange={(e) => setNewClassYear(e.target.value)}
                      placeholder="e.g., 2030"
                      required
                      className="w-full px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark placeholder-gray-medium font-medium"
                    />
                    {classYears.includes(newClassYear) && newClassYear && (
                      <p className="text-red-600 text-sm mt-1">
                        This class year already exists
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleCancelAddClass}
                      className="flex-1 py-3 px-4 bg-gray-light text-gray-dark font-semibold rounded-lg hover:bg-gray-200 transition-all duration-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        !newClassYear || classYears.includes(newClassYear)
                      }
                      className="flex-1 py-3 px-4 bg-green text-white font-semibold rounded-lg hover:bg-green-dark focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      Add Class
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
