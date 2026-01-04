# import cv2

# def read_video(video_path):
#     cap = cv2.VideoCapture(video_path)
#     frames = []
#     while True:
#         ret, frame = cap.read()
#         if not ret:
#             break
#         frames.append(frame)
#     return frames

# def save_video(ouput_video_frames,output_video_path):
#     fourcc = cv2.VideoWriter_fourcc(*'XVID')
#     out = cv2.VideoWriter(output_video_path, fourcc, 24, (ouput_video_frames[0].shape[1], ouput_video_frames[0].shape[0]))
#     for frame in ouput_video_frames:
#         out.write(frame)
#     out.release()

import cv2
import os
import subprocess

def read_video(video_path):
    cap = cv2.VideoCapture(video_path)
    frames = []
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frames.append(frame)
    cap.release()
    return frames


def save_video(output_video_frames, output_video_path, fps=24):
    """Save frames to a browser-playable MP4 (H.264 + AAC)."""
    height, width, _ = output_video_frames[0].shape

    # Step 1: Save raw mp4 using OpenCV
    temp_path = output_video_path.replace(".mp4", "_raw.mp4")
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(temp_path, fourcc, fps, (width, height))
    for frame in output_video_frames:
        out.write(frame)
    out.release()

    # Step 2: Re-encode to H.264 for web compatibility
    try:
        subprocess.run([
            "ffmpeg", "-y", "-i", temp_path,
            "-vcodec", "libx264", "-acodec", "aac",
            "-pix_fmt", "yuv420p", output_video_path
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        os.remove(temp_path)
        print(f"✅ Saved browser-compatible video: {output_video_path}")
    except Exception as e:
        print(f"⚠️ FFmpeg re-encoding failed: {e}")
        # fallback — keep the OpenCV raw version
        os.rename(temp_path, output_video_path)
