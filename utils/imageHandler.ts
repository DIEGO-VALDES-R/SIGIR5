import { supabase } from '../supabaseClient';

const BUCKET_NAME = 'product-images';

/**
 * Sube una imagen de producto a Supabase Storage
 * @param file - Archivo de imagen
 * @param productId - ID del producto
 * @returns URL pública de la imagen o null si falla
 */
export const uploadProductImage = async (
  file: File,
  productId: string
): Promise<{ url: string; publicId: string } | null> => {
  try {
    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Tipo de archivo no válido. Solo se permiten JPG, PNG y WebP');
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('El archivo es demasiado grande. Máximo 5MB');
    }

    // Generar nombre único
    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}_${Date.now()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    // Subir archivo
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      publicId: filePath
    };
  } catch (error) {
    console.error('Error subiendo imagen:', error);
    return null;
  }
};

/**
 * Elimina una imagen de producto de Supabase Storage
 * @param publicId - Path de la imagen en storage
 */
export const deleteProductImage = async (publicId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([publicId]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error eliminando imagen:', error);
    return false;
  }
};

/**
 * Actualiza la imagen de un producto (elimina la anterior y sube la nueva)
 * @param file - Nuevo archivo de imagen
 * @param productId - ID del producto
 * @param oldPublicId - Path de la imagen anterior (opcional)
 */
export const updateProductImage = async (
  file: File,
  productId: string,
  oldPublicId?: string
): Promise<{ url: string; publicId: string } | null> => {
  // Eliminar imagen anterior si existe
  if (oldPublicId) {
    await deleteProductImage(oldPublicId);
  }

  // Subir nueva imagen
  return await uploadProductImage(file, productId);
};

/**
 * Convierte File a base64 para preview local
 * @param file - Archivo de imagen
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Valida si una URL de imagen es accesible
 * @param url - URL de la imagen
 */
export const validateImageUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Redimensiona una imagen antes de subirla (opcional para optimización)
 * @param file - Archivo de imagen
 * @param maxWidth - Ancho máximo
 * @param maxHeight - Alto máximo
 */
export const resizeImage = (
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 800
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Error al redimensionar'));
        }, file.type);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
