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
import NewsletterSpread from "@/components/NewsletterSpread";
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

  if (loading) {
    return (
      <div className="min-h-screen bg-green flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white/75">Loading newsletters...</p>
        </div>
      </div>
    );
  }

  return (
    // overflow-x-clip: the full-width newsletter spread can be a scrollbar-width wider than the page
    <div className="min-h-screen bg-green overflow-x-clip">
      {/* Header */}
      <header
        className={`page-header-enter bg-green relative transition-opacity duration-500 ${
          showContent ? "opacity-100" : "opacity-0"
        }`}
      >
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
        className={`page-main-enter max-w-6xl mx-auto p-6 transition-opacity duration-500 ${
          showContent ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Add Newsletter Button */}
        {user && userProfile && (
          <div className="mb-8">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-white text-green px-6 py-3 rounded-lg hover:bg-gray-light transition-colors duration-300 font-semibold"
            >
              {showAddForm ? "Cancel" : "Add Newsletter"}
            </button>
          </div>
        )}

        {/* Add Newsletter Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
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
                  className="border border-gray-300 focus:border-green w-full px-4 py-3 bg-white rounded-lg focus:ring-2 focus:ring-green transition-colors duration-200 text-gray-dark"
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
                  className="border border-gray-300 focus:border-green w-full px-4 py-3 bg-white rounded-lg focus:ring-2 focus:ring-green transition-colors duration-200 text-gray-dark"
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
                    className="border border-gray-300 focus:border-green w-full px-4 py-3 bg-white rounded-lg focus:ring-2 focus:ring-green transition-colors duration-200 text-gray-dark file:mr-4 file:py-2 file:px-4 file:rounded-full file:text-sm file:font-semibold file:bg-green file:text-white hover:file:bg-green-dark file:cursor-pointer cursor-pointer"
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

        {/* Newsletters, fanned out by issue date (oldest left, newest right) */}
        {newsletters.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white text-lg">No newsletters found.</p>
            {user && userProfile && (
              <p className="text-white/75 mt-2">Be the first to add one!</p>
            )}
          </div>
        ) : (
          <NewsletterSpread
            newsletters={[...newsletters]
              .sort((a, b) => a.issueDate.localeCompare(b.issueDate))
              .map((newsletter) => ({
                id: newsletter.id,
                title: newsletter.title,
                pdfUrl: newsletter.pdfUrl,
                issueDate: newsletter.issueDate,
                canDelete:
                  !!userProfile?.isAdmin || newsletter.authorId === user?.uid,
              }))}
            deletingId={deletingNewsletter}
            onDelete={(newsletter) =>
              handleDeleteNewsletter(newsletter.id, newsletter.pdfUrl)
            }
          />
        )}
      </div>
    </div>
  );
}
