"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import ProfileDropdown from "@/components/ProfileDropdown";
import ImageModal from "@/components/ImageModal";
import UploadModal from "@/components/UploadModal";
import {
  extractCloudinaryPublicId,
  deleteCloudinaryImage,
} from "@/lib/imageUtils";

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

export default function MemoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [memory, setMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);
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
    if (resolvedParams.id) {
      fetchMemory();
    }
  }, [resolvedParams.id]);

  const fetchMemory = async () => {
    try {
      const memoryDoc = await getDoc(doc(db, "memories", resolvedParams.id));
      if (memoryDoc.exists()) {
        setMemory({
          id: memoryDoc.id,
          ...memoryDoc.data(),
        } as Memory);
      } else {
        router.push("/memories");
      }
    } catch (error) {
      console.error("Error fetching memory:", error);
      router.push("/memories");
    } finally {
      setLoading(false);
    }
  };

  const handleImagesUpload = async (imageUrls: string[]) => {
    if (!memory || !user || imageUrls.length === 0) return;

    setUploading(true);
    try {
      await updateDoc(doc(db, "memories", memory.id), {
        photos: arrayUnion(...imageUrls),
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setMemory({
        ...memory,
        photos: [...memory.photos, ...imageUrls],
      });
    } catch (error) {
      console.error("Error adding photos:", error);
      alert("Error adding photos. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleImageClick = (index: number) => {
    setModalImageIndex(index);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleOpenUploadModal = () => {
    setUploadModalOpen(true);
  };

  const handleCloseUploadModal = () => {
    setUploadModalOpen(false);
  };

  const handleDeleteMemory = async () => {
    if (
      !memory ||
      !confirm(
        "Are you sure you want to delete this memory? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      await deleteDoc(doc(db, "memories", memory.id));
      router.push("/memories");
    } catch (error) {
      console.error("Error deleting memory:", error);
      alert("Error deleting memory. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeletePhoto = async (photoUrl: string, photoIndex: number) => {
    if (
      !memory ||
      !confirm(
        "Are you sure you want to delete this photo? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeletingPhoto(photoUrl);
    try {
      // Extract public ID from Cloudinary URL
      const publicId = extractCloudinaryPublicId(photoUrl);

      if (publicId) {
        // Delete from Cloudinary
        const cloudinarySuccess = await deleteCloudinaryImage(publicId);
        if (!cloudinarySuccess) {
          console.warn(
            "Failed to delete image from Cloudinary, but continuing with database update"
          );
        }
      } else {
        console.warn("Could not extract public ID from URL:", photoUrl);
      }

      // Remove from Firestore
      await updateDoc(doc(db, "memories", memory.id), {
        photos: arrayRemove(photoUrl),
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setMemory({
        ...memory,
        photos: memory.photos.filter((_, index) => index !== photoIndex),
      });
    } catch (error) {
      console.error("Error deleting photo:", error);
      alert("Error deleting photo. Please try again.");
    } finally {
      setDeletingPhoto(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-light to-white">
        <div className="max-w-7xl mx-auto px-8 py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-green border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-medium">Loading memory...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!memory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-light to-white">
        <div className="max-w-7xl mx-auto px-8 py-20">
          <div className="text-center">
            <h1 className="text-3xl font-serif font-bold text-gray-dark mb-4">
              Memory Not Found
            </h1>
            <Link
              href="/memories"
              className="inline-flex items-center px-6 py-3 bg-green text-white font-semibold rounded-lg hover:bg-green-dark transition-all duration-300"
            >
              Back to Memories
            </Link>
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
                href="/memories"
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
                Back to Memories
              </Link>
            </div>
            <div className="flex items-center space-x-4">
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
              {memory.title}
            </h1>
            {memory.description && (
              <p className="text-white/80 text-xl font-light max-w-3xl mx-auto">
                {memory.description}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Photos Section Header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-serif font-bold text-gray-dark">
            Photos ({memory.photos.length})
          </h2>
          <div className="flex gap-3">
            <button
              onClick={handleOpenUploadModal}
              disabled={uploading}
              className="inline-flex items-center px-6 py-3 bg-green text-white font-semibold rounded-lg hover:bg-green-dark transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="mr-2 w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Upload Photos
            </button>
            {user && memory.authorId === user.uid && (
              <button
                onClick={handleDeleteMemory}
                disabled={deleting}
                className="inline-flex items-center px-4 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete memory"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg
                      className="mr-2 w-4 h-4"
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
                    Delete Memory
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Photos Grid */}
        <div className="mb-8">
          {memory.photos.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {memory.photos.map((photo, index) => (
                <div
                  key={index}
                  className="relative group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-green/20 hover:border-green/40"
                >
                  <div className="aspect-square relative">
                    <Image
                      src={photo}
                      alt={`Memory photo ${index + 1}`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Delete button - only show for memory author */}
                    {user && memory.authorId === user.uid && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleDeletePhoto(photo, index);
                        }}
                        disabled={deletingPhoto === photo}
                        className="absolute top-3 right-3 p-2 bg-red-500/90 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm z-10"
                        title="Delete photo"
                      >
                        {deletingPhoto === photo ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
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
                    )}

                    {/* Clickable overlay for opening image modal */}
                    <div
                      className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center cursor-pointer"
                      onClick={() => handleImageClick(index)}
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-white/90 rounded-full p-3">
                          <svg
                            className="w-6 h-6 text-gray-dark"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
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
                No Photos Yet
              </h3>
              <p className="text-gray-medium mb-8 max-w-md mx-auto">
                Start building this memory by uploading your first photo above.
              </p>
            </div>
          )}
        </div>

        {/* Links Section */}
        {memory.links && memory.links.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-serif font-bold text-gray-dark mb-6">
              External Links ({memory.links.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {memory.links.map((link, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-green/20 p-4 group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-green/10 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-green"
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
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm truncate block group-hover:underline"
                      >
                        {link}
                      </a>
                      <p className="text-gray-500 text-xs mt-1">
                        External photo collection
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Memory Info */}
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-green/20 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm text-gray-medium">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <span>Created by {memory.authorName}</span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green/10 text-green border border-green/20">
                Class of {memory.classYear}
              </span>
            </div>
            <span>
              {memory.createdAt?.toDate?.()?.toLocaleDateString() || "No date"}
            </span>
          </div>
        </div>
      </main>

      {/* Image Modal */}
      {memory && (
        <ImageModal
          images={memory.photos}
          currentIndex={modalImageIndex}
          isOpen={modalOpen}
          onClose={handleCloseModal}
        />
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={handleCloseUploadModal}
        onImagesUpload={handleImagesUpload}
        uploading={uploading}
      />
    </div>
  );
}
