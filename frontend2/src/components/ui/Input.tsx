import { View, Text, TextInput, TextInputProps } from "react-native";
import { Colors } from "@/constants/colors";
 
interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
 
export const Input = ({ label, error, leftIcon, rightIcon, style, ...props }: InputProps) => {
  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.textSecondary, marginBottom: 6 }}>
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: Colors.surface,
          borderWidth: 1.5,
          borderColor: error ? Colors.error : Colors.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          gap: 10,
        }}
      >
        {leftIcon}
        <TextInput
          style={[
            {
              flex: 1,
              paddingVertical: 14,
              fontSize: 15,
              color: Colors.textPrimary,
            },
            style as any,
          ]}
          placeholderTextColor={Colors.textMuted}
          {...props}
        />
        {rightIcon}
      </View>
      {error && (
        <Text style={{ fontSize: 12, color: Colors.error, marginTop: 4 }}>{error}</Text>
      )}
    </View>
  );
};