"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import Polaroid, { handwriting } from "@/components/Polaroid";

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
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/login");
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

  const currentLocationText = !member
    ? ""
    : typeof member.currentLocation === "object" && member.currentLocation !== null
    ? member.currentLocation.displayName || ""
    : member.currentLocation || "";

  if (loading) {
    return (
      <div className="min-h-screen bg-green">
        <div className="max-w-7xl mx-auto px-8 py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
            <p className="text-white/75">Loading member...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-green">
        <div className="max-w-7xl mx-auto px-8 py-20">
          <div className="text-center">
            <h1 className="text-3xl font-serif font-bold text-white mb-4">
              Member Not Found
            </h1>
            <Link
              href="/members"
              className="inline-flex items-center px-6 py-3 bg-white text-green hover:bg-gray-light font-semibold rounded-lg transition-all duration-300"
            >
              Back to Members
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green">
      {/* Header */}
      <header className="page-header-enter bg-green relative">
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
      <main className="page-main-enter max-w-5xl mx-auto px-6 md:px-8 py-12 md:py-16">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-14 md:gap-16">
          {/* Polaroid, pinned up */}
          <div className="profile-polaroid relative w-64 sm:w-72 flex-shrink-0 -rotate-3">
            <Polaroid
              src={member.profilePicture}
              alt={`${member.firstName} ${member.lastName}`}
              caption={`${member.firstName} ${member.lastName}`}
              sizes="288px"
              priority
              className="drop-shadow-[0_18px_22px_rgba(0,0,0,0.35)]"
            />
            <Image
              src="/assets/pushpin.png"
              alt=""
              width={180}
              height={180}
              className="profile-pin absolute -top-4 left-1/2 -ml-5 w-10 h-10 select-none pointer-events-none drop-shadow-[2px_5px_3px_rgba(0,0,0,0.45)]"
            />
          </div>

          {/* Sticky note with the details, handwritten */}
          <div
            className={`profile-note ${handwriting.className} relative w-80 sm:w-[22rem] min-h-[22rem] rotate-2 px-8 pt-8 pb-10 text-gray-800 drop-shadow-[0_14px_18px_rgba(0,0,0,0.3)]`}
            style={{
              backgroundImage: "url(/assets/sticky-note.webp)",
              backgroundSize: "100% 100%",
            }}
          >
            <p className="text-4xl leading-tight">Class of {member.classYear}</p>
            <div className="mt-3 space-y-1 text-2xl leading-snug">
              {member.username && <p>@{member.username}</p>}
              {member.hometown && <p>from {member.hometown}</p>}
              {currentLocationText && <p>now in {currentLocationText}</p>}
              {member.email && (
                <p className="text-xl break-all">{member.email}</p>
              )}
            </div>
            {member.bio && (
              <p className="mt-5 text-2xl leading-snug whitespace-pre-line">
                {member.bio}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
