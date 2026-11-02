"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button, ErrorBox, Modal, Spinner, useToast } from "./ui";

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_CDN =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

/**
 * Laptop cameras often drop the stream after a few seconds when:
 * - another app (Teams/Zoom/Windows Hello) grabs the device
 * - constraints are too strict
 * - the <video> element is briefly detached
 * This component keeps the stream alive and auto-restarts if the track ends while the modal is open.
 */
export function CameraCheckIn({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timestampRef = useRef(0);
  const aliveRef = useRef(false); // true while modal should keep camera
  const startingRef = useRef(false);
  const [faces, setFaces] = useState(0);
  const [status, setStatus] = useState<"starting" | "ready" | "error">("starting");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const clearDetector = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    try {
      detectorRef.current?.close?.();
    } catch {
      /* ignore */
    }
    detectorRef.current = null;
  }, []);

  const stopStreamOnly = useCallback(() => {
    const stream = streamRef.current;
    streamRef.current = null;
    if (stream) {
      stream.getTracks().forEach((t) => {
        try {
          t.onended = null;
          t.stop();
        } catch {
          /* ignore */
        }
      });
    }
    const video = videoRef.current;
    if (video) {
      try {
        video.pause();
      } catch {
        /* ignore */
      }
      video.srcObject = null;
    }
  }, []);

  const fullStop = useCallback(() => {
    aliveRef.current = false;
    startingRef.current = false;
    clearDetector();
    stopStreamOnly();
  }, [clearDetector, stopStreamOnly]);

  const startFaceLoop = useCallback(async (video: HTMLVideoElement) => {
    clearDetector();
    try {
      const vision = await import("@mediapipe/tasks-vision");
      if (!aliveRef.current) return;

      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_CDN);
      if (!aliveRef.current) return;

      const faceDetector = await vision.FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_CDN, delegate: "CPU" },
        runningMode: "VIDEO",
        minDetectionConfidence: 0.5,
      });

      if (!aliveRef.current) {
        faceDetector.close?.();
        return;
      }

      detectorRef.current = faceDetector;
      timestampRef.current = 0;

      // warm-up once
      try {
        const warm = Math.max(performance.now(), 1);
        timestampRef.current = warm;
        if (video.videoWidth > 0) faceDetector.detectForVideo(video, warm);
      } catch {
        /* ignore */
      }

      intervalRef.current = setInterval(() => {
        if (!aliveRef.current) return;
        const vid = videoRef.current;
        const det = detectorRef.current;
        if (!vid || !det) return;
        if (vid.readyState < 2 || vid.videoWidth <= 0) return;

        if (vid.paused) {
          vid.play().catch(() => {});
          return;
        }

        const now = performance.now();
        const ts = Math.max(now, timestampRef.current + 1);
        timestampRef.current = ts;

        try {
          const result = det.detectForVideo(vid, ts);
          setFaces(Array.isArray(result?.detections) ? result.detections.length : 0);
        } catch {
          /* frame error */
        }
      }, 200);

      setStatus("ready");
      setError("");
    } catch (e: any) {
      if (!aliveRef.current) return;
      setStatus("error");
      setError(e?.message || "Face detection failed to load. You can close and try again.");
    }
  }, [clearDetector]);

  const attachStream = useCallback(
    async (stream: MediaStream) => {
      streamRef.current = stream;

      // If laptop camera track ends (device stolen / driver glitch), restart while modal open
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          if (!aliveRef.current) return;
          setStatus("starting");
          setError("Camera disconnected. Reconnecting…");
          // small delay then restart
          setTimeout(() => {
            if (aliveRef.current) void startCamera();
          }, 400);
        };
      });

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error("Video element not ready — close and open again.");
      }

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      try {
        await video.play();
      } catch {
        // try again shortly (laptop drivers sometimes need a tick)
        await new Promise((r) => setTimeout(r, 200));
        try {
          await video.play();
        } catch {
          /* still ok — frames may arrive */
        }
      }

      // wait for dimensions
      await new Promise<void>((resolve) => {
        if (video.videoWidth > 0 && video.readyState >= 2) {
          resolve();
          return;
        }
        const done = () => {
          video.removeEventListener("loadeddata", done);
          video.removeEventListener("playing", done);
          resolve();
        };
        video.addEventListener("loadeddata", done);
        video.addEventListener("playing", done);
        setTimeout(done, 3000);
      });

      if (!aliveRef.current) return;
      await startFaceLoop(video);
    },
    [startFaceLoop]
  );

  const startCamera = useCallback(async () => {
    if (!aliveRef.current || startingRef.current) return;
    startingRef.current = true;
    setStatus("starting");
    setFaces(0);

    // stop previous stream without clearing alive flag
    clearDetector();
    stopStreamOnly();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not available. Use HTTPS or localhost.");
      }

      // Laptop-friendly constraints: start simple, then slightly better
      let stream: MediaStream | null = null;
      const attempts: MediaStreamConstraints[] = [
        { audio: false, video: true }, // most compatible for laptop webcams
        { audio: false, video: { facingMode: "user" } },
        {
          audio: false,
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        },
      ];

      let lastErr: any = null;
      for (const constraints of attempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (e) {
          lastErr = e;
        }
      }

      if (!stream) {
        const name = lastErr?.name;
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          throw new Error("Camera permission denied. Allow camera in browser settings.");
        }
        if (name === "NotReadableError" || name === "TrackStartError") {
          throw new Error(
            "Camera is busy. Close Zoom / Teams / Skype / Windows Camera app, then try again."
          );
        }
        if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          throw new Error("No camera found on this laptop.");
        }
        throw new Error(lastErr?.message || "Could not open the camera.");
      }

      if (!aliveRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      await attachStream(stream);
    } catch (e: any) {
      if (!aliveRef.current) return;
      setStatus("error");
      setError(e?.message || "Could not start the camera.");
    } finally {
      startingRef.current = false;
    }
  }, [attachStream, clearDetector, stopStreamOnly]);

  // Only tied to `open` — does not restart on parent re-renders
  useEffect(() => {
    if (!open) {
      fullStop();
      return;
    }

    aliveRef.current = true;
    void startCamera();

    return () => {
      // On unmount / close: fully release camera so other apps can use it
      fullStop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      if (!navigator.geolocation) {
        throw new Error("Location is not supported by your browser");
      }

      const getPos = (highAccuracy: boolean): Promise<GeolocationPosition> =>
        new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: highAccuracy,
            timeout: highAccuracy ? 8000 : 12000,
            maximumAge: 30000,
          });
        });

      let pos: GeolocationPosition;
      try {
        pos = await getPos(true);
      } catch (err: any) {
        if (err?.code === 1) {
          throw new Error("Location permission was denied. Please allow location in your browser.");
        }
        pos = await getPos(false);
      }

      await api("/attendance/check-in", {
        body: {
          source: "camera",
          face_count: faces,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        },
      });
      toast("Checked in with camera");
      fullStop();
      onDone();
    } catch (e: any) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e?.code === 1
          ? "Location permission was denied."
          : e?.message || "Check-in failed";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Camera check-in"
      onClose={() => {
        fullStop();
        onClose();
      }}
    >
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-xl bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="aspect-[4/3] w-full -scale-x-100 object-cover"
          />
          {status === "starting" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 bg-black/50 text-sm text-white">
              <Spinner /> Starting camera…
            </div>
          )}
          {status === "ready" && (
            <div
              className={`pointer-events-none absolute left-2 top-2 rounded-full px-2.5 py-1 text-xs font-medium text-white shadow ${
                faces === 1 ? "bg-emerald-600" : "bg-amber-600"
              }`}
            >
              {faces === 1 ? "1 face detected" : faces === 0 ? "No face detected" : `${faces} faces — only one allowed`}
            </div>
          )}
        </div>

        {error && <ErrorBox message={error} />}

        <div className="rounded-lg bg-soft px-3 py-2 text-xs text-muted">
          <strong className="text-foreground">Laptop tip:</strong> Close Zoom, Teams, Skype, or the Windows Camera
          app first. Only one program can use the webcam at a time. Use{" "}
          <strong className="text-foreground">localhost</strong> or <strong className="text-foreground">HTTPS</strong>.
        </div>

        <p className="text-xs text-muted">
          Only face count + location are sent. No photo is stored.
        </p>

        <div className="flex gap-2">
          {status === "error" && (
            <Button type="button" variant="secondary" className="flex-1" onClick={() => void startCamera()}>
              Retry camera
            </Button>
          )}
          <Button
            onClick={submit}
            loading={busy}
            disabled={status !== "ready" || faces !== 1}
            className="flex-1"
          >
            Check in
          </Button>
        </div>
      </div>
    </Modal>
  );
}
