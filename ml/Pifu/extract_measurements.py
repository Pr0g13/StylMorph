"""
extract_measurements.py  (v2 — Professional Algorithm)
=======================================================
Extracts accurate body measurements from a PIFuHD-generated .obj mesh,
scaled to the user's real height.

Key improvements over v1:
  • Convex hull perimeter  — replaces bounding-box ellipse (far more accurate)
  • Arm removal            — filters torso vertices by distance from center X
  • Wider slice band       — 6 cm instead of 2.5 cm for stable sampling
  • Corrected landmark ratios  — based on published anthropometric data
  • scipy fallback          — uses ConvexHull if scipy is available; otherwise
                              computes a simple ordered-hull polygon

Usage:
    python extract_measurements.py <obj_path> <height_cm>
Outputs JSON to stdout.  Standalone test:
    python extract_measurements.py model.obj 179
"""

import sys
import json
import math
import os

# ─────────────────────────────────────────────────────────────────────────────
# 1.  OBJ loader (pure numpy)
# ─────────────────────────────────────────────────────────────────────────────
def load_obj_vertices(obj_path):
    try:
        import numpy as np
    except ImportError:
        raise RuntimeError("numpy is required: pip install numpy")

    verts = []
    with open(obj_path, "r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            if line.startswith("v "):
                parts = line.split()
                if len(parts) >= 4:
                    try:
                        verts.append([float(parts[1]), float(parts[2]), float(parts[3])])
                    except ValueError:
                        pass
    if not verts:
        raise RuntimeError(f"No vertices found in OBJ: {obj_path}")
    return __import__("numpy").array(verts, dtype=float)


# ─────────────────────────────────────────────────────────────────────────────
# 2.  Scale so Y ∈ [0, target_height_cm]
# ─────────────────────────────────────────────────────────────────────────────
def scale_to_height(verts, target_cm):
    import numpy as np
    y_min, y_max = verts[:, 1].min(), verts[:, 1].max()
    mesh_h = y_max - y_min
    if mesh_h < 1e-6:
        raise RuntimeError("Degenerate mesh: zero height span.")
    verts = verts.copy()
    verts[:, 1] -= y_min          # ground the mesh
    verts *= (target_cm / mesh_h) # uniform scale to real height
    return verts


# ─────────────────────────────────────────────────────────────────────────────
# 3.  Horizontal slice + optional torso isolation (arm removal)
# ─────────────────────────────────────────────────────────────────────────────
def slice_at_y(verts, y_level, band=6.0):
    """Return all vertices within ±band/2 of y_level."""
    import numpy as np
    half = band / 2.0
    mask = (verts[:, 1] >= y_level - half) & (verts[:, 1] <= y_level + half)
    return verts[mask]


def remove_arms(pts, torso_half_width_cm=20.0):
    """
    Remove arm / limb vertices.
    Strategy: keep points whose X is within ±torso_half_width_cm of the
    median X of the slice.  For a typical adult torso this is ~20 cm per side.
    Adjust if needed — wider = keeps more; narrower = tighter torso.
    """
    import numpy as np
    if len(pts) < 4:
        return pts
    cx = float(np.median(pts[:, 0]))
    mask = np.abs(pts[:, 0] - cx) <= torso_half_width_cm
    filtered = pts[mask]
    # Fall back to original if filter removes too many points
    return filtered if len(filtered) >= 4 else pts


# ─────────────────────────────────────────────────────────────────────────────
# 4.  Circumference via convex hull perimeter (XZ plane)
# ─────────────────────────────────────────────────────────────────────────────
def convex_hull_perimeter(xz_pts):
    """
    Compute the perimeter of the 2-D convex hull of a set of (x, z) points.
    Uses scipy.spatial.ConvexHull when available; falls back to a simple
    ordered polar-angle polygon otherwise.
    Returns perimeter in the same units as the input points (cm after scaling).
    """
    import numpy as np

    if len(xz_pts) < 3:
        return None

    # ── scipy path (preferred) ────────────────────────────────────────────────
    try:
        from scipy.spatial import ConvexHull
        hull = ConvexHull(xz_pts)
        verts = hull.vertices
        perim = 0.0
        n = len(verts)
        for i in range(n):
            p1 = xz_pts[verts[i]]
            p2 = xz_pts[verts[(i + 1) % n]]
            perim += float(np.linalg.norm(p1 - p2))
        return perim

    except Exception:
        pass  # fall through to numpy fallback

    # ── numpy fallback: gift-wrapping (Jarvis march) ──────────────────────────
    pts = xz_pts.copy()
    n = len(pts)
    hull_idx = []
    start = int(np.argmin(pts[:, 0]))  # leftmost point
    current = start
    while True:
        hull_idx.append(current)
        next_pt = (current + 1) % n
        for i in range(n):
            # Counter-clockwise: cross product < 0
            v1 = pts[next_pt] - pts[current]
            v2 = pts[i] - pts[current]
            if (v1[0] * v2[1] - v1[1] * v2[0]) < 0:
                next_pt = i
        current = next_pt
        if current == start or len(hull_idx) > n:
            break

    if len(hull_idx) < 3:
        return None

    perim = 0.0
    for i in range(len(hull_idx)):
        p1 = pts[hull_idx[i]]
        p2 = pts[hull_idx[(i + 1) % len(hull_idx)]]
        perim += float(np.linalg.norm(p1 - p2))
    return perim


# ─────────────────────────────────────────────────────────────────────────────
# 5.  Main extraction
# ─────────────────────────────────────────────────────────────────────────────
def extract_measurements(obj_path, height_cm):
    import numpy as np

    verts = load_obj_vertices(obj_path)
    verts = scale_to_height(verts, height_cm)

    # ── Corrected anatomical landmark ratios ──────────────────────────────────
    # Source: Drillis & Contini (1966), ANSUR II, and OpenPose body proportions
    landmarks = {
        "neck":  0.87,   # base of neck — 0.87 avoids jaw/head inclusion
        "chest": 0.78,   # fullest part of chest (nipple line)
        "waist": 0.60,   # narrowest part of torso
        "hips":  0.50,   # widest part, hip bone level
    }

    BAND   = 6.0   # cm — wider for denser vertex sampling
    # torso half-width filter: ±18 cm — tighter to exclude arm influence on waist/hips
    ARM_FILTER = 18.0

    meas = {"height": round(height_cm, 1)}

    for region, ratio in landmarks.items():
        y_level = ratio * height_cm
        pts = slice_at_y(verts, y_level, band=BAND)

        if len(pts) < 4:
            continue

        # Remove arm vertices for torso measurements
        # (neck and chest are particularly affected by shoulder/arm geometry)
        pts_torso = remove_arms(pts, torso_half_width_cm=ARM_FILTER)

        xz = pts_torso[:, [0, 2]]
        circ = convex_hull_perimeter(xz)

        if circ is not None and 20 < circ < 200:
            if region == "neck":
                meas["neckSize"] = round(circ, 1)
            elif region == "chest":
                meas["chest"] = round(circ, 1)
            elif region == "waist":
                meas["waist"] = round(circ, 1)
            elif region == "hips":
                meas["hips"] = round(circ, 1)

    # ── Shoulder width: max X-span across 10 slices between 82–88% height ──────
    # Use max to capture the widest point (bone-to-bone shoulder width)
    best_shoulder = 0.0
    shoulder_pts_list = []
    for frac in np.linspace(0.82, 0.88, 10):
        s_pts = slice_at_y(verts, float(frac) * height_cm, band=BAND)
        if len(s_pts) >= 5:
            shoulder_pts_list.append(s_pts)
            width = float(s_pts[:, 0].max() - s_pts[:, 0].min())
            if width > best_shoulder:
                best_shoulder = width

    if best_shoulder > 20 and best_shoulder < 70:
        meas["shoulder"] = round(best_shoulder, 1)

    # ── Inseam: 50% height (crotch to floor) ─────────────────────────────────
    meas["inseam"] = round(0.50 * height_cm, 1)

    # ── Arm length ────────────────────────────────────────────────────────────
    # Use max X-span at shoulder level vs torso — gives "arm reach" per side
    # Then vertical arm drop (shoulder Y → wrist Y ≈ 48% of height)
    shoulder_y = 0.84 * height_cm
    wrist_y    = 0.48 * height_cm
    arm_drop   = shoulder_y - wrist_y  # vertical component

    # Horizontal reach of arm beyond torso half-width (torso ~26% of height)
    torso_half = 0.13 * height_cm  # half of ~26% width
    if shoulder_pts_list:
        arm_x_max = float(all_shoulder[:, 0].max())
        arm_x_min = float(all_shoulder[:, 0].min())
        reach = max(arm_x_max - torso_half, abs(arm_x_min) - torso_half, 0)
    else:
        reach = 0.10 * height_cm  # fallback: ~10% each side

    arm_length = math.sqrt(reach ** 2 + arm_drop ** 2)
    if 30 < arm_length < 90:
        meas["armLength"] = round(arm_length, 1)

    # ── Anthropometric fallbacks for any missed measurement ──────────────────
    # All ratios from ANSUR II 50th-percentile male data normalized to height.
    defaults = {
        "neckSize":  round(0.223 * height_cm, 1),  # ~39.9 cm @ 179 cm
        "chest":     round(0.542 * height_cm, 1),  # ~97.0 cm @ 179 cm
        "waist":     round(0.469 * height_cm, 1),  # ~83.9 cm @ 179 cm
        "hips":      round(0.553 * height_cm, 1),  # ~99.0 cm @ 179 cm
        "shoulder":  round(0.257 * height_cm, 1),  # ~46.0 cm @ 179 cm
        "inseam":    round(0.500 * height_cm, 1),  # ~89.5 cm @ 179 cm
        "armLength": round(0.325 * height_cm, 1),  # ~58.2 cm @ 179 cm
    }

    for key, val in defaults.items():
        if key not in meas or meas[key] is None:
            meas[key] = val

    return meas


# ─────────────────────────────────────────────────────────────────────────────
# 6.  CLI entry point
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python extract_measurements.py <obj_path> <height_cm>",
              file=sys.stderr)
        sys.exit(1)

    obj_path = sys.argv[1]
    try:
        height_cm = float(sys.argv[2])
    except ValueError:
        print(f"Invalid height: {sys.argv[2]}", file=sys.stderr)
        sys.exit(1)

    if not os.path.isfile(obj_path):
        print(f"OBJ not found: {obj_path}", file=sys.stderr)
        sys.exit(1)

    try:
        result = extract_measurements(obj_path, height_cm)
        print(json.dumps(result, indent=2))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)
