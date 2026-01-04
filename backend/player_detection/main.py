from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import numpy as np
import cv2
from werkzeug.utils import secure_filename

# Import your existing modules
from utils import read_video, save_video
from trackers import Tracker
from team_assigner import TeamAssigner
from player_ball_assigner import PlayerBallAssigner
from camera_movement_estimator import CameraMovementEstimator
from view_transformer import ViewTransformer
from speed_and_distance_estimator import SpeedAndDistance_Estimator


# ---------------- Flask Config ----------------
app = Flask(__name__)
CORS(app)  # ✅ Allow frontend (React) access

UPLOAD_FOLDER = 'input_videos'
OUTPUT_FOLDER = 'output_videos'
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)


def allowed_file(filename):
    """Check valid video extension"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# ---------------- Core Tracking Logic ----------------
def process_video(input_path, output_path):
    """Process football video: detect players, ball, speed, possession"""
    print(f"📹 Processing: {input_path}")

    # 1️⃣ Read Video
    video_frames = read_video(input_path)

    # 2️⃣ Initialize Tracker
    tracker = Tracker('models/best.pt')
    tracks = tracker.get_object_tracks(video_frames, read_from_stub=False)
    tracker.add_position_to_tracks(tracks)

    # 3️⃣ Camera movement estimator
    camera_movement_estimator = CameraMovementEstimator(video_frames[0])
    camera_movement_per_frame = camera_movement_estimator.get_camera_movement(video_frames)
    camera_movement_estimator.add_adjust_positions_to_tracks(tracks, camera_movement_per_frame)

    # 4️⃣ View Transformer
    view_transformer = ViewTransformer()
    view_transformer.add_transformed_position_to_tracks(tracks)

    # 5️⃣ Interpolate Ball Positions
    tracks["ball"] = tracker.interpolate_ball_positions(tracks["ball"])

    # 6️⃣ Speed & Distance Estimator
    speed_and_distance_estimator = SpeedAndDistance_Estimator()
    speed_and_distance_estimator.add_speed_and_distance_to_tracks(tracks)

    # 7️⃣ Team Assignment
    team_assigner = TeamAssigner()
    team_assigner.assign_team_color(video_frames[0], tracks['players'][0])

    for frame_num, player_track in enumerate(tracks['players']):
        for player_id, track in player_track.items():
            team = team_assigner.get_player_team(video_frames[frame_num], track['bbox'], player_id)
            tracks['players'][frame_num][player_id]['team'] = team
            tracks['players'][frame_num][player_id]['team_color'] = team_assigner.team_colors[team]

    # 8️⃣ Ball possession
    player_assigner = PlayerBallAssigner()
    team_ball_control = []

    for frame_num, player_track in enumerate(tracks['players']):
        ball_bbox = tracks['ball'][frame_num][1]['bbox']
        assigned_player = player_assigner.assign_ball_to_player(player_track, ball_bbox)

        if assigned_player != -1:
            tracks['players'][frame_num][assigned_player]['has_ball'] = True
            team_ball_control.append(tracks['players'][frame_num][assigned_player]['team'])
        else:
            team_ball_control.append(team_ball_control[-1] if len(team_ball_control) > 0 else None)

    team_ball_control = np.array(team_ball_control)

    # 9️⃣ Draw Annotations
    output_video_frames = tracker.draw_annotations(video_frames, tracks, team_ball_control)
    output_video_frames = camera_movement_estimator.draw_camera_movement(output_video_frames, camera_movement_per_frame)
    speed_and_distance_estimator.draw_speed_and_distance(output_video_frames, tracks)

    # 🔟 Save processed video
    save_video(output_video_frames, output_path)

    print(f"✅ Processed video saved: {output_path}")
    return output_path


# ---------------- Flask Routes ----------------
@app.route('/detect', methods=['POST'])
def upload_and_process():
    """API endpoint to upload and process football videos"""
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400

    file = request.files['video']
    if not (file and allowed_file(file.filename)):
        return jsonify({'error': 'Invalid file type. Only mp4, avi, mov allowed'}), 400

    filename = secure_filename(file.filename)
    input_path = os.path.join(UPLOAD_FOLDER, filename)
    output_path = os.path.join(OUTPUT_FOLDER, f'processed_{filename}')
    file.save(input_path)

    try:
        process_video(input_path, output_path)
        output_url = f"http://127.0.0.1:5000/output/{os.path.basename(output_path)}"
        return jsonify({'processed_video_url': output_url})
    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/output/<path:filename>')
def serve_output(filename):
    """Serve processed video to frontend"""
    return send_from_directory(OUTPUT_FOLDER, filename)


# ---------------- Main Entry ----------------
if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
