import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const COLORS = {
  // Sky blue theme from iOS app
  purple0: '#AFECFF', // Background (rgb(0.686, 0.925, 1.000))
  purple1: '#00687B', // Primary sky blue (rgb(0.000, 0.408, 0.482))
  purple2: '#005568',
  purple3: '#4DA6B8',
  bgColor: '#AFECFF',
  titleColor: '#1F2937',
  white: '#FFFFFF',
  black: '#000000',
  buttonColor: '#00687B',
  errorCode: '#FE504E',
  red: '#FE504E',
  postTitleColor: '#00687B',
  lightGrayColor: '#D9D9D9',
  textFieldBg: '#FFFFFF',
  textColor: '#000000',
};

export const SIZES = {
  screenWidth: SCREEN_WIDTH,
  iconAppMarginTop: 60,
  defaultTextFieldHeight: 50,
  cornerRadius12: 12,
  cornerRadius16: 16,
  cornerRadius20: 20,
  spacingXXS: 4,
  spacingXS: 6,
  spacingS: 8,
  spacingM: 16,
  spacingL: 24,
  spacingXL: 32,
  spacingXXL: 40,
  spacing64: 64,
  spacingLarge: 48,
  buttonHeight: 60,
  buttonMarginBottom: 40,
};

export const FONTS = {
  regular: 'System',
  italic: 'System',
  bold: 'System',
  semiBold: 'System',
};
