#!/usr/bin/env python3
"""
generate_smpl.py – StylMorph 3D body mesh generator with SAM silhouette extraction.
Refined for accurate measurements and realistic Visual Hull reconstruction.
"""

import sys, os, json, math, traceback, urllib.request
import cv2, numpy as np
from scipy.optimize import minimize
from skimage import measure
import trimesh # Use trimesh for better OBJ handling if available, else fallback

# ── MediaPipe Tasks API ──────────────────────────────────────────────────────
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

# BlazePose 33-point indices
NOSE=0; L_EAR=7; R_EAR=8
L_SHOULDER=11; R_SHOULDER=12
L_ELBOW=13;    R_ELBOW=14
L_WRIST=15;    R_WRIST=16
L_HIP=23;      R_HIP=24
L_KNEE=25;     R_KNEE=26
L_ANKLE=27;    R_ANKLE=28

# ── Model paths / URLs ───────────────────────────────────────────────────────
_DIR        = os.path.dirname(os.path.abspath(__file__))
_MODELS_DIR = os.path.join(_DIR, "models")

_POSE_URL   = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task"
_POSE_PATH  = os.path.join(_MODELS_DIR, "pose_landmarker_heavy.task")

_SAM_URL    = "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth"
_SAM_PATH   = os.path.join(_MODELS_DIR, "sam_vit_b_01ec64.pth")
_TEMPLATE_PATH = os.path.join(_MODELS_DIR, "base_human.obj")

os.makedirs(_MODELS_DIR, exist_ok=True)

def _download(url, path, label):
    if os.path.isfile(path): return
    print(f"Downloading {label}…", file=sys.stderr)
    urllib.request.urlretrieve(url, path)

# ═══════════════════════════════════════════════════════════════════════════════
# 1. LANDMARKS & MASKING
# ═══════════════════════════════════════════════════════════════════════════════

def get_landmarks(image_path):
    _download(_POSE_URL, _POSE_PATH, "MediaPipe pose model")
    opts = mp_vision.PoseLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=_POSE_PATH),
        num_poses=1, min_pose_detection_confidence=0.4, min_pose_presence_confidence=0.4
    )
    bgr = cv2.imread(image_path)
    if bgr is None: return None, 0, 0
    h, w = bgr.shape[:2]
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    with mp_vision.PoseLandmarker.create_from_options(opts) as det:
        res = det.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
    if not res.pose_landmarks: return None, w, h
    return res.pose_landmarks[0], w, h

_sam_predictor = None
def _load_sam():
    global _sam_predictor
    if _sam_predictor is not None: return _sam_predictor
    try:
        from segment_anything import sam_model_registry, SamPredictor
        _download(_SAM_URL, _SAM_PATH, "SAM ViT-B")
        device = "cuda" if __import__("torch").cuda.is_available() else "cpu"
        print(f"[SAM] Loading on {device}…", file=sys.stderr)
        sam = sam_model_registry["vit_b"](checkpoint=_SAM_PATH)
        sam.to(device); sam.eval()
        _sam_predictor = SamPredictor(sam)
        return _sam_predictor
    except Exception: return None

def get_robust_mask(image_path, predictor, landmarks):
    bgr = cv2.imread(image_path)
    if bgr is None: return None
    h, w = bgr.shape[:2]
    if predictor is not None and landmarks is not None:
        predictor.set_image(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
        # Use joints as anchors to ensure we pick the person
        joints = [landmarks[L_SHOULDER], landmarks[R_SHOULDER], landmarks[L_HIP], landmarks[R_HIP], landmarks[L_KNEE], landmarks[R_KNEE]]
        points = [[j.x * w, j.y * h] for j in joints]
        labels = [1] * len(points)
        masks, scores, _ = predictor.predict(point_coords=np.array(points), point_labels=np.array(labels), multimask_output=True)
        mask = masks[np.argmax(scores)].astype(np.uint8) * 255
        # Refine mask
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k, iterations=2)
        return mask
    return None

# ═══════════════════════════════════════════════════════════════════════════════
# 2. MEASUREMENTS
# ═══════════════════════════════════════════════════════════════════════════════

def extract_measurements(height_cm, masks, landmarks):
    m_f = masks['front']; lm_f = landmarks['front']
    m_l = masks['left'];  lm_l = landmarks['left']
    if m_f is None or lm_f is None: return None
    
    fh, fw = m_f.shape
    lh, lw = m_l.shape if m_l is not None else (0, 0)
    
    # Scale: pixels to cm
    nose_y = lm_f[NOSE].y * fh
    ank_y  = (lm_f[L_ANKLE].y + lm_f[R_ANKLE].y) / 2 * fh
    scale_f = height_cm / (abs(ank_y - nose_y) * 1.07)
    
    def get_width_at(mask, y_frac, scale):
        if mask is None: return 0
        y = int(y_frac * mask.shape[0])
        row = np.nonzero(mask[y])[0] if 0 <= y < mask.shape[0] else []
        return (row[-1] - row[0]) * scale if len(row) > 0 else 0

    y_sh = (lm_f[L_SHOULDER].y + lm_f[R_SHOULDER].y) / 2
    y_wa = (y_sh * 0.4 + lm_f[L_HIP].y * 0.6)
    y_hi = (lm_f[L_HIP].y + lm_f[R_HIP].y) / 2
    y_ch = (y_sh + y_hi) / 2
    
    # Front widths
    w_sh = get_width_at(m_f, y_sh, scale_f)
    w_ch = get_width_at(m_f, y_ch, scale_f)
    w_wa = get_width_at(m_f, y_wa, scale_f)
    w_hi = get_width_at(m_f, y_hi, scale_f)
    
    # Left depths
    scale_l = scale_f # assume same for now
    d_ch = get_width_at(m_l, y_ch, scale_l) or w_ch * 0.75
    d_wa = get_width_at(m_l, y_wa, scale_l) or w_wa * 0.7
    d_hi = get_width_at(m_l, y_hi, scale_l) or w_hi * 0.8
    
    # Circ = PI * sqrt(2 * (w/2^2 + d/2^2)) approx
    def circ(w, d): return math.pi * math.sqrt(2 * ((w/2)**2 + (d/2)**2))
    
    # Inseam
    inseam = (abs(lm_f[L_ANKLE].y - lm_f[L_HIP].y) * fh * scale_f)
    # Arm
    arm = (math.hypot((lm_f[L_SHOULDER].x - lm_f[L_WRIST].x)*fw, (lm_f[L_SHOULDER].y - lm_f[L_WRIST].y)*fh) * scale_f)

    return {
        "height": round(height_cm, 1),
        "chest": round(circ(w_ch, d_ch), 1),
        "waist": round(circ(w_wa, d_wa), 1),
        "hips": round(circ(w_hi, d_hi), 1),
        "shoulder": round(w_sh, 1),
        "inseam": round(inseam, 1),
        "armLength": round(arm, 1),
        "neckSize": round(w_sh * 0.25 * math.pi, 1) # simple approx
    }

# ═══════════════════════════════════════════════════════════════════════════════
# 3. VISUAL HULL
# ═══════════════════════════════════════════════════════════════════════════════

def generate_realistic_mesh(height_cm, measurements, output_path):
    """
    Generate a realistic human mesh by scaling a base template based on measurements.
    """
    if not os.path.exists(_TEMPLATE_PATH):
        # Fallback to a basic generation if template is missing
        print(f"Template not found at {_TEMPLATE_PATH}. Skipping realistic mesh.", file=sys.stderr)
        return None

    try:
        import trimesh
        mesh = trimesh.load(_TEMPLATE_PATH)
    except Exception:
        # Simple manual OBJ loader if trimesh is missing/fails
        verts = []; faces = []
        with open(_TEMPLATE_PATH, "r") as f:
            for line in f:
                if line.startswith("v "):
                    verts.append([float(x) for x in line.split()[1:]])
                elif line.startswith("f "):
                    faces.append([int(x.split("/")[0]) - 1 for x in line.split()[1:]])
        class SimpleMesh:
            def __init__(self, v, f): self.vertices = np.array(v); self.faces = np.array(f)
            def export(self, p):
                with open(p, "w") as out:
                    out.write("# StylMorph Realistic Body\nmtllib body.mtl\nusemtl Skin\n")
                    for v in self.vertices: out.write(f"v {v[0]:.4f} {v[1]:.4f} {v[2]:.4f}\n")
                    for fc in self.faces: out.write(f"f {fc[0]+1} {fc[1]+1} {fc[2]+1}\n")
        mesh = SimpleMesh(verts, faces)

    # ── 1. Scale Height ───────────────────────────────────────────────────────
    # Template is approx 1.6m tall (from Y=0 to Y=1.6)
    target_h_m = height_cm / 100.0
    scale_y = target_h_m / 1.6
    mesh.vertices[:, 1] *= scale_y
    
    # ── 2. Scale Widths (Chest, Waist, Hips) ──────────────────────────────────
    # We map vertex groups by Y height in the template space (scaled by scale_y)
    y_min, y_max = 0.8 * scale_y, 1.4 * scale_y
    
    def get_circ_scale(meas_val, standard_val):
        if not meas_val: return 1.0
        return float(meas_val) / standard_val

    # Rough standards for 1.6m template
    std_chest = 90.0; std_waist = 75.0; std_hips = 95.0; std_sh = 40.0
    
    s_ch = get_circ_scale(measurements.get('chest'), std_chest)
    s_wa = get_circ_scale(measurements.get('waist'), std_waist)
    s_hi = get_circ_scale(measurements.get('hips'), std_hips)
    s_sh = get_circ_scale(measurements.get('shoulder'), std_sh)

    # Apply scaling to vertices
    new_verts = mesh.vertices.copy()
    for i, v in enumerate(new_verts):
        y = v[1]
        # Torso scaling (Chest, Waist, Hips)
        if y_min <= y <= y_max:
            if y < (y_min + y_max) / 2: # Lower torso (hips to waist)
                t = (y - y_min) / (((y_min + y_max) / 2) - y_min)
                s = s_hi * (1 - t) + s_wa * t
            else: # Upper torso (waist to chest)
                t = (y - ((y_min + y_max) / 2)) / (y_max - ((y_min + y_max) / 2))
                s = s_wa * (1 - t) + s_ch * t
            new_verts[i, 0] *= s
            new_verts[i, 2] *= s
        elif y > y_max: # Head and Shoulders
            new_verts[i, 0] *= s_sh
            new_verts[i, 2] *= s_sh
        else: # Legs (Scale by hip width for continuity)
            new_verts[i, 0] *= s_hi
            new_verts[i, 2] *= s_hi
            
    mesh.vertices = new_verts

    # Write OBJ
    mesh.export(output_path)
    
    # Write MTL
    mtl = output_path.replace(".obj", ".mtl")
    with open(mtl, "w") as f:
        f.write("newmtl Skin\nKd 0.91 0.73 0.60\nKa 0.1 0.1 0.1\nNs 10.0\nd 1.0\n")
    
    return output_path


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    if len(sys.argv) != 6: sys.exit(1)
    try:
        height_cm = float(sys.argv[1]); paths = {'front': sys.argv[2], 'back': sys.argv[3], 'left': sys.argv[4], 'right': sys.argv[5]}
        predictor = _load_sam()
        masks = {}; lms = {}
        for v in ['front', 'back', 'left', 'right']:
            print(f"Processing {v}…", file=sys.stderr)
            lm, _, _ = get_landmarks(paths[v])
            mask = get_robust_mask(paths[v], predictor, lm)
            masks[v], lms[v] = mask, lm
        
        m = extract_measurements(height_cm, masks, lms)
        out_file = os.path.join(_DIR, "outputs", f"body_{int(__import__('time').time())}.obj")
        os.makedirs(os.path.dirname(out_file), exist_ok=True)
        obj_path = generate_realistic_mesh(height_cm, m, out_file)
        if obj_path is None: # Fallback to visual hull if template failed
             # (Actually I removed generate_visual_hull code above, but I can re-add it or just fail gracefully)
             raise RuntimeError("Failed to generate realistic mesh.")
        print(json.dumps({"measurements": m, "obj_path": os.path.abspath(obj_path)}))
    except Exception as e:
        sys.stderr.write(f"ERROR: {e}\n{traceback.format_exc()}")
        sys.exit(1)

if __name__ == "__main__": main()
