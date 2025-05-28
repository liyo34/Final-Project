import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, ActivityIndicator, Modal, Vibration } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import API_BASE_URL from '../config/apiConfig';
import ImagePlaceholder from '../components/ImagePlaceholder';

const QrScanner = ({ initialDemoMode: initialDemoModeProp }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scannedData, setScannedData] = useState([]);
  const [flashMode, setFlashMode] = useState(BarCodeScanner.Constants.FlashMode.off);
  const [captureMode, setCaptureMode] = useState(false); // Toggle between scan and capture modes
  const [capturedImage, setCapturedImage] = useState(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [demoMode, setDemoMode] = useState(false); // Toggle for demo mode
  const [showErrorModal, setShowErrorModal] = useState(false); // State for custom error modal
  const [errorMessage, setErrorMessage] = useState(''); // Error message for the modal
  const [showDuplicateModal, setShowDuplicateModal] = useState(false); // State for duplicate scan modal
  const [duplicateStudentInfo, setDuplicateStudentInfo] = useState(null); // Student info for duplicate scan
  const cameraRef = useRef(null);
  const navigation = useNavigation();
  const route = useRoute();
  
  // Get parameters from route
  const classData = route.params?.classData;
  const initialDemoMode = route.params?.initialDemoMode;

  useEffect(() => {
    (async () => {
      // Request both barcode scanner and camera permissions
      const { status: barcodeStatus } = await BarCodeScanner.requestPermissionsAsync();
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      
      // Also request media library permissions for saving photos
      const { status: mediaLibraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      setHasPermission(barcodeStatus === 'granted' && cameraStatus === 'granted');
    })();
  }, []);
  
  // Enable demo mode automatically if initialDemoMode prop is true
  useEffect(() => {
    if (initialDemoModeProp) {
      setDemoMode(true);
    }
  }, [initialDemoModeProp]);

  const handleBarCodeScanned = async ({ type, data }) => {
    try {
      setScanned(true);
      
      // Clean the QR code data
      const cleanedData = data.trim();
      console.log('Scanned QR data:', cleanedData);
      
      // STRICT VALIDATION: Only accept the pipe-delimited format (studentID|name|email)
      const pipeDelimitedRegex = /^([^|]+)\|([^|]+)\|([^|]+)$/;
      const pipeMatch = cleanedData.match(pipeDelimitedRegex);
      
      // Check if the QR code has the expected format
      if (!pipeMatch) {
        console.error('QR code does not match the expected format (studentID|name|email)');
        
        // Show custom error modal
        setErrorMessage('This QR code does not have the required format:\n\nstudentID|name|email\n\nATTENDANCE NOT RECORDED.');
        setShowErrorModal(true);
        
        // Vibrate the device if possible
        try {
          Vibration.vibrate(500);
        } catch (e) {
          console.log('Vibration not available:', e);
        }
        
        setScanned(false);
        return;
      }
      
      // Extract student data from the pipe-delimited format
      const [_, studentId, name, email] = pipeMatch;
      studentData = {
        studentId,
        name,
        email
      };
      
      console.log('Successfully parsed pipe-delimited data:', studentData);
      
      console.log('Scanned student data:', studentData);
      
      // Check if this student has already been scanned
      if (scannedData.some(item => item.studentId === studentData.studentId)) {
        console.log('Student already scanned:', studentData.studentId);
        
        // Show custom duplicate scan modal
        setDuplicateStudentInfo(studentData);
        setShowDuplicateModal(true);
        
        // Vibrate the device if possible
        try {
          Vibration.vibrate([100, 100, 100]);
        } catch (e) {
          console.log('Vibration not available:', e);
        }
        
        setScanned(false);
        return;
      }
      
      // Get user token for API authentication
      const userToken = await AsyncStorage.getItem('userToken');
      
      if (userToken && classData) {
        try {
          // Record attendance in the API
          const attendanceResponse = await fetch(`${API_BASE_URL}/api/attendance/record`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              classId: classData.id,
              studentId: studentData.studentId,
              date: new Date().toISOString(),
              status: 'present'
            })
          });
          
          if (attendanceResponse.ok) {
            console.log('Attendance recorded successfully');
          } else {
            console.log('Failed to record attendance:', attendanceResponse.status);
            // Continue anyway since we're storing locally
          }
        } catch (apiError) {
          console.error('Error recording attendance in API:', apiError);
          // Continue anyway since we're storing locally
        }
      }
      
      // Add the scanned student to our local list
      const newScannedData = [...scannedData, {
        ...studentData,
        timestamp: new Date().toISOString()
      }];
      
      setScannedData(newScannedData);
      
      // Show success message
      Alert.alert(
        'Student Verified',
        `${studentData.name} (${studentData.studentId}) has been marked present.`,
        [
          {
            text: 'Continue Scanning',
            onPress: () => setScanned(false)
          }
        ]
      );
    } catch (error) {
      console.error('Error handling QR code scan:', error);
      Alert.alert('Error', 'An error occurred while processing the QR code.');
      setScanned(false);
    }
  };

  // Function to take a picture with the camera
  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          skipProcessing: false,
        });
        
        setCapturedImage(photo.uri);
        processQrCodeFromImage(photo.uri);
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to take picture. Please try again.');
      }
    }
  };
  
  // Function to pick an image from the gallery
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0].uri;
        setCapturedImage(selectedImage);
        processQrCodeFromImage(selectedImage);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };
  
  // Process QR code from an image
  const processQrCodeFromImage = async (imageUri) => {
    try {
      setProcessingImage(true);
      
      // Use BarCodeScanner to scan the image
      const scannedCodes = await BarCodeScanner.scanFromURLAsync(imageUri);
      
      if (scannedCodes.length > 0) {
        // Process the first QR code found
        const { type, data } = scannedCodes[0];
        
        // Process the scanned QR code data
        await handleBarCodeScanned({ type, data });
      } else {
        Alert.alert('No QR Code Found', 'No valid QR code was detected in the image. Please try again with a clearer image.');
      }
    } catch (error) {
      console.error('Error processing QR code from image:', error);
      Alert.alert('Error', 'Failed to process QR code from image. Please try again.');
    } finally {
      setProcessingImage(false);
    }
  };
  
  // Generate a demo QR code for testing
  const generateDemoQRCode = () => {
    // Create a sample student data object
    const demoStudentData = {
      studentId: 'STU' + Math.floor(100000 + Math.random() * 900000),
      name: 'Demo Student',
      program: 'Computer Science'
    };
    
    // Display an alert with the demo data
    Alert.alert(
      'Demo QR Code Generated',
      `Student ID: ${demoStudentData.studentId}\nName: ${demoStudentData.name}\nProgram: ${demoStudentData.program}`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Use This Data',
          onPress: () => handleBarCodeScanned({ type: 'qr', data: JSON.stringify(demoStudentData) })
        }
      ]
    );
  };
  
  // Toggle between scan mode and capture mode
  const toggleCaptureMode = () => {
    setCaptureMode(!captureMode);
    setCapturedImage(null);
    setScanned(false);
    setDemoMode(false);
  };
  
  // Toggle demo mode
  const toggleDemoMode = () => {
    setDemoMode(!demoMode);
    setCaptureMode(false);
    setCapturedImage(null);
    setScanned(false);
  };
  
  // Generate a demo QR code scan result
  const generateDemoScan = (type = 'student') => {
    let demoData;
    
    if (type === 'student') {
      // Create demo student data
      demoData = {
        studentId: 'STU' + Math.floor(100000 + Math.random() * 900000),
        name: 'Demo Student',
        program: 'Computer Science',
        year: Math.floor(1 + Math.random() * 4)
      };
    } else if (type === 'class') {
      // Create demo class data
      demoData = {
        classId: 'CLS' + Math.floor(10000 + Math.random() * 90000),
        courseCode: 'CS' + Math.floor(100 + Math.random() * 900),
        courseName: 'Introduction to Programming',
        section: String.fromCharCode(65 + Math.floor(Math.random() * 3)), // A, B, or C
        room: 'Room ' + Math.floor(100 + Math.random() * 300),
        time: '10:00 AM - 12:00 PM'
      };
    }
    
    // Simulate a QR code scan
    handleBarCodeScanned({ 
      type: 'qr', 
      data: JSON.stringify(demoData)
    });
  };
  
  // Toggle flash
  const toggleFlash = () => {
    setFlashMode(
      flashMode === BarCodeScanner.Constants.FlashMode.torch
        ? BarCodeScanner.Constants.FlashMode.off
        : BarCodeScanner.Constants.FlashMode.torch
    );
  };

  const handleFinishScanning = () => {
    if (scannedData.length > 0) {
      // Navigate to attendance summary screen
      navigation.navigate('AttendanceSummary', {
        scannedData,
        classData
      });
    } else {
      Alert.alert(
        'No Attendance Recorded',
        'You have not scanned any student QR codes yet.',
        [
          {
            text: 'Continue Scanning',
            style: 'cancel'
          },
          {
            text: 'Exit Anyway',
            onPress: () => navigation.goBack()
          }
        ]
      );
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ImagePlaceholder 
          width="100%" 
          height="100%" 
          iconName="camera-outline" 
          iconSize={60} 
          text="Requesting camera permission..."
          style={{ backgroundColor: '#000' }}
          textStyle={{ color: '#fff', fontSize: 18 }}
          iconStyle={{ color: '#fff' }}
        />
      </View>
    );
  }
  
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <ImagePlaceholder 
          width="100%" 
          height="70%" 
          iconName="camera-off-outline" 
          iconSize={80} 
          text="Camera access is required to scan QR codes"
          style={{ backgroundColor: '#000' }}
          textStyle={{ color: '#fff', fontSize: 18 }}
          iconStyle={{ color: '#ff6b6b' }}
        />
        <View style={styles.noPermissionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.demoButton]}
            onPress={() => setDemoMode(true)}
          >
            <Ionicons name="flash-outline" size={20} color="white" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Use Demo Mode</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // Demo mode view
  if (demoMode) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Demo QR Scanner</Text>
          
          <TouchableOpacity
            style={styles.flashButton}
            onPress={toggleDemoMode}
          >
            <Ionicons name="close-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.demoContainer}>
          <Text style={styles.demoTitle}>Demo Mode</Text>
          <Text style={styles.demoDescription}>
            Your camera is not available or not working. Use demo mode to simulate QR code scanning.
          </Text>
          
          <View style={styles.demoQrContainer}>
            <ImagePlaceholder
              width={250}
              height={250}
              isQRCode={true}
              text="Demo QR Code"
              style={styles.qrPlaceholder}
            />
          </View>
          
          <View style={styles.demoButtonsContainer}>
            <TouchableOpacity 
              style={styles.scanDemoButton}
              onPress={() => generateDemoScan('student')}
            >
              <Ionicons name="person-outline" size={20} color="white" style={styles.buttonIcon} />
              <Text style={styles.scanButtonText}>Scan Student QR</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.scanDemoButton, styles.classButton]}
              onPress={() => generateDemoScan('class')}
            >
              <Ionicons name="school-outline" size={20} color="white" style={styles.buttonIcon} />
              <Text style={styles.scanButtonText}>Scan Class QR</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Text style={styles.scannedCount}>
              {scannedData.length} students scanned
            </Text>
          </View>
          
          <View style={styles.footerRight}>
            <TouchableOpacity
              style={styles.finishButton}
              onPress={handleFinishScanning}
            >
              <Text style={styles.finishButtonText}>Finish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

return (
  <View style={styles.container}>
    {/* Custom Error Modal for Invalid QR Format */}
    <Modal
      visible={showErrorModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowErrorModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.errorModalContent}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={60} color="#FF3B30" />
          </View>
          
          <Text style={styles.errorModalTitle}>INVALID QR CODE FORMAT</Text>
          
          <Text style={styles.errorModalMessage}>
            {errorMessage}
          </Text>
          
          <TouchableOpacity 
            style={styles.errorCloseButton} 
            onPress={() => setShowErrorModal(false)}
          >
            <Text style={styles.errorCloseButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    
    {/* Custom Modal for Duplicate Student Scan */}
    <Modal
      visible={showDuplicateModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowDuplicateModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.duplicateModalContent}>
          <View style={styles.duplicateIconContainer}>
            <Ionicons name="information-circle" size={60} color="#007AFF" />
          </View>
          
          <Text style={styles.duplicateModalTitle}>ALREADY SCANNED</Text>
          
          <Text style={styles.duplicateModalMessage}>
            {duplicateStudentInfo ? 
              `Student ${duplicateStudentInfo.name} (${duplicateStudentInfo.studentId}) has already been marked present.\n\nATTENDANCE ALREADY RECORDED.` : 
              'This student has already been scanned and marked present.'}
          </Text>
          
          <TouchableOpacity 
            style={styles.duplicateCloseButton} 
            onPress={() => setShowDuplicateModal(false)}
          >
            <Text style={styles.duplicateCloseButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    {!captureMode ? (
      // Live QR Scanner Mode
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
        flashMode={flashMode}
      />
    ) : (
      // Camera Capture Mode
      <>
        {capturedImage ? (
          // Show captured image
          <Image 
            source={{ uri: capturedImage }} 
            style={StyleSheet.absoluteFillObject} 
            resizeMode="contain"
          />
        ) : (
          // Show camera for taking picture with ImagePlaceholder as fallback
          <>
            <Camera
              ref={cameraRef}
              style={StyleSheet.absoluteFillObject}
              type={Camera.Constants.Type.back}
              flashMode={
                flashMode === BarCodeScanner.Constants.FlashMode.torch
                  ? Camera.Constants.FlashMode.torch
                  : Camera.Constants.FlashMode.off
              }
              onCameraReady={() => console.log('Camera ready')}
              onMountError={(error) => {
                console.error('Camera mount error:', error);
                // If camera fails to mount, the ImagePlaceholder will be visible
              }}
            />
            <View style={styles.cameraOverlay}>
              <ImagePlaceholder 
                width={250} 
                height={250} 
                iconName="qr-code-outline" 
                iconSize={80} 
                text="Position QR code in frame"
                style={styles.qrPlaceholder}
                textStyle={{ color: '#fff', fontSize: 16 }}
                iconStyle={{ color: '#fff' }}
              />
            </View>
          </>
        )}
      </>
    )}
    
    <View style={styles.overlay}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          {captureMode 
            ? (capturedImage ? 'Processing QR Code' : 'Take Picture of QR Code')
            : (classData ? `${classData.courseCode} Attendance` : 'Scan QR Code')
          }
        </Text>
        
        <TouchableOpacity
          style={styles.flashButton}
          onPress={toggleFlash}
        >
          <Ionicons 
            name={flashMode === BarCodeScanner.Constants.FlashMode.torch ? "flash" : "flash-outline"} 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>
      </View>
      
      {/* Show loading indicator when processing image */}
      {processingImage && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1B3358" />
          <Text style={styles.loadingText}>Processing QR Code...</Text>
        </View>
      )}
      
      {!processingImage && (
        <View style={styles.scanArea}>
          <View style={styles.scanFrame} />
          <Text style={styles.scanText}>
            {captureMode 
              ? (capturedImage 
                ? 'Processing QR code from image...'
                : 'Position QR code in frame and take picture')
              : 'Scan student QR code to mark attendance'
            }
          </Text>
        </View>
      )}
      
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={styles.scannedCount}>
            {scannedData.length} students scanned
          </Text>
          
          {/* Toggle between scan and capture modes */}
          <TouchableOpacity
            style={styles.modeButton}
            onPress={toggleCaptureMode}
          >
            <Ionicons 
              name={captureMode ? "scan-outline" : "camera-outline"} 
              size={24} 
              color="white" 
            />
            <Text style={styles.modeButtonText}>
              {captureMode ? "Scan Mode" : "Camera Mode"}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.footerRight}>
          {captureMode && !capturedImage && (
            <>
              {/* Button to take picture */}
              <TouchableOpacity
                style={styles.captureButton}
                onPress={takePicture}
              >
                <Ionicons name="camera" size={30} color="white" />
              </TouchableOpacity>
              
              {/* Button to pick image from gallery */}
              <TouchableOpacity
                style={styles.galleryButton}
                onPress={pickImage}
              >
                <Ionicons name="images-outline" size={24} color="white" />
              </TouchableOpacity>
            </>
          )}
          
          {capturedImage && (
            // Button to retake picture
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={() => setCapturedImage(null)}
            >
              <Ionicons name="refresh-outline" size={24} color="white" />
              <Text style={styles.buttonText}>Retake</Text>
            </TouchableOpacity>
          )}
          
          {!captureMode && (
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.demoButton}
                onPress={generateDemoQRCode}
              >
                <Ionicons name="qr-code-outline" size={20} color="white" />
                <Text style={styles.buttonText}>Demo QR</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.finishButton}
                onPress={handleFinishScanning}
              >
                <Text style={styles.finishButtonText}>Finish</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  </View>
);
};

const styles = StyleSheet.create({
  // Custom Error Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorModalContent: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF3B30',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  errorIconContainer: {
    marginBottom: 15,
  },
  errorModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 15,
    textAlign: 'center',
  },
  errorModalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  errorCloseButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 10,
  },
  errorCloseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  // Duplicate Scan Modal Styles
  duplicateModalContent: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  duplicateIconContainer: {
    marginBottom: 15,
  },
  duplicateModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  duplicateModalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  duplicateCloseButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 10,
  },
  duplicateCloseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  qrPlaceholder: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 20,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  flashButton: {
    padding: 10,
  },
  scanArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#1B3358',
    backgroundColor: 'transparent',
    borderRadius: 20,
  },
  scanText: {
    color: 'white',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  footer: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scannedCount: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 51, 88, 0.7)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modeButtonText: {
    color: 'white',
    marginLeft: 5,
    fontSize: 14,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1B3358',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(27, 51, 88, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 51, 88, 0.7)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 15,
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 160,
  },
  finishButton: {
    backgroundColor: '#1B3358',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  demoButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  finishButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  text: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    margin: 20,
  },
  button: {
    backgroundColor: '#1B3358',
    padding: 15,
    borderRadius: 10,
    margin: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default QrScanner;
