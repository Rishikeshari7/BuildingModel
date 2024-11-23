"use client"
import React, { useState } from "react";
import ModelViewer from "@/components/ModelViewer/ModelViewer";

export default function Home() {
  // State to hold shadow properties
  const [shadowOpacity, setShadowOpacity] = useState(1);
  const [shadowResolution, setShadowResolution] = useState(4096);
  const [lightIntensity, setLightIntensity] = useState(2);
  const [modelScale, setModelScale] = useState(300);

  return (
    <div className="flex flex-col w-[100vw] h-[100vh] p-4">
      <p className="baba text-red-500">Home</p>
      
      {/* Input Form for Shadow Properties */}
      <div className="mb-4 flex gap-4 items-center">
        <label>
          Shadow Opacity:
          <input
            type="number"
            value={shadowOpacity}
            step="0.1"
            min="0"
            max="1"
            onChange={(e) => setShadowOpacity(parseFloat(e.target.value))}
            className="border p-1 rounded"
          />
        </label>

        <label>
          Shadow Resolution:
          <input
            type="number"
            value={shadowResolution}
            step="1"
            min="128"
            onChange={(e) => setShadowResolution(parseInt(e.target.value, 10))}
            className="border p-1 rounded"
          />
        </label>

        <label>
          Light Intensity:
          <input
            type="number"
            value={lightIntensity}
            step="0.1"
            min="0"
            max="10"
            onChange={(e) => setLightIntensity(parseFloat(e.target.value))}
            className="border p-1 rounded"
          />
        </label>

        <label>
          Model Scale:
          <input
            type="number"
            value={modelScale}
            step="10"
            min="10"
            onChange={(e) => setModelScale(parseInt(e.target.value, 10))}
            className="border p-1 rounded"
          />
        </label>
      </div>

      {/* Model Viewer Component */}
      <div className="flex-grow">
        <ModelViewer
          shadowOpacity={shadowOpacity}
          shadowResolution={shadowResolution}
          lightIntensity={lightIntensity}
          modelScale={modelScale}
          modelPath="/models/"
          objFile="model.obj"
          mtlFile="model.mtl"
        />
      </div>

      <p>Footer</p>
    </div>
  );
}
