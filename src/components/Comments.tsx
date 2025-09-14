"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";

interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorProfilePicture?: string;
  createdAt: any;
  updatedAt?: any;
}

interface CommentsProps {
  postId: string;
}

export default function Comments({ postId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
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
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (postId) {
      fetchComments();
    }
  }, [postId]);

  const fetchComments = async () => {
    try {
      const commentsQuery = query(
        collection(db, "posts", postId, "comments"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(commentsQuery);

      const commentsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Comment[];

      setComments(commentsData);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !userProfile) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, "posts", postId, "comments"), {
        content: newComment.trim(),
        authorId: user.uid,
        authorName: userProfile.username || user.email,
        authorProfilePicture: userProfile.profilePicture || null,
        createdAt: serverTimestamp(),
      });

      setNewComment("");
      fetchComments();
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("Error adding comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "posts", postId, "comments", commentId));
      fetchComments();
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Error deleting comment. Please try again.");
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      await updateDoc(doc(db, "posts", postId, "comments", commentId), {
        content: editContent.trim(),
        updatedAt: serverTimestamp(),
      });

      setEditingComment(null);
      setEditContent("");
      fetchComments();
    } catch (error) {
      console.error("Error updating comment:", error);
      alert("Error updating comment. Please try again.");
    }
  };

  const startEditing = (comment: Comment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  const cancelEditing = () => {
    setEditingComment(null);
    setEditContent("");
  };

  if (loading) {
    return (
      <div className="mt-16">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-green border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-16">
      <div className="bg-white rounded-2xl shadow-xl border-2 border-green/20 p-8">
        <h2 className="text-3xl font-serif font-bold text-gray-dark mb-8">
          Comments ({comments.length})
        </h2>

        {/* Add Comment Form */}
        {user ? (
          <form onSubmit={handleSubmitComment} className="mb-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                {userProfile?.profilePicture ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    <Image
                      src={userProfile.profilePicture}
                      alt={userProfile.username}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-green/20 flex items-center justify-center">
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
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="w-full px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark font-medium resize-none"
                  rows={3}
                  required
                />
                <div className="flex justify-end mt-3">
                  <button
                    type="submit"
                    disabled={submitting || !newComment.trim()}
                    className="px-6 py-2 bg-green text-white font-semibold rounded-lg hover:bg-green-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {submitting ? "Posting..." : "Post Comment"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="mb-8 p-6 bg-green/5 rounded-lg border-2 border-green/20 text-center">
            <p className="text-gray-dark mb-4">
              Please{" "}
              <button
                onClick={() => router.push("/login")}
                className="text-green hover:text-green-dark font-semibold underline"
              >
                log in
              </button>{" "}
              to leave a comment.
            </p>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-6">
          {comments.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-block p-4 bg-green/5 rounded-full border-2 border-green/20 mb-4">
                <svg
                  className="w-8 h-8 text-green"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="text-gray-medium">
                No comments yet. Be the first to share your thoughts!
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="border-b border-gray-200 pb-6 last:border-b-0"
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    {comment.authorProfilePicture ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden">
                        <Image
                          src={comment.authorProfilePicture}
                          alt={comment.authorName}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-green/20 flex items-center justify-center">
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
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-gray-dark">
                        {comment.authorName}
                      </span>
                      <span className="text-sm text-gray-500">
                        {comment.createdAt?.toDate?.()?.toLocaleDateString() ||
                          "No date"}
                        {comment.updatedAt && (
                          <span className="text-gray-400"> (edited)</span>
                        )}
                      </span>
                      {user && comment.authorId === user.uid && (
                        <div className="flex gap-1 ml-auto">
                          <button
                            onClick={() => startEditing(comment)}
                            className="p-1 text-gray-400 hover:text-green hover:bg-green/10 rounded transition-all duration-200"
                            title="Edit comment"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all duration-200"
                            title="Delete comment"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {editingComment === comment.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark font-medium resize-none"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditComment(comment.id)}
                            className="px-4 py-1 bg-green text-white text-sm font-semibold rounded hover:bg-green-dark transition-colors duration-200"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-4 py-1 bg-gray-500 text-white text-sm font-semibold rounded hover:bg-gray-600 transition-colors duration-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-dark leading-relaxed">
                        {comment.content}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
