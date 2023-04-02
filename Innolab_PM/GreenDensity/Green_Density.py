import cv2

def calculate_green_color_density(D:\INNOLAB\Input-20230331T200711Z-001\Inputtests_under 1GB\Screenshot 2023-04-02 170138.png, threshold_value):
    # Bild einlesen
    image = cv2.imread(image_path)
    
    # Gr�nen Farbkanal extrahieren
    green_channel = image[:,:,1]
    
    # Schwellenwert anwenden, um Bin�rbild zu erstellen
    _, binary_image = cv2.threshold(green_channel, threshold_value, 255, cv2.THRESH_BINARY)
    
    # Wei�e Pixel z�hlen und Farbintensit�t berechnen
    white_pixel_count = cv2.countNonZero(binary_image)
    total_pixel_count = binary_image.size
    color_density = (white_pixel_count / total_pixel_count) * 100
    
    return color_density

if __name__ == "__main__":
    image_path = "path/to/your/image.jpg"
    threshold_value = 127  
    
    color_density = calculate_green_color_density(image_path, threshold_value)
    print(f"Gr�ne Farbintensit�t: {color_density:.2f}%")
