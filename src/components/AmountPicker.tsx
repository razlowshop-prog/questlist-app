import { Text, View } from 'react-native';
import { amountLabel, clampAmount, MEASURE_RANGES, UNIT_STARTS, type Amount, type Measure, type MeasureUnit } from '../measure';
import { eyebrow, themed, useStyles } from '../theme';
import { Chip } from './Chip';
import { Stepper } from './Stepper';

const UNIT_NAMES: Record<MeasureUnit, string> = { min: 'Time', km: 'Distance', steps: 'Steps' };

/** How far or how long for Walk and Run (time or distance), or how many steps. XP follows the amount. */
export function AmountPicker({ measure, value, onChange }: { measure: Measure; value: Amount; onChange: (a: Amount) => void }) {
  const s = useStyles(makeStyles);
  const units = Object.keys(MEASURE_RANGES[measure]) as MeasureUnit[];
  const range = MEASURE_RANGES[measure][value.unit]!;
  return (
    <>
      <Text style={s.small}>{measure === 'steps' ? 'How many steps?' : 'How far or how long?'}</Text>
      {units.length > 1 && (
        <View style={s.row}>
          {units.map((u) => (
            <Chip key={u} label={UNIT_NAMES[u]} active={value.unit === u} onPress={() => u !== value.unit && onChange(clampAmount(measure, { unit: u, value: UNIT_STARTS[measure][u]! }))} />
          ))}
        </View>
      )}
      <Stepper
        value={value.value}
        min={range.min}
        max={range.max}
        step={range.step}
        format={(v) => amountLabel({ unit: value.unit, value: v })}
        onChange={(v) => onChange(clampAmount(measure, { unit: value.unit, value: v }))}
        label=""
      />
    </>
  );
}

const makeStyles = themed((c) => ({
  small: { ...eyebrow(c, 11), color: c.muted },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
}));
