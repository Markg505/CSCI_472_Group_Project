import { useState } from 'react';
import { apiClient } from '../../api/client';

interface ImageUploadProps {
  itemId: string;
  currentImageUrl: string;
  onImageUpdated: (newImageUrl: string) => void;
  disabled?: boolean;
}

export function ImageUploadComponent({ 
  itemId, 
  currentImageUrl, 
  onImageUpdated,
  disabled = false 
}: ImageUploadProps) {
  const [imageUrl, setImageUrl] = useState(currentImageUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl || '');

  const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop';

  const handleUrlChange = (newUrl: string) => {
    setImageUrl(newUrl);
    setPreviewUrl(newUrl);
    setError(null);
  };

  const handleSaveImage = async () => {
    if (!imageUrl.trim()) {
      setError('Image URL cannot be empty');
      return;
    }

    try {
      new URL(imageUrl);
    } catch {
      setError('Please enter a valid URL (must start with http:// or https://)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updatedItem = await apiClient.updateMenuItemImage(itemId, imageUrl);
      onImageUpdated(updatedItem.imageUrl);
      setPreviewUrl(updatedItem.imageUrl);
    } catch (err) {
      setError('Failed to update image. Please try again.');
      console.error('Image update error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageError = () => {
    setPreviewUrl(FALLBACK_IMAGE);
  };

  const handleClearImage = async () => {
    setIsLoading(true);
    try {
      const updatedItem = await apiClient.updateMenuItemImage(itemId, '');
      setImageUrl('');
      setPreviewUrl('');
      onImageUpdated(updatedItem.imageUrl);
    } catch (err) {
      setError('Failed to clear image');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border border-white/10 rounded-lg bg-card">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-24 h-24 border border-white/20 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
            ) : (
              <div className="text-mute text-sm text-center p-2">
                No image
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <label htmlFor={`image-url-${itemId}`} className="block text-sm font-medium mb-1">
              Image URL
            </label>
            <input
              id={`image-url-${itemId}`}
              type="url"
              value={imageUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="input w-full"
              disabled={disabled || isLoading}
            />
          </div>

          {error && (
            <div className="text-rose-400 text-sm">{error}</div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSaveImage}
              disabled={disabled || isLoading || imageUrl === currentImageUrl}
              className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Image'}
            </button>
            
            {currentImageUrl && (
              <button
                onClick={handleClearImage}
                disabled={disabled || isLoading}
                className="btn-ghost text-sm px-4 py-2 text-rose-400 hover:text-rose-300 disabled:opacity-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="text-xs text-mute">
        <p>Enter a direct image URL (must be publicly accessible). Supported formats: JPG, PNG, WebP.</p>
      </div>
    </div>
  );
}
