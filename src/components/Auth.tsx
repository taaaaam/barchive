"use client";
import { useCallback, useState } from "react";
import { auth, db, ADMIN_EMAIL } from "@/lib/firebase";
import {
  signOut,
  onAuthStateChanged,
  User,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ClassSelection from "./ClassSelection";
import MemberSelection, { ClaimedAccount } from "./MemberSelection";
import ProfileSetup from "./ProfileSetup";
import AdminDashboard from "./AdminDashboard";

export default function Auth() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<
    "class" | "members" | "admin" | "admin-login"
  >("class");
  const [selectedClass, setSelectedClass] = useState("");
  const [adminLogin, setAdminLogin] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  // A new account is being claimed ("pending") or was just claimed and is
  // going through the optional profile setup; hold the home redirect meanwhile
  const [claim, setClaim] = useState<null | "pending" | ClaimedAccount>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      //   console.log("Auth state changed:", user?.email);
      setUser(user);
      if (user) {
        try {
          // Fetch user profile
          const userDoc = await getDoc(doc(db, "users", user.uid));
          console.log("User doc exists:", userDoc.exists());

          if (userDoc.exists()) {
            const profile = userDoc.data();
            console.log("User profile:", profile);
            setUserProfile(profile);

            // Check if user is admin
            if (profile?.isAdmin) {
              console.log("User is admin, will redirect to admin dashboard");
            }
          } else {
            console.log("User doc doesn't exist, checking if admin email");
            // Fallback: if user doc doesn't exist but email matches admin, treat as admin
            if (user.email === ADMIN_EMAIL) {
              console.log(
                "Admin email detected, creating profile and will redirect to admin"
              );
              setUserProfile({
                email: user.email,
                username: "admin",
                firstName: "Admin",
                lastName: "User",
                isAdmin: true,
              });
            }
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          // Fallback for admin email
          if (user.email === ADMIN_EMAIL) {
            console.log("Error fetching profile, but admin email detected");
            setUserProfile({
              email: user.email,
              username: "admin",
              firstName: "Admin",
              lastName: "User",
              isAdmin: true,
            });
          }
        }
      } else {
        setUserProfile(null);
        setCurrentStep("class");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Regular users go to the home page, which plays its intro animation
  const goHome = useCallback(() => {
    router.push("/");
  }, [router]);

  // Handle redirects in useEffect to avoid render-time navigation
  useEffect(() => {
    if (claim) return; // claiming / profile setup in progress
    if (user && userProfile) {
      if (userProfile.isAdmin) {
        router.push("/admin");
      } else {
        goHome();
      }
    }
  }, [user, userProfile, router, claim, goHome]);

  const handleClassSelected = (classYear: string) => {
    setSelectedClass(classYear);
    setCurrentStep("members");
  };

  const handleNewClassCreated = (classYear: string) => {
    // Handle new class creation if needed
    console.log("New class created:", classYear);
    // You can add additional logic here, such as saving to a database
  };

  const handleBackToClass = () => {
    setCurrentStep("class");
    setSelectedClass("");
  };

  const handleLoginSuccess = () => {
    // This will be handled by the onAuthStateChanged listener
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoggingIn(true);
    console.log("Admin login attempt:", adminLogin.email);

    try {
      const result = await signInWithEmailAndPassword(
        auth,
        adminLogin.email,
        adminLogin.password
      );
      console.log("Login successful:", result.user);
      // The onAuthStateChanged listener will handle the rest
    } catch (error: any) {
      console.error("Login error:", error);
      setError(error.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error("Error signing out:", error);
    }
  };

  // Just claimed an account: optional profile questions before heading home
  if (claim && claim !== "pending") {
    return (
      <ProfileSetup
        uid={claim.uid}
        memberId={claim.memberId}
        firstName={claim.firstName}
        onDone={goHome}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
      </div>
    );
  }

  if (user && userProfile && !claim) {
    // Show loading while redirecting (both admin and regular users)
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
      </div>
    );
  }

  // Render appropriate component based on current step
  if (currentStep === "admin") {
    return <AdminDashboard />;
  }

  if (currentStep === "admin-login") {
    return (
      <div className="max-w-lg mx-auto p-10 bg-white rounded-2xl shadow-2xl relative">
        <div className="relative">
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-green/5 rounded-full mb-6">
              <svg
                className="w-10 h-10 text-green"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12,4A4,4 0 0,0 8,8A4,4 0 0,0 12,12A4,4 0 0,0 16,8A4,4 0 0,0 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
              </svg>
            </div>
            <h2 className="text-3xl font-serif font-bold text-gray-dark mb-2">
              Admin Login
            </h2>
            <p className="text-gray-medium font-light">
              Access admin dashboard
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-dark mb-2">
                Admin Email
              </label>
              <input
                type="email"
                value={adminLogin.email}
                onChange={(e) =>
                  setAdminLogin({ ...adminLogin, email: e.target.value })
                }
                required
                className="border border-gray-300 focus:border-green w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-green bg-white text-gray-dark placeholder-gray-medium font-medium"
                placeholder="Enter admin email"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-dark mb-2">
                Password
              </label>
              <input
                type="password"
                value={adminLogin.password}
                onChange={(e) =>
                  setAdminLogin({ ...adminLogin, password: e.target.value })
                }
                required
                className="border border-gray-300 focus:border-green w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-green bg-white text-gray-dark placeholder-gray-medium font-medium"
                placeholder="Enter password"
              />
            </div>

            {error && (
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-red-800 text-sm font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-4 px-6 bg-green text-white font-serif font-semibold text-lg rounded-lg hover:bg-green-dark focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              {isLoggingIn ? "Logging in..." : "Login as Admin"}
            </button>
          </form>

          <div className="mt-6 text-center pt-4">
            <button
              onClick={() => setCurrentStep("class")}
              className="text-gray-medium hover:text-green font-medium transition-colors duration-300"
            >
              Back to Member Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === "members") {
    return (
      <MemberSelection
        classYear={selectedClass}
        onBack={handleBackToClass}
        onLoginSuccess={handleLoginSuccess}
        onClaimStart={() => setClaim("pending")}
        onClaimed={setClaim}
        onClaimFailed={() => setClaim(null)}
      />
    );
  }

  return (
    <div>
      <ClassSelection
        onClassSelected={handleClassSelected}
        onNewClassCreated={handleNewClassCreated}
      />
      <div className="mt-8 text-center">
        <button
          onClick={() => setCurrentStep("admin-login")}
          className="text-white/75 hover:text-white font-medium transition-colors duration-300"
        >
          Admin Login
        </button>
      </div>
    </div>
  );
}
