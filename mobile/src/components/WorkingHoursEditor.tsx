/**
 * WorkingHoursEditor Component
 * Complex editor for staff working hours
 * Day-by-day schedule with time pickers
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WorkingHours, WorkingHoursDay } from '../types/staff';

interface WorkingHoursEditorProps {
  workingHours: WorkingHours;
  onChange: (hours: WorkingHours) => void;
  disabled?: boolean;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const PRESET_TIMES = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00',
];

const WorkingHoursEditor: React.FC<WorkingHoursEditorProps> = ({
  workingHours,
  onChange,
  disabled = false,
}) => {
  // Toggle day enabled/disabled
  const toggleDay = useCallback((day: keyof WorkingHours) => {
    onChange({
      ...workingHours,
      [day]: {
        ...workingHours[day],
        enabled: !workingHours[day].enabled,
      },
    });
  }, [workingHours, onChange]);

  // Update start time
  const updateStartTime = useCallback((day: keyof WorkingHours, time: string) => {
    onChange({
      ...workingHours,
      [day]: {
        ...workingHours[day],
        start: time,
      },
    });
  }, [workingHours, onChange]);

  // Update end time
  const updateEndTime = useCallback((day: keyof WorkingHours, time: string) => {
    onChange({
      ...workingHours,
      [day]: {
        ...workingHours[day],
        end: time,
      },
    });
  }, [workingHours, onChange]);

  // Copy to all days
  const copyToAll = useCallback((sourceDay: keyof WorkingHours) => {
    const sourceHours = workingHours[sourceDay];
    const newHours = { ...workingHours };
    
    DAYS.forEach(day => {
      newHours[day] = {
        ...sourceHours,
        breaks: [], // Don't copy breaks
      };
    });
    
    onChange(newHours);
  }, [workingHours, onChange]);

  // Render day row
  const renderDay = useCallback((day: keyof WorkingHours) => {
    const dayHours = workingHours[day];

    return (
      <View key={day} style={styles.dayRow}>
        {/* Day Label and Toggle */}
        <View style={styles.dayHeader}>
          <Text style={[styles.dayLabel, !dayHours.enabled && styles.dayLabelDisabled]}>
            {DAY_LABELS[day]}
          </Text>
          <Switch
            value={dayHours.enabled}
            onValueChange={() => toggleDay(day)}
            disabled={disabled}
            trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
            thumbColor={dayHours.enabled ? '#8b5cf6' : '#f3f4f6'}
          />
        </View>

        {/* Time Pickers */}
        {dayHours.enabled && (
          <View style={styles.timeRow}>
            {/* Start Time */}
            <View style={styles.timePickerContainer}>
              <Text style={styles.timeLabel}>Start</Text>
              <View style={styles.timePicker}>
                <Ionicons name="time-outline" size={16} color="#6b7280" />
                <Text style={styles.timeText}>{dayHours.start}</Text>
              </View>
            </View>

            <Ionicons name="arrow-forward" size={16} color="#9ca3af" />

            {/* End Time */}
            <View style={styles.timePickerContainer}>
              <Text style={styles.timeLabel}>End</Text>
              <View style={styles.timePicker}>
                <Ionicons name="time-outline" size={16} color="#6b7280" />
                <Text style={styles.timeText}>{dayHours.end}</Text>
              </View>
            </View>

            {/* Copy Button */}
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => copyToAll(day)}
              disabled={disabled}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="copy-outline" size={16} color="#8b5cf6" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [workingHours, disabled, toggleDay, copyToAll]);

  return (
    <View style={styles.container}>
      {/* Info */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
        <Text style={styles.infoText}>
          Toggle days on/off and set working hours. Tap copy icon to apply to all days.
        </Text>
      </View>

      {/* Days */}
      <View style={styles.daysContainer}>
        {DAYS.map(renderDay)}
      </View>

      {/* Presets */}
      <View style={styles.presetsContainer}>
        <Text style={styles.presetsLabel}>Quick Presets:</Text>
        <View style={styles.presetsRow}>
          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => {
              const preset: WorkingHours = {
                monday: { enabled: true, start: '09:00', end: '17:00', breaks: [] },
                tuesday: { enabled: true, start: '09:00', end: '17:00', breaks: [] },
                wednesday: { enabled: true, start: '09:00', end: '17:00', breaks: [] },
                thursday: { enabled: true, start: '09:00', end: '17:00', breaks: [] },
                friday: { enabled: true, start: '09:00', end: '17:00', breaks: [] },
                saturday: { enabled: false, start: '09:00', end: '17:00', breaks: [] },
                sunday: { enabled: false, start: '09:00', end: '17:00', breaks: [] },
              };
              onChange(preset);
            }}
            disabled={disabled}
          >
            <Text style={styles.presetButtonText}>9-5 Weekdays</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => {
              const preset: WorkingHours = {
                monday: { enabled: true, start: '10:00', end: '19:00', breaks: [] },
                tuesday: { enabled: true, start: '10:00', end: '19:00', breaks: [] },
                wednesday: { enabled: true, start: '10:00', end: '19:00', breaks: [] },
                thursday: { enabled: true, start: '10:00', end: '19:00', breaks: [] },
                friday: { enabled: true, start: '10:00', end: '19:00', breaks: [] },
                saturday: { enabled: true, start: '10:00', end: '19:00', breaks: [] },
                sunday: { enabled: false, start: '10:00', end: '19:00', breaks: [] },
              };
              onChange(preset);
            }}
            disabled={disabled}
          >
            <Text style={styles.presetButtonText}>10-7 Mon-Sat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => {
              const preset: WorkingHours = {
                monday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
                tuesday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
                wednesday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
                thursday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
                friday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
                saturday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
                sunday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
              };
              onChange(preset);
            }}
            disabled={disabled}
          >
            <Text style={styles.presetButtonText}>9-6 All Week</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  daysContainer: {
    gap: 12,
  },
  dayRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  dayLabelDisabled: {
    color: '#9ca3af',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timePickerContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  presetsContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  presetsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f5f3ff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  presetButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b5cf6',
  },
});

export default React.memo(WorkingHoursEditor);
