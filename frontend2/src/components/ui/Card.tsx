import { View, ViewProps } from "react-native";
import { Colors } from "@/constants/colors";
 
interface CardProps extends ViewProps {
  children: React.ReactNode;
  padding?: number;
}
 
export const Card = ({ children, padding = 16, style, ...props }: CardProps) => {
  return (
    <View
      style={[
        {
          backgroundColor: Colors.surface,
          borderRadius: 16,
          padding,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
          borderWidth: 1,
          borderColor: Colors.border,
        },
        style as any,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};
 
 