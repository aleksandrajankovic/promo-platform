"use client";

import AdminTableCard from "../../components/AdminTableCard";

export default function ScratchTab({
  scratchCoverUrl, setScratchCoverUrl,
  scratchCursorUrl, setScratchCursorUrl,
  openGallery,
}) {
  return (
    <div className="space-y-6">
      <AdminTableCard title="Scratch Card">
        <div className="p-4 space-y-4">
          <p className="text-sm text-neutral-500">
            Image shown on the scratch-off layer for promotions with "Enable scratch card" turned on.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="flex-1 min-w-0 border border-[#D0D0D0] rounded px-2.5 py-1.5 text-sm"
              value={scratchCoverUrl}
              onChange={(e) => setScratchCoverUrl(e.target.value)}
              placeholder="/img/scratchCard.png"
            />
            <button
              type="button"
              onClick={() => openGallery("scratchCover")}
              className="shrink-0 inline-flex items-center justify-center px-4 py-2.5 rounded bg-[#1F2933] text-white text-xs hover:brightness-110 whitespace-nowrap"
            >
              Choose from gallery
            </button>
          </div>
          <div className="text-xs text-neutral-400 space-y-0.5">
            <p>Recommended: <strong className="text-neutral-500">840×300px</strong> (landscape, ~2.8:1) for regular scratch cards.</p>
            <p>
              If a promo also has "Flip card" enabled, this same image is shown in a <strong className="text-neutral-500">portrait 360:430</strong> crop
              instead — a wide landscape image will get cropped tighter in the middle for those. Pick something with the focal point centered if you use both.
            </p>
          </div>
          {scratchCoverUrl && (
            <div className="mt-1 border border-neutral-200 rounded-lg overflow-hidden w-full max-w-[240px] aspect-video bg-black/40">
              <img src={scratchCoverUrl} alt="scratch cover preview" className="w-full h-full object-cover" />
            </div>
          )}

          <hr className="border-neutral-100" />

          <p className="text-sm text-neutral-500">
            Cursor icon shown while scratching (small image, e.g. a coin).
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="flex-1 min-w-0 border border-[#D0D0D0] rounded px-2.5 py-1.5 text-sm"
              value={scratchCursorUrl}
              onChange={(e) => setScratchCursorUrl(e.target.value)}
              placeholder="/img/coin.png"
            />
            <button
              type="button"
              onClick={() => openGallery("scratchCursor")}
              className="shrink-0 inline-flex items-center justify-center px-4 py-2.5 rounded bg-[#1F2933] text-white text-xs hover:brightness-110 whitespace-nowrap"
            >
              Choose from gallery
            </button>
          </div>
          <p className="text-xs text-neutral-400">
            Recommended: <strong className="text-neutral-500">32×32px</strong>, square, transparent PNG. The cursor's click-point is fixed to the center of the image, so keep it small and centered.
          </p>
          {scratchCursorUrl && (
            <div className="mt-1 border border-neutral-200 rounded-lg overflow-hidden w-16 h-16 bg-black/40 flex items-center justify-center">
              <img src={scratchCursorUrl} alt="scratch cursor preview" className="max-w-full max-h-full object-contain" />
            </div>
          )}
        </div>
      </AdminTableCard>
    </div>
  );
}
