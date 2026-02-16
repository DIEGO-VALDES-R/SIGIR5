import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { fileToBase64 } from '../utils/imageHandler';

interface ImageUploaderProps {
  currentImageUrl?: string;
  onImageSelect: (file: File | null) => void;
  disabled?: boolean;
  darkMode?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  currentImageUrl,
  onImageSelect,
  disabled = false,
  darkMode = false
}) => {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ FIX PRINCIPAL: sincronizar preview cuando cambia el producto
  useEffect(() => {
    setPreview(currentImageUrl || null);
  }, [currentImageUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Solo se permiten imágenes JPG, PNG o WebP');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es demasiado grande. Máximo 5MB');
      return;
    }

    setIsLoading(true);
    try {
      const base64 = await fileToBase64(file);
      setPreview(base64);
      onImageSelect(file);
    } catch (error) {
      console.error('Error al cargar imagen:', error);
      alert('Error al cargar la imagen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onImageSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-2">
      <label className={`block text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        Imagen del Producto
      </label>
      
      <div 
        className={`relative border-2 border-dashed rounded-xl overflow-hidden transition-colors ${
          disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'cursor-pointer hover:border-emerald-500'
        } ${
          darkMode 
            ? 'border-slate-600 bg-slate-700' 
            : 'border-slate-300 bg-slate-50'
        }`}
        style={{ height: '240px' }}
      >
        {preview ? (
          <>
            <img 
              src={preview} 
              alt="Preview" 
              className="w-full h-full object-contain"
              onError={() => setPreview(null)} // ✅ si la URL falla, mostrar placeholder
            />
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-lg"
              >
                <X size={18} />
              </button>
            )}
          </>
        ) : (
          <div 
            onClick={handleClick}
            className="w-full h-full flex flex-col items-center justify-center gap-3"
          >
            {isLoading ? (
              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
            ) : (
              <>
                <div className={`p-4 rounded-full ${darkMode ? 'bg-slate-600' : 'bg-slate-200'}`}>
                  {disabled ? (
                    <ImageIcon className={`w-8 h-8 ${darkMode ? 'text-slate-400' : 'text-slate-400'}`} />
                  ) : (
                    <Upload className={`w-8 h-8 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} />
                  )}
                </div>
                <div className="text-center px-4">
                  <p className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {disabled ? 'Sin imagen' : 'Click para subir imagen'}
                  </p>
                  {!disabled && (
                    <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      JPG, PNG o WebP (máx. 5MB)
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {preview && !disabled && (
        <button
          type="button"
          onClick={handleClick}
          className={`w-full text-sm py-2 rounded-lg transition ${
            darkMode 
              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          Cambiar imagen
        </button>
      )}
    </div>
  );
};