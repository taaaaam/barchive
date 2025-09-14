"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { getDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProfileDropdown from "@/components/ProfileDropdown";
import { uploadPDF } from "@/lib/cloudinary";

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
      // Upload PDF to Cloudinary
      const pdfUrl = await uploadPDF(newNewsletter.pdfFile);

      // Save newsletter data to Firestore
      await addDoc(collection(db, "newsletters"), {
        title: newNewsletter.title,
        pdfUrl: pdfUrl,
        issueDate: newNewsletter.issueDate,
        authorId: user.uid,
        authorName: userProfile.username || user.email,
        createdAt: serverTimestamp(),
      });

      // Reset form and refresh list
      setNewNewsletter({ title: "", pdfFile: null, issueDate: "" });
      setShowAddForm(false);
      fetchNewsletters();
    } catch (error) {
      console.error("Error adding newsletter:", error);
      alert("Error adding newsletter. Please try again.");
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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
              Newsletters
            </h1>
            <p className="text-white/80 text-xl font-light">
              Stay updated with BaR Club news and updates
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
                <div className="flex justify-between items-start">
                  <div className="flex-1">
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
                  <div className="ml-4">
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
