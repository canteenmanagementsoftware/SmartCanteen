
import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import * as faceapi from 'face-api.js';

const WebcamCapture = ({ onCapture, onCancel }) => {
  const webcamRef = useRef(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [message, setMessage] = useState('Starting camera...');
  const [canCapture, setCanCapture] = useState(false);

  // Load face detection model
  useEffect(() => {
    const loadModel = async () => {
      try {
        const MODEL_URL = '/models';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        setIsModelLoaded(true);
        setMessage('Camera ready - Position your face');
      } catch (error) {
        console.error('Error loading face detection:', error);
        setMessage('Error loading face detection');
      }
    };
    loadModel();
  }, []);

  // Check face position periodically
  useEffect(() => {
    if (!isModelLoaded || !webcamRef.current) return;

    let checkInterval = setInterval(async () => {
      try {
        const detection = await faceapi.detectSingleFace(
          webcamRef.current.video,
          new faceapi.TinyFaceDetectorOptions()
        );

        if (detection) {
          // Face found - check position and size
          const { width, height } = detection.box;
          const videoWidth = webcamRef.current.video.videoWidth;
          const videoHeight = webcamRef.current.video.videoHeight;

          // Check if face is too small or too large
          const faceRatio = width / videoWidth;
          if (faceRatio < 0.2) {
            setMessage('Move closer to camera');
            setCanCapture(false);
          } else if (faceRatio > 0.8) {
            setMessage('Move away from camera');
            setCanCapture(false);
          } else {
            setMessage('✅ Good position - Click Capture');
            setCanCapture(true);
          }
        } else {
          setMessage('No face detected');
          setCanCapture(false);
        }
      } catch (error) {
        console.error('Face check error:', error);
      }
    }, 500); // Check every 500ms

    return () => clearInterval(checkInterval);
  }, [isModelLoaded]);

  const capture = async () => {
    if (!canCapture) {
      alert('Please position your face correctly first');
      return;
    }

    const screenshot = webcamRef.current.getScreenshot();
    onCapture(screenshot);
  };

  return (
    <div className="bg-gray-100 p-4 rounded-lg shadow-md w-full max-w-md">
      <div className="flex flex-col items-center space-y-4">
        {/* Camera View */}
        <div className="relative w-full">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="w-full h-auto rounded-lg border-2 border-gray-300"
          />
          
          {/* Face Guide Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-48 h-48 border-2 rounded-full ${
              canCapture ? 'border-green-500' : 'border-gray-400'
            } border-dashed opacity-50`}></div>
          </div>

          {/* Close Button */}
          <div className="absolute top-2 right-2">
            <button
              onClick={onCancel}
              className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Status Message */}
        <div className={`text-sm font-medium ${
          canCapture ? 'text-green-600' : 'text-gray-600'
        }`}>
          {message}
        </div>
        
        {/* Capture Button */}
        <button
          type="button"
          onClick={capture}
          disabled={!canCapture}
          className={`px-4 py-2 rounded-md flex items-center ${
            canCapture 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
          }`}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Capture
        </button>
      </div>
    </div>
  );
};

export default WebcamCapture;