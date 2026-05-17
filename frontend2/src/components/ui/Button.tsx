import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from "react-native";
import { Colors } from "@/constants/colors";
 
interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}
 
export const Button = ({
  title,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  style,
  ...props
}: ButtonProps) => {
  const bgColors = {
    primary:   Colors.primary,
    secondary: Colors.secondary,
    outline:   "transparent",
    ghost:     "transparent",
    danger:    Colors.error,
  };
 
  const textColors = {
    primary:   "#fff",
    secondary: "#fff",
    outline:   Colors.primary,
    ghost:     Colors.textSecondary,
    danger:    "#fff",
  };
 
  const paddings = { sm: 8, md: 14, lg: 18 };
  const fontSizes = { sm: 13, md: 15, lg: 17 };
 
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || isLoading}
      style={[
        {
          backgroundColor: bgColors[variant],
          paddingVertical: paddings[size],
          paddingHorizontal: paddings[size] * 2,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          borderWidth: variant === "outline" ? 1.5 : 0,
          borderColor: variant === "outline" ? Colors.primary : "transparent",
          opacity: disabled || isLoading ? 0.5 : 1,
        },
        style as any,
      ]}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={textColors[variant]} />
      ) : (
        <Text style={{ color: textColors[variant], fontSize: fontSizes[size], fontWeight: "600" }}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};
 