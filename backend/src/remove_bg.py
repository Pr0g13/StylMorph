import sys
from rembg import remove
from PIL import Image

def main():
    if len(sys.argv) < 3:
        print("Usage: python remove_bg.py <input_img> <output_img>")
        sys.exit(1)
        
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    try:
        input_img = Image.open(input_path)
        
        # Ensure image is in RGBA so background can be transparent
        input_img = input_img.convert("RGBA")
        
        output_img = remove(input_img)
        output_img.save(output_path)
        print(f"Background successfully removed and saved to {output_path}")
    except Exception as e:
        print(f"Error removing background: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
