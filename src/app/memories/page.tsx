"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import ProfileDropdown from "@/components/ProfileDropdown";
import { getDoc } from "firebase/firestore";

interface Memory {
  id: string;
  title: string;
  description?: string;
  photos: string[];
  links?: string[];
  classYear: string;
  createdAt: any;
  authorId: string;
  authorName: string;
}

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMemory, setNewMemory] = useState({
    title: "",
    description: "",
    classYear: "",
    links: [] as string[],
  });
  const [newLink, setNewLink] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedClassYear, setSelectedClassYear] = useState("all");
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [deletingMemory, setDeletingMemory] = useState<string | null>(null);
  const [availableClassYears, setAvailableClassYears] = useState<string[]>([]);
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
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchMemories();
      fetchClassYears();
    }
  }, [user]);

  const fetchClassYears = async () => {
    try {
      const classesQuery = query(
        collection(db, "classes"),
        orderBy("year", "asc")
      );
      const snapshot = await getDocs(classesQuery);

      if (snapshot.empty) {
        // Fallback to default years if no classes exist
        setAvailableClassYears(["2025", "2026", "2027", "2028", "2029"]);
      } else {
        const years = snapshot.docs.map((doc) => doc.data().year);
        setAvailableClassYears(years);
      }
    } catch (error) {
      console.error("Error fetching class years:", error);
      // Fallback to default years
      setAvailableClassYears(["2025", "2026", "2027", "2028", "2029"]);
    }
  };

  const fetchMemories = async () => {
    try {
      const memoriesQuery = query(
        collection(db, "memories"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(memoriesQuery);

      const memoriesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Memory[];

      setMemories(memoriesData);
    } catch (error) {
      console.error("Error fetching memories:", error);
    } finally {
      setLoading(false);
    }
  };

  const addLink = () => {
    if (newLink.trim() && !newMemory.links.includes(newLink.trim())) {
      setNewMemory({
        ...newMemory,
        links: [...newMemory.links, newLink.trim()],
      });
      setNewLink("");
    }
  };

  const removeLink = (index: number) => {
    setNewMemory({
      ...newMemory,
      links: newMemory.links.filter((_, i) => i !== index),
    });
  };

  // Filter memories based on selected class year
  const filteredMemories =
    selectedClassYear === "all"
      ? memories
      : memories.filter((memory) => memory.classYear === selectedClassYear);

  // Get unique class years for filter dropdown
  const classYears = Array.from(
    new Set(memories.map((memory) => memory.classYear))
  ).sort((a, b) => b.localeCompare(a));

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      await addDoc(collection(db, "memories"), {
        title: newMemory.title,
        description: newMemory.description || null,
        classYear: newMemory.classYear,
        photos: [],
        links: newMemory.links,
        authorId: user?.uid,
        authorName: userProfile?.username || user?.email,
        createdAt: serverTimestamp(),
      });

      setNewMemory({ title: "", description: "", classYear: "", links: [] });
      setNewLink("");
      setShowCreateForm(false);
      fetchMemories();
    } catch (error) {
      console.error("Error creating memory:", error);
      alert("Error creating memory. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this memory? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeletingMemory(memoryId);
    try {
      await deleteDoc(doc(db, "memories", memoryId));
      fetchMemories();
    } catch (error) {
      console.error("Error deleting memory:", error);
      alert("Error deleting memory. Please try again.");
    } finally {
      setDeletingMemory(null);
    }
  };

  const handleEditMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMemory) return;

    try {
      await updateDoc(doc(db, "memories", editingMemory.id), {
        title: editingMemory.title,
        description: editingMemory.description || null,
        classYear: editingMemory.classYear,
        links: editingMemory.links,
        updatedAt: serverTimestamp(),
      });

      setEditingMemory(null);
      fetchMemories();
    } catch (error) {
      console.error("Error updating memory:", error);
      alert("Error updating memory. Please try again.");
    }
  };

  const startEditing = (memory: Memory) => {
    setEditingMemory({
      ...memory,
      links: memory.links || [],
    });
    setShowCreateForm(false);
  };

  const cancelEditing = () => {
    setEditingMemory(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-light to-white">
        <div className="max-w-7xl mx-auto px-8 py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-green border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-medium">Loading memories...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-light to-white">
      {/* Header */}
      <header className="bg-green shadow-2xl border-b-4 border-green-light relative">
        <div className="absolute inset-0 bg-gradient-to-r from-green via-green-dark to-green opacity-90"></div>
        <div className="relative max-w-7xl mx-auto px-8 py-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
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
            <div className="flex items-center space-x-4">
              <Link
                href="/members"
                className="text-white hover:text-gray-light font-medium text-lg transition-colors duration-300"
              >
                Delegations
              </Link>
              {userProfile && (
                <ProfileDropdown
                  username={userProfile.username}
                  profilePicture={userProfile.profilePicture}
                />
              )}
            </div>
          </div>
          <div className="text-center mt-8">
            <h1 className="text-5xl font-serif font-bold text-white mb-4">
              Memories
            </h1>
            <p className="text-white/80 text-xl font-light">
              Preserve and share our society's cherished moments
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <h2 className="text-3xl font-serif font-bold text-gray-dark">
              {selectedClassYear === "all"
                ? "All Memories"
                : `Class of ${selectedClassYear} Memories`}{" "}
              ({filteredMemories.length})
            </h2>
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-dark">
                Filter by class:
              </label>
              <select
                value={selectedClassYear}
                onChange={(e) => setSelectedClassYear(e.target.value)}
                className="px-3 py-2 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark font-medium"
              >
                <option value="all">All Classes</option>
                {classYears.map((year) => (
                  <option key={year} value={year}>
                    Class of {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-6 py-3 bg-green text-white font-semibold rounded-lg hover:bg-green-dark transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            {showCreateForm ? "Cancel" : "Create New Memory"}
          </button>
        </div>

        {/* Edit Memory Form */}
        {editingMemory && (
          <div className="mb-8 p-6 bg-white rounded-2xl shadow-2xl border-2 border-green/20">
            <h3 className="text-xl font-serif font-bold text-gray-dark mb-4">
              Edit Memory
            </h3>
            <form onSubmit={handleEditMemory} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-dark mb-2">
                  Memory Title
                </label>
                <input
                  type="text"
                  value={editingMemory.title}
                  onChange={(e) =>
                    setEditingMemory({
                      ...editingMemory,
                      title: e.target.value,
                    })
                  }
                  required
                  className="w-full px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark font-medium"
                  placeholder="Enter memory title"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-dark mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={editingMemory.description || ""}
                  onChange={(e) =>
                    setEditingMemory({
                      ...editingMemory,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark font-medium resize-none"
                  rows={3}
                  placeholder="Enter memory description"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-dark mb-2">
                  Class Year
                </label>
                <select
                  value={editingMemory.classYear}
                  onChange={(e) =>
                    setEditingMemory({
                      ...editingMemory,
                      classYear: e.target.value,
                    })
                  }
                  required
                  className="w-full px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark font-medium"
                >
                  <option value="">Select class year</option>
                  {availableClassYears.map((year) => (
                    <option key={year} value={year}>
                      Class of {year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Links Section */}
              <div>
                <label className="block text-sm font-semibold text-gray-dark mb-2">
                  External Links (Optional)
                </label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newLink}
                      onChange={(e) => setNewLink(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addLink())
                      }
                      className="flex-1 px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark font-medium"
                      placeholder="Add link to external photo collection (e.g., Adobe Lightroom, Google Photos)"
                    />
                    <button
                      type="button"
                      onClick={addLink}
                      disabled={!newLink.trim()}
                      className="px-4 py-3 bg-green text-white rounded-lg hover:bg-green-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      Add
                    </button>
                  </div>

                  {/* Display added links */}
                  {editingMemory.links && editingMemory.links.length > 0 && (
                    <div className="space-y-2">
                      {editingMemory.links.map((link, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                        >
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm truncate flex-1 mr-2"
                          >
                            {link}
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              const updatedLinks =
                                editingMemory.links?.filter(
                                  (_, i) => i !== index
                                ) || [];
                              setEditingMemory({
                                ...editingMemory,
                                links: updatedLinks,
                              });
                            }}
                            className="text-red-500 hover:text-red-700 p-1"
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
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-4 px-6 bg-green text-white font-serif font-semibold text-lg rounded-lg hover:bg-green-dark focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  Update Memory
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="flex-1 py-4 px-6 bg-gray-500 text-white font-serif font-semibold text-lg rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Create Memory Form */}
        {showCreateForm && (
          <div className="mb-8 p-6 bg-white rounded-2xl shadow-2xl border-2 border-green/20">
            <h3 className="text-xl font-serif font-bold text-gray-dark mb-4">
              Create New Memory
            </h3>
            <form onSubmit={handleCreateMemory} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-dark mb-2">
                  Memory Title
                </label>
                <input
                  type="text"
                  value={newMemory.title}
                  onChange={(e) =>
                    setNewMemory({ ...newMemory, title: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark font-medium"
                  placeholder="Enter memory title"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-dark mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newMemory.description}
                  onChange={(e) =>
                    setNewMemory({ ...newMemory, description: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark font-medium resize-none"
                  rows={3}
                  placeholder="Enter memory description"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-dark mb-2">
                  Class Year
                </label>
                <select
                  value={newMemory.classYear}
                  onChange={(e) =>
                    setNewMemory({ ...newMemory, classYear: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark font-medium"
                >
                  <option value="">Select class year</option>
                  {availableClassYears.map((year) => (
                    <option key={year} value={year}>
                      Class of {year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Links Section */}
              <div>
                <label className="block text-sm font-semibold text-gray-dark mb-2">
                  External Links (Optional)
                </label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newLink}
                      onChange={(e) => setNewLink(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addLink())
                      }
                      className="flex-1 px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark font-medium"
                      placeholder="Add link to external photo collection (e.g., Adobe Lightroom, Google Photos)"
                    />
                    <button
                      type="button"
                      onClick={addLink}
                      disabled={!newLink.trim()}
                      className="px-4 py-3 bg-green text-white rounded-lg hover:bg-green-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      Add
                    </button>
                  </div>

                  {/* Display added links */}
                  {newMemory.links.length > 0 && (
                    <div className="space-y-2">
                      {newMemory.links.map((link, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                        >
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm truncate flex-1 mr-2"
                          >
                            {link}
                          </a>
                          <button
                            type="button"
                            onClick={() => removeLink(index)}
                            className="text-red-500 hover:text-red-700 p-1"
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
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-4 px-6 bg-green text-white font-serif font-semibold text-lg rounded-lg hover:bg-green-dark focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                {isCreating ? "Creating..." : "Create Memory"}
              </button>
            </form>
          </div>
        )}

        {/* Memories Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredMemories.map((memory) => (
            <div
              key={memory.id}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 overflow-hidden group hover:-translate-y-1 relative"
            >
              {/* Edit/Delete buttons for memory publisher */}
              {user && memory.authorId === user.uid && (
                <div className="absolute top-3 right-3 z-20 flex gap-1">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      startEditing(memory);
                    }}
                    className="p-1.5 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-green hover:bg-green/10 rounded-lg transition-all duration-200 shadow-sm"
                    title="Edit memory"
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
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteMemory(memory.id);
                    }}
                    disabled={deletingMemory === memory.id}
                    className="p-1.5 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete memory"
                  >
                    {deletingMemory === memory.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              )}

              <Link href={`/memories/${memory.id}`} className="relative block">
                {/* Cover Image */}
                <div className="aspect-square relative bg-gray-100">
                  {memory.photos.length > 0 ? (
                    <img
                      src={memory.photos[0]}
                      alt={memory.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green/10 to-green/5">
                      <div className="text-center">
                        <svg
                          className="w-12 h-12 text-green/60 mx-auto mb-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <p className="text-sm text-green/60 font-medium">
                          No Photos
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Photo count badge */}
                  {memory.photos.length > 1 && (
                    <div className="absolute top-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                      +{memory.photos.length - 1} more
                    </div>
                  )}
                </div>

                {/* Bottom overlay with metadata */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-4">
                  <div className="text-white">
                    <h3 className="font-semibold text-lg mb-1 line-clamp-1 group-hover:text-green-300 transition-colors">
                      {memory.title}
                    </h3>

                    {memory.description && (
                      <p className="text-sm text-gray-200 line-clamp-2 mb-2">
                        {memory.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs">
                      <span className="bg-green/20 text-green-300 px-2 py-1 rounded-full font-medium">
                        Class of {memory.classYear}
                      </span>

                      <div className="flex items-center gap-3 text-gray-300">
                        <span className="flex items-center gap-1">
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
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          {memory.photos.length}
                        </span>

                        {memory.links && memory.links.length > 0 && (
                          <span className="flex items-center gap-1">
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
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                            {memory.links.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {filteredMemories.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-block p-6 bg-green/5 rounded-full border-2 border-green/20 mb-6">
              <svg
                className="w-16 h-16 text-green"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-serif font-bold text-gray-dark mb-4">
              No Memories Yet
            </h3>
            <p className="text-gray-medium mb-8 max-w-md mx-auto">
              Be the first to create a memory and start preserving our society's
              cherished moments.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
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
              Create First Memory
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
