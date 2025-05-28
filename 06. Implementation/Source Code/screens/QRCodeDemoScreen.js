import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import QRCodeGenerator from '../components/QRCodeGenerator';
import QRCodeDisplay from '../components/QRCodeDisplay';
import ImagePlaceholder from '../components/ImagePlaceholder';

/**
 * A demonstration screen showing how to use QR codes in both web and mobile
 * This screen demonstrates both generating and scanning QR codes
 */
const QRCodeDemoScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('generate'); // 'generate' or 'scan'
  const [demoStudentData, setDemoStudentData] = useState({
    studentId: 'STU123456',
    name: 'John Doe',
    program: 'Computer Science'
  });

  // Navigate to QR scanner
  const navigateToScanner = () => {
    navigation.navigate('QrScanner', {
      classData: {
        id: 'CLASS001',
        courseCode: 'CS101',
        title: 'Introduction to Programming'
      }
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1B3358" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR Code Demo</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'generate' && styles.activeTab]}
          onPress={() => setActiveTab('generate')}
        >
          <Ionicons 
            name="qr-code-outline" 
            size={20} 
            color={activeTab === 'generate' ? '#fff' : '#1B3358'} 
          />
          <Text style={[styles.tabText, activeTab === 'generate' && styles.activeTabText]}>
            Generate QR
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'scan' && styles.activeTab]}
          onPress={() => setActiveTab('scan')}
        >
          <Ionicons 
            name="scan-outline" 
            size={20} 
            color={activeTab === 'scan' ? '#fff' : '#1B3358'} 
          />
          <Text style={[styles.tabText, activeTab === 'scan' && styles.activeTabText]}>
            Scan QR
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'generate' ? (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Student QR Code</Text>
          <Text style={styles.description}>
            This QR code contains your student information and can be used to mark your attendance.
          </Text>
          
          <View style={styles.qrDisplayContainer}>
            <QRCodeDisplay 
              value={JSON.stringify(demoStudentData)}
              title="Your Attendance QR Code"
              size={200}
              showActions={true}
            />
          </View>
          
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>How to use:</Text>
            <Text style={styles.infoText}>
              1. Show this QR code to your lecturer when prompted
            </Text>
            <Text style={styles.infoText}>
              2. Your attendance will be automatically recorded
            </Text>
            <Text style={styles.infoText}>
              3. You can save or share this QR code for quick access
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Scan Student QR Codes</Text>
          <Text style={styles.description}>
            Use the scanner to mark student attendance by scanning their QR codes.
          </Text>
          
          <View style={styles.scannerPreview}>
            <ImagePlaceholder
              width={Platform.OS === 'web' ? 300 : '90%'}
              height={300}
              iconName="scan-outline"
              iconSize={80}
              text="QR Scanner Preview"
              style={styles.scannerPlaceholder}
              textStyle={{ color: '#fff', fontSize: 18 }}
              iconStyle={{ color: '#fff' }}
            />
          </View>
          
          <TouchableOpacity 
            style={styles.scanButton}
            onPress={navigateToScanner}
          >
            <Ionicons name="camera-outline" size={24} color="#fff" />
            <Text style={styles.scanButtonText}>Open QR Scanner</Text>
          </TouchableOpacity>
          
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>Scanner Features:</Text>
            <Text style={styles.infoText}>
              • Live scanning mode for real-time attendance
            </Text>
            <Text style={styles.infoText}>
              • Camera mode to take pictures of QR codes
            </Text>
            <Text style={styles.infoText}>
              • Gallery option to select saved QR code images
            </Text>
            <Text style={styles.infoText}>
              • Works on both mobile devices and web browsers
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 50,
    paddingBottom: 20,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B3358',
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#1B3358',
  },
  tabText: {
    marginLeft: 5,
    fontSize: 16,
    fontWeight: '500',
    color: '#1B3358',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1B3358',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  qrDisplayContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  scannerPreview: {
    alignItems: 'center',
    marginVertical: 20,
  },
  scannerPlaceholder: {
    backgroundColor: 'rgba(27, 51, 88, 0.8)',
    borderRadius: 15,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B3358',
    borderRadius: 10,
    paddingVertical: 15,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  infoContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginTop: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B3358',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 15,
    color: '#555',
    marginBottom: 8,
    lineHeight: 22,
  },
});

export default QRCodeDemoScreen;
