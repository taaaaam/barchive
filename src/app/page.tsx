"use client";
import Link from "next/link";
import Image from "next/image";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, auth, ADMIN_EMAIL } from "@/lib/firebase";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import ProfileDropdown from "@/components/ProfileDropdown";
import MapLink from "@/components/MapLink";
import CameraViewer from "@/components/CameraViewer";
import HandwrittenText from "@/components/HandwrittenText";
import { useRouter } from "next/navigation";
import { HOME_INTRO_KEY } from "@/lib/homeIntro";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showLogo, setShowLogo] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  // False until Firebase reports whether someone is signed in, so neither
  // version of the page flashes before we know which one to show
  const [authReady, setAuthReady] = useState(false);
  // Entrance animation, played once right after logging in
  const [playIntro] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const flagged = sessionStorage.getItem(HOME_INTRO_KEY) === "1";
      sessionStorage.removeItem(HOME_INTRO_KEY);
      return (
        flagged &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    } catch {
      return false;
    }
  });
  const logoRefs = useRef<(HTMLImageElement | null)[]>([]);
  const [allPhotos, setAllPhotos] = useState<Array<{ url: string; sourceType: 'post' | 'memory'; sourceTitle: string; sourceId?: string }>>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState<number>(0);
  const router = useRouter();

  useEffect(() => {
    async function fetchPhotos() {
      const photos: Array<{ url: string; sourceType: 'post' | 'memory'; sourceTitle: string; sourceId?: string }> = [];

      try {
        const [postsSnapshot, memoriesSnapshot] = await Promise.all([
          getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc"))),
          getDocs(query(collection(db, "memories"), orderBy("createdAt", "desc"))),
        ]);

        // Featured images from public posts
        postsSnapshot.docs.forEach((postDoc) => {
          const data = postDoc.data();
          if (!data.private && !data.archived && data.featuredImage && data.featuredImage.trim() !== '') {
            photos.push({
              url: data.featuredImage,
              sourceType: 'post',
              sourceTitle: data.title || postDoc.id,
              sourceId: postDoc.id,
            });
          }
        });

        // Photos from memories
        memoriesSnapshot.docs.forEach((memoryDoc) => {
          const memoryData = memoryDoc.data();
          if (memoryData.photos && Array.isArray(memoryData.photos)) {
            memoryData.photos.forEach((photo: string) => {
              if (photo && photo.trim() !== '') {
                photos.push({
                  url: photo,
                  sourceType: 'memory',
                  sourceTitle: memoryData.title || memoryDoc.id,
                  sourceId: memoryDoc.id,
                });
              }
            });
          }
        });

        const shuffledPhotos = photos.sort(() => Math.random() - 0.5);
        setAllPhotos(shuffledPhotos);
        if (shuffledPhotos.length > 0) {
          setCurrentPhotoIndex(Math.floor(Math.random() * shuffledPhotos.length));
        }
      } catch (error) {
        console.error("Error fetching photos:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPhotos();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setAuthReady(true);
      if (user) {
        // Fetch user profile
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        } else if (user.email !== ADMIN_EMAIL) {
          // Signed in to an account whose profile no longer exists (e.g. it
          // was deleted): sign out rather than waiting forever for a profile
          await signOut(auth);
        }
      } else {
        setUserProfile(null);
        // Don't redirect to login - allow non-authenticated users to view home page
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Trigger logo, navigation, and profile fade-in when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLogo(true);
      setShowNav(true);
      setShowProfile(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Logo intro: start where the big signed-out crest sits (centred, large),
  // then glide up into its real spot and shrink to its real size
  const signedIn = authReady && !!user;
  useLayoutEffect(() => {
    if (!playIntro || !signedIn) return;
    const logo = logoRefs.current.find((el) => el && el.offsetParent !== null);
    if (!logo) return;
    const rect = logo.getBoundingClientRect();
    const crestSize = window.innerWidth >= 768 ? 384 : 256;
    const startX = window.innerWidth / 2 - (rect.left + rect.width / 2);
    const startY = window.innerHeight / 2 - 40 - (rect.top + rect.height / 2);
    logo.animate(
      [
        {
          transform: `translate(${startX}px, ${startY}px) scale(${crestSize / rect.width})`,
          opacity: 1,
        },
        { transform: "none", opacity: 1 },
      ],
      { duration: 1100, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "both" }
    );
  }, [playIntro, signedIn]);

  // Photos are shuffled once on load, so stepping through them in order is still random
  const showNextPhoto = () => {
    if (allPhotos.length === 0) return;
    setCurrentPhotoIndex((i) => (i + 1) % allPhotos.length);
  };

  const showPreviousPhoto = () => {
    if (allPhotos.length === 0) return;
    setCurrentPhotoIndex((i) => (i - 1 + allPhotos.length) % allPhotos.length);
  };

  if (!authReady) {
    return <div className="min-h-screen bg-green" />;
  }

  // Signed out: just the crest and a way in
  if (!user) {
    return (
      <div className="min-h-screen bg-green flex flex-col items-center justify-center px-8">
        <Image
          src="/assets/bar_logo_no_bg.png"
          alt="BaR"
          width={600}
          height={600}
          priority
          className="home-crest w-64 h-64 md:w-96 md:h-96"
        />
        <Link
          href="/login"
          className="home-enter mt-10 px-6 py-2 font-serif text-2xl text-white/80 hover:text-white tracking-[0.2em] transition-colors duration-500"
        >
          Enter
        </Link>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-green ${playIntro ? "home-intro" : ""}`}>
      {/* Header */}
      <header
        className="bg-green min-h-screen flex items-center"
      >
        <div className="relative max-w-7xl mx-auto px-8 py-8 w-full flex flex-col justify-between min-h-screen">
          {/* Navigation */}
          {/* Desktop Layout */}
          {/* Three columns so the crest + title sit exactly in the middle and the
              nav text on both sides lines up with the centre of that stack */}
          <div className="hidden md:grid grid-cols-[1fr_auto_1fr] items-center gap-8 mb-8">
            {/* Left side - Navigation Links or empty space */}
            <div className="flex items-center gap-6 justify-self-start">
              {user && userProfile && (
                <nav
                  className={`intro-nav flex items-center gap-6 transition-opacity duration-500 ease-in-out ${
                    showNav ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <Link
                    href="/memories"
                    className="text-white hover:text-gray-light font-medium text-lg transition-colors duration-300"
                  >
                    Memories
                  </Link>
                  <Link
                    href="/chronicles"
                    className="text-white hover:text-gray-light font-medium text-lg transition-colors duration-300"
                  >
                    Chronicles
                  </Link>
                  <Link
                    href="/members"
                    className="text-white hover:text-gray-light font-medium text-lg transition-colors duration-300"
                  >
                    Delegations
                  </Link>
                  <MapLink />
                </nav>
              )}
            </div>

            {/* Center: crest above the title */}
            <div className="flex flex-col items-center">
              <Image
                src="/assets/bar_logo_no_bg.png"
                ref={(el) => {
                  logoRefs.current[1] = el;
                }}
                alt="BaR Logo"
                width={300}
                height={300}
                className={`w-20 h-20 mb-2 transition-opacity duration-500 ease-in-out ${
                  showLogo ? "opacity-100" : "opacity-0"
                }`}
              />
              <h1 className="intro-title text-2xl font-serif font-bold text-white">
                <HandwrittenText text="The BaRchive" />
              </h1>
            </div>

            {/* Right side - Auth Status */}
            <div className="intro-nav-right flex items-center gap-4 justify-self-end">
              {user && userProfile && (
                <Link
                  href="/newsletters"
                  className={`text-white hover:text-gray-light font-medium text-lg transition-all duration-500 ease-in-out ${
                    showNav ? "opacity-100" : "opacity-0"
                  }`}
                >
                  Newsletters
                </Link>
              )}
              {user && userProfile ? (
                <div
                  className={`transition-opacity duration-500 ease-in-out ${
                    showProfile ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <ProfileDropdown
                    username={userProfile?.username}
                    profilePicture={userProfile?.profilePicture}
                    isAdmin={userProfile?.isAdmin}
                  />
                </div>
              ) : user ? (
                <div
                  className={`px-6 py-3 bg-white/20 text-white rounded-lg transition-opacity duration-500 ease-in-out ${
                    showProfile ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden mb-8">
            {/* Title */}
            <div className="text-center mb-6">
              <Image
                src="/assets/bar_logo_no_bg.png"
                ref={(el) => {
                  logoRefs.current[0] = el;
                }}
                alt="BaR Logo"
                width={300}
                height={300}
                className={`w-20 h-20 mx-auto mb-2 transition-opacity duration-500 ease-in-out ${
                  showLogo ? "opacity-100" : "opacity-0"
                }`}
              />
              <h1 className="intro-title text-2xl font-serif font-bold text-white">
                <HandwrittenText text="The BaRchive" />
              </h1>
            </div>

            {/* Navigation Links */}
            {user && userProfile && (
              <div
                className={`intro-nav flex flex-wrap justify-center items-center gap-4 mb-4 transition-opacity duration-500 ease-in-out ${
                  showNav ? "opacity-100" : "opacity-0"
                }`}
              >
                <Link
                  href="/memories"
                  className="text-white hover:text-gray-light font-medium text-lg transition-colors duration-300"
                >
                  Memories
                </Link>
                <Link
                  href="/chronicles"
                  className="text-white hover:text-gray-light font-medium text-lg transition-colors duration-300"
                >
                  Chronicles
                </Link>
                <Link
                  href="/members"
                  className="text-white hover:text-gray-light font-medium text-lg transition-colors duration-300"
                >
                  Delegations
                </Link>
                <MapLink />
                <Link
                  href="/newsletters"
                  className="text-white hover:text-gray-light font-medium text-lg transition-colors duration-300"
                >
                  Newsletters
                </Link>
              </div>
            )}

            {/* Auth Status */}
            <div className="intro-nav-right flex justify-center">
              {user && userProfile ? (
                <div
                  className={`transition-opacity duration-500 ease-in-out ${
                    showProfile ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <ProfileDropdown
                    username={userProfile?.username}
                    profilePicture={userProfile?.profilePicture}
                    isAdmin={userProfile?.isAdmin}
                  />
                </div>
              ) : user ? (
                <div
                  className={`px-6 py-3 bg-white/20 text-white rounded-lg transition-opacity duration-500 ease-in-out ${
                    showProfile ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                </div>
              ) : null}
            </div>
          </div>
          {/* Main Content - Centered */}
          <div className="flex-1 flex flex-col items-center text-center">
            {user && userProfile && (
              <div
                className={`intro-camera w-full flex-1 flex flex-col justify-center transition-opacity duration-500 ease-in-out ${
                  showProfile ? "opacity-100" : "opacity-0"
                }`}
              >
                <CameraViewer
                  photos={allPhotos}
                  index={currentPhotoIndex}
                  loading={loading}
                  onPrevious={showPreviousPhoto}
                  onNext={showNextPhoto}
                />
              </div>
            )}
          </div>

          {/* Footer Space */}
          <div className="h-16"></div>
        </div>
      </header>
    </div>
  );
}
