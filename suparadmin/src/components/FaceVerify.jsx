import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import axios from "../utils/axios";
import * as faceapi from "face-api.js";

const FaceVerify = ({ user }) => {
  const webcamRef = useRef(null);
  const [result, setResult] = useState("");

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = process.env.PUBLIC_URL + "/models";
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    };
    loadModels();
  }, []);

  const verify = async () => {
    const imageSrc = webcamRef.current.getScreenshot();
    const detection = await faceapi.detectSingleFace(webcamRef.current.video).withFaceLandmarks().withFaceDescriptor();
    if (!detection) return alert("No face detected");

    const userData = await axios.get(`/user/${user._id}`);
    const img = await faceapi.fetchImage(userData.data.photo);
    const refDetection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

    if (!refDetection) return alert("User face not detected");

    const distance = faceapi.euclideanDistance(detection.descriptor, refDetection.descriptor);
    const match = distance < 0.6;
    setResult(match ? `Matched (distance: ${distance.toFixed(2)})` : "Not Matched");
  };

  return (
    <div>
      <Webcam ref={webcamRef} screenshotFormat="image/jpeg" />
      <button onClick={verify}>Verify Face</button>
      <p>{result}</p>
    </div>
  );
};

export default FaceVerify;