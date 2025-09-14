import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  onImageRemove: () => void;
  selectedImage?: File | null;
  accept?: string;
  className?: string;
}

export default function ImageUpload({
  onImageSelect,
  onImageRemove,
  selectedImage,
  accept = "image/*",
  className = ""
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    console.log('ImageUpload: handleFile called', { fileName: file.name, fileSize: file.size, fileType: file.type });
    setError(null);

    try {
      // Validate file exists and is valid
      if (!file || !file.name || !file.type || file.size === 0) {
        console.error('ImageUpload: Invalid file', { file: !!file, name: file?.name, type: file?.type, size: file?.size });
        setError('Invalid file selected. Please try again.');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        console.error('ImageUpload: Invalid file type', file.type);
        setError('Please select an image file (PNG, JPG, GIF, etc.)');
        return;
      }

      // No client-side size restrictions - server will handle optimization
      console.log('ImageUpload: File accepted for upload', { 
        fileName: file.name, 
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        fileType: file.type 
      });

      // Additional safety checks
      if (file.name.length > 255) {
        console.error('ImageUpload: File name too long', file.name.length);
        setError('File name is too long. Please rename your file and try again.');
        return;
      }

      console.log('ImageUpload: File validation passed, calling onImageSelect');
      onImageSelect(file);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error');
      console.error('ImageUpload: Error handling file:', errorMessage);
      setError('Failed to process the selected file. Please try again.');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    try {
      if (!e.dataTransfer || !e.dataTransfer.files) {
        setError('File drop not supported by your browser. Please use the file picker instead.');
        return;
      }

      if (e.dataTransfer.files.length === 0) {
        setError('No files detected. Please try again.');
        return;
      }

      if (e.dataTransfer.files.length > 1) {
        setError('Please select only one image file at a time.');
        return;
      }

      handleFile(e.dataTransfer.files[0]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error');
      console.error('Error handling file drop:', errorMessage);
      setError('Failed to process dropped file. Please try the file picker instead.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    setError(null);
    onImageRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      {selectedImage ? (
        <div className="relative">
          <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-bfrs-100 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-bfrs-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{selectedImage.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={removeImage}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragActive 
              ? 'border-bfrs-500 bg-bfrs-50' 
              : 'border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <div className="mx-auto w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mb-4">
            <Upload className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-900 mb-1">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-gray-500">
            PNG, JPG, GIF, WebP - any size
          </p>
          <p className="text-xs text-gray-400 mt-1">
            📱 We'll automatically optimize your image for the best display
          </p>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
