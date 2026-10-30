"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button, ErrorBox, Modal, Spinner, useToast } from "./ui";

// Camera check-in: counts faces in the browser (MediaPipe), reads GPS, and sends both to the server.
// The server decides (distance to office, accuracy, exactly one face); no photo is stored or uploaded.
const WASM_LOCAL = "/wasm";
const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";
const MODEL_LOCAL = "/models/blaze_face_short_range.tflite";
const MODEL_CDN = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

export function CameraCheckIn({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const detector = useRef<any>(null);
  const raf = useRef<number>(0);
  const [faces, setFaces] = useState(0);
  const [status, setStatus] = useState<"starting" | "ready" | "error">("starting");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    detector.current?.close?.();
    detector.current = null;
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStatus("starting");
    setError("");
    setFaces(0);

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("This browser cannot access the camera (HTTPS or localhost is required).");
        }

        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });

        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = s;

        const v = video.current;
        if (v) {
          v.srcObject = s;
          try {
            await v.play();
          } catch {
            // Ignore autoplay rejection, stream is attached
          }
        }

        // Initialize MediaPipe FaceDetector: Try local wasm first, then fallback to CDN
        const { FilesetResolver, FaceDetector } = await import("@mediapipe/tasks-vision");
        let faceDetector: any = null;

        try {
          const fileset = await FilesetResolver.forVisionTasks(WASM_LOCAL);
          faceDetector = await FaceDetector.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_LOCAL },
            runningMode: "VIDEO",
            minDetectionConfidence: 0.5,
          });
        } catch {
          // CDN fallback
          const fileset = await FilesetResolver.forVisionTasks(WASM_CDN);
          faceDetector = await FaceDetector.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_CDN },
            runningMode: "VIDEO",
            minDetectionConfidence: 0.5,
          });
        }

        if (cancelled) {
          faceDetector?.close?.();
          return;
        }

        detector.current = faceDetector;
        setStatus("ready");

        let lastVideoTime = -1;
        let lastTimestamp = 0;

        const loop = () => {
          if (cancelled) return;
          const vid = video.current;
          if (vid && detector.current && vid.readyState >= 2 && vid.videoWidth > 0 && vid.videoHeight > 0) {
            if (vid.currentTime !== lastVideoTime) {
              lastVideoTime = vid.currentTime;
              const now = performance.now();
              const currentTimestamp = Math.max(now, lastTimestamp + 1);
              lastTimestamp = currentTimestamp;
              try {
                const res = detector.current.detectForVideo(vid, currentTimestamp);
                setFaces(res?.detections?.length || 0);
              } catch {
                // Ignore single-frame detection hiccups
              }
            }
          }
          raf.current = requestAnimationFrame(loop);
        };

        loop();
      } catch (e: any) {
        if (!cancelled) {
          setStatus("error");
          setError(e?.name === "NotAllowedError" ? "Camera permission was denied." : e?.message || "Could not start the camera.");
        }
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [open, stop]);

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
        // Fallback for laptops/PCs with no GPS hardware
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
      stop();
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
    <Modal open={open} title="Camera check-in" onClose={() => { stop(); onClose(); }}>
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-xl bg-black">
          <video ref={video} autoPlay playsInline muted className="aspect-[4/3] w-full -scale-x-100 object-cover" />
          {status === "starting" && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-white">
              <Spinner /> Starting camera & face detection...
            </div>
          )}
          {status === "ready" && (
            <div className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-xs font-medium text-white shadow ${faces === 1 ? "bg-emerald-600" : "bg-amber-600"}`}>
              {faces === 1 ? "1 face detected" : faces === 0 ? "No face detected" : `${faces} faces - only one allowed`}
            </div>
          )}
        </div>
        {error && <ErrorBox message={error} />}
        <p className="text-xs text-muted">Only the face count and your location are sent. No photo is stored. If this fails, ask HR for an attendance correction.</p>
        <Button onClick={submit} loading={busy} disabled={status !== "ready" || faces !== 1} className="w-full">
          Check in
        </Button>
      </div>
    </Modal>
  );
}
