import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, radii } from '@/lib/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}

export function TextField({ label, value, onChangeText, placeholder }: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.group}>
      <Text variant="small" color="muted">{label}</Text>
      <View style={[styles.box, focused && styles.focused]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.input}
        />
        {value.length > 0 ? (
          <Pressable accessibilityLabel="Clear" hitSlop={10} onPress={() => onChangeText('')}>
            <Icon name="close" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  icon?: IconName;
}

// Selector inline: se despliega bajo el campo, sin modales (funciona igual en web y móvil).
export function SelectField({ label, value, options, onChange, icon = 'calendar' }: SelectFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.group}>
      <Text variant="small" color="muted">{label}</Text>
      <Pressable accessibilityRole="button" style={[styles.box, open && styles.focused]} onPress={() => setOpen((v) => !v)}>
        <Icon name={icon} size={18} />
        <Text variant="body" style={styles.flex}>{value}</Text>
        <Icon name="chevronDown" size={18} color={colors.muted} />
      </Pressable>
      {open ? (
        <View style={styles.menu}>
          {options.map((option) => (
            <Pressable
              key={option}
              style={[styles.option, option === value && { backgroundColor: colors.mintSoft }]}
              onPress={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              <Text variant="body">{option}</Text>
              {option === value ? <Icon name="check" size={16} /> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

interface CheckboxProps {
  label: string;
  caption?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Checkbox({ label, caption, checked, onChange }: CheckboxProps) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => onChange(!checked)} style={styles.checkRow}>
      <View style={[styles.checkBox, checked && styles.checkBoxOn]}>
        {checked ? <Icon name="check" size={16} color={colors.white} strokeWidth={3} /> : null}
      </View>
      <View style={styles.flex}>
        <Text variant="bodyStrong">{label}</Text>
        {caption ? <Text variant="small" color="muted">{caption}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkBox: {
    width: 26,
    height: 26,
    marginTop: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  checkBoxOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  group: { gap: 6 },
  flex: { flex: 1 },
  box: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  focused: { borderColor: colors.forest },
  input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 12, outlineStyle: 'none' } as never,
  menu: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 6,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: radii.sm,
  },
});
