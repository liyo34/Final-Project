import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Ionicons } from '@expo/vector-icons';

/**
 * A simple QR code scanner web interface that matches the design shown in the image
 */
const WebQRScanner = ({ onScan, onClose }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [activeTab, setActiveTab] = useState('scan'); // 'scan', 'create', 'about', 'contact'
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    if (scanned) return;
    setScanned(true);
    if (onScan) {
      onScan({ type, data });
    } else {
      alert(`Bar code with type ${type} and data ${data} has been scanned!`);
    }
    setTimeout(() => setScanned(false), 2000);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        // Process photo for QR code
        console.log('Photo taken:', photo.uri);
      } catch (error) {
        console.error('Error taking picture:', error);
      }
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'scan':
        return (
          <View style={styles.scannerContainer}>
            {hasPermission === null ? (
              <Text style={styles.text}>Requesting camera permission...</Text>
            ) : hasPermission === false ? (
              <Text style={styles.text}>No access to camera</Text>
            ) : (
              <Camera
                ref={cameraRef}
                style={styles.camera}
                type={Camera.Constants.Type.back}
                onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
                barCodeScannerSettings={{
                  barCodeTypes: [BarCodeScanner.Constants.BarCodeType.qr],
                }}
              />
            )}
          </View>
        );
      case 'create':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.title}>Create QR Code</Text>
            <Text style={styles.description}>
              This feature will be available soon.
            </Text>
          </View>
        );
      case 'about':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.title}>About</Text>
            <Text style={styles.description}>
              This is a simple QR code scanner that works on both web and mobile platforms.
            </Text>
          </View>
        );
      case 'contact':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.title}>Contact</Text>
            <Text style={styles.description}>
              For support or inquiries, please contact us.
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>QR Code scanner</Text>
        
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'scan' && styles.activeTab]}
            onPress={() => setActiveTab('scan')}
          >
            <Text style={styles.tabText}>Scan</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'create' && styles.activeTab]}
            onPress={() => setActiveTab('create')}
          >
            <Text style={styles.tabText}>Create</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'about' && styles.activeTab]}
            onPress={() => setActiveTab('about')}
          >
            <Text style={styles.tabText}>About</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'contact' && styles.activeTab]}
            onPress={() => setActiveTab('contact')}
          >
            <Text style={styles.tabText}>Contact</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {renderContent()}
      </View>

      {activeTab === 'scan' && (
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.cameraButton} onPress={() => {}}>
            <Ionicons name="videocam" size={24} color="#000" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.cameraButton} onPress={takePicture}>
            <Ionicons name="camera" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    width: '100%',
    height: '100%',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    width: '100%',
    justifyContent: 'center',
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginHorizontal: 5,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  scannerContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    width: '100%',
    height: '100%',
    maxWidth: 500,
    maxHeight: 500,
    borderWidth: 1,
    borderColor: '#000',
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 20,
  },
  cameraButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
  text: {
    fontSize: 16,
    color: '#666',
  },
});

export default WebQRScanner;
