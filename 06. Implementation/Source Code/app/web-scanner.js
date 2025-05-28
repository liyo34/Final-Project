import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ImagePlaceholder from '../components/ImagePlaceholder';

const WebQRScannerPage = () => {
  const [activeTab, setActiveTab] = React.useState('scan');
  const [scanned, setScanned] = React.useState(false);
  const [showDemo, setShowDemo] = React.useState(false);

  // Function to simulate scanning a QR code
  const handleDemoScan = () => {
    if (scanned) return;
    setScanned(true);
    
    // Create demo student data
    const demoData = {
      studentId: 'STU' + Math.floor(100000 + Math.random() * 900000),
      name: 'Demo Student',
      program: 'Computer Science'
    };
    
    alert(`QR Code Scanned!\nStudent ID: ${demoData.studentId}\nName: ${demoData.name}\nProgram: ${demoData.program}`);
    setTimeout(() => setScanned(false), 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ 
        headerShown: false,
      }} />
      
      <View style={styles.content}>
        <Text style={styles.title}>QR Code scanner</Text>
        
        <View style={styles.tabsContainer}>
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
        
        <View style={styles.scannerContainer}>
          {activeTab === 'scan' ? (
            <>
              <View style={styles.qrScannerFrame}>
                {showDemo ? (
                  <ImagePlaceholder
                    width={300}
                    height={300}
                    isQRCode={true}
                    text="Demo QR Code"
                    style={styles.qrPlaceholder}
                  />
                ) : (
                  <View style={styles.scannerBox}>
                    <View style={styles.scannerContent}>
                      <Ionicons name="scan-outline" size={80} color="#ccc" />
                      <Text style={styles.scannerText}>Position QR code in this area</Text>
                    </View>
                  </View>
                )}
              </View>
              
              <View style={styles.cameraControls}>
                <TouchableOpacity 
                  style={styles.cameraButton}
                  onPress={() => setShowDemo(!showDemo)}
                >
                  <Ionicons name="qr-code-outline" size={24} color="#000" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.cameraButton, styles.primaryButton]}
                  onPress={handleDemoScan}
                >
                  <Ionicons name="camera" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </>
          ) : activeTab === 'create' ? (
            <View style={styles.tabContent}>
              <ImagePlaceholder
                width={250}
                height={250}
                iconName="create-outline"
                iconSize={60}
                text="Create QR Code feature coming soon"
              />
            </View>
          ) : activeTab === 'about' ? (
            <View style={styles.tabContent}>
              <Text style={styles.tabContentText}>About this QR Scanner</Text>
              <Text style={styles.description}>
                This is a simple QR code scanner that works on both web and mobile platforms.
                It allows you to quickly scan QR codes for attendance tracking.
              </Text>
            </View>
          ) : (
            <View style={styles.tabContent}>
              <Text style={styles.tabContentText}>Contact Us</Text>
              <Text style={styles.description}>
                For support or inquiries, please contact us at support@example.com
              </Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#000',
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    width: '100%',
    justifyContent: 'center',
    marginBottom: 20,
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
    color: '#333',
  },
  scannerContainer: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  qrScannerFrame: {
    width: Platform.OS === 'web' ? 500 : '100%',
    height: Platform.OS === 'web' ? 500 : 400,
    maxWidth: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  scannerBox: {
    width: 300,
    height: 300,
    borderWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  scannerContent: {
    alignItems: 'center',
    padding: 20,
  },
  scannerText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  qrPlaceholder: {
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#fff',
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
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
  primaryButton: {
    backgroundColor: '#000',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    width: '100%',
    maxWidth: 500,
  },
  tabContentText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 24,
    maxWidth: 600,
    marginTop: 10,
  },
});

export default WebQRScannerPage;
