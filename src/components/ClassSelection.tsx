"use client";
import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ClassSelectionProps {
  onClassSelected: (classYear: string) => void;
  onNewClassCreated?: (classYear: string) => void;
}

export default function ClassSelection({
  onClassSelected,
  onNewClassCreated,
}: ClassSelectionProps) {
  const [selectedClass, setSelectedClass] = useState("");
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [newClassYear, setNewClassYear] = useState("");
  const [classYears, setClassYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchClassYears();
  }, []);

  const fetchClassYears = async () => {
    try {
      setLoading(true);
      const classesQuery = query(
        collection(db, "classes"),
        orderBy("year", "asc")
      );
      const snapshot = await getDocs(classesQuery);

      if (snapshot.empty) {
        // If no classes exist, create default ones
        await createDefaultClasses();
        setClassYears(["2025", "2026", "2027", "2028", "2029"]);
      } else {
        const years = snapshot.docs.map((doc) => doc.data().year);
        setClassYears(years);
      }
    } catch (error) {
      console.error("Error fetching class years:", error);
      setError("Error loading class years");
      // Fallback to default years
      setClassYears(["2025", "2026", "2027", "2028", "2029"]);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultClasses = async () => {
    const defaultYears = ["2025", "2026", "2027", "2028", "2029"];
    try {
      for (const year of defaultYears) {
        await addDoc(collection(db, "classes"), {
          year: year,
          createdAt: new Date(),
        });
      }
    } catch (error) {
      console.error("Error creating default classes:", error);
    }
  };

  const handleClassSelect = (classYear: string) => {
    setSelectedClass(classYear);
    onClassSelected(classYear);
  };

  const handleAddNewClass = () => {
    setShowAddClassModal(true);
  };

  const handleSubmitNewClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newClassYear && !classYears.includes(newClassYear)) {
      try {
        // Save new class to Firebase
        await addDoc(collection(db, "classes"), {
          year: newClassYear,
          createdAt: new Date(),
        });

        // Update local state
        const updatedClassYears = [...classYears, newClassYear].sort();
        setClassYears(updatedClassYears);
        setSelectedClass(newClassYear);
        onClassSelected(newClassYear);

        if (onNewClassCreated) {
          onNewClassCreated(newClassYear);
        }

        setShowAddClassModal(false);
        setNewClassYear("");
      } catch (error) {
        console.error("Error adding new class:", error);
        setError("Error adding new class. Please try again.");
      }
    }
  };

  const handleCancelAddClass = () => {
    setShowAddClassModal(false);
    setNewClassYear("");
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-10 bg-white rounded-2xl shadow-2xl border-2 border-green/20 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-green/5 to-transparent rounded-2xl"></div>
        <div className="relative flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green mx-auto mb-4"></div>
            <p className="text-gray-medium">Loading classes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-10 bg-white rounded-2xl shadow-2xl border-2 border-green/20 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-green/5 to-transparent rounded-2xl"></div>
      <div className="relative">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-serif font-bold text-gray-dark mb-2">
            Select Your Class
          </h2>
          <p className="text-gray-medium font-light">
            Choose your graduation year to continue
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {classYears.map((classYear) => (
            <button
              key={classYear}
              onClick={() => handleClassSelect(classYear)}
              className="p-6 bg-gray-light hover:bg-green/10 border-2 border-gray-light hover:border-green/30 rounded-lg transition-all duration-300 hover:shadow-lg group"
            >
              <div className="text-center">
                <div className="text-2xl font-serif font-bold text-gray-dark group-hover:text-green mb-2">
                  Class of {classYear}
                </div>
                <div className="text-sm text-gray-medium">Select</div>
              </div>
            </button>
          ))}

          {/* Add New Class Button */}
          <button
            onClick={handleAddNewClass}
            className="p-6 bg-green/5 hover:bg-green/10 border-2 border-dashed border-green/30 hover:border-green/50 rounded-lg transition-all duration-300 hover:shadow-lg group"
          >
            <div className="text-center">
              <div className="text-2xl font-serif font-bold text-green group-hover:text-green-dark mb-2">
                <i className="fas fa-plus mr-2"></i>
                Add New Class
              </div>
              <div className="text-sm text-gray-medium">Create</div>
            </div>
          </button>
        </div>
      </div>

      {/* Add New Class Modal */}
      {showAddClassModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-green/20 max-w-md w-full p-8 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-green/5 to-transparent rounded-2xl"></div>
            <div className="relative">
              <div className="text-center mb-6">
                <div className="inline-block p-3 bg-green/10 rounded-full border-2 border-green/30 mb-4">
                  <i className="fas fa-plus text-green text-xl"></i>
                </div>
                <h3 className="text-2xl font-serif font-bold text-gray-dark mb-2">
                  Add New Class
                </h3>
                <p className="text-gray-medium font-light">
                  Enter the graduation year for the new class
                </p>
              </div>

              <form onSubmit={handleSubmitNewClass} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-dark mb-2">
                    Graduation Year
                  </label>
                  <input
                    type="text"
                    value={newClassYear}
                    onChange={(e) => setNewClassYear(e.target.value)}
                    placeholder="e.g., 2030"
                    required
                    className="w-full px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark placeholder-gray-medium font-medium"
                  />
                  {classYears.includes(newClassYear) && newClassYear && (
                    <p className="text-red-600 text-sm mt-1">
                      This class year already exists
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCancelAddClass}
                    className="flex-1 py-3 px-4 bg-gray-light text-gray-dark font-semibold rounded-lg hover:bg-gray-200 transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      !newClassYear || classYears.includes(newClassYear)
                    }
                    className="flex-1 py-3 px-4 bg-green text-white font-semibold rounded-lg hover:bg-green-dark focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    Add Class
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
