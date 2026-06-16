import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

const MAX_HISTORY = 50;

// Clona solo los tracks (lo único que necesita undo)
function cloneTracks(tracks) {
  return JSON.parse(JSON.stringify(tracks));
}

export const useEditorStore = create(
  immer((set, get) => ({
    // ── Project ──────────────────────────────────────────────
    project:    null,
    clips:      [],
    setProject: (p)     => set((s) => { s.project = p; }),
    setClips:   (clips) => set((s) => { s.clips = clips; }),

    // ── Timeline tracks ──────────────────────────────────────
    tracks: [
      { id: "video-1", type: "video", label: "Video", items: [] },
      { id: "audio-1", type: "audio", label: "Audio", items: [] },
      { id: "text-1",  type: "text",  label: "Texto", items: [] },
    ],

    // ── Undo/Redo history ────────────────────────────────────
    _history: [],      // array de snapshots de tracks
    _historyIdx: -1,   // posición actual en la historia

    // Guarda snapshot antes de una acción destructiva
    _pushHistory: () => {
      const s = get();
      const snapshot = cloneTracks(s.tracks);
      set((state) => {
        // Descartar redo stack (todo lo que está adelante del índice actual)
        const newHistory = state._history.slice(0, state._historyIdx + 1);
        newHistory.push(snapshot);
        if (newHistory.length > MAX_HISTORY) newHistory.shift();
        state._history    = newHistory;
        state._historyIdx = newHistory.length - 1;
      });
    },

    undo: () => {
      const s = get();
      if (s._historyIdx <= 0) return;
      set((state) => {
        state._historyIdx -= 1;
        state.tracks = cloneTracks(state._history[state._historyIdx]);
        const maxEnd = state.tracks.flatMap((t) => t.items).reduce((m, i) => Math.max(m, i.trackEnd), 0);
        state.duration = maxEnd;
        state.selectedItemId = null;
      });
    },

    redo: () => {
      const s = get();
      if (s._historyIdx >= s._history.length - 1) return;
      set((state) => {
        state._historyIdx += 1;
        state.tracks = cloneTracks(state._history[state._historyIdx]);
        const maxEnd = state.tracks.flatMap((t) => t.items).reduce((m, i) => Math.max(m, i.trackEnd), 0);
        state.duration = maxEnd;
        state.selectedItemId = null;
      });
    },

    canUndo: () => get()._historyIdx > 0,
    canRedo: () => get()._historyIdx < get()._history.length - 1,

    // ── Playback ─────────────────────────────────────────────
    currentTime:      0,
    duration:         0,
    playing:          false,
    zoom:             1,
    showSubtitles:    false,
    setCurrentTime:   (t) => set((s) => { s.currentTime = t; }),
    setDuration:      (d) => set((s) => { s.duration = d; }),
    setPlaying:       (v) => set((s) => { s.playing = v; }),
    setZoom:          (z) => set((s) => { s.zoom = Math.max(0.1, Math.min(10, z)); }),
    toggleSubtitles:  ()  => set((s) => { s.showSubtitles = !s.showSubtitles; }),

    // ── Selection ────────────────────────────────────────────
    selectedItemId: null,
    selectItem:  (id) => set((s) => { s.selectedItemId = id; }),
    clearSelect: ()   => set((s) => { s.selectedItemId = null; }),

    // ── Add clip to timeline ─────────────────────────────────
    addClipToTrack: (clip, trackId) => {
      get()._pushHistory();
      set((s) => {
        const track = s.tracks.find((t) => t.id === trackId);
        if (!track) return;
        const existingEnd = track.items.reduce((max, item) => Math.max(max, item.trackEnd), 0);
        const dur = clip.duration || (clip.end_time - clip.start_time) || 30;
        track.items.push({
          id:           `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          clipId:       clip.id,
          title:        clip.title,
          downloadUrl:  clip.download_url,
          thumbnailUrl: clip.thumbnail_url,
          srcStart:     0,
          srcEnd:       dur,
          trackStart:   existingEnd,
          trackEnd:     existingEnd + dur,
          duration:     dur,
          text:         clip.text      || "",
          fontSize:     clip.fontSize  || 48,
          color:        clip.color     || "#ffffff",
          animation:    clip.animation || "none",
          opacity:      1,
          speed:        1,
        });
        const maxEnd = s.tracks.flatMap((t) => t.items).reduce((m, i) => Math.max(m, i.trackEnd), 0);
        s.duration = maxEnd;
      });
    },

    // ── Move item ────────────────────────────────────────────
    moveItem: (itemId, newTrackStart) => {
      get()._pushHistory();
      set((s) => {
        for (const track of s.tracks) {
          const item = track.items.find((i) => i.id === itemId);
          if (item) {
            const dur = item.trackEnd - item.trackStart;
            item.trackStart = Math.max(0, newTrackStart);
            item.trackEnd   = item.trackStart + dur;
            break;
          }
        }
        const maxEnd = s.tracks.flatMap((t) => t.items).reduce((m, i) => Math.max(m, i.trackEnd), 0);
        s.duration = maxEnd;
      });
    },

    // ── Trim item ────────────────────────────────────────────
    trimItem: (itemId, side, newTime) => {
      get()._pushHistory();
      set((s) => {
        for (const track of s.tracks) {
          const item = track.items.find((i) => i.id === itemId);
          if (item) {
            if (side === "start") {
              item.trackStart = Math.max(0, Math.min(newTime, item.trackEnd - 0.5));
            } else {
              item.trackEnd = Math.max(item.trackStart + 0.5, newTime);
            }
            item.duration = item.trackEnd - item.trackStart;
            break;
          }
        }
      });
    },

    // ── Cut at currentTime ───────────────────────────────────
    cutAtCurrentTime: () => {
      get()._pushHistory();
      set((s) => {
        const t = s.currentTime;
        for (const track of s.tracks) {
          for (let i = 0; i < track.items.length; i++) {
            const item = track.items[i];
            if (t > item.trackStart + 0.1 && t < item.trackEnd - 0.1) {
              const second = {
                ...item,
                id:         `item-${Date.now()}-b`,
                trackStart: t,
                srcStart:   item.srcStart + (t - item.trackStart),
              };
              item.trackEnd = t;
              item.duration = t - item.trackStart;
              track.items.splice(i + 1, 0, second);
              break;
            }
          }
        }
      });
    },

    // ── Delete item ──────────────────────────────────────────
    deleteItem: (itemId) => {
      get()._pushHistory();
      set((s) => {
        for (const track of s.tracks) {
          const idx = track.items.findIndex((i) => i.id === itemId);
          if (idx !== -1) { track.items.splice(idx, 1); break; }
        }
        s.selectedItemId = null;
      });
    },

    // ── Update item properties ───────────────────────────────
    updateItemProp: (itemId, key, value) =>
      set((s) => {
        for (const track of s.tracks) {
          const item = track.items.find((i) => i.id === itemId);
          if (item) { item[key] = value; break; }
        }
      }),

    // ── Add text overlay ─────────────────────────────────────
    addText: () => {
      get()._pushHistory();
      set((s) => {
        const t         = s.currentTime;
        const textTrack = s.tracks.find((tr) => tr.type === "text");
        if (!textTrack) return;
        textTrack.items.push({
          id:         `text-${Date.now()}`,
          clipId:     null,
          type:       "text",
          text:       "Tu texto aquí",
          fontSize:   48,
          color:      "#ffffff",
          animation:  "none",
          trackStart: t,
          trackEnd:   t + 5,
          duration:   5,
        });
      });
    },

    // ── Restore tracks from saved edit_data ──────────────────
    setTracks: (tracks, duration) =>
      set((s) => {
        s.tracks   = tracks;
        s.duration = duration || tracks.flatMap((t) => t.items).reduce((m, i) => Math.max(m, i.trackEnd || 0), 0);
        s._history    = [];
        s._historyIdx = -1;
      }),

    // ── Reset ────────────────────────────────────────────────
    reset: () =>
      set((s) => {
        s.tracks = [
          { id: "video-1", type: "video", label: "Video", items: [] },
          { id: "audio-1", type: "audio", label: "Audio", items: [] },
          { id: "text-1",  type: "text",  label: "Texto", items: [] },
        ];
        s.currentTime    = 0;
        s.duration       = 0;
        s.playing        = false;
        s.selectedItemId = null;
        s._history       = [];
        s._historyIdx    = -1;
      }),

    // ── Computed: selected item ───────────────────────────────
    getSelectedItem: () => {
      const s = get();
      if (!s.selectedItemId) return null;
      for (const track of s.tracks) {
        const item = track.items.find((i) => i.id === s.selectedItemId);
        if (item) return item;
      }
      return null;
    },
  }))
);
