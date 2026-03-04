import sys
import os
import shutil
import subprocess
import glob

def run_pifuhd(input_image, output_obj):
    """
    Wrapper script to run PIFuHD on a single image.
    """
    pifu_wrapper_dir = os.path.dirname(os.path.abspath(__file__))
    pifuhd_repo_dir = os.path.join(pifu_wrapper_dir, "pifuhd")
    
    if not os.path.exists(pifuhd_repo_dir):
         raise FileNotFoundError(f"CRITICAL ERROR: 'pifuhd' repository was not found at {pifuhd_repo_dir}.")

    # Create temporary directories for input and output
    temp_in_dir = os.path.join(pifu_wrapper_dir, "temp_in")
    temp_out_dir = os.path.join(pifu_wrapper_dir, "temp_out")
    
    os.makedirs(temp_in_dir, exist_ok=True)
    os.makedirs(temp_out_dir, exist_ok=True)

    # Clean any existing files in temp_in_dir
    for f in glob.glob(os.path.join(temp_in_dir, "*")):
        os.remove(f)

    # Copy input image to temp_in_dir
    filename = os.path.basename(input_image)
    temp_img_path = os.path.join(temp_in_dir, filename)
    shutil.copy2(input_image, temp_img_path)

    # Calculate tight bounding box to improve PIFuHD accuracy
    try:
        from PIL import Image
        import numpy as np
        with Image.open(input_image) as img:
            w, h = img.size
            if img.mode == 'RGBA':
                # Use alpha channel to find bbox
                alpha = np.array(img.split()[-1])
                y_idx, x_idx = np.where(alpha > 0)
            else:
                # Assuming background is white or black, finding foreground
                gray = img.convert("L")
                np_img = np.array(gray)
                # Simple threshold to find foreground (adjust if needed depending on input)
                # Typically inputs to PIFuHD from SAM have transparent or solid white backgrounds.
                # Here we assume anything not perfectly white (255) foreground if mostly white, else > 0
                if np.mean(np_img) > 127: # mostly white bg
                    y_idx, x_idx = np.where(np_img < 250)
                else: # mostly black bg
                    y_idx, x_idx = np.where(np_img > 5)

            if len(y_idx) > 0 and len(x_idx) > 0:
                y0, y1 = np.min(y_idx), np.max(y_idx)
                x0, x1 = np.min(x_idx), np.max(x_idx)
            else:
                # fallback to entire image
                y0, y1 = 0, h - 1
                x0, x1 = 0, w - 1

            bbox_w, bbox_h = x1 - x0, y1 - y0
            
            # The person should take up ~80% of the crop max dimension
            side = int(max(bbox_w, bbox_h) * 1.25)
            
            # Center the square on the found bounding box
            cx, cy = x0 + bbox_w // 2, y0 + bbox_h // 2
            x0_sq = cx - side // 2
            y0_sq = cy - side // 2
            
            # PIFuHD's dataset wrapper will safely pad negative/out-of-bound coordinates
            rect_str = f"{x0_sq} {y0_sq} {side} {side}"
            
    except Exception as e:
        print(f"Failed to calculate tight bounding box: {e}")
        try:
             with Image.open(input_image) as img:
                 w, h = img.size
        except:
             w, h = 1024, 1024
        
        # Fallback square
        side = max(w, h)
        cx, cy = w // 2, h // 2
        x0_sq = cx - side // 2
        y0_sq = cy - side // 2
        rect_str = f"{x0_sq} {y0_sq} {side} {side}"

    base = os.path.splitext(filename)[0]
    rect_path = os.path.join(temp_in_dir, f"{base}_rect.txt")
    print(f"PIFuHD BBox: {rect_str}")
    with open(rect_path, "w") as f:
        f.write(f"{rect_str}\n")

    # Change working directory to pifuhd_repo_dir so simple_test.py can find checkpoints
    original_cwd = os.getcwd()
    os.chdir(pifuhd_repo_dir)

    print(f"Running PIFuHD on image: {input_image}")
    try:
        # Run PIFuHD simple_test.py
        # Use python from the current environment
        cmd = [
            sys.executable,
            "-m", "apps.simple_test",
            "-r", "256",
            "--use_rect",
            "-i", temp_in_dir,
            "-o", temp_out_dir
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"PIFuHD Error Output:\n{result.stderr}")
            raise RuntimeError(f"PIFuHD execution failed with return code {result.returncode}")
        
        # Locate the output file in temp_out_dir/pifuhd_final/recon
        # Usually it is named result_<filename base>.obj
        base_name = os.path.splitext(filename)[0]
        # pifuhd_final outputs obj files typically with 'result_' prefix or similar depends on reconWrapper
        result_dir = os.path.join(temp_out_dir, "pifuhd_final", "recon")
        output_files = []
        if os.path.exists(result_dir):
            output_files = [f for f in os.listdir(result_dir) if f.endswith(".obj")]
        
        if not output_files:
            raise RuntimeError("PIFuHD failed to generate an output .obj file.")
            
        # Assuming the first .obj is our result
        generated_obj = os.path.join(result_dir, output_files[0])
        
        # Move it to the requested output path
        os.makedirs(os.path.dirname(os.path.abspath(output_obj)), exist_ok=True)
        shutil.move(generated_obj, output_obj)
        print(f"PIFuHD Model successfully saved at {output_obj}!")

    finally:
        os.chdir(original_cwd)
        # Cleanup
        shutil.rmtree(temp_in_dir, ignore_errors=True)
        shutil.rmtree(temp_out_dir, ignore_errors=True)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python run_pifuhd.py <input_image_path> <output_obj_path>")
        sys.exit(1)
        
    input_image = sys.argv[1]
    output_obj = sys.argv[2]
    
    if not os.path.exists(input_image):
        print(f"Error: Input image {input_image} not found.", file=sys.stderr)
        sys.exit(1)
        
    run_pifuhd(input_image, output_obj)
