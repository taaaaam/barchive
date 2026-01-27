"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import ProfileDropdown from "@/components/ProfileDropdown";

// Dynamically import MapContainer to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("react-leaflet").then((mod) => mod.Tooltip),
  { ssr: false }
);

// Import Leaflet CSS
import "leaflet/dist/leaflet.css";

interface Location {
  displayName: string;
  lat: number;
  lng: number;
}

interface UserLocation {
  id: string;
  username: string;
  profilePicture?: string;
  classYear?: string;
  location: Location;
}

export default function MapPage() {
  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showContent, setShowContent] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
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
      fetchUserLocations();
    }
  }, [user]);

  // Fix Leaflet marker icons for Next.js (client-side only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("leaflet").then((L) => {
        delete (L.default.Icon.Default.prototype as any)._getIconUrl;
        L.default.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        });
      });
    }
  }, []);

  // Geocode a string location to coordinates
  const geocodeLocation = async (locationString: string): Promise<Location | null> => {
    if (!locationString || locationString.trim().length === 0) {
      return null;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          locationString
        )}&limit=1&addressdetails=1`,
        {
          headers: {
            "User-Agent": "BaRchive Map",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          return {
            displayName: data[0].display_name,
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
          };
        }
      }
    } catch (error) {
      console.error("Error geocoding location:", error);
    }

    return null;
  };

  const fetchUserLocations = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const locations: UserLocation[] = [];

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        let location: Location | null = null;

        // Check if location is already a structured object
        if (userData.currentLocation) {
          if (
            typeof userData.currentLocation === "object" &&
            userData.currentLocation.lat &&
            userData.currentLocation.lng
          ) {
            // Already structured location
            location = {
              displayName:
                userData.currentLocation.displayName ||
                userData.currentLocation.display_name ||
                "Unknown Location",
              lat: userData.currentLocation.lat,
              lng: userData.currentLocation.lng,
            };
          } else if (typeof userData.currentLocation === "string") {
            // String location - geocode it
            location = await geocodeLocation(userData.currentLocation);
          }
        }

        if (location) {
          locations.push({
            id: userDoc.id,
            username: userData.username || "Unknown User",
            profilePicture: userData.profilePicture,
            classYear: userData.classYear,
            location: location,
          });
        }
      }

      setUserLocations(locations);
    } catch (error) {
      console.error("Error fetching user locations:", error);
    } finally {
      setLoading(false);
      setTimeout(() => {
        setShowContent(true);
      }, 100);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-light to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-medium">Loading map...</p>
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
                  isAdmin={userProfile.isAdmin}
                />
              )}
            </div>
          </div>
          <div className="text-center mt-8">
            <h1 className="text-5xl font-serif font-bold text-white mb-4">
              Map
            </h1>
            <p className="text-white/80 text-xl font-light mb-6">
              See where our members are located around the world
            </p>
            <p className="text-white/60 text-sm">
              {userLocations.length} member{userLocations.length !== 1 ? "s" : ""} with locations
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={`max-w-7xl mx-auto px-8 py-12 transition-opacity duration-500 ${
          showContent ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-green/20 overflow-hidden">
          <div style={{ height: "600px", width: "100%" }}>
            {typeof window !== "undefined" && (
              <MapContainer
                center={[20, 0]}
                zoom={2}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {userLocations.map((userLocation) => (
                  <Marker
                    key={userLocation.id}
                    position={[userLocation.location.lat, userLocation.location.lng]}
                  >
                    <Tooltip>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {userLocation.profilePicture && (
                            <Image
                              src={userLocation.profilePicture}
                              alt={userLocation.username}
                              width={24}
                              height={24}
                              className="rounded-full"
                            />
                          )}
                          <span className="font-medium">{userLocation.username}</span>
                        </div>
                        {userLocation.classYear && (
                          <span className="text-xs text-gray-600">
                            Class of {userLocation.classYear}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {userLocation.location.displayName}
                        </span>
                      </div>
                    </Tooltip>
                    <Popup>
                      <div className="text-center">
                        {userLocation.profilePicture && (
                          <div className="mb-2 flex justify-center">
                            <Image
                              src={userLocation.profilePicture}
                              alt={userLocation.username}
                              width={48}
                              height={48}
                              className="rounded-full"
                            />
                          </div>
                        )}
                        <p className="font-semibold text-gray-900 mb-1">
                          {userLocation.username}
                        </p>
                        {userLocation.classYear && (
                          <p className="text-xs text-gray-500 mb-1">
                            Class of {userLocation.classYear}
                          </p>
                        )}
                        <p className="text-sm text-gray-600">
                          {userLocation.location.displayName}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>
        </div>

        {userLocations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-medium text-lg">
              No members have set their locations yet.
            </p>
            <Link
              href="/profile"
              className="inline-block mt-4 px-6 py-3 bg-green text-white font-semibold rounded-lg hover:bg-green-dark transition-all duration-300"
            >
              Set Your Location
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

