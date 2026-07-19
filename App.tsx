import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './src/HomeScreen';
import AddScreen from './src/AddScreen';

class ErrorBoundary extends React.Component<any, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, padding: 40, backgroundColor: '#f00', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>APP CRASHED!</Text>
          <ScrollView style={{ marginTop: 20 }}>
            <Text style={{ color: '#fff' }}>{String(this.state.error)}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const Stack = createStackNavigator();

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Ana" component={HomeScreen} />
              <Stack.Screen name="Ekle" component={AddScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}