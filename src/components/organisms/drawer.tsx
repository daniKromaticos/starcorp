/**
 * Drawer — Lateral panel que se desliza desde el borde izquierdo
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Text } from '@/src/tw';
import { tokens } from '@/src/theme/tokens';
import { Icon, IconName } from '@/src/components/atoms';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_WIDTH = 280;

export interface DrawerMenuItem {
  id: string;
  label: string;
  icon: IconName;
}

export interface DrawerProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  activeSection?: string;
  menuItems?: DrawerMenuItem[];
  onItemPress?: (id: string) => void;
}

export function Drawer({
  visible,
  onClose,
  title,
  activeSection = 'dashboard',
  menuItems,
  onItemPress,
}: DrawerProps) {
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  useEffect(() => {
    isAnimating.current = true;
    if (visible) {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isAnimating.current = false;
      });
    }
  }, [visible, translateX, opacity]);

  const defaultMenuItems: DrawerMenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'home' },
    { id: 'explore', label: 'Explorar', icon: 'search' },
    { id: 'clients', label: 'Clientes', icon: 'people' },
    { id: 'settings', label: 'Configuración', icon: 'gear' },
  ];

  const items = menuItems || defaultMenuItems;

  if (!visible && !isAnimating.current) {
    return null;
  }

  return (
    <View style={[styles.container, { pointerEvents: visible ? 'auto' : 'none' }]}>
      <Animated.View style={[styles.overlay, { opacity }]}>
        <TouchableOpacity
          style={styles.overlayTouch}
          onPress={onClose}
          activeOpacity={1}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{title || 'Menú'}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="x" size={16} color={tokens.color.ink.secondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.menu}>
          {items.map((item) => {
            const isActive = item.id === activeSection;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  isActive && styles.menuItemActive,
                ]}
                onPress={() => {
                  onItemPress?.(item.id);
                  onClose();
                }}
              >
                <Icon
                  name={item.icon}
                  size={20}
                  color={isActive ? tokens.color.accent.primary : tokens.color.ink.secondary}
                />
                <Text
                  style={[
                    styles.menuLabel,
                    isActive && styles.menuLabelActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTouch: {
    flex: 1,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: DRAWER_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: tokens.color.background.primary,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + tokens.spacing.lg : tokens.spacing['3xl'],
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.border.default,
  },
  title: {
    ...tokens.typography.h3,
    color: tokens.color.ink.primary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.color.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: {
    paddingTop: tokens.spacing.lg,
    paddingHorizontal: tokens.spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.spacing.xs,
    gap: tokens.spacing.md,
  },
  menuItemActive: {
    backgroundColor: tokens.color.accent.muted,
  },
  menuLabel: {
    ...tokens.typography.body,
    color: tokens.color.ink.secondary,
  },
  menuLabelActive: {
    color: tokens.color.accent.primary,
    fontWeight: '600',
  },
});