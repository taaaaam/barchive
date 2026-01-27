"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import ProfileDropdown from "@/components/ProfileDropdown";

interface Location {
  displayName: string;
  lat: number;
  lng: number;
}

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  classYear: string;
  isClaimed: boolean;
  claimedBy?: string;
  username?: string;
  profilePicture?: string;
  hometown?: string;
  currentLocation?: string | Location;
  bio?: string;
}

export default function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
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
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (resolvedParams.id) {
      fetchMember();
    }
  }, [resolvedParams.id]);

  const fetchMember = async () => {
    try {
      const memberDoc = await getDoc(doc(db, "members", resolvedParams.id));
      if (memberDoc.exists()) {
        const memberData = memberDoc.data();
        let profilePicture = memberData.profilePicture;
        let bio = memberData.bio;
        let username = memberData.username;
        let hometown = memberData.hometown;
        let currentLocation = memberData.currentLocation;
        let email = memberData.email;

        // If member is claimed, try to get profile data from users collection
        if (memberData.isClaimed && memberData.claimedBy) {
          try {
            const userDoc = await getDoc(
              doc(db, "users", memberData.claimedBy)
            );
            if (userDoc.exists()) {
              const userData = userDoc.data();
              // Use user data if member data is missing
              profilePicture = profilePicture || userData.profilePicture;
              bio = bio || userData.bio;
              username = username || userData.username;
              hometown = hometown || userData.hometown;
              currentLocation = currentLocation || userData.currentLocation;
              email = email || userData.email;
            }
          } catch (error) {
            console.error("Error fetching user profile for member:", error);
          }
        }

        setMember({
          id: memberDoc.id,
          ...memberData,
          profilePicture: profilePicture,
          bio: bio,
          username: username,
          hometown: hometown,
          currentLocation: currentLocation,
          email: email,
        } as Member);
      } else {
        router.push("/members");
      }
    } catch (error) {
      console.error("Error fetching member:", error);
      router.push("/members");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-light to-white">
        <div className="max-w-7xl mx-auto px-8 py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-green border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-medium">Loading member...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-light to-white">
        <div className="max-w-7xl mx-auto px-8 py-20">
          <div className="text-center">
            <h1 className="text-3xl font-serif font-bold text-gray-dark mb-4">
              Member Not Found
            </h1>
            <Link
              href="/members"
              className="inline-flex items-center px-6 py-3 bg-green text-white font-semibold rounded-lg hover:bg-green-dark transition-all duration-300"
            >
              Back to Members
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
                href="/members"
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
                Back to Members
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/memories"
                className="text-white hover:text-gray-light font-medium text-lg transition-colors duration-300"
              >
                Memories
              </Link>
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
              {member.firstName} {member.lastName}
            </h1>
            <p className="text-white/80 text-xl font-light">
              Class of {member.classYear}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-8 py-12">
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-green/20 overflow-hidden">
          {/* Profile Section */}
          <div className="p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
              {/* Profile Picture */}
              <div className="flex-shrink-0">
                {member.profilePicture ? (
                  <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-green/20">
                    <Image
                      src={member.profilePicture}
                      alt={`${member.firstName} ${member.lastName}`}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 rounded-full bg-green/10 border-4 border-green/20 flex items-center justify-center">
                    <svg
                      className="w-24 h-24 text-green"
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
              </div>

              {/* Member Info */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-3xl font-serif font-bold text-gray-dark mb-4">
                  {member.firstName} {member.lastName}
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-center md:justify-start space-x-2">
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
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-lg text-gray-dark font-medium">
                      Class of {member.classYear}
                    </span>
                  </div>

                  {member.email && (
                    <div className="flex items-center justify-center md:justify-start space-x-2">
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
                          d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                        />
                      </svg>
                      <span className="text-lg text-gray-dark font-medium">
                        {member.email}
                      </span>
                    </div>
                  )}

                  {member.username && (
                    <div className="flex items-center justify-center md:justify-start space-x-2">
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
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span className="text-lg text-gray-dark font-medium">
                        @{member.username}
                      </span>
                    </div>
                  )}

                  {member.hometown && (
                    <div className="flex items-center justify-center md:justify-start space-x-2">
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
                          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                        />
                      </svg>
                      <span className="text-lg text-gray-dark font-medium">
                        {member.hometown}
                      </span>
                    </div>
                  )}

                  {member.currentLocation && (
                    <div className="flex items-center justify-center md:justify-start space-x-2">
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
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span className="text-lg text-gray-dark font-medium">
                        {typeof member.currentLocation === "object" && member.currentLocation !== null
                          ? member.currentLocation.displayName || "Unknown Location"
                          : member.currentLocation}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-center md:justify-start space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        member.isClaimed ? "bg-green" : "bg-gray-400"
                      }`}
                    ></div>
                    <span className="text-lg text-gray-dark font-medium">
                      {member.isClaimed
                        ? "Profile Claimed"
                        : "Profile Available"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bio Section */}
            {member.bio && (
              <div className="mt-8 pt-8 border-t border-green/20">
                <h3 className="text-2xl font-serif font-bold text-gray-dark mb-4">
                  About
                </h3>
                <p className="text-gray-medium leading-relaxed text-lg">
                  {member.bio}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
