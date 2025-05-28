import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const WebCameraScanner = ({ onScan, enabled = true }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [isScanning, setIsScanning] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' for back camera, 'user' for front
  const scanIntervalRef = useRef(null);

  useEffect(() => {
    // Start the camera when component mounts
    startCamera();

    // Clean up when component unmounts
    return () => {
      stopCamera();
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      // Only run on web platform
      if (Platform.OS !== 'web') {
        setHasPermission(false);
        return;
      }

      // Check if navigator.mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('Browser API navigator.mediaDevices.getUserMedia not available');
        setHasPermission(false);
        return;
      }

      // Request camera permission with enhanced settings
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
          // Improve camera quality with constraints
          advanced: [
            { zoom: 1 },  // Default zoom level
            { brightness: 1 }, // Default brightness
            { sharpness: 2 }, // Enhanced sharpness
            { focusMode: 'continuous' } // Continuous auto-focus
          ]
        },
        audio: false
      });

      setHasPermission(true);

      // Set the stream to the video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Start scanning for QR codes
      startScanning();
    } catch (error) {
      console.error('Error starting camera:', error);
      setHasPermission(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const startScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    // Scan for QR code every 500ms
    scanIntervalRef.current = setInterval(() => {
      if (isScanning && videoRef.current && canvasRef.current) {
        try {
          scanQRCode();
        } catch (error) {
          console.error('Error scanning QR code:', error);
        }
      }
    }, 500);
  };

  const scanQRCode = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    const context = canvas.getContext('2d');
    const width = video.videoWidth;
    const height = video.videoHeight;

    // Set canvas dimensions to match video
    canvas.width = width;
    canvas.height = height;

    // Draw the current video frame to the canvas
    context.drawImage(video, 0, 0, width, height);

    // Get the image data from the canvas
    const imageData = context.getImageData(0, 0, width, height);

    // If jsQR is available, use it to scan the image data
    if (window.jsQR) {
      const code = window.jsQR(imageData.data, width, height);
      
      if (code) {
        // QR code found
        console.log('QR code detected:', code.data);
        
        // Pause scanning
        setIsScanning(false);
        
        // Call the onScan callback with the result
        if (onScan) {
          onScan({
            type: 'qr',
            data: code.data
          });
        }
      }
    } else {
      console.warn('jsQR library not loaded. QR scanning not available.');
    }
  };

  const toggleCamera = () => {
    // Toggle between front and back camera
    setFacingMode(prevMode => prevMode === 'environment' ? 'user' : 'environment');
  };

  const toggleTorch = () => {
    // Toggle flashlight (only works on some devices/browsers)
    if (videoRef.current && videoRef.current.srcObject) {
      const track = videoRef.current.srcObject.getVideoTracks()[0];
      
      if (track && track.getCapabilities && track.getCapabilities().torch) {
        track.applyConstraints({
          advanced: [{ torch: !torchOn }]
        });
        setTorchOn(!torchOn);
      } else {
        console.warn('Torch not supported on this device/browser');
      }
    }
  };

  const resumeScanning = () => {
    setIsScanning(true);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera or browser doesn't support camera access.</Text>
        <Text style={styles.subText}>Try using Chrome or Firefox on a device with a camera.</Text>
      </View>
    );
  }

  if (!enabled) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Scanner is only available during scheduled class time.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        {/* Video element for the camera feed */}
        <video
          ref={videoRef}
          style={styles.video}
          autoPlay
          playsInline
          muted
        />
        
        {/* Canvas for processing frames (hidden) */}
        <canvas
          ref={canvasRef}
          style={styles.canvas}
        />
        
        {/* Scanning overlay */}
        <View style={styles.overlay}>
          <View style={styles.scanArea} />
        </View>
        
        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={toggleCamera}>
            <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.controlButton} onPress={toggleTorch}>
            <Ionicons name={torchOn ? "flash" : "flash-outline"} size={24} color="#fff" />
          </TouchableOpacity>
          
          {!isScanning && (
            <TouchableOpacity style={styles.resumeButton} onPress={resumeScanning}>
              <Text style={styles.resumeText}>Tap to scan again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  canvas: {
    display: 'none',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'transparent',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  resumeButton: {
    position: 'absolute',
    top: -100,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  resumeText: {
    color: '#fff',
    fontSize: 16,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
  },
  subText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default WebCameraScanner;
