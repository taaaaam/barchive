"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import ProfileDropdown from "@/components/ProfileDropdown";

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
  currentLocation?: string;
  bio?: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
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
    if (user) {
      fetchMembers();
    }
  }, [user]);

  const fetchMembers = async () => {
    try {
      // Fetch all members without ordering to avoid index requirements
      const membersQuery = collection(db, "members");
      const snapshot = await getDocs(membersQuery);

      const membersData: Member[] = [];

      // Fetch each member and their profile data if claimed
      for (const memberDoc of snapshot.docs) {
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

        membersData.push({
          id: memberDoc.id,
          ...memberData,
          profilePicture: profilePicture,
          bio: bio,
          username: username,
          hometown: hometown,
          currentLocation: currentLocation,
          email: email,
        } as Member);
      }

      // Sort in JavaScript instead of Firestore
      const sortedMembers = membersData.sort((a, b) => {
        // First sort by class year (descending)
        const yearComparison = b.classYear.localeCompare(a.classYear);
        if (yearComparison !== 0) return yearComparison;

        // Then sort by last name (ascending) within the same year
        return a.lastName.localeCompare(b.lastName);
      });

      setMembers(sortedMembers);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  // Group members by class year
  const membersByClass = members.reduce((acc, member) => {
    const year = member.classYear;
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(member);
    return acc;
  }, {} as Record<string, Member[]>);

  const classYears = Object.keys(membersByClass).sort((a, b) =>
    b.localeCompare(a)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-light to-white">
        <div className="max-w-7xl mx-auto px-8 py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-green border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-medium">Loading members...</p>
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
                href="/memories"
                className="text-white hover:text-gray-light font-medium text-lg transition-colors duration-300"
              >
                Memories
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
              Delegations
            </h1>
            <p className="text-white/80 text-xl font-light">
              Connect with fellow society members across all class years
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-serif font-bold text-gray-dark mb-2">
            All Members ({members.length})
          </h2>
          <p className="text-gray-medium">Organized by graduation year</p>
        </div>

        {classYears.length > 0 ? (
          <div className="space-y-12">
            {classYears.map((classYear) => (
              <div
                key={classYear}
                className="bg-white rounded-2xl shadow-2xl border-2 border-green/20 p-8"
              >
                <div className="mb-6">
                  <h3 className="text-2xl font-serif font-bold text-gray-dark mb-2">
                    Class of {classYear}
                  </h3>
                  <p className="text-gray-medium">
                    {membersByClass[classYear].length} member
                    {membersByClass[classYear].length !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {membersByClass[classYear].map((member) => (
                    <Link
                      key={member.id}
                      href={`/members/${member.id}`}
                      className="group bg-gray-light hover:bg-green/5 rounded-xl p-6 border-2 border-gray-light hover:border-green/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                    >
                      <div className="text-center">
                        <div className="mb-4">
                          {member.profilePicture ? (
                            <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-3 border-green/20">
                              <Image
                                src={member.profilePicture}
                                alt={`${member.firstName} ${member.lastName}`}
                                width={80}
                                height={80}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-20 h-20 mx-auto rounded-full bg-green/10 border-3 border-green/20 flex items-center justify-center">
                              <svg
                                className="w-10 h-10 text-green"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12,4A4,4 0 0,0 8,8A4,4 0 0,0 12,12A4,4 0 0,0 16,8A4,4 0 0,0 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <h4 className="font-serif font-bold text-gray-dark mb-1 group-hover:text-green transition-colors">
                          {member.firstName} {member.lastName}
                        </h4>
                        {member.username && (
                          <p className="text-sm text-gray-medium mb-2">
                            @{member.username}
                          </p>
                        )}
                        {(member.hometown || member.currentLocation) && (
                          <div className="space-y-1 mb-2">
                            {member.hometown && (
                              <div className="flex items-center justify-center space-x-1">
                                <svg
                                  className="w-3 h-3 text-green"
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
                                <span className="text-xs text-gray-medium">
                                  {member.hometown}
                                </span>
                              </div>
                            )}
                            {member.currentLocation && (
                              <div className="flex items-center justify-center space-x-1">
                                <svg
                                  className="w-3 h-3 text-green"
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
                                <span className="text-xs text-gray-medium">
                                  {member.currentLocation}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-center">
                          {member.isClaimed ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green text-white">
                              Active Member
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Available
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="inline-block p-6 bg-green/5 rounded-full border-2 border-green/20 mb-6">
              <svg
                className="w-16 h-16 text-green"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12,4A4,4 0 0,0 8,8A4,4 0 0,0 12,12A4,4 0 0,0 16,8A4,4 0 0,0 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
              </svg>
            </div>
            <h3 className="text-2xl font-serif font-bold text-gray-dark mb-4">
              No Members Found
            </h3>
            <p className="text-gray-medium mb-8 max-w-md mx-auto">
              No members have been added to the society yet. Contact an admin to
              add members.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
