import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import axios from "../utils/axios";
import * as faceapi from "face-api.js";

const RegisterUser = () => {
  const webcamRef = useRef(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "" });

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = process.env.PUBLIC_URL + "/models";
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    };
    loadModels();
  }, []);

  const capture = async () => {
    const imageSrc = webcamRef.current.getScreenshot();
    const detection = await faceapi.detectSingleFace(webcamRef.current.video).withFaceLandmarks().withFaceDescriptor();
    if (!detection) return alert("No face detected. Try again");

    await axios.post("/user/register", { ...form, imageBase64: imageSrc });
    alert("User Registered");
  };

  return (
    <div>
      <input placeholder="First Name" onChange={e => setForm({ ...form, firstName: e.target.value })} />
      <input placeholder="Last Name" onChange={e => setForm({ ...form, lastName: e.target.value })} />
      <input placeholder="Email" onChange={e => setForm({ ...form, email: e.target.value })} />
      <Webcam ref={webcamRef} screenshotFormat="image/jpeg" />
      <button onClick={capture}>Register</button>
    </div>
  );
};

export default RegisterUser;