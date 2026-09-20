from PIL import Image, ImageDraw

def create_app_icon():
    # Create a clean 512x512 rounded icon with AI gradient background
    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Draw rounded rectangle background (dark blue/slate gradient style)
    draw.rounded_rectangle([16, 16, size - 16, size - 16], radius=96, fill=(15, 23, 42))

    # Inner cyan circle symbol
    center = size // 2
    draw.ellipse([center - 120, center - 120, center + 120, center + 120], fill=(56, 189, 248))
    draw.ellipse([center - 60, center - 60, center + 60, center + 60], fill=(15, 23, 42))

    import os
    os.makedirs("D:/Project/AI-Portable-App/src-tauri/icons", exist_ok=True)
    
    # Save PNGs
    img.save("D:/Project/AI-Portable-App/src-tauri/icons/icon.png")
    img.save("D:/Project/AI-Portable-App/src-tauri/icons/32x32.png")
    img.save("D:/Project/AI-Portable-App/src-tauri/icons/128x128.png")
    img.save("D:/Project/AI-Portable-App/src-tauri/icons/128x128@2x.png")

    # Save ICO
    img.save("D:/Project/AI-Portable-App/src-tauri/icons/icon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print("Generated app icons in src-tauri/icons/")

if __name__ == "__main__":
    create_app_icon()
