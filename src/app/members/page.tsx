"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import DelegationClass from "@/components/DelegationClass";

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

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showContent, setShowContent] = useState(false);
  // Class doc id and group photo per class year
  const [classInfo, setClassInfo] = useState<
    Record<string, { id: string; groupPhoto?: string }>
  >({});
  // The expanded class, if any; all classes start collapsed
  const [focusedYear, setFocusedYear] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
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
      // Fetch all members (without ordering to avoid index requirements) and classes
      const [snapshot, classesSnapshot] = await Promise.all([
        getDocs(collection(db, "members")),
        getDocs(collection(db, "classes")),
      ]);

      const classes: Record<string, { id: string; groupPhoto?: string }> = {};
      for (const classDoc of classesSnapshot.docs) {
        const data = classDoc.data();
        classes[String(data.year)] = {
          id: classDoc.id,
          groupPhoto: data.groupPhoto || undefined,
        };
      }
      setClassInfo(classes);

      const membersData: Member[] = [];
      const claimedUserIds = new Set<string>();

      // First pass: collect all claimed user IDs
      for (const memberDoc of snapshot.docs) {
        const memberData = memberDoc.data();
        if (memberData.isClaimed && memberData.claimedBy) {
          claimedUserIds.add(memberData.claimedBy);
        }
      }

      // Fetch all user profiles in parallel
      const userProfilePromises = Array.from(claimedUserIds).map((userId) =>
        getDoc(doc(db, "users", userId))
          .then((userDoc) => ({
            userId,
            userData: userDoc.exists() ? userDoc.data() : null,
          }))
          .catch((error) => {
            console.error(`Error fetching user profile for ${userId}:`, error);
            return { userId, userData: null };
          })
      );

      const userProfiles = await Promise.all(userProfilePromises);
      const userProfileMap = new Map(
        userProfiles.map(({ userId, userData }) => [userId, userData])
      );

      // Second pass: build members data with user profiles
      for (const memberDoc of snapshot.docs) {
        const memberData = memberDoc.data();
        let profilePicture = memberData.profilePicture;
        let bio = memberData.bio;
        let username = memberData.username;
        let hometown = memberData.hometown;
        let currentLocation = memberData.currentLocation;
        let email = memberData.email;

        // If member is claimed, get profile data from the map
        if (memberData.isClaimed && memberData.claimedBy) {
          const userData = userProfileMap.get(memberData.claimedBy);
          if (userData) {
            // Use user data if member data is missing
            profilePicture = profilePicture || userData.profilePicture;
            bio = bio || userData.bio;
            username = username || userData.username;
            hometown = hometown || userData.hometown;
            currentLocation = currentLocation || userData.currentLocation;
            email = email || userData.email;
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
      // Trigger fade-in after a brief delay
      setTimeout(() => {
        setShowContent(true);
      }, 100);
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
  // Clicking or tapping outside the expanded class (or pressing Escape) collapses it
  useEffect(() => {
    if (!focusedYear) return;
    const handlePointerDown = (e: PointerEvent) => {
      const section = sectionRefs.current[focusedYear];
      if (section && e.target instanceof Node && !section.contains(e.target)) {
        setFocusedYear(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocusedYear(null);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [focusedYear]);

  const expandClass = (year: string) => {
    setFocusedYear(year);
    // Once the expand animation settles, make sure the class is in view
    window.setTimeout(() => {
      sectionRefs.current[year]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 520);
  };

  const saveGroupPhoto = async (year: string, url: string) => {
    // Older class docs have random IDs; new ones use the year as the ID
    const id = classInfo[year]?.id ?? year;
    await setDoc(
      doc(db, "classes", id),
      { year, groupPhoto: url, groupPhotoUpdatedAt: new Date() },
      { merge: true }
    );
    setClassInfo((prev) => ({ ...prev, [year]: { id, groupPhoto: url } }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-green flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white/75">Loading members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green">
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
              Delegations
            </h1>
            <p className="text-white/80 text-xl font-light">
              Connect with fellow society members across all class years
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={`page-main-enter max-w-7xl mx-auto px-8 py-12 transition-opacity duration-500 ${
          showContent ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="mb-8">
          <h2 className="text-3xl font-serif font-bold text-white mb-2">
            All Members ({members.length})
          </h2>
          <p className="text-white/75">Organized by graduation year</p>
        </div>

        {classYears.length > 0 ? (
          <div className="space-y-4">
            {classYears.map((classYear) => (
              <DelegationClass
                key={classYear}
                ref={(el) => {
                  sectionRefs.current[classYear] = el;
                }}
                classYear={classYear}
                members={membersByClass[classYear]}
                groupPhoto={classInfo[classYear]?.groupPhoto}
                focused={focusedYear === classYear}
                canEditPhoto={
                  !!userProfile &&
                  (userProfile.isAdmin ||
                    String(userProfile.classYear) === classYear)
                }
                onFocusRequest={() => expandClass(classYear)}
                onGroupPhotoChange={(url) => saveGroupPhoto(classYear, url)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="inline-block p-6 bg-white/10 rounded-full mb-6">
              <svg
                className="w-16 h-16 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12,4A4,4 0 0,0 8,8A4,4 0 0,0 12,12A4,4 0 0,0 16,8A4,4 0 0,0 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
              </svg>
            </div>
            <h3 className="text-2xl font-serif font-bold text-white mb-4">
              No Members Found
            </h3>
            <p className="text-white/75 mb-8 max-w-md mx-auto">
              No members have been added to the society yet. Contact an admin to
              add members.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
