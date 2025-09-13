"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db, auth, ADMIN_EMAIL } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import AdminDashboard from "@/components/AdminDashboard";
import ProfileDropdown from "@/components/ProfileDropdown";

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          // Fetch user profile
          const userDoc = await getDoc(doc(db, "users", user.uid));

          if (userDoc.exists()) {
            const profile = userDoc.data();
            setUserProfile(profile);

            // Check if user is admin
            if (profile?.isAdmin) {
              // User is admin, stay on this page
            } else {
              // User is not admin, redirect to home
              router.push("/");
            }
          } else {
            // Fallback: if user doc doesn't exist but email matches admin, treat as admin
            if (user.email === ADMIN_EMAIL) {
              setUserProfile({
                email: user.email,
                username: "admin",
                firstName: "Admin",
                lastName: "User",
                isAdmin: true,
              });
            } else {
              // User is not admin, redirect to home
              router.push("/");
            }
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          // Fallback for admin email
          if (user.email === ADMIN_EMAIL) {
            setUserProfile({
              email: user.email,
              username: "admin",
              firstName: "Admin",
              lastName: "User",
              isAdmin: true,
            });
          } else {
            // User is not admin, redirect to home
            router.push("/");
          }
        }
      } else {
        // No user, redirect to login
        router.push("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error: any) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-light to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-green border-t-transparent"></div>
      </div>
    );
  }

  if (!user || !userProfile || !userProfile.isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-light to-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-dark mb-4">
            Access Denied
          </h1>
          <p className="text-gray-medium">You don't have admin privileges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-light to-white">
      {/* Header */}
      <header className="bg-green shadow-2xl border-b-4 border-green-light relative">
        <div className="absolute inset-0 bg-gradient-to-r from-green via-green-dark to-green opacity-90"></div>
        <div className="relative max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/10 rounded-full border-2 border-white/20">
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12,4A4,4 0 0,0 8,8A4,4 0 0,0 12,12A4,4 0 0,0 16,8A4,4 0 0,0 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-serif font-bold text-white">
                  Admin Dashboard
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/")}
                className="px-4 py-2 text-white hover:text-gray-light font-medium transition-colors duration-300"
              >
                View Blog
              </button>
              {userProfile && (
                <ProfileDropdown
                  username={userProfile.username}
                  profilePicture={userProfile.profilePicture}
                />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-12">
        <AdminDashboard />
      </main>

      {/* Footer */}
      <footer className="bg-green text-white py-12 mt-20">
        <div className="max-w-7xl mx-auto px-8">
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
    </div>
  );
}
