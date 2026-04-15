import { useRef, useCallback } from "react";
import RNBottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Colors } from "@/constants/colors";
 
interface BottomSheetProps {
  children: React.ReactNode;
  snapPoints?: string[];
  onClose?: () => void;
  sheetRef: React.RefObject<RNBottomSheet>;
}
 
export const BottomSheet = ({
  children,
  snapPoints = ["50%", "90%"],
  onClose,
  sheetRef,
}: BottomSheetProps) => {
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );
 
  return (
    <RNBottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: Colors.border, width: 40 }}
      backgroundStyle={{ backgroundColor: Colors.surface, borderRadius: 24 }}
    >
      <BottomSheetView style={{ flex: 1, padding: 20 }}>
        {children}
      </BottomSheetView>
    </RNBottomSheet>
  );
};