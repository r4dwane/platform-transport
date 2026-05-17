import { Modal, View, ScrollView, TouchableOpacity } from "react-native";
import { Colors } from "@/constants/colors";
 
interface BottomSheetProps {
  children: React.ReactNode;
  visible: boolean;
  onClose: () => void;
}
 
export const BottomSheet = ({ children, visible, onClose }: BottomSheetProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
          onPress={onClose}
        />
        <View
          style={{
            backgroundColor: Colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            maxHeight: "90%",
          }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              backgroundColor: Colors.border,
              borderRadius: 2,
              alignSelf: "center",
              marginBottom: 16,
            }}
          />
          <ScrollView showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};