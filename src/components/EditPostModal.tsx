"use client";
import { useState } from "react";
import ImageUpload from "./ImageUpload";
import RichTextEditor from "./RichTextEditor";

interface EditPostModalProps {
  post: any;
  onClose: () => void;
  onSave: (updatedPost: any) => void;
}

export default function EditPostModal({
  post,
  onClose,
  onSave,
}: EditPostModalProps) {
  const [title, setTitle] = useState(post.title || "");
  const [content, setContent] = useState(post.content || "");
  const [excerpt, setExcerpt] = useState(post.excerpt || "");
  const [featuredImage, setFeaturedImage] = useState(post.featuredImage || "");
  const [isPrivate, setIsPrivate] = useState(post.private || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Please enter a title for your post.");
      return;
    }
    if (!content.trim()) {
      alert("Please enter content for your post.");
      return;
    }

    setSaving(true);
    try {
      const updatedPost = {
        ...post,
        title: title.trim(),
        content: content.trim(),
        excerpt: excerpt.trim(),
        featuredImage: featuredImage,
        private: isPrivate,
      };
      await onSave(updatedPost);
    } catch (error) {
      console.error("Error saving post:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (imageUrl: string) => {
    setFeaturedImage(imageUrl);
  };

  const handleRemoveImage = () => {
    setFeaturedImage("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-serif font-bold text-gray-dark">
              Edit Post
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-dark mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark font-medium"
                placeholder="Enter post title"
                maxLength={100}
              />
              <p className="text-sm text-gray-500 mt-1">
                {title.length}/100 characters
              </p>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-semibold text-gray-dark mb-2">
                Content *
              </label>
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Write your post content here..."
                className="w-full"
              />
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-sm font-semibold text-gray-dark mb-2">
                Excerpt
              </label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border-2 border-green/30 rounded-lg focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark font-medium resize-none"
                placeholder="Enter a brief description of your post"
                maxLength={300}
              />
              <p className="text-sm text-gray-500 mt-1">
                {excerpt.length}/300 characters
              </p>
            </div>

            {/* Featured Image */}
            <div>
              <label className="block text-sm font-semibold text-gray-dark mb-2">
                Featured Image
              </label>
              {featuredImage ? (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={featuredImage}
                      alt="Featured image"
                      className="w-full h-48 object-cover rounded-lg border-2 border-green/20"
                    />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Click the X to remove this image
                  </p>
                </div>
              ) : (
                <ImageUpload
                  onImageUpload={handleImageUpload}
                  onImageRemove={() => {}}
                />
              )}
            </div>

            {/* Private Post Checkbox */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border-2 border-green/20">
              <input
                type="checkbox"
                id="private"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-5 h-5 text-green border-green/30 rounded focus:ring-2 focus:ring-green focus:ring-offset-2 cursor-pointer"
              />
              <label
                htmlFor="private"
                className="text-sm font-medium text-gray-dark cursor-pointer flex-1"
              >
                Make this post private (only you will be able to see it)
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-green/20">
            <button
              onClick={onClose}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim() || !content.trim()}
              className="px-6 py-3 bg-green text-white rounded-lg hover:bg-green-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-semibold"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
