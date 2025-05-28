import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import QRCodeGenerator from './QRCodeGenerator';

/**
 * A component to display QR codes with options to save and share
 * Works on both web and mobile platforms
 */
const QRCodeDisplay = ({
  value,
  title = 'Scan this QR Code',
  size = 200,
  showActions = true,
  containerStyle = {},
  onClose,
}) => {
  const [qrRef, setQrRef] = useState(null);
  const [saved, setSaved] = useState(false);

  // Function to save QR code to device (mobile only)
  const saveQRCode = async () => {
    if (Platform.OS === 'web') {
      // Web implementation would go here
      // For web, we'd typically use canvas to export as image
      alert('Saving QR codes is not supported in web version');
      return;
    }

    try {
      // Request permissions first
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status !== 'granted') {
        alert('Sorry, we need media library permissions to save the QR code');
        return;
      }

      // Create a temporary file URI for the QR code
      const fileUri = `${FileSystem.cacheDirectory}qrcode-${Date.now()}.png`;
      
      // For react-native-qrcode-svg, we'd use the toDataURL method
      // This is a placeholder - actual implementation depends on the QR library
      if (qrRef && qrRef.toDataURL) {
        qrRef.toDataURL(async (dataURL) => {
          try {
            const base64Data = dataURL.split(',')[1];
            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            const asset = await MediaLibrary.createAssetAsync(fileUri);
            await MediaLibrary.createAlbumAsync('QR Codes', asset, false);
            
            setSaved(true);
            alert('QR Code saved to your gallery');
          } catch (error) {
            console.error('Error saving QR code:', error);
            alert('Failed to save QR code');
          }
        });
      }
    } catch (error) {
      console.error('Error saving QR code:', error);
      alert('Failed to save QR code');
    }
  };

  // Function to share QR code
  const shareQRCode = async () => {
    if (Platform.OS === 'web') {
      // Web sharing API
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'QR Code',
            text: 'Check out this QR Code',
            // url: qrCodeUrl, // Would need to be generated
          });
        } catch (error) {
          console.error('Error sharing:', error);
        }
      } else {
        alert('Web Share API not supported in this browser');
      }
      return;
    }

    try {
      // For mobile platforms
      const fileUri = `${FileSystem.cacheDirectory}qrcode-${Date.now()}.png`;
      
      if (qrRef && qrRef.toDataURL) {
        qrRef.toDataURL(async (dataURL) => {
          try {
            const base64Data = dataURL.split(',')[1];
            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            // Check if sharing is available
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
              await Sharing.shareAsync(fileUri);
            } else {
              alert('Sharing is not available on this device');
            }
          } catch (error) {
            console.error('Error sharing QR code:', error);
            alert('Failed to share QR code');
          }
        });
      }
    } catch (error) {
      console.error('Error sharing QR code:', error);
      alert('Failed to share QR code');
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
      )}
      
      <Text style={styles.title}>{title}</Text>
      
      <View style={styles.qrContainer}>
        <QRCodeGenerator
          value={value}
          size={size}
          getRef={(ref) => setQrRef(ref)}
        />
      </View>
      
      {showActions && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, saved && styles.actionButtonDisabled]} 
            onPress={saveQRCode}
            disabled={saved}
          >
            <Ionicons name="save-outline" size={22} color={saved ? "#999" : "#1B3358"} />
            <Text style={[styles.actionText, saved && styles.actionTextDisabled]}>
              {saved ? "Saved" : "Save"}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={shareQRCode}>
            <Ionicons name="share-social-outline" size={22} color="#1B3358" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <Text style={styles.instructions}>
        Present this QR code to your lecturer to mark your attendance
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 350,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1B3358',
  },
  qrContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  actionButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  actionText: {
    marginLeft: 5,
    color: '#1B3358',
    fontWeight: '500',
  },
  actionTextDisabled: {
    color: '#999',
  },
  instructions: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
});

export default QRCodeDisplay;
