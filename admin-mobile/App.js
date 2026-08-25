import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View, TouchableOpacity, Text } from "react-native";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { usePushRegistration } from "./src/context/usePushRegistration";
import LoginScreen from "./src/screens/LoginScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import OrdersScreen from "./src/screens/OrdersScreen";
import InventoryScreen from "./src/screens/InventoryScreen";
import AddProductScreen from "./src/screens/AddProductScreen";
import MoreScreen from "./src/screens/MoreScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function InventoryStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="InventoryList"
        component={InventoryScreen}
        options={({ navigation }) => ({
          title: "Inventory",
          headerRight: () => (
            <TouchableOpacity onPress={() => navigation.navigate("AddProduct")}>
              <Text style={{ color: "#1B7A43", fontWeight: "700" }}>+ Add</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen name="AddProduct" component={AddProductScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: "#1B7A43" }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Inventory" component={InventoryStack} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();
  usePushRegistration();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#101913" }}>
        <ActivityIndicator color="#1B7A43" />
      </View>
    );
  }

  return <NavigationContainer>{user ? <MainTabs /> : <LoginScreen />}</NavigationContainer>;
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}
