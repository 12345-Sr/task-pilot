import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { useAppStore } from '../store';
import { t } from '../i18n';

interface ConfirmDialogProps {
  visible: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  confirmColor = colors.danger,
  onConfirm,
  onCancel,
}) => {
  const { language } = useAppStore();
  const dialogTitle = title || t(language, 'delete_confirm_title');
  const dialogMessage = message || t(language, 'delete_confirm_msg');
  const dialogConfirm = confirmText || t(language, 'confirm_yes_delete');
  const dialogCancel = cancelText || t(language, 'cancel');
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{dialogTitle}</Text>
          <Text style={styles.message}>{dialogMessage}</Text>
          <View style={styles.btnRow}>
            <TouchableOpacity activeOpacity={0.8} style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>{dialogCancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} style={styles.confirmBtn} onPress={onConfirm}>
              <Text style={styles.confirmText}>{dialogConfirm}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18, 51, 91, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.floating,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryText,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: colors.secondaryText,
    lineHeight: 20,
    marginBottom: 20,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.secondaryText,
  },
  confirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.importantRed,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
});

export default ConfirmDialog;
