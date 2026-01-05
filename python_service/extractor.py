import cv2
import numpy as np


class EnhancedBodyMeasurementExtractor:
    def __init__(self):
        self.target_height = 800

        self.body_ratios = {
            "shoulder_height": 0.24,
            "chest_height": 0.29,
            "waist_height": 0.45,
            "hip_height": 0.53,
            "arm_length": 0.44,
            "inseam": 0.47,
        }

        self.edge_params = {
            "canny_low": 50,
            "canny_high": 150,
        }

    # ---------------------------
    # Image loading
    # ---------------------------
    def load_image(self, path):
        img = cv2.imread(path)
        if img is None:
            return None

        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        h, w = img.shape[:2]
        scale = self.target_height / h
        return cv2.resize(img, (int(w * scale), self.target_height))

    # ---------------------------
    # Edge detection
    # ---------------------------
    def detect_edges(self, image):
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 1)
        return cv2.Canny(
            blurred,
            self.edge_params["canny_low"],
            self.edge_params["canny_high"],
        )

    # ---------------------------
    # Background removal
    # ---------------------------
    def advanced_background_removal(self, image):
        edges = self.detect_edges(image)
        contours, _ = cv2.findContours(
            edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        mask = np.zeros(image.shape[:2], dtype=np.uint8)
        if contours:
            largest = max(contours, key=cv2.contourArea)
            cv2.drawContours(mask, [largest], -1, 255, -1)

        return image, mask

    # ---------------------------
    # Silhouette extraction
    # ---------------------------
    def extract_body_silhouette(self, mask):
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        return (mask > 0).astype(np.uint8)

    # ---------------------------
    # Silhouette analysis (SAFE)
    # ---------------------------
    def analyze_silhouette(self, silhouette):
    # Primary: contour-based
        contours, _ = cv2.findContours(
            silhouette, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        if contours:
            contour = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(contour)
        else:
            # 🔥 FALLBACK: bounding box from mask
            ys, xs = np.where(silhouette > 0)
            if len(xs) == 0 or len(ys) == 0:
                return None  # safe failure

            x, y = xs.min(), ys.min()
            w, h = xs.max() - x, ys.max() - y

        # Sanity check
        if h < 100 or w < 50:
            return None

        widths = {}
        for name, ratio in [
            ("shoulder", 0.24),
            ("chest", 0.29),
            ("waist", 0.45),
            ("hip", 0.53),
        ]:
            row = y + int(h * ratio)
            if row >= silhouette.shape[0]:
                continue

            slice_row = silhouette[row, x : x + w]
            idx = np.where(slice_row > 0)[0]
            if len(idx) > 0:
                widths[name] = idx[-1] - idx[0]

        return {
            "pixel_height": h,
            "pixel_width": w,
            "widths": widths,
        }

    # ---------------------------
    # Measurement calculation
    # ---------------------------
    def calculate_real_measurements(self, front, side):
        scale = 170.0 / ((front["pixel_height"] + side["pixel_height"]) / 2)

        measurements = {
            "height_cm": round(front["pixel_height"] * scale, 1),
        }

        for part, px in front["widths"].items():
            measurements[f"{part}_width_cm"] = round(px * scale, 1)

        measurements["arm_length_cm"] = round(
            measurements["height_cm"] * self.body_ratios["arm_length"], 1
        )
        measurements["inseam_cm"] = round(
            measurements["height_cm"] * self.body_ratios["inseam"], 1
        )

        return measurements

    # ---------------------------
    # MAIN ENTRY (SAFE)
    # ---------------------------
    def process(self, image_paths):
        views = {}

        for view, path in image_paths.items():
            image = self.load_image(path)
            if image is None:
                continue

            _, mask = self.advanced_background_removal(image)
            silhouette = self.extract_body_silhouette(mask)
            analysis = self.analyze_silhouette(silhouette)
            if analysis is None:
                continue
            views[view] = analysis


        if "front" not in views:
            raise ValueError("Front silhouette not detected")

        side = "left" if "left" in views else "right"
        if side not in views:
            raise ValueError("Side silhouette not detected")

        return self.calculate_real_measurements(
            views["front"], views[side]
        )
