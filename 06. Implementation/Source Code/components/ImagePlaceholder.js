import React from 'react';
import { View, Text, StyleSheet, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * A reusable image placeholder component that works on both web and mobile
 * Can also display QR code images
 * 
 * @param {Object} props
 * @param {number} props.width - Width of the placeholder
 * @param {number} props.height - Height of the placeholder
 * @param {string} props.iconName - Ionicons icon name to display
 * @param {number} props.iconSize - Size of the icon
 * @param {string} props.text - Text to display below the icon
 * @param {Object} props.style - Additional styles for the container
 * @param {Object} props.textStyle - Additional styles for the text
 * @param {Object} props.iconStyle - Additional styles for the icon
 * @param {string} props.imageSource - Optional image source URI to display instead of icon
 * @param {boolean} props.isQRCode - Whether the image is a QR code
 */
const ImagePlaceholder = ({
  width = 200,
  height = 200,
  iconName = 'image-outline',
  iconSize = 50,
  text = 'Image Placeholder',
  style = {},
  textStyle = {},
  iconStyle = {},
  imageSource = null,
  isQRCode = false,
}) => {
  // Sample QR code image for demonstration when no imageSource is provided but isQRCode is true
  const sampleQRCodeBase64 = 'data:image/png;base64,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';
  
  return (
    <View
      style={[
        styles.container,
        { width, height },
        style,
        Platform.OS === 'web' ? styles.webShadow : styles.mobileShadow
      ]}
    >
      {imageSource ? (
        // Display the provided image
        <Image
          source={{ uri: imageSource }}
          style={[styles.image, isQRCode && styles.qrCode]}
          resizeMode="contain"
        />
      ) : isQRCode ? (
        // Display a sample QR code if isQRCode is true but no imageSource
        <Image
          source={{ uri: sampleQRCodeBase64 }}
          style={styles.qrCode}
          resizeMode="contain"
        />
      ) : (
        // Display the icon if no image source is provided
        <Ionicons
          name={iconName}
          size={iconSize}
          color="#1B3358"
          style={[styles.icon, iconStyle]}
        />
      )}
      {text ? (
        <Text style={[styles.text, textStyle]}>{text}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    overflow: 'hidden',
  },
  webShadow: {
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
  },
  mobileShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  icon: {
    marginBottom: 10,
  },
  text: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  image: {
    width: '80%',
    height: '80%',
    marginBottom: 10,
  },
  qrCode: {
    width: '80%',
    height: '80%',
    marginBottom: 10,
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
});

export default ImagePlaceholder;
