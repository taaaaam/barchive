"use client";
import { useState, useEffect, useRef } from "react";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  classYear: string;
  isClaimed: boolean;
  claimedBy?: string;
  username?: string;
}

interface MemberSelectionProps {
  classYear: string;
  onBack: () => void;
  onLoginSuccess: () => void;
}

export default function MemberSelection({
  classYear,
  onBack,
  onLoginSuccess,
}: MemberSelectionProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);
  const [showKeywordVerification, setShowKeywordVerification] = useState(false);
  const [keywordVerified, setKeywordVerified] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [newMember, setNewMember] = useState({
    firstName: "",
    lastName: "",
  });
  const [newMemberKeyword, setNewMemberKeyword] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const claimAccountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMembers();
  }, [classYear]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const membersQuery = query(
        collection(db, "members"),
        where("classYear", "==", classYear),
        orderBy("lastName", "asc")
      );
      const snapshot = await getDocs(membersQuery);

      const membersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Member[];

      setMembers(membersData);
    } catch (error) {
      console.error("Error fetching members:", error);
      setError("Error loading members");
    } finally {
      setLoading(false);
    }
  };

  const verifyKeyword = (inputKeyword: string): boolean => {
    const words = inputKeyword.trim().split(/\s+/);

    // Check if exactly 3 words
    if (words.length !== 3) {
      return false;
    }

    // Check if first letters are B, A, R (case insensitive)
    const firstLetters = words.map((word) => word.charAt(0).toUpperCase());
    return (
      firstLetters[0] === "B" &&
      firstLetters[1] === "A" &&
      firstLetters[2] === "R"
    );
  };

  const handleKeywordVerification = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!keyword.trim()) {
      setError("The sacred phrase cannot be empty");
      return;
    }

    if (verifyKeyword(keyword)) {
      setShowKeywordVerification(false);
      setKeywordVerified(true);
      setError("");
    } else {
      setError(
        "The phrase you have entered is not recognized. Please try again."
      );
    }
  };

  const handleMemberSelection = (member: Member) => {
    setSelectedMember(member);

    // Scroll to the claim account section after a short delay to ensure DOM update
    setTimeout(() => {
      if (claimAccountRef.current) {
        claimAccountRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
  };

  const handleStartClaimProcess = () => {
    if (!selectedMember || selectedMember.isClaimed) return;

    // Reset form fields
    setUsername("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setKeyword("");
    setError("");
    setKeywordVerified(false);

    // Show keyword verification first
    setShowKeywordVerification(true);
  };

  const handleClaimAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedMember) return;

    // Check keyword verification first
    if (!keywordVerified) {
      setError("You must first prove your knowledge of our traditions");
      setShowKeywordVerification(true);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setIsClaiming(true);

    try {
      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Update member document
      await updateDoc(doc(db, "members", selectedMember.id), {
        isClaimed: true,
        claimedBy: userCredential.user.uid,
        username: username.trim(),
        email: email.trim(),
        claimedAt: new Date(),
      });

      // Create user profile
      await setDoc(doc(db, "users", userCredential.user.uid), {
        memberId: selectedMember.id,
        firstName: selectedMember.firstName,
        lastName: selectedMember.lastName,
        username: username.trim(),
        classYear: selectedMember.classYear,
        email: email.trim(),
        isAdmin: false,
        createdAt: new Date(),
      });

      onLoginSuccess();
    } catch (error: any) {
      console.error("Error claiming account:", error);
      setError(error.message);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleLoginToClaimedAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedMember) return;

    if (!password) {
      setError("Password is required");
      return;
    }

    setIsClaiming(true);

    try {
      if (!selectedMember.email) {
        setError(
          "This account hasn't been claimed yet. Please claim it first."
        );
        return;
      }
      await signInWithEmailAndPassword(auth, selectedMember.email, password);
      onLoginSuccess();
    } catch (error: any) {
      console.error("Error logging in:", error);
      setError(error.message);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsAddingMember(true);

    // Check keyword verification first
    if (!verifyKeyword(newMemberKeyword)) {
      setError("Please enter the correct verification keyword");
      setIsAddingMember(false);
      return;
    }

    try {
      await addDoc(collection(db, "members"), {
        firstName: newMember.firstName.trim(),
        lastName: newMember.lastName.trim(),
        classYear: classYear,
        isClaimed: false,
        createdAt: new Date(),
      });

      setNewMember({ firstName: "", lastName: "" });
      setNewMemberKeyword("");
      setShowAddMemberForm(false);
      fetchMembers(); // Refresh the members list
    } catch (error: any) {
      console.error("Error adding member:", error);
      setError("Failed to add member. Please try again.");
    } finally {
      setIsAddingMember(false);
    }
  };

  // Remove the full-screen loading state - show the UI immediately

  return (
    <div className="max-w-4xl mx-auto p-10 bg-white rounded-2xl shadow-2xl border-2 border-green/20 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-green/5 to-transparent rounded-2xl"></div>
      <div className="relative">
        <div className="text-center mb-8">
          <button
            onClick={onBack}
            className="inline-flex items-center text-gray-medium hover:text-green font-medium transition-colors duration-300 mb-4"
          >
            <svg
              className="mr-2 w-4 h-4"
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
            Back to Class Selection
          </button>

          <h2 className="text-3xl font-serif font-bold text-gray-dark mb-2">
            Class of {classYear} Members
          </h2>
          <p className="text-gray-medium font-light">
            Select your account to claim or log in
          </p>
        </div>

        {/* Add Member Button */}
        <div className="mb-6 text-center">
          <button
            onClick={() => setShowAddMemberForm(!showAddMemberForm)}
            className="inline-flex items-center px-6 py-3 bg-green text-white font-semibold rounded-lg hover:bg-green-dark transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <svg
              className="mr-2 w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            {showAddMemberForm ? "Cancel" : "Add New Member"}
          </button>
        </div>

        {/* Add Member Form */}
        {showAddMemberForm && (
          <div className="mb-8 p-6 bg-white rounded-2xl shadow-2xl border-2 border-green/20">
            <h3 className="text-xl font-serif font-bold text-gray-dark mb-4">
              Add New Member
            </h3>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-dark mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={newMember.firstName}
                    onChange={(e) =>
                      setNewMember({ ...newMember, firstName: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark font-medium"
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-dark mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={newMember.lastName}
                    onChange={(e) =>
                      setNewMember({ ...newMember, lastName: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark font-medium"
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-dark mb-2">
                  Society Verification
                </label>
                <input
                  type="text"
                  value={newMemberKeyword}
                  onChange={(e) => setNewMemberKeyword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark font-medium"
                  placeholder="Enter the sacred phrase that binds us together"
                />
                <p className="text-sm text-gray-medium mt-2">
                  Enter the three words that define us
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm font-medium">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isAddingMember}
                  className="flex-1 py-4 px-6 bg-green text-white font-serif font-semibold text-lg rounded-lg hover:bg-green-dark focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  {isAddingMember ? "Adding..." : "Add Member"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddMemberForm(false)}
                  className="flex-1 py-4 px-6 bg-gray-500 text-white font-serif font-semibold text-lg rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Members Grid */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-green border-t-transparent mx-auto mb-2"></div>
            <p className="text-sm text-gray-medium">Loading members...</p>
          </div>
        ) : members.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => handleMemberSelection(member)}
                className={`p-4 rounded-lg border-2 transition-all duration-300 text-left ${
                  selectedMember?.id === member.id
                    ? "border-green bg-green/10"
                    : member.isClaimed
                    ? "border-gray-300 bg-gray-50 hover:border-green/30"
                    : "border-green/30 bg-green/5 hover:border-green"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-dark">
                      {member.firstName} {member.lastName}
                    </div>
                    <div className="text-sm text-gray-medium">
                      {member.email || "Email will be added when claimed"}
                    </div>
                  </div>
                  <div className="text-right">
                    {member.isClaimed ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green text-white">
                        Claimed
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Available
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="inline-block p-6 bg-green/5 rounded-full border-2 border-green/20 mb-6">
              <svg
                className="w-16 h-16 text-green"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-serif font-bold text-gray-dark mb-4">
              No Members Yet
            </h3>
            <p className="text-gray-medium mb-8 max-w-md mx-auto">
              This class doesn't have any members yet. Add the first member to
              get started.
            </p>
          </div>
        )}

        {selectedMember && (
          <div ref={claimAccountRef} className="border-t border-gray-200 pt-8">
            <h3 className="text-xl font-serif font-bold text-gray-dark mb-4">
              {selectedMember.isClaimed ? "Log In" : "Claim Account"}
            </h3>

            <div className="mb-4 p-4 bg-gray-light rounded-lg">
              <div className="font-semibold text-gray-dark">
                {selectedMember.firstName} {selectedMember.lastName}
              </div>
              <div className="text-sm text-gray-medium">
                Class of {selectedMember.classYear}
              </div>
              {selectedMember.email && (
                <div className="text-sm text-gray-medium">
                  {selectedMember.email}
                </div>
              )}
            </div>

            {!selectedMember.isClaimed && showKeywordVerification && (
              <div className="mb-6 p-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <h4 className="text-lg font-serif font-bold text-gray-dark mb-3">
                  Society Verification
                </h4>
                <p className="text-gray-medium mb-4">
                  To proceed, you must demonstrate your knowledge of our
                  traditions. Enter the sacred phrase that binds us together.
                </p>

                <form
                  onSubmit={handleKeywordVerification}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-semibold text-gray-dark mb-2">
                      Sacred Phrase
                    </label>
                    <input
                      type="text"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      required
                      className="w-full px-4 py-3 border-2 border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white text-gray-dark placeholder-gray-medium font-medium"
                      placeholder="Enter the three words that define us"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                      <p className="text-red-800 text-sm font-medium">
                        {error}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 py-3 px-6 bg-yellow-500 text-white font-serif font-semibold rounded-lg hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                      Prove Knowledge
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowKeywordVerification(false)}
                      className="flex-1 py-3 px-6 bg-gray-500 text-white font-serif font-semibold rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {!selectedMember.isClaimed &&
              !showKeywordVerification &&
              !keywordVerified && (
                <div className="mb-6">
                  <button
                    onClick={handleStartClaimProcess}
                    className="w-full py-4 px-6 bg-green text-white font-serif font-semibold text-lg rounded-lg hover:bg-green-dark focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    Start Claim Process
                  </button>
                </div>
              )}

            {(selectedMember.isClaimed ||
              (!selectedMember.isClaimed && keywordVerified)) && (
              <form
                onSubmit={
                  selectedMember.isClaimed
                    ? handleLoginToClaimedAccount
                    : handleClaimAccount
                }
                className="space-y-4"
              >
                {!selectedMember.isClaimed && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-dark mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required={!selectedMember.isClaimed}
                        className="w-full px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark placeholder-gray-medium font-medium"
                        placeholder="Enter your email address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-dark mb-2">
                        Choose Username
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required={!selectedMember.isClaimed}
                        className="w-full px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark placeholder-gray-medium font-medium"
                        placeholder="Enter your username"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-dark mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark placeholder-gray-medium font-medium"
                    placeholder="Enter your password"
                  />
                </div>

                {!selectedMember.isClaimed && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-dark mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required={!selectedMember.isClaimed}
                      className="w-full px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark placeholder-gray-medium font-medium"
                      placeholder="Confirm your password"
                    />
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                    <p className="text-red-800 text-sm font-medium">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isClaiming}
                  className="w-full py-4 px-6 bg-green text-white font-serif font-semibold text-lg rounded-lg hover:bg-green-dark focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  {isClaiming
                    ? "Processing..."
                    : selectedMember.isClaimed
                    ? "Log In"
                    : "Claim Account"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
