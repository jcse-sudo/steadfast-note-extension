"""
Simple script to create extension icons
Run: python create_icons.py
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    
    def create_icon(size, filename):
        # Create image with gradient-like background
        img = Image.new('RGB', (size, size), color='#667eea')
        draw = ImageDraw.Draw(img)
        
        # Draw gradient effect
        for i in range(size):
            color_val = int(102 + (118 - 102) * i / size)
            draw.line([(0, i), (size, i)], fill=(color_val, 75, 170))
        
        # Draw text
        try:
            font_size = int(size * 0.6)
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            font = ImageFont.load_default()
        
        text = "N"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        position = ((size - text_width) // 2, (size - text_height) // 2 - 5)
        draw.text(position, text, fill='white', font=font)
        
        # Save
        img.save(filename)
        print(f"✓ Created {filename}")
    
    # Create all three icons
    create_icon(16, 'icon16.png')
    create_icon(48, 'icon48.png')
    create_icon(128, 'icon128.png')
    
    print("\n✓ All icons created successfully!")
    print("Now you can install the extension in Chrome/Edge")
    
except ImportError:
    print("PIL/Pillow not installed.")
    print("\nOption 1: Install Pillow")
    print("  pip install Pillow")
    print("  Then run: python create_icons.py")
    print("\nOption 2: Use the HTML method")
    print("  Open create-icons.html in your browser")
    print("\nOption 3: Use any PNG images")
    print("  Rename any 3 PNG files to icon16.png, icon48.png, icon128.png")
