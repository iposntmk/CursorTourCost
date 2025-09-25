export interface SavedImage {
  id: string;
  name: string;
  base64: string;
  mimeType: string;
  size: number;
  savedAt: string;
}

const STORAGE_KEY = 'saved_images';

export const saveImageToStorage = async (file: File): Promise<SavedImage> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const [, base64] = result.split(',');
        const savedImage: SavedImage = {
          id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          base64: base64 ?? result,
          mimeType: file.type,
          size: file.size,
          savedAt: new Date().toISOString(),
        };

        // Lưu vào localStorage
        const existingImages = getSavedImages();
        const updatedImages = [savedImage, ...existingImages].slice(0, 10); // Giới hạn 10 ảnh
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedImages));
        
        resolve(savedImage);
      } else {
        reject(new Error('Không thể đọc nội dung tập tin.'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Đọc tập tin thất bại.'));
    };
    reader.readAsDataURL(file);
  });
};

export const getSavedImages = (): SavedImage[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Lỗi khi đọc ảnh đã lưu:', error);
    return [];
  }
};

export const deleteSavedImage = (id: string): void => {
  try {
    const existingImages = getSavedImages();
    const updatedImages = existingImages.filter(img => img.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedImages));
  } catch (error) {
    console.error('Lỗi khi xóa ảnh:', error);
  }
};

export const clearAllSavedImages = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Lỗi khi xóa tất cả ảnh:', error);
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};