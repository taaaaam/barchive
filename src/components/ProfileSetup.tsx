"use client";
import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import LocationPicker from "./LocationPicker";
import ProfileImageUpload from "./ProfileImageUpload";

interface Location {
  displayName: string;
  lat: number;
  lng: number;
}

interface ProfileSetupProps {
  uid: string;
  memberId: string;
  firstName: string;
  onDone: () => void;
}

const STEPS = ["hometown", "location", "photo"] as const;
type Step = (typeof STEPS)[number];

// Optional profile questions shown right after someone claims their account.
// Every step can be skipped; whatever was filled in is saved at the end to the
// user's profile and their member entry (the same fields the profile page edits).
export default function ProfileSetup({
  uid,
  memberId,
  firstName,
  onDone,
}: ProfileSetupProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [hometown, setHometown] = useState("");
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [profilePicture, setProfilePicture] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const step: Step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const finish = async () => {
    const updates: Record<string, unknown> = {};
    if (hometown.trim()) updates.hometown = hometown.trim();
    if (currentLocation) updates.currentLocation = currentLocation;
    if (profilePicture) updates.profilePicture = profilePicture;

    if (Object.keys(updates).length === 0) {
      onDone();
      return;
    }

    setSaving(true);
    setError("");
    try {
      await Promise.all([
        updateDoc(doc(db, "users", uid), updates),
        updateDoc(doc(db, "members", memberId), updates),
      ]);
      onDone();
    } catch (err) {
      console.error("Error saving profile setup:", err);
      setError("Couldn't save your profile. You can try again, or skip and do it later from your profile page.");
      setSaving(false);
    }
  };

  const next = () => {
    if (isLast) {
      finish();
      return;
    }
    setDirection("forward");
    setStepIndex((i) => i + 1);
  };

  const back = () => {
    setDirection("back");
    setStepIndex((i) => Math.max(0, i - 1));
  };

  // "Skip" clears this step's answer and moves on
  const skip = () => {
    if (step === "hometown") setHometown("");
    if (step === "location") setCurrentLocation(null);
    if (step === "photo") setProfilePicture("");
    next();
  };

  return (
    <div className="member-card-enter max-w-xl mx-auto p-10 bg-white rounded-2xl shadow-2xl">
      <div className="text-center mb-8">
        <p className="text-sm font-semibold text-green mb-2">
          Welcome, {firstName}! Your account is claimed.
        </p>
        <p className="text-gray-medium text-sm">
          A few optional questions to fill out your profile
        </p>
        {/* Progress dots */}
        <div className="mt-5 flex justify-center gap-2" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === stepIndex ? "w-6 bg-green" : i < stepIndex ? "w-2 bg-green" : "w-2 bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>

      <div
        key={step}
        className={direction === "forward" ? "setup-step-forward" : "setup-step-back"}
      >
        {step === "hometown" && (
          <>
            <h2 className="text-3xl font-serif font-bold text-gray-dark mb-2">
              Where are you from?
            </h2>
            <p className="text-gray-medium mb-6">Your hometown, however you like to say it.</p>
            <input
              type="text"
              value={hometown}
              onChange={(e) => setHometown(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  next();
                }
              }}
              placeholder="e.g. Houston, TX"
              autoFocus
              className="border border-gray-300 focus:border-green w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-green bg-white text-gray-dark"
            />
          </>
        )}

        {step === "location" && (
          <>
            <h2 className="text-3xl font-serif font-bold text-gray-dark mb-2">
              Where are you now?
            </h2>
            <p className="text-gray-medium mb-6">
              Where you live these days. This puts you on the members map.
            </p>
            <LocationPicker
              value={currentLocation}
              onChange={setCurrentLocation}
              placeholder="Search for a city"
            />
          </>
        )}

        {step === "photo" && (
          <>
            <h2 className="text-3xl font-serif font-bold text-gray-dark mb-2">
              Add a profile picture
            </h2>
            <p className="text-gray-medium mb-6">So everyone can put a face to the name.</p>
            <div className="flex justify-center">
              <ProfileImageUpload
                onImageUpload={setProfilePicture}
                onImageRemove={() => setProfilePicture("")}
                currentImage={profilePicture || undefined}
              />
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="mt-6 bg-red-50 rounded-lg p-4">
          <p className="text-red-800 text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={back}
          disabled={stepIndex === 0 || saving}
          className="px-4 py-2 text-gray-medium hover:text-green font-medium transition-colors disabled:invisible"
        >
          Back
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={skip}
            disabled={saving}
            className="px-4 py-2 text-gray-medium hover:text-green font-medium transition-colors disabled:opacity-50"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={next}
            disabled={saving}
            className="px-6 py-3 bg-green text-white font-semibold rounded-lg hover:bg-green-dark transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : isLast ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
