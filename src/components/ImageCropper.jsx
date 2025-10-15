// components/ImageCropper.js
import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from './cropUtils';

export default function ImageCropper({ image, onCropDone, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropDone = async () => {
    const croppedImage = await getCroppedImg(image, croppedAreaPixels);
    onCropDone(croppedImage);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="relative w-[90vw] h-[90vh] bg-white rounded shadow-lg p-4">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={1} // Square crop
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />

        <div className="mt-4 flex justify-between">
          <button onClick={onCancel} className="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
          <button onClick={handleCropDone} className="bg-blue-600 text-white px-4 py-2 rounded">Crop</button>
        </div>
      </div>
    </div>
  );
}
