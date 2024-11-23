



















// --------------------------------------------------------------------------------------------------------------














'use client';

import React, { useEffect,useState, useRef } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const ModelViewer = ({
  shadowOpacity = 0.5, // Controls the opacity of shadows on the ground
  shadowResolution = 2048, // Sets the resolution of shadow maps for directional light
  lightIntensity = 1, // Intensity of the directional light
  modelScale = 100, // Scaling factor for the 3D model
  modelPath = '/models/', // Base path for the model files
  objFile = 'model.obj', // Name of the .OBJ file
  mtlFile = 'model.mtl', // Name of the .MTL file
}) => {
  const mountRef = useRef(null); // Reference to the mounting DOM element

  const [timeOfDay, setTimeOfDay] = useState(5.5);
  const compassRef = useRef(null); 
  const [direction, setDirection] = useState('North'); // State for compass direction

  useEffect(() => {
    // Initialize the Three.js scene
    const scene = new THREE.Scene();

    // Set up the camera with perspective projection
    const camera = new THREE.PerspectiveCamera(
      3, // Field of view in degrees
      mountRef.current.clientWidth / mountRef.current.clientHeight, // Aspect ratio
      0.1, // Near clipping plane
      1000 // Far clipping plane
    );

    // Create the WebGL renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true }); // Enable antialiasing for smoother edges
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    renderer.setClearColor(0xeeeeee); // Set background color to light gray
    renderer.shadowMap.enabled = true; // Enable shadow rendering
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Use soft shadows for better visuals
    mountRef.current.appendChild(renderer.domElement); // Append the renderer to the DOM

    // Add orbit controls for interactive rotation, zoom, and panning
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Enable smooth interaction
    controls.dampingFactor = 0.5; // Define damping strength
    controls.minDistance = 10; // Set minimum zoom distance
    controls.maxDistance = 500; // Set maximum zoom distance
    controls.minPolarAngle = 0; // Prevent looking below the ground (upward angle)
    controls.maxPolarAngle = Math.PI / 2; // Limit to looking straight at or above the ground (90 degrees)
    
    const updateCompassDirection = () => {
      const angle = Math.atan2(camera.position.x, camera.position.z);
      const degree = (angle * (180 / Math.PI) + 360) % 360;

      if (degree >= 315 || degree < 45) setDirection('North');
      else if (degree >= 45 && degree < 135) setDirection('East');
      else if (degree >= 135 && degree < 225) setDirection('South');
      else setDirection('West');
    };
    const updateCompassRotation = () => {
      const vector = new THREE.Vector3(0, 0, -1);
      vector.applyQuaternion(camera.quaternion); // Rotate vector based on camera orientation
      const angle = Math.atan2(vector.x, vector.z); // Calculate rotation angle
      const degree = (angle * (180 / Math.PI) + 360) % 360; // Convert to degrees

      // Rotate the compass
      if (compassRef.current) {
        compassRef.current.style.transform = `rotate(${degree}deg)`;
      }
    };

    // Add ambient light to illuminate the scene
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Soft general illumination
    scene.add(ambientLight);

    // Add directional light for shadows and focused illumination
    const directionalLight = new THREE.DirectionalLight(0xffffff, lightIntensity  );
    directionalLight.position.set(50, 100, 50); // Set light source position
    directionalLight.castShadow = true; // Enable casting shadows
    directionalLight.shadow.mapSize.width = shadowResolution; // Set shadow resolution
    directionalLight.shadow.mapSize.height = shadowResolution;
    directionalLight.shadow.camera.near = 1; // Define shadow camera near plane
    directionalLight.shadow.camera.far = 500; // Define shadow camera far plane
    directionalLight.shadow.camera.left = -100; // Set shadow camera bounds
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    scene.add(directionalLight);

    // Create a ground plane to receive shadows
    const groundGeometry = new THREE.PlaneGeometry(300, 300); // Large flat plane
    const groundshadow = new THREE.ShadowMaterial({opacity: shadowOpacity }); // Semi-transparent shadow material
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0xf0e170 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial,groundshadow);
    ground.rotation.x = -Math.PI / 2; // Rotate plane to be horizontal
    ground.position.y = -1.5; // Position the ground slightly below the model
    ground.receiveShadow = true; // Enable receiving shadows
    scene.add(ground);


    // Load and configure the 3D model
    const mtlLoader = new MTLLoader();
    mtlLoader.setPath(modelPath); // Set the path to the .MTL file
    mtlLoader.load(mtlFile, (materials) => {
      materials.preload(); // Preload the materials

      // Load the .OBJ model using the materials
      const objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.setPath(modelPath); // Set the path to the .OBJ file
      objLoader.load(
        objFile, // File name of the .OBJ model
        (object) => {
          // Configure the model for shadows
          object.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true; // Enable the model to cast shadows
              child.receiveShadow = true; // Enable the model to receive shadows
            }
          });

          object.scale.set(modelScale, modelScale, modelScale); // Scale the model
          object.position.y = 0; // Position the model above the ground
          scene.add(object); // Add the model to the scene
        },
        undefined,
        (error) => {
          console.error('Error loading OBJ:', error); // Log any errors during model loading
        }
      );
    });


    
    // Set the initial camera position
    camera.position.set(0, 100, 200); // Position the camera for a good view


    // const updateSunPosition = () => {
    //   const angle = (timeOfDay / 24) * Math.PI * 2; // Convert time to radians
    //   directionalLight.position.set(
    //     Math.cos(angle) * 100, // X position
    //     Math.sin(angle) * 100, // Y position (height)
    //     50 // Z position
    //   );
    //   directionalLight.target.position.set(0, 0, 0); // Target the scene center
    //   directionalLight.target.updateMatrixWorld(); // Update the target
    // };
    const updateSunPosition = () => {
      // Convert time to radians (0 to 2π for a full day)
      const angle = (timeOfDay / 24) * Math.PI * 2;
    
      // Calculate sun's horizontal position (X) and height (Y)
      // Sunrise starts in the East (X > 0), moves to noon (highest point), and sets in the West (X < 0)
      const sunX = Math.cos(angle) * 150; // Horizontal position of the sun
      const sunY = Math.max(Math.sin(angle) * 150, 10); // Vertical position (minimum 10 to avoid negative height)
      const sunZ = 0; // Fixed Z-axis for simplicity (sun moves East to West)
    
      // Set the directional light's position to simulate the sun
      directionalLight.position.set(sunX, sunY, sunZ);
    
      // Minimize shadow intensity and softness at noon
      const isNoon = timeOfDay === 12; // Check if it's noon
      directionalLight.intensity = isNoon ? 1.0 : lightIntensity; // Slightly higher light intensity at noon
      directionalLight.shadow.radius = isNoon ? 0.2 : 1; // Softer shadows during other times
    
      // Adjust shadow opacity based on the sun's height (higher sun = less shadow)
      groundshadow.opacity = 1 - sunY / 150; // Example: Fully visible shadows at sunrise/sunset, minimal at noon
    
      // Update the target to point to the center of the scene
      directionalLight.target.position.set(0, 0, 0);
      directionalLight.target.updateMatrixWorld();
    };
    
    
    // Animation loop for rendering the scene
    const animate = () => {
      requestAnimationFrame(animate); // Schedule the next frame
      controls.update(); // Update the controls for smooth interaction
      updateSunPosition(); // Update sun position in each frame
      updateCompassDirection();
      updateCompassRotation(); 
      renderer.render(scene, camera); // Render the scene
    };
    animate();

    const handleKeyDown = (event) => {
      switch (event.key) {
        case 'ArrowUp': // Move camera up
          camera.position.y += 10;
          break;
        case 'ArrowDown': // Move camera down
          camera.position.y -= 10;
          break;
        case 'ArrowLeft': // Move camera left
          camera.position.x -= 10;
          break;
        case 'ArrowRight': // Move camera right
          camera.position.x += 10;
          break;
      }
      controls.update(); // Ensure controls are updated after position change
    };

    window.addEventListener('keydown', handleKeyDown);

    // Handle window resizing to adjust the renderer and camera
    const handleResize = () => {
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight; // Update aspect ratio
      camera.updateProjectionMatrix(); // Recalculate projection matrix
      renderer.setSize(
        mountRef.current.clientWidth,
        mountRef.current.clientHeight
      );
    };
    window.addEventListener('resize', handleResize); // Listen for resize events

    // Cleanup function to remove event listeners and DOM elements
    return () => {
      mountRef.current.removeChild(renderer.domElement); // Remove renderer from DOM
      window.removeEventListener('resize', handleResize); // Remove resize listener
      window.removeEventListener('keydown', handleKeyDown); // Cleanup keydown listener
    };
  }, [timeOfDay,shadowOpacity, shadowResolution, lightIntensity, modelScale, modelPath, objFile, mtlFile]); // Dependencies for useEffect

  
  return (
    <div className="flex bg-gray-200">
          <div
        ref={compassRef} // Compass reference
        style={{
          position:"absolute",
          right:"0px",
          top:"0px",
          width: '100px',
          height: '100px',
          background: 'url("/compass.jpg") no-repeat center center',
          backgroundSize: 'contain',
          transformOrigin: 'center', // Rotate from center
        }}
      ></div>
      <p>3D Model Viewer</p>
      
      <div
        ref={mountRef} // Attach the DOM reference
        style={{
          width: '100%', // Full width
          overflow: 'auto', // Prevent content overflow
          height: '500px', // Fixed height
        }}
      /> 
      <hr/>
      <div
        style={{
          padding: '10px',
          background: 'rgba(255, 255, 255, 0.8)',
          borderRadius: '5px',
        }}
      >
        <strong>Compass:</strong> {direction}
      </div>
      <hr/>
      <div>
      <input
        type="range"
        min="0"
        max="24"
        value={timeOfDay}
        onChange={(e) => setTimeOfDay(Number(e.target.value))}
        style={{ width: '100%' }}
      />
      <hr/><hr/>

      <hr/><hr/>
      <p>Time of Day: {timeOfDay} (0 = Midnight, 24 = Next Midnight)</p>
      </div>
      <hr/>
      <hr/>
      <div>
        <strong>Controls</strong>
        <div>
          <p><strong>Action</strong>: Click and drag with the left mouse button.</p>
          <p><strong>Effect</strong>: Rotates the scene around the model based on the mouse movement.</p>
       </div>
       <hr/>
        <div>
          <p><strong>Action</strong>: Click and drag with the right mouse button or use the middle mouse button (scroll wheel press).</p>
          <p><strong>Effect</strong>: Moves the camera horizontally or vertically without rotating, providing a different perspective.</p>
        </div>
      </div>
    </div>
  );
};

export default ModelViewer;

















// -----------------------------------------------------------------------------------------------------------------------





























// 'use client';

// import React, { useEffect,useState, useRef } from 'react';
// import * as THREE from 'three';
// import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
// import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// const ModelViewer = ({
//   shadowOpacity = 0.5, // Controls the opacity of shadows on the ground
//   shadowResolution = 2048, // Sets the resolution of shadow maps for directional light
//   lightIntensity = 1, // Intensity of the directional light
//   modelScale = 100, // Scaling factor for the 3D model
//   modelPath = '/models/', // Base path for the model files
//   objFile = 'model.obj', // Name of the .OBJ file
//   mtlFile = 'model.mtl', // Name of the .MTL file
// }) => {
//   const mountRef = useRef(null); // Reference to the mounting DOM element

//   const [timeOfDay, setTimeOfDay] = useState(23);

//   useEffect(() => {
//     // Initialize the Three.js scene
//     const scene = new THREE.Scene();

//     // Set up the camera with perspective projection
//     const camera = new THREE.PerspectiveCamera(
//       3, // Field of view in degrees
//       mountRef.current.clientWidth / mountRef.current.clientHeight, // Aspect ratio
//       0.1, // Near clipping plane
//       1000 // Far clipping plane
//     );

//     // Create the WebGL renderer
//     const renderer = new THREE.WebGLRenderer({ antialias: true }); // Enable antialiasing for smoother edges
//     renderer.setSize(
//       mountRef.current.clientWidth,
//       mountRef.current.clientHeight
//     );
//     renderer.setClearColor(0xeeeeee); // Set background color to light gray
//     renderer.shadowMap.enabled = true; // Enable shadow rendering
//     renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Use soft shadows for better visuals
//     mountRef.current.appendChild(renderer.domElement); // Append the renderer to the DOM

//     // Add orbit controls for interactive rotation, zoom, and panning
//     const controls = new OrbitControls(camera, renderer.domElement);
//     controls.enableDamping = true; // Enable smooth interaction
//     controls.dampingFactor = 0.5; // Define damping strength
//     controls.minDistance = 10; // Set minimum zoom distance
//     controls.maxDistance = 500; // Set maximum zoom distance
//     controls.minPolarAngle = 0; // Prevent looking below the ground (upward angle)
//     controls.maxPolarAngle = Math.PI / 2; // Limit to looking straight at or above the ground (90 degrees)
    

//     // Add ambient light to illuminate the scene
//     const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Soft general illumination
//     scene.add(ambientLight);

//     // Add directional light for shadows and focused illumination
//     const directionalLight = new THREE.DirectionalLight(0xffffff, lightIntensity  );
//     directionalLight.position.set(50, 100, 50); // Set light source position
//     directionalLight.castShadow = true; // Enable casting shadows
//     directionalLight.shadow.mapSize.width = shadowResolution; // Set shadow resolution
//     directionalLight.shadow.mapSize.height = shadowResolution;
//     directionalLight.shadow.camera.near = 1; // Define shadow camera near plane
//     directionalLight.shadow.camera.far = 500; // Define shadow camera far plane
//     directionalLight.shadow.camera.left = -100; // Set shadow camera bounds
//     directionalLight.shadow.camera.right = 100;
//     directionalLight.shadow.camera.top = 100;
//     directionalLight.shadow.camera.bottom = -100;
//     scene.add(directionalLight);

//     // Create a ground plane to receive shadows
//     const groundGeometry = new THREE.PlaneGeometry(300, 300); // Large flat plane
//     const groundshadow = new THREE.ShadowMaterial({opacity: shadowOpacity }); // Semi-transparent shadow material
//     const groundMaterial = new THREE.MeshStandardMaterial({ color: 0xf0e170 });
//     const ground = new THREE.Mesh(groundGeometry, groundMaterial,groundshadow);
//     ground.rotation.x = -Math.PI / 2; // Rotate plane to be horizontal
//     ground.position.y = -1.5; // Position the ground slightly below the model
//     ground.receiveShadow = true; // Enable receiving shadows
//     scene.add(ground);


//     // Load and configure the 3D model
//     const mtlLoader = new MTLLoader();
//     mtlLoader.setPath(modelPath); // Set the path to the .MTL file
//     mtlLoader.load(mtlFile, (materials) => {
//       materials.preload(); // Preload the materials

//       // Load the .OBJ model using the materials
//       const objLoader = new OBJLoader();
//       objLoader.setMaterials(materials);
//       objLoader.setPath(modelPath); // Set the path to the .OBJ file
//       objLoader.load(
//         objFile, // File name of the .OBJ model
//         (object) => {
//           // Configure the model for shadows
//           object.traverse((child) => {
//             if (child.isMesh) {
//               child.castShadow = true; // Enable the model to cast shadows
//               child.receiveShadow = true; // Enable the model to receive shadows
//             }
//           });

//           object.scale.set(modelScale, modelScale, modelScale); // Scale the model
//           object.position.y = 0; // Position the model above the ground
//           scene.add(object); // Add the model to the scene
//         },
//         undefined,
//         (error) => {
//           console.error('Error loading OBJ:', error); // Log any errors during model loading
//         }
//       );
//     });


    
//     // Set the initial camera position
//     camera.position.set(0, 100, 200); // Position the camera for a good view


//     // const updateSunPosition = () => {
//     //   const angle = (timeOfDay / 24) * Math.PI * 2; // Convert time to radians
//     //   directionalLight.position.set(
//     //     Math.cos(angle) * 100, // X position
//     //     Math.sin(angle) * 100, // Y position (height)
//     //     50 // Z position
//     //   );
//     //   directionalLight.target.position.set(0, 0, 0); // Target the scene center
//     //   directionalLight.target.updateMatrixWorld(); // Update the target
//     // };
//     const updateSunPosition = () => {
//       // Convert time to radians
//       const angle = (timeOfDay / 24) * Math.PI * 2;
    
//       // Calculate sun height (Y position)
//       // Noon (12): Maximum height (e.g., 150 units)
//       // Sunrise/Sunset (6/18): Near horizon (e.g., 10 units)
//       const sunHeight = Math.sin(angle) * 150;
    
//       // Update directional light position
//       directionalLight.position.set(
//         Math.cos(angle) * 100, // X position
//         Math.max(sunHeight, 10), // Y position (minimum to keep shadows visible near the horizon)
//         50 // Z position
//       );
    
//       // Minimize shadow strength at noon
//       const isNoon = timeOfDay === 12;
//       directionalLight.intensity = isNoon ? 0.8 : lightIntensity; // Dim light slightly at noon
//       directionalLight.shadow.radius = isNoon ? 0.1 : 1; // Reduce shadow softness
    
//       // Update the target to point to the center
//       directionalLight.target.position.set(0, 0, 0);
//       directionalLight.target.updateMatrixWorld();
//     };
    
//     // Animation loop for rendering the scene
//     const animate = () => {
//       requestAnimationFrame(animate); // Schedule the next frame
//       controls.update(); // Update the controls for smooth interaction
//       updateSunPosition(); // Update sun position in each frame
//       renderer.render(scene, camera); // Render the scene
//     };
//     animate();

//     const handleKeyDown = (event) => {
//       switch (event.key) {
//         case 'ArrowUp': // Move camera up
//           camera.position.y += 10;
//           break;
//         case 'ArrowDown': // Move camera down
//           camera.position.y -= 10;
//           break;
//         case 'ArrowLeft': // Move camera left
//           camera.position.x -= 10;
//           break;
//         case 'ArrowRight': // Move camera right
//           camera.position.x += 10;
//           break;
//       }
//       controls.update(); // Ensure controls are updated after position change
//     };

//     window.addEventListener('keydown', handleKeyDown);

//     // Handle window resizing to adjust the renderer and camera
//     const handleResize = () => {
//       camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight; // Update aspect ratio
//       camera.updateProjectionMatrix(); // Recalculate projection matrix
//       renderer.setSize(
//         mountRef.current.clientWidth,
//         mountRef.current.clientHeight
//       );
//     };
//     window.addEventListener('resize', handleResize); // Listen for resize events

//     // Cleanup function to remove event listeners and DOM elements
//     return () => {
//       mountRef.current.removeChild(renderer.domElement); // Remove renderer from DOM
//       window.removeEventListener('resize', handleResize); // Remove resize listener
//       window.removeEventListener('keydown', handleKeyDown); // Cleanup keydown listener
//     };
//   }, [timeOfDay,shadowOpacity, shadowResolution, lightIntensity, modelScale, modelPath, objFile, mtlFile]); // Dependencies for useEffect

  
//   return (
//     <div className="flex bg-gray-200">
//       <p>3D Model Viewer</p>
//       <div
//         ref={mountRef} // Attach the DOM reference
//         style={{
//           width: '100%', // Full width
//           overflow: 'auto', // Prevent content overflow
//           height: '500px', // Fixed height
//         }}
//       /> 
//       <hr/>
//       <hr/>
//       <div>
//       <input
//         type="range"
//         min="0"
//         max="24"
//         value={timeOfDay}
//         onChange={(e) => setTimeOfDay(Number(e.target.value))}
//         style={{ width: '100%' }}
//       />
//       <p>Time of Day: {timeOfDay} (0 = Midnight, 24 = Next Midnight)</p>
//       </div>
//       <hr/>
//       <hr/>
//       <div>
//         <strong>Controls</strong>
//         <div>
//           <p><strong>Action</strong>: Click and drag with the left mouse button.</p>
//           <p><strong>Effect</strong>: Rotates the scene around the model based on the mouse movement.</p>
//        </div>
//        <hr/>
//         <div>
//           <p><strong>Action</strong>: Click and drag with the right mouse button or use the middle mouse button (scroll wheel press).</p>
//           <p><strong>Effect</strong>: Moves the camera horizontally or vertically without rotating, providing a different perspective.</p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ModelViewer;





























// ------------------------------------------------------------------------------------------------------------













// 'use client';

// import React, { useEffect, useRef } from 'react';
// import * as THREE from 'three';
// import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
// import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// const ModelViewer = () => {
//   const mountRef = useRef(null);

//   useEffect(() => {
//     // Scene, Camera, and Renderer Setup
//     const scene = new THREE.Scene();
//     const camera = new THREE.PerspectiveCamera(
//       75,
//       mountRef.current.clientWidth / mountRef.current.clientHeight,
//       0.1,
//       1000
//     );
//     const renderer = new THREE.WebGLRenderer({ antialias: true });
//     renderer.setSize(
//       mountRef.current.clientWidth,
//       mountRef.current.clientHeight
//     );
//     renderer.setClearColor(0xeeeeee); // Light gray background
//     renderer.shadowMap.enabled = true; // Enable shadows
//     renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
//     mountRef.current.appendChild(renderer.domElement);

//     // Orbit Controls
//     const controls = new OrbitControls(camera, renderer.domElement);
//     controls.enableDamping = true; // Smooth rotation
//     controls.dampingFactor = 0.25;
//     controls.minDistance = 10; // Minimum zoom distance
//     controls.maxDistance = 500; // Maximum zoom distance

//     // Ambient Light
//     const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // General illumination
//     scene.add(ambientLight);

//     // Directional Light for Shadows
//     const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
//     directionalLight.position.set(50, 100, 50); // Position the light
//     directionalLight.castShadow = true; // Enable shadows from this light
//     directionalLight.shadow.mapSize.width = 2048; // High-resolution shadow map
//     directionalLight.shadow.mapSize.height = 2048;
//     directionalLight.shadow.camera.near = 1;
//     directionalLight.shadow.camera.far = 500;
//     directionalLight.shadow.camera.left = -100;
//     directionalLight.shadow.camera.right = 100;
//     directionalLight.shadow.camera.top = 100;
//     directionalLight.shadow.camera.bottom = -100;
//     scene.add(directionalLight);

//     // Ground Plane to Receive Shadows
//     const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
//     const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.5 });
//     const ground = new THREE.Mesh(groundGeometry, groundMaterial);
//     ground.rotation.x = -Math.PI / 2; // Rotate to be flat
//     ground.position.y = -5; // Place below the model
//     ground.receiveShadow = true; // Enable shadow receiving
//     scene.add(ground);

//     // MTL and OBJ Loader
//     const mtlLoader = new MTLLoader();
//     mtlLoader.setPath('/models/'); // Path to the MTL file
//     mtlLoader.load('model.mtl', (materials) => {
//       materials.preload(); // Preload materials

//       const objLoader = new OBJLoader();
//       objLoader.setMaterials(materials);
//       objLoader.setPath('/models/'); // Path to the OBJ file
//       objLoader.load(
//         'model.obj',
//         (object) => {
//           // Traverse and Configure Object for Shadows
//           object.traverse((child) => {
//             if (child.isMesh) {
//               child.castShadow = true; // Enable casting shadows
//               child.receiveShadow = true; // Enable receiving shadows
//             }
//           });

//           object.scale.set(100, 100, 100); // Scale up the model
//           object.position.y = 0; // Adjust position if needed
//           scene.add(object);
//         },
//         undefined,
//         (error) => {
//           console.error('Error loading OBJ:', error);
//         }
//       );
//     });

//     // Camera Position
//     camera.position.set(0, 100, 200);

//     // Animation Loop
//     const animate = () => {
//       requestAnimationFrame(animate);
//       controls.update(); // Update controls
//       renderer.render(scene, camera);
//     };
//     animate();

//     // Handle Window Resize
//     const handleResize = () => {
//       camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
//       camera.updateProjectionMatrix();
//       renderer.setSize(
//         mountRef.current.clientWidth,
//         mountRef.current.clientHeight
//       );
//     };
//     window.addEventListener('resize', handleResize);

//     // Cleanup on Component Unmount
//     return () => {
//       mountRef.current.removeChild(renderer.domElement);
//       window.removeEventListener('resize', handleResize);
//     };
//   }, []);

//   return (
//     <div className="flex bg-gray-200">
//       <p>3D Model Viewer</p>
//       <div
//         ref={mountRef}
//         style={{
//           width: '100%',
//           overflow: 'auto',
//           height: '500px',
//         }}
//       />
//     </div>
//   );
// };

// export default ModelViewer;



















// -------------------------------------------------------------------------------------------------------------------------------











// 'use client';

// import React, { useEffect, useRef } from 'react';
// import * as THREE from 'three';
// import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
// import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// const ModelViewer = () => {
//   const mountRef = useRef(null);

//   useEffect(() => {
//     // Set up scene, camera, and renderer
//     const scene = new THREE.Scene();
//     const camera = new THREE.PerspectiveCamera(
//       75,
//       mountRef.current.clientWidth / mountRef.current.clientHeight,
//       0.1,
//       1000
//     );
//     const renderer = new THREE.WebGLRenderer({ antialias: true });
//     renderer.setSize(
//       mountRef.current.clientWidth,
//       mountRef.current.clientHeight
//     );
//     renderer.setClearColor(0xeeeeee); // Set background color
//     renderer.shadowMap.enabled = true; // Enable shadows
//     renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Use soft shadows
//     mountRef.current.appendChild(renderer.domElement);

//     // Add orbit controls for interactivity
//     const controls = new OrbitControls(camera, renderer.domElement);
//     controls.enableDamping = true; // Smooth rotation
//     controls.dampingFactor = 0.25;
//     controls.minDistance = 10; // Minimum zoom distance
//     controls.maxDistance = 500; // Maximum zoom distance

//     // Add ambient and directional lights
//     const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Ambient light for overall illumination
//     scene.add(ambientLight);

//     const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
//     directionalLight.position.set(10, 20, 10); // Light source position
//     directionalLight.castShadow = true; // Enable shadow casting
//     directionalLight.shadow.mapSize.width = 1024; // Shadow map resolution
//     directionalLight.shadow.mapSize.height = 1024;
//     directionalLight.shadow.camera.near = 1;
//     directionalLight.shadow.camera.far = 100;
//     directionalLight.shadow.camera.left = -50;
//     directionalLight.shadow.camera.right = 50;
//     directionalLight.shadow.camera.top = 50;
//     directionalLight.shadow.camera.bottom = -50;
//     scene.add(directionalLight);

//     // Add a ground plane to receive shadows
//     const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
//     const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.5 });
//     const ground = new THREE.Mesh(groundGeometry, groundMaterial);
//     ground.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
//     ground.receiveShadow = true; // Enable shadow receiving
//     scene.add(ground);

//     // Load MTL and OBJ files
//     const mtlLoader = new MTLLoader();
//     mtlLoader.setPath('/models/'); // Path to the MTL file
//     mtlLoader.load('model.mtl', (materials) => {
//       materials.preload(); // Preload materials

//       const objLoader = new OBJLoader();
//       objLoader.setMaterials(materials);
//       objLoader.setPath('/models/'); // Path to the OBJ file
//       objLoader.load(
//         'model.obj',
//         (object) => {
//           // Check and fix NaN values in geometry
//           object.traverse((child) => {
//             if (child.isMesh) {
//               child.castShadow = true; // Enable shadow casting for the object
//               child.receiveShadow = true; // Enable shadow receiving for the object

//               const geometry = child.geometry;
//               if (geometry.attributes.position) {
//                 const positions = geometry.attributes.position.array;
//                 for (let i = 0; i < positions.length; i++) {
//                   if (isNaN(positions[i])) {
//                     positions[i] = Math.random() * 100; // Replace NaN with random value
//                   }
//                 }
//                 geometry.computeBoundingSphere(); // Recompute bounding sphere
//               }
//             }
//           });

//           // Scale and add the object to the scene
//           object.scale.set(500, 500, 500); // Scale up the model
//           scene.add(object);
//         },
//         undefined,
//         (error) => {
//           console.error('Error loading OBJ:', error); // Log errors if any
//         }
//       );
//     });

//     // Set initial camera position
//     camera.position.set(0, 50, 150);

//     // Animation loop for rendering and rotation
//     const animate = () => {
//       requestAnimationFrame(animate);
//       controls.update(); // Update orbit controls
//     //   scene.rotation.y += 0.01; // Rotate the scene for an engaging effect
//       renderer.render(scene, camera);
//     };
//     animate();

//     // Handle window resizing
//     const handleResize = () => {
//       camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
//       camera.updateProjectionMatrix();
//       renderer.setSize(
//         mountRef.current.clientWidth,
//         mountRef.current.clientHeight
//       );
//     };
//     window.addEventListener('resize', handleResize);

//     // Cleanup on component unmount
//     return () => {
//       mountRef.current.removeChild(renderer.domElement);
//       window.removeEventListener('resize', handleResize);
//     };
//   }, []);

//   return (
//     <div className="flex bg-gray-200">
//       <p>3D Model Viewer</p>
//       <div
//         ref={mountRef}
//         style={{
//           width: '100%',
//           overflow: 'auto',
//           height: '500px',
//         }}
//       />
//     </div>
//   );
// };

// export default ModelViewer;













// --------------------------------------------------------------------------------------------------------------



// 'use client';

// import React, { useEffect, useRef } from 'react';
// import * as THREE from 'three';
// import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
// import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// const ModelViewer = () => {
//   const mountRef = useRef(null);

//   useEffect(() => {
//     // Set up scene, camera, and renderer
//     const scene = new THREE.Scene();
//     const camera = new THREE.PerspectiveCamera(
//       75,
//       mountRef.current.clientWidth / mountRef.current.clientHeight,
//       0.1,
//       1000
//     );
//     const renderer = new THREE.WebGLRenderer();
//     renderer.setSize(
//       mountRef.current.clientWidth,
//       mountRef.current.clientHeight
//     );
//     renderer.setClearColor(0xeeeeee); // Set background color
//     mountRef.current.appendChild(renderer.domElement);

//     // Add orbit controls for interactivity
//     const controls = new OrbitControls(camera, renderer.domElement);
//     controls.enableDamping = true; // Smooth rotation
//     controls.dampingFactor = 0.25;
//     controls.minDistance = 10; // Minimum zoom distance
//     controls.maxDistance = 500; // Maximum zoom distance

//     // Add ambient and directional lights
//     scene.add(new THREE.AmbientLight(0xffffff, 0.8)); // Ambient light for overall illumination
//     const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
//     directionalLight.position.set(10, 10, 10); // Light source position
//     scene.add(directionalLight);

//     // Add environment map (skybox texture for reflection)
//     const loader = new THREE.CubeTextureLoader();
//     const envMap = loader.load([
//       '/background.webp', // Positive X
//       '/background.webp', // Negative X  sandy_gravel_02
//       '/background.webp', // Positive Y
//       '/background.webp', // Negative Y
//       '/background.webp', // Positive Z
//       '/background.webp', // Negative Z
//     ]);
//     scene.background = envMap; // Set skybox as the scene's background

//     // Load MTL and OBJ files
//     const mtlLoader = new MTLLoader();
//     mtlLoader.setPath('/models/'); // Path to the MTL file
//     mtlLoader.load('model.mtl', (materials) => {
//       materials.preload(); // Preload materials

//       const objLoader = new OBJLoader();
//       objLoader.setMaterials(materials);
//       objLoader.setPath('/models/'); // Path to the OBJ file
//       objLoader.load(
//         'model.obj',
//         (object) => {
//           // Check and fix NaN values in geometry
//           object.traverse((child) => {
//             if (child.isMesh) {
//               const geometry = child.geometry;

//               if (geometry.attributes.position) {
//                 const positions = geometry.attributes.position.array;
//                 for (let i = 0; i < positions.length; i++) {
//                   if (isNaN(positions[i])) {
//                     positions[i] = Math.random() * 100; // Replace NaN with random value
//                   }
//                 }
//                 geometry.computeBoundingSphere(); // Recompute bounding sphere
//               }
//             }
//           });

//           // Scale and add the object to the scene
//           object.scale.set(500, 500, 500); // Scale up the model
//           scene.add(object);
//         },
//         undefined,
//         (error) => {
//           console.error('Error loading OBJ:', error); // Log errors if any
//         }
//       );
//     });

//     // Set initial camera position
//     camera.position.set(0, 50, 150);

//     // Animation loop for rendering and rotation
//     const animate = () => {
//       requestAnimationFrame(animate);
//       controls.update(); // Update orbit controls
//       scene.rotation.y += 0; // Rotate the scene for an engaging effect
//       renderer.render(scene, camera);
//     };
//     animate();

//     // Handle window resizing
//     const handleResize = () => {
//       camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
//       camera.updateProjectionMatrix();
//       renderer.setSize(
//         mountRef.current.clientWidth,
//         mountRef.current.clientHeight
//       );
//     };
//     window.addEventListener('resize', handleResize);

//     // Cleanup on component unmount
//     return () => {
//       mountRef.current.removeChild(renderer.domElement);
//       window.removeEventListener('resize', handleResize);
//     };
//   }, []);

//   return (
//     <div className="flex bg-gray-200">
//       <p>3D Model Viewer</p>
//       <div
//         ref={mountRef}
//         style={{
//           width: '100%',
//           overflow: 'auto',
//           height: '500px',
//         }}
//       />
//     </div>
//   );
// };

// export default ModelViewer;
