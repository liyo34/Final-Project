import React, { useState } from 'react';
import { View, StyleSheet, Platform, Text, TouchableOpacity, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebQRScanner from '../components/WebQRScanner';
import { Ionicons } from '@expo/vector-icons';
import ImagePlaceholder from '../components/ImagePlaceholder';

/**
 * A screen that displays the WebQRScanner in a layout similar to the reference image
 */
const WebQRScannerScreen = ({ navigation }) => {
  const [scanResult, setScanResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showDemoOptions, setShowDemoOptions] = useState(false);

  const handleScan = (result) => {
    setScanResult(result);
    setShowResultModal(true);
  };

  const closeModal = () => {
    setShowResultModal(false);
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
    } else {
      // Generic demo data
      demoData = {
        id: 'DEMO' + Math.floor(10000 + Math.random() * 90000),
        timestamp: new Date().toISOString()
      };
    }
    
    // Simulate a QR code scan
    handleScan({
      type: 'qr',
      data: JSON.stringify(demoData)
    });
    
    setShowDemoOptions(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button and demo mode toggle */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>QR Scanner</Text>
        
        <TouchableOpacity 
          style={[styles.demoButton, isDemoMode && styles.demoButtonActive]}
          onPress={() => setIsDemoMode(!isDemoMode)}
        >
          <Ionicons 
            name={isDemoMode ? "flash" : "flash-outline"} 
            size={20} 
            color={isDemoMode ? "#fff" : "#000"} 
          />
          <Text style={[styles.demoButtonText, isDemoMode && styles.demoButtonTextActive]}>
            Demo Mode {isDemoMode ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {isDemoMode ? (
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
              style={styles.scanButton}
              onPress={() => generateDemoScan('student')}
            >
              <Ionicons name="person-outline" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.scanButtonText}>Scan Student QR</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.scanButton, styles.classButton]}
              onPress={() => generateDemoScan('class')}
            >
              <Ionicons name="school-outline" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.scanButtonText}>Scan Class QR</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.webContainer}>
          <WebQRScanner onScan={handleScan} />
          
          {/* Demo Mode Prompt */}
          <View style={styles.demoPrompt}>
            <Text style={styles.demoPromptText}>Camera not working?</Text>
            <TouchableOpacity onPress={() => setIsDemoMode(true)}>
              <Text style={styles.demoPromptLink}>Try Demo Mode</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Result Modal */}
      <Modal
        visible={showResultModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>QR Code Scanned</Text>
            
            {scanResult && (
              <>
                <Text style={styles.resultLabel}>Type:</Text>
                <Text style={styles.resultValue}>{scanResult.type}</Text>
                
                <Text style={styles.resultLabel}>Data:</Text>
                <Text style={styles.resultValue}>
                  {typeof scanResult.data === 'string' && scanResult.data.startsWith('{') 
                    ? JSON.stringify(JSON.parse(scanResult.data), null, 2) 
                    : scanResult.data}
                </Text>
              </>
            )}
            
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 16 : 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  demoButtonActive: {
    backgroundColor: '#4CAF50',
  },
  demoButtonText: {
    fontSize: 14,
    marginLeft: 4,
    color: '#000',
  },
  demoButtonTextActive: {
    color: '#fff',
  },
  webContainer: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 800 : '100%',
    alignSelf: 'center',
    backgroundColor: '#fff',
    position: 'relative',
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
      },
    }),
  },
  demoPrompt: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    alignItems: 'center',
  },
  demoPromptText: {
    color: '#fff',
    fontSize: 14,
  },
  demoPromptLink: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5,
  },
  demoContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  demoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1B3358',
  },
  demoDescription: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
    maxWidth: 500,
  },
  demoQrContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  qrPlaceholder: {
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#fff',
  },
  demoButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 20,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B3358',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    margin: 10,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 3,
      },
    }),
  },
  classButton: {
    backgroundColor: '#4CAF50',
  },
  buttonIcon: {
    marginRight: 8,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
      },
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  resultValue: {
    fontSize: 16,
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    width: '100%',
  },
  closeButton: {
    backgroundColor: '#000',
    borderRadius: 5,
    padding: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WebQRScannerScreen;
