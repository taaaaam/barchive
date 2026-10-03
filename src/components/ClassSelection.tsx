"use client";
import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// BaR was founded in 2011; allow classes up to 4 years out
const MIN_CLASS_YEAR = 2011;
const MAX_CLASS_YEAR = new Date().getFullYear() + 4;

const isValidClassYear = (year: string) =>
  /^\d{4}$/.test(year) &&
  Number(year) >= MIN_CLASS_YEAR &&
  Number(year) <= MAX_CLASS_YEAR;

interface ClassSelectionProps {
  onClassSelected: (classYear: string) => void;
  onNewClassCreated?: (classYear: string) => void;
}

export default function ClassSelection({
  onClassSelected,
  onNewClassCreated,
}: ClassSelectionProps) {
  const [selectedClass, setSelectedClass] = useState("");
  // Once a year is chosen the card animates away before the member list appears
  const [leaving, setLeaving] = useState(false);
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

      // Dedupe: older class docs were created with random IDs, so the same year can appear multiple times.
        // Also hide out-of-range years (typos like 2067) left over from before validation existed.
        const years = Array.from(
        new Set(snapshot.docs.map((doc) => String(doc.data().year)))
      )
        .filter(isValidClassYear)
        .sort();
      setClassYears(years);
    } catch (error) {
      console.error("Error fetching class years:", error);
      setError("Error loading class years");
    } finally {
      setLoading(false);
    }
  };

  const handleClassSelect = (classYear: string) => {
    if (selectedClass) return;
    // 1. the node fills and ripples while the other years fall away,
    // 2. the card lifts out, 3. the member list takes over
    setSelectedClass(classYear);
    window.setTimeout(() => setLeaving(true), 500);
    window.setTimeout(() => onClassSelected(classYear), 850);
  };

  const handleAddNewClass = () => {
    setShowAddClassModal(true);
  };

  const handleSubmitNewClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidClassYear(newClassYear) && !classYears.includes(newClassYear)) {
      try {
        // Save new class to Firebase
        await setDoc(doc(db, "classes", newClassYear), {
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
      <div className="max-w-2xl mx-auto p-10 bg-white rounded-2xl shadow-2xl relative">
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
    <div
      className={`max-w-4xl mx-auto p-10 bg-white rounded-2xl shadow-2xl relative ${
        leaving ? "class-card-leave" : ""
      }`}
    >
      <div className="relative">
        <div
          className={`text-center mb-8 transition-all duration-300 ${
            selectedClass ? "opacity-0 -translate-y-2" : ""
          }`}
        >
          <h2 className="text-3xl font-serif font-bold text-gray-dark mb-2">
            Select Your Class
          </h2>
          <p className="text-gray-medium font-light">
            Choose your graduation year to continue
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 rounded-lg p-4">
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Desktop: horizontal timeline, labels alternating above/below */}
        <div className="hidden md:block relative h-36 px-2">
          <div
            className={`timeline-line absolute left-2 right-2 top-1/2 h-0.5 -translate-y-1/2 bg-green/20 transition-opacity duration-500 ${
              selectedClass ? "opacity-0" : ""
            }`}
          />
          <div className="relative h-full flex items-center justify-between">
            {classYears.map((classYear, i) => (
              <TimelineNode
                key={classYear}
                label={classYear}
                labelAbove={i % 2 === 0}
                index={i}
                selected={selectedClass === classYear}
                dimmed={!!selectedClass && selectedClass !== classYear}
                dimDelay={
                  selectedClass
                    ? Math.abs(i - classYears.indexOf(selectedClass)) * 25
                    : 0
                }
                onClick={() => handleClassSelect(classYear)}
              />
            ))}
            <TimelineNode
              label="New"
              labelAbove={classYears.length % 2 === 0}
              index={classYears.length}
              isAdd
              dimmed={!!selectedClass}
              onClick={handleAddNewClass}
            />
          </div>
        </div>

        {/* Mobile: vertical timeline */}
        <div className="md:hidden relative pl-2">
          <div
            className={`timeline-line-vertical absolute left-[15px] top-3 bottom-3 w-0.5 bg-green/20 transition-opacity duration-500 ${
              selectedClass ? "opacity-0" : ""
            }`}
          />
          <div className="relative space-y-1">
            {classYears.map((classYear, i) => (
              <button
                key={classYear}
                type="button"
                onClick={() => handleClassSelect(classYear)}
                className={`timeline-node group w-full flex items-center gap-4 py-2 text-left transition-[opacity,transform] duration-300 ${
                  selectedClass && selectedClass !== classYear ? "opacity-0 -translate-x-3" : ""
                }`}
                style={{
                  animationDelay: `${300 + i * 40}ms`,
                  transitionDelay: selectedClass
                    ? `${Math.abs(i - classYears.indexOf(selectedClass)) * 25}ms`
                    : "0ms",
                }}
              >
                <span
                  className={`relative z-10 w-4 h-4 rounded-full ring-2 ring-green transition-all duration-300 group-hover:scale-125 ${
                    selectedClass === classYear ? "bg-green scale-125" : "bg-white group-hover:bg-green"
                  }`}
                >
                  {selectedClass === classYear && (
                    <span className="node-ripple absolute inset-0 rounded-full bg-green" />
                  )}
                </span>
                <span className="font-serif text-lg font-bold text-gray-dark group-hover:text-green transition-colors">
                  Class of {classYear}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={handleAddNewClass}
              className="timeline-node group w-full flex items-center gap-4 py-2 text-left"
              style={{ animationDelay: `${300 + classYears.length * 40}ms` }}
            >
              <span className="relative z-10 w-4 h-4 rounded-full bg-green/10 text-green flex items-center justify-center text-[10px] group-hover:bg-green group-hover:text-white transition-colors">
                <i className="fas fa-plus" />
              </span>
              <span className="text-gray-medium group-hover:text-green transition-colors">
                Add a new class
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Add New Class Modal */}
      {showAddClassModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
            <div className="relative">
              <div className="text-center mb-6">
                <div className="inline-block p-3 bg-green/10 rounded-full mb-4">
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
                    inputMode="numeric"
                    maxLength={4}
                    placeholder={`e.g., ${MAX_CLASS_YEAR - 3}`}
                    required
                    className="border border-gray-300 focus:border-green w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-green bg-white text-gray-dark placeholder-gray-medium font-medium"
                  />
                  {classYears.includes(newClassYear) && newClassYear && (
                    <p className="text-red-600 text-sm mt-1">
                      This class year already exists
                    </p>
                  )}
                  {newClassYear.length === 4 &&
                    !isValidClassYear(newClassYear) && (
                      <p className="text-red-600 text-sm mt-1">
                        Enter a year between {MIN_CLASS_YEAR} and{" "}
                        {MAX_CLASS_YEAR}
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
                      !isValidClassYear(newClassYear) ||
                      classYears.includes(newClassYear)
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

function TimelineNode({
  label,
  labelAbove,
  index,
  selected = false,
  dimmed = false,
  dimDelay = 0,
  isAdd = false,
  onClick,
}: {
  label: string;
  labelAbove: boolean;
  index: number;
  selected?: boolean;
  dimmed?: boolean;
  dimDelay?: number;
  isAdd?: boolean;
  onClick: () => void;
}) {
  const labelEl = (
    <span
      className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-serif font-bold transition-all duration-300 ${
        labelAbove ? "bottom-full mb-3" : "top-full mt-3"
      } ${
        selected
          ? "text-green text-lg"
          : isAdd
          ? "text-gray-medium text-sm group-hover:text-green"
          : "text-gray-dark text-sm group-hover:text-green group-hover:text-base"
      }`}
    >
      {label}
    </span>
  );

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isAdd ? "Add a new class" : `Class of ${label}`}
      className={`timeline-node group relative flex items-center justify-center w-8 h-8 transition-[opacity,transform] duration-300 ${
        dimmed ? "opacity-0 scale-50" : ""
      }`}
      style={{
        animationDelay: `${300 + index * 45}ms`,
        transitionDelay: `${dimDelay}ms`,
      }}
    >
      {labelEl}
      {isAdd ? (
        <span className="w-5 h-5 rounded-full bg-green/10 text-green flex items-center justify-center text-[10px] transition-all duration-300 group-hover:bg-green group-hover:text-white group-hover:scale-125">
          <i className="fas fa-plus" />
        </span>
      ) : (
        <span
          className={`relative w-4 h-4 rounded-full ring-2 ring-green transition-all duration-300 group-hover:scale-150 ${
            selected ? "bg-green scale-150" : "bg-white group-hover:bg-green"
          }`}
        >
          {selected && (
            <span className="node-ripple absolute inset-0 rounded-full bg-green" />
          )}
        </span>
      )}
    </button>
  );
}
