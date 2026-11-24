import { createContext, forwardRef, useContext } from 'react';
import { StyleSheet, Text as NativeText, TextInput as NativeTextInput } from 'react-native';

export const appFonts = {
  'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
  'Poppins-Medium': require('../assets/fonts/Poppins-Medium.ttf'),
  'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
  'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
  'Poppins-ExtraBold': require('../assets/fonts/Poppins-ExtraBold.ttf'),
  'Poppins-Black': require('../assets/fonts/Poppins-Black.ttf')
};

const families = { 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
const WeightContext = createContext('400');

export function resolveTypography(style, inheritedWeight = '400') {
  const flat = StyleSheet.flatten(style) || {};
  const weight = flat.fontWeight || inheritedWeight;
  const number = weight === 'bold' ? 700 : weight === 'normal' ? 400 : Number(weight);
  return {
    weight,
    // Each native font file is a distinct face; avoid synthetic bold on Android.
    font: { fontFamily: flat.fontFamily || `Poppins-${families[number] || 'Regular'}`, fontWeight: 'normal' }
  };
}

export const Text = forwardRef(function Text({ style, children, ...props }, ref) {
  const inheritedWeight = useContext(WeightContext);
  const { weight, font } = resolveTypography(style, inheritedWeight);
  return <WeightContext.Provider value={weight}><NativeText ref={ref} {...props} style={[style, font]}>{children}</NativeText></WeightContext.Provider>;
});

export const TextInput = forwardRef(function TextInput({ style, ...props }, ref) {
  return <NativeTextInput ref={ref} {...props} style={[style, resolveTypography(style).font]} />;
});
