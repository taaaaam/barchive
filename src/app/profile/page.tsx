"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import ProfileImageUpload from "@/components/ProfileImageUpload";
import LocationPicker from "@/components/LocationPicker";
import MapLink from "@/components/MapLink";

interface Location {
  displayName: string;
  lat: number;
  lng: number;
}

interface UserProfile {
  id: string;
  username: string;
  bio?: string;
  hometown?: string;
  currentLocation?: string | Location;
  profilePicture?: string;
  classYear: string;
  email: string;
  memberId?: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        await fetchUserProfile(user.uid);
      } else {
        setUserProfile(null);
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchUserProfile = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const profileData = userDoc.data();

        // Find the member document that this user has claimed
        let memberId = null;
        try {
          const membersQuery = query(
            collection(db, "members"),
            where("claimedBy", "==", uid)
          );
          const membersSnapshot = await getDocs(membersQuery);
          if (!membersSnapshot.empty) {
            memberId = membersSnapshot.docs[0].id;
          }
        } catch (error) {
          console.error("Error finding member document:", error);
        }

        // Handle currentLocation - could be string or Location object
        let currentLocation: string | Location | undefined = undefined;
        if (profileData.currentLocation) {
          if (
            typeof profileData.currentLocation === "object" &&
            profileData.currentLocation.lat &&
            profileData.currentLocation.lng
          ) {
            // It's already a Location object
            currentLocation = {
              displayName:
                profileData.currentLocation.displayName ||
                profileData.currentLocation.display_name ||
                "Unknown Location",
              lat: profileData.currentLocation.lat,
              lng: profileData.currentLocation.lng,
            };
          } else if (typeof profileData.currentLocation === "string") {
            // It's a string (backwards compatibility)
            currentLocation = profileData.currentLocation;
          }
        }

        const profile: UserProfile = {
          id: userDoc.id,
          username: profileData.username || "",
          bio: profileData.bio || "",
          hometown: profileData.hometown || "",
          currentLocation: currentLocation,
          profilePicture: profileData.profilePicture || "",
          classYear: profileData.classYear || "",
          email: profileData.email || "",
          memberId: memberId || undefined,
        };
        setUserProfile(profile);
        setEditedProfile(profile);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !editedProfile) return;

    setSaving(true);
    try {
      // Prepare location data for Firestore
      // If it's a Location object, store it as an object; if it's a string, keep it as string
      const locationToSave =
        typeof editedProfile.currentLocation === "object" && editedProfile.currentLocation !== null
          ? editedProfile.currentLocation
          : editedProfile.currentLocation || null;

      // Update user profile
      await updateDoc(doc(db, "users", user.uid), {
        username: editedProfile.username,
        bio: editedProfile.bio,
        hometown: editedProfile.hometown,
        currentLocation: locationToSave,
        profilePicture: editedProfile.profilePicture,
      });

      // Also update the member document if this user has claimed a member profile
      if (userProfile?.memberId) {
        await updateDoc(doc(db, "members", userProfile.memberId), {
          username: editedProfile.username,
          bio: editedProfile.bio,
          hometown: editedProfile.hometown,
          currentLocation: locationToSave,
          profilePicture: editedProfile.profilePicture,
        });
      }

      setUserProfile(editedProfile);
      setEditMode(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error updating profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile(userProfile);
    setEditMode(false);
  };

  const handleImageUpload = (imageUrl: string) => {
    if (editedProfile) {
      setEditedProfile({ ...editedProfile, profilePicture: imageUrl });
    }
  };

  const handleImageRemove = () => {
    if (editedProfile) {
      setEditedProfile({ ...editedProfile, profilePicture: "" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-light to-white">
        <div className="max-w-7xl mx-auto px-8 py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-green border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-medium">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-light to-white">
        <div className="max-w-7xl mx-auto px-8 py-20">
          <div className="text-center">
            <h1 className="text-3xl font-serif font-bold text-gray-dark mb-4">
              Profile Not Found
            </h1>
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 bg-green text-white font-semibold rounded-lg hover:bg-green-dark transition-all duration-300"
            >
              Back to Home
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
              <MapLink />
              <Link
                href="/newsletters"
                className="text-white hover:text-gray-light font-medium text-lg transition-colors duration-300"
              >
                Newsletters
              </Link>
            </div>
          </div>
          <div className="text-center mt-8">
            <h1 className="text-5xl font-serif font-bold text-white mb-4">
              My Profile
            </h1>
            <p className="text-white/80 text-xl font-light">
              Manage your personal information
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-8 py-12">
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-green/20 overflow-hidden">
          <div className="p-8">
            {/* Profile Header */}
            <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-8 mb-8">
              {/* Profile Picture */}
              <div className="flex-shrink-0 w-full md:w-auto">
                {editMode ? (
                  <ProfileImageUpload
                    onImageUpload={handleImageUpload}
                    onImageRemove={handleImageRemove}
                    currentImage={editedProfile?.profilePicture}
                  />
                ) : (
                  <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-green/20">
                    {userProfile.profilePicture ? (
                      <Image
                        src={userProfile.profilePicture}
                        alt={userProfile.username}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-green/10 flex items-center justify-center">
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
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-3xl font-serif font-bold text-gray-dark mb-4">
                  {editMode ? (
                    <input
                      type="text"
                      value={editedProfile?.username || ""}
                      onChange={(e) =>
                        setEditedProfile({
                          ...editedProfile!,
                          username: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark font-serif font-bold text-3xl"
                    />
                  ) : (
                    userProfile.username
                  )}
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
                      Class of {userProfile.classYear}
                    </span>
                  </div>

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
                      {userProfile.email}
                    </span>
                  </div>

                  {(editMode || userProfile.hometown) && (
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
                        {editMode ? (
                          <input
                            type="text"
                            value={editedProfile?.hometown || ""}
                            onChange={(e) =>
                              setEditedProfile({
                                ...editedProfile!,
                                hometown: e.target.value,
                              })
                            }
                            placeholder="Hometown"
                            className="px-3 py-1 border border-green/30 rounded focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark"
                          />
                        ) : (
                          userProfile.hometown
                        )}
                      </span>
                    </div>
                  )}

                  {(editMode || userProfile.currentLocation) && (
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
                        {editMode ? (
                          <div className="w-full max-w-md">
                            <LocationPicker
                              value={
                                typeof editedProfile?.currentLocation === "object"
                                  ? editedProfile.currentLocation
                                  : editedProfile?.currentLocation || null
                              }
                              onChange={(location) =>
                                setEditedProfile({
                                  ...editedProfile!,
                                  currentLocation: location || "",
                                })
                              }
                              placeholder="Search for your location..."
                            />
                          </div>
                        ) : typeof userProfile.currentLocation === "object" ? (
                          userProfile.currentLocation.displayName
                        ) : (
                          userProfile.currentLocation
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bio Section */}
            <div className="mb-8">
              <h3 className="text-2xl font-serif font-bold text-gray-dark mb-4">
                About
              </h3>
              {editMode ? (
                <textarea
                  value={editedProfile?.bio || ""}
                  onChange={(e) =>
                    setEditedProfile({
                      ...editedProfile!,
                      bio: e.target.value,
                    })
                  }
                  placeholder="Tell us about yourself..."
                  className="w-full px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark font-medium resize-none"
                  rows={4}
                />
              ) : (
                <p className="text-gray-medium leading-relaxed text-lg">
                  {userProfile.bio || "No bio added yet."}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4">
              {editMode ? (
                <>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-6 py-3 text-gray-medium hover:text-gray-dark transition-colors duration-200 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-3 bg-green text-white font-semibold rounded-lg hover:bg-green-dark transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-6 py-3 bg-green text-white font-semibold rounded-lg hover:bg-green-dark transition-all duration-300"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
