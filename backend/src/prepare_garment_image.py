import sys
import cv2
import numpy as np
import os
from rembg import remove, new_session
from PIL import Image

def main():
    if len(sys.argv) < 2:
        print("Usage: python prepare_garment_image.py <input_img>")
        sys.exit(1)
        
    input_path = sys.argv[1]
    
    try:
        # Load image
        input_img = Image.open(input_path).convert("RGBA")
        
        # 1. Remove background cleanly using rembg (u2net model is ideal for general objects)
        session = new_session("u2net")
        img_no_bg = remove(input_img, session=session)
        img_no_bg_np = np.array(img_no_bg)
        
        # 2. Extract Alpha channel
        alpha = img_no_bg_np[:, :, 3]
        
        # 3. Find bounding box of non-transparent region
        coords = cv2.findNonZero(alpha)
        if coords is None:
            # Fallback
            x, y, w, h = 0, 0, img_no_bg_np.shape[1], img_no_bg_np.shape[0]
        else:
            x, y, w, h = cv2.boundingRect(coords)
            
        # 4. Make bounding box a square with small padding. 
        # Garments might be longer than they are wide. We want it centered in a 512x512 canvas.
        cx = x + w // 2
        cy = y + h // 2
        
        # Size of the square (max of width/height). Add a 10% margin to ensure it fits.
        size = int(max(w, h) * 1.1)
        
        new_x = cx - size // 2
        new_y = cy - size // 2
        
        # 5. Paste on white background instead of transparent
        white_bg = Image.new("RGBA", img_no_bg.size, (255, 255, 255, 255))
        final_img = Image.alpha_composite(white_bg, img_no_bg).convert("RGB")
        
        # 6. Physical crop and pad
        square_img = Image.new("RGB", (size, size), (255, 255, 255))
        
        src_left = max(0, new_x)
        src_top = max(0, new_y)
        src_right = min(final_img.width, new_x + size)
        src_bottom = min(final_img.height, new_y + size)
        
        dst_left = src_left - new_x
        dst_top = src_top - new_y
        
        if src_right > src_left and src_bottom > src_top:
            region = final_img.crop((src_left, src_top, src_right, src_bottom))
            square_img.paste(region, (dst_left, dst_top))
            
        # Optional: resize it down to 512x512
        square_img = square_img.resize((512, 512), Image.Resampling.LANCZOS)
        
        # Save back to same path (overwriting with cleaned, white-bg, square image)
        ext = os.path.splitext(input_path)[1]
        square_img.save(input_path)
        
        # 7. Save _rect.txt. Since we already perfectly cropped it, rect is the whole image
        rect_path = input_path.replace(ext, '_rect.txt')
        with open(rect_path, 'w') as f:
            f.write(f"0 0 512 512\n")
            
        print(f"Preprocessing complete. Square garment size: 512x512")
        
    except Exception as e:
        print(f"Error during preprocessing: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
