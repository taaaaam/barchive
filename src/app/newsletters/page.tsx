"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { getDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ProfileDropdown from "@/components/ProfileDropdown";
import MapLink from "@/components/MapLink";
import { uploadPDF, extractPublicId, deleteCloudinaryImage } from "@/lib/cloudinary";

interface Newsletter {
  id: string;
  title: string;
  pdfUrl: string;
  issueDate: string;
  createdAt: any;
  authorId: string;
  authorName: string;
}

export default function NewslettersPage() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingNewsletter, setDeletingNewsletter] = useState<string | null>(null);
  const [showContent, setShowContent] = useState(false);
  const [newNewsletter, setNewNewsletter] = useState({
    title: "",
    pdfFile: null as File | null,
    issueDate: "",
  });
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
    fetchNewsletters();
  }, []);

  const fetchNewsletters = async () => {
    try {
      const newslettersQuery = query(
        collection(db, "newsletters"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(newslettersQuery);

      const newslettersData: Newsletter[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        newslettersData.push({
          id: doc.id,
          title: data.title,
          pdfUrl: data.pdfUrl,
          issueDate: data.issueDate,
          createdAt: data.createdAt,
          authorId: data.authorId,
          authorName: data.authorName,
        });
      });

      setNewsletters(newslettersData);
    } catch (error) {
      console.error("Error fetching newsletters:", error);
    } finally {
      setLoading(false);
      // Trigger fade-in after a brief delay
      setTimeout(() => {
        setShowContent(true);
      }, 100);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile || !newNewsletter.pdfFile) return;

    setUploading(true);
    try {
      console.log("🚀 Starting newsletter upload process...");
      console.log("📋 Newsletter data:", {
        title: newNewsletter.title,
        issueDate: newNewsletter.issueDate,
        file: newNewsletter.pdfFile.name,
        fileSize: `${(newNewsletter.pdfFile.size / 1024 / 1024).toFixed(2)} MB`,
      });

      // Upload PDF to Cloudinary
      const pdfUrl = await uploadPDF(newNewsletter.pdfFile);
      console.log("✅ PDF uploaded successfully, saving to Firestore...");

      // Save newsletter data to Firestore
      await addDoc(collection(db, "newsletters"), {
        title: newNewsletter.title,
        pdfUrl: pdfUrl,
        issueDate: newNewsletter.issueDate,
        authorId: user.uid,
        authorName: userProfile.username || user.email,
        createdAt: serverTimestamp(),
      });

      console.log("✅ Newsletter saved successfully!");

      // Reset form and refresh list
      setNewNewsletter({ title: "", pdfFile: null, issueDate: "" });
      setShowAddForm(false);
      fetchNewsletters();
    } catch (error: any) {
      console.error("❌ Error adding newsletter:", error);
      console.error("❌ Error stack:", error.stack);
      
      // Show more detailed error message
      const errorMessage = error.message || "Unknown error occurred";
      alert(`Error adding newsletter: ${errorMessage}\n\nCheck the browser console for more details.`);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setNewNewsletter({ ...newNewsletter, pdfFile: file });
    } else {
      alert("Please select a PDF file.");
    }
  };

  const handleDeleteNewsletter = async (newsletterId: string, pdfUrl: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this newsletter? This action cannot be undone. This will also delete the PDF from Cloudinary."
      )
    ) {
      return;
    }

    setDeletingNewsletter(newsletterId);
    try {
      // Delete the PDF from Cloudinary (PDFs are stored as "raw" resources)
      const publicId = extractPublicId(pdfUrl);
      if (publicId) {
        const deleted = await deleteCloudinaryImage(publicId, "raw");
        if (!deleted) {
          console.warn("Failed to delete PDF from Cloudinary, but continuing with Firestore deletion");
        }
      }

      // Delete the newsletter from Firestore
      await deleteDoc(doc(db, "newsletters", newsletterId));

      // Refresh the list
      fetchNewsletters();
    } catch (error) {
      console.error("Error deleting newsletter:", error);
      alert("Error deleting newsletter. Please try again.");
    } finally {
      setDeletingNewsletter(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Convert PDF URL to preview image URL using Cloudinary transformations
  const getPDFPreviewUrl = (pdfUrl: string): string => {
    try {
      // Cloudinary can generate a preview from PDF by converting it to an image
      // We'll use the first page (pg_1) and convert to JPG format
      // Transformations: f_jpg (format), pg_1 (page 1), w_300 (width), h_400 (height), c_fill (crop fill), q_auto (quality)
      
      // Handle different Cloudinary URL formats
      if (pdfUrl.includes("/raw/upload/")) {
        // For raw uploads, change to image endpoint and add transformations
        return pdfUrl.replace("/raw/upload/", "/image/upload/f_jpg,pg_1,w_300,h_400,c_fill,q_auto/");
      } else if (pdfUrl.includes("/upload/v")) {
        // If it has a version, insert transformations after /upload/
        return pdfUrl.replace("/upload/v", "/upload/f_jpg,pg_1,w_300,h_400,c_fill,q_auto/v");
      } else if (pdfUrl.includes("/upload/")) {
        // If it's using /upload/ without version, add transformations
        return pdfUrl.replace("/upload/", "/upload/f_jpg,pg_1,w_300,h_400,c_fill,q_auto/");
      }
      return pdfUrl;
    } catch (error) {
      console.error("Error generating PDF preview URL:", error);
      return pdfUrl;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-light to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-medium">Loading newsletters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-light to-white">
      {/* Header */}
      <header
        className={`bg-green shadow-2xl border-b-4 border-green-light relative transition-opacity duration-500 ${
          showContent ? "opacity-100" : "opacity-0"
        }`}
      >
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
              <MapLink />
              {userProfile && (
                <ProfileDropdown
                  username={userProfile.username}
                  profilePicture={userProfile.profilePicture}
                  isAdmin={userProfile.isAdmin}
                />
              )}
            </div>
          </div>
          <div className="text-center mt-8">
            <h1 className="text-5xl font-serif font-bold text-white mb-4">
              Newsletters
            </h1>
            <p className="text-white/80 text-xl font-light">
              Stay updated with BaR news and updates
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div
        className={`max-w-6xl mx-auto p-6 transition-opacity duration-500 ${
          showContent ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Add Newsletter Button */}
        {user && userProfile && (
          <div className="mb-8">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-green text-white px-6 py-3 rounded-lg hover:bg-green-dark transition-colors duration-300 font-semibold"
            >
              {showAddForm ? "Cancel" : "Add Newsletter"}
            </button>
          </div>
        )}

        {/* Add Newsletter Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-2 border-green/20">
            <h2 className="text-2xl font-serif font-bold text-gray-dark mb-6">
              Add New Newsletter
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-dark mb-2">
                  Newsletter Title
                </label>
                <input
                  type="text"
                  value={newNewsletter.title}
                  onChange={(e) =>
                    setNewNewsletter({
                      ...newNewsletter,
                      title: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green focus:border-green transition-colors duration-200 text-gray-dark"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-dark mb-2">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={newNewsletter.issueDate}
                  onChange={(e) =>
                    setNewNewsletter({
                      ...newNewsletter,
                      issueDate: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green focus:border-green transition-colors duration-200 text-gray-dark"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-dark mb-2">
                  PDF File
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green focus:border-green transition-colors duration-200 text-gray-dark file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green file:text-white hover:file:bg-green-dark file:cursor-pointer cursor-pointer"
                    required
                  />
                </div>
                {newNewsletter.pdfFile && (
                  <p className="text-sm text-green mt-1">
                    Selected: {newNewsletter.pdfFile.name}
                  </p>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className="bg-green text-white px-6 py-2 rounded-lg hover:bg-green-dark transition-colors duration-300 disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Add Newsletter"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray text-white px-6 py-2 rounded-lg hover:bg-gray-dark transition-colors duration-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Newsletters List */}
        <div className="space-y-4">
          {newsletters.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-dark text-lg">No newsletters found.</p>
              {user && userProfile && (
                <p className="text-gray-medium mt-2">
                  Be the first to add one!
                </p>
              )}
            </div>
          ) : (
            newsletters.map((newsletter) => (
              <div
                key={newsletter.id}
                className="bg-white rounded-lg shadow-lg p-6 border-2 border-green/20 hover:shadow-xl transition-shadow duration-300"
              >
                <div className="flex gap-6">
                  {/* PDF Preview Image */}
                  <div className="flex-shrink-0">
                    <div className="w-32 h-40 rounded-lg overflow-hidden border-2 border-green/20 bg-gray-light relative">
                      <Image
                        src={getPDFPreviewUrl(newsletter.pdfUrl)}
                        alt={`${newsletter.title} preview`}
                        fill
                        className="object-cover"
                        unoptimized
                        onError={(e) => {
                          // Show fallback if preview fails to load
                          const img = e.currentTarget;
                          img.style.display = "none";
                          const container = img.parentElement;
                          if (container && !container.querySelector(".pdf-fallback")) {
                            const fallback = document.createElement("div");
                            fallback.className = "pdf-fallback w-full h-full flex items-center justify-center bg-green/10 absolute inset-0";
                            fallback.innerHTML = `
                              <svg class="w-12 h-12 text-green" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
                              </svg>
                            `;
                            container.appendChild(fallback);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Newsletter Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-serif font-bold text-gray-dark mb-2">
                        {newsletter.title}
                      </h3>
                      <p className="text-gray-medium mb-4">
                        Issue Date: {formatDate(newsletter.issueDate)}
                      </p>
                      <p className="text-sm text-gray-light">
                        Added by {newsletter.authorName}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col items-end gap-3">
                    <a
                      href={newsletter.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-green text-white px-6 py-2 rounded-lg hover:bg-green-dark transition-colors duration-300 font-semibold inline-flex items-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                      View PDF
                    </a>
                    {/* Show delete button for admins or the author */}
                    {(userProfile?.isAdmin || newsletter.authorId === user?.uid) && (
                      <button
                        onClick={() => handleDeleteNewsletter(newsletter.id, newsletter.pdfUrl)}
                        disabled={deletingNewsletter === newsletter.id}
                        className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                      >
                        {deletingNewsletter === newsletter.id ? (
                          <>
                            <svg
                              className="animate-spin h-4 w-4"
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
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            Deleting...
                          </>
                        ) : (
                          <>
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
                            Delete
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
