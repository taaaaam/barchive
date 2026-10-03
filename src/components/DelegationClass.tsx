"use client";
import Image from "next/image";
import Link from "next/link";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { uploadImage } from "@/lib/cloudinary";
import { processImageFile, validateImageFile } from "@/lib/imageUtils";

export interface DelegationMember {
  id: string;
  firstName: string;
  lastName: string;
  username?: string;
  profilePicture?: string;
  isClaimed: boolean;
}

interface DelegationClassProps {
  classYear: string;
  members: DelegationMember[];
  groupPhoto?: string;
  focused: boolean;
  canEditPhoto: boolean;
  onFocusRequest: () => void;
  onGroupPhotoChange: (url: string) => Promise<void>;
}

const DelegationClass = forwardRef<HTMLElement, DelegationClassProps>(
  function DelegationClass(
    {
      classYear,
      members,
      groupPhoto,
      focused,
      canEditPhoto,
      onFocusRequest,
      onGroupPhotoChange,
    },
    ref
  ) {
    const showBackdrop = !focused && !!groupPhoto;

    return (
      <section
        ref={ref}
        data-year={classYear}
        className={`relative overflow-hidden rounded-2xl transition-[background-color,box-shadow] duration-500 ease-out ${
          focused ? "bg-white shadow-2xl" : "bg-white/10 shadow-none hover:shadow-lg"
        }`}
      >
        {/* Group photo as the backdrop of a collapsed class */}
        {groupPhoto && (
          <div
            aria-hidden="true"
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-500 ${
              showBackdrop ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url("${groupPhoto}")` }}
          >
            <div className="absolute inset-0 bg-black/55" />
          </div>
        )}

        <div className="relative">
          {/* Collapsed: year + a row of faces */}
          <Collapsible open={!focused}>
            <button
              type="button"
              onClick={onFocusRequest}
              aria-expanded={focused}
              className="w-full min-h-[10rem] hover:min-h-[13rem] transition-[min-height] duration-300 ease-out flex flex-wrap items-center justify-between gap-4 px-8 py-8 text-left cursor-pointer"
            >
              <div>
                <h3 className="text-2xl font-serif font-bold text-white">
                  Class of {classYear}
                </h3>
                <p className="text-sm text-white/75">
                  {members.length} member{members.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {members.map((member) => (
                  <Avatar key={member.id} member={member} size={36} ringed />
                ))}
              </div>
            </button>
          </Collapsible>

          {/* Focused: member grid + group photo */}
          <Collapsible open={focused}>
            <div className="p-6 md:p-8">
              <div className="flex flex-wrap items-end justify-between gap-2 mb-6">
                <div>
                  <h3 className="text-3xl font-serif font-bold text-gray-dark">
                    Class of {classYear}
                  </h3>
                  <p className="text-gray-medium">
                    {members.length} member{members.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
                    Active
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    Not yet joined
                  </span>
                </div>
              </div>

              <div className="flex flex-col-reverse lg:flex-row gap-8">
                {/* Member grid */}
                <div className="lg:w-3/5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1 content-start">
                  {members.map((member, i) => (
                    <Link
                      key={member.id}
                      href={`/members/${member.id}`}
                      className={`group flex items-center gap-3 p-2 rounded-lg hover:bg-gray-light transition-all duration-500 ease-out ${
                        focused
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-2"
                      }`}
                      style={{ transitionDelay: focused ? `${i * 25}ms` : "0ms" }}
                    >
                      <Avatar member={member} size={44} />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-dark truncate group-hover:text-green transition-colors">
                          {member.firstName} {member.lastName}
                        </p>
                        {member.username && (
                          <p className="text-xs text-gray-medium truncate">
                            @{member.username}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Group photo */}
                <div className="lg:w-2/5">
                  <GroupPhoto
                    classYear={classYear}
                    groupPhoto={groupPhoto}
                    canEdit={canEditPhoto}
                    onChange={onGroupPhotoChange}
                  />
                </div>
              </div>
            </div>
          </Collapsible>
        </div>
      </section>
    );
  }
);

export default DelegationClass;

// Animates height between 0 and auto using the grid-rows 0fr/1fr technique
function Collapsible({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
      aria-hidden={!open}
      inert={!open}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

function Avatar({
  member,
  size,
  ringed = false,
}: {
  member: DelegationMember;
  size: number;
  ringed?: boolean;
}) {
  const name = `${member.firstName} ${member.lastName}`;
  const dot = Math.max(8, Math.round(size * 0.26));
  return (
    <span
      className={`relative flex-shrink-0 rounded-full ${
        ringed ? "ring-2 ring-white" : ""
      }`}
      style={{ width: size, height: size }}
      title={ringed ? name : undefined}
    >
      {member.profilePicture ? (
        <Image
          src={member.profilePicture}
          alt={name}
          width={size * 2}
          height={size * 2}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <span className="w-full h-full rounded-full bg-[#dfece3] flex items-center justify-center text-green font-semibold"
          style={{ fontSize: size * 0.36 }}
        >
          {member.firstName?.[0]}
          {member.lastName?.[0]}
        </span>
      )}
      <span
        className={`absolute bottom-0 right-0 rounded-full ring-2 ring-white ${
          member.isClaimed ? "bg-[#22c55e]" : "bg-yellow-400"
        }`}
        style={{ width: dot, height: dot }}
        aria-label={member.isClaimed ? "Active" : "Not yet joined"}
      />
    </span>
  );
}

function GroupPhoto({
  classYear,
  groupPhoto,
  canEdit,
  onChange,
}: {
  classYear: string;
  groupPhoto?: string;
  canEdit: boolean;
  onChange: (url: string) => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState(false);
  const closeViewer = useCallback(() => setViewing(false), []);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const validationError = validateImageFile(file, 8);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setUploading(true);
    try {
      const url = await uploadImage(await processImageFile(file));
      await onChange(url);
    } catch (err) {
      console.error("Error uploading group photo:", err);
      setError("Couldn't upload the photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const uploadButton = canEdit && (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-sm font-semibold text-green hover:text-green-dark disabled:opacity-50"
      >
        {uploading
          ? "Uploading…"
          : groupPhoto
          ? "Change group photo"
          : "Upload group photo"}
      </button>
    </>
  );

  return (
    <div>
      {groupPhoto ? (
        <button
          type="button"
          onClick={() => setViewing(true)}
          aria-label={`View Class of ${classYear} group photo`}
          className="block w-full rounded-xl overflow-hidden cursor-zoom-in transition-opacity hover:opacity-90"
        >
          <Image
            src={groupPhoto}
            alt={`Class of ${classYear} group photo`}
            width={1200}
            height={900}
            sizes="(min-width: 1024px) 480px, 100vw"
            className="w-full h-auto"
          />
        </button>
      ) : (
        <div className="aspect-[4/3] rounded-xl bg-gray-light flex flex-col items-center justify-center gap-2 text-gray-medium text-sm">
          No group photo yet
        </div>
      )}
      <div className="mt-3 flex items-center justify-between gap-4">
        {uploadButton}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      {viewing && groupPhoto && (
        <PhotoLightbox
          src={groupPhoto}
          caption={`Class of ${classYear}`}
          onClose={closeViewer}
        />
      )}
    </div>
  );
}

// Full-screen view of a group photo. Rendered in place (not in a portal) so
// clicks inside it still count as inside the expanded class.
function PhotoLightbox({
  src,
  caption,
  onClose,
}: {
  src: string;
  caption: string;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    // Capture phase + stopPropagation so Escape closes only the lightbox,
    // not the expanded class behind it
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKey, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${caption} group photo`}
      onClick={onClose}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-4 md:p-10 bg-black/90 cursor-zoom-out transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <Image
        src={src}
        alt={`${caption} group photo`}
        width={2400}
        height={1800}
        sizes="100vw"
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[85vh] w-auto h-auto max-w-full rounded-lg cursor-default transition-transform duration-300 ${
          visible ? "scale-100" : "scale-95"
        }`}
      />
      <p className="text-white/80 font-serif text-lg">{caption}</p>
    </div>
  );
}
