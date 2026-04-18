import { View } from "react-native";
import { useImperativeHandle, forwardRef } from "react";

export const BottomSheet = forwardRef(({ children }: any, ref: any) => {
  useImperativeHandle(ref, () => ({
    expand: () => {},
    close: () => {},
  }));
  return <View style={{ display: "none" }}>{children}</View>;
});