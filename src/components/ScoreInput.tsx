'use client'

interface ScoreInputProps {
  label: string
  name: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

function getScoreColor(value: number, max: number): string {
  const ratio = value / max
  if (ratio <= 0.3) return 'text-green-600'
  if (ratio <= 0.6) return 'text-yellow-600'
  return 'text-red-600'
}

export function ScoreInput({ label, name, value, onChange, min = 0, max = 10 }: ScoreInputProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={name} className="text-sm font-medium text-gray-700">
          {label}
        </label>
        <span className={['text-sm font-semibold tabular-nums', getScoreColor(value, max)].join(' ')}>
          {value}/{max}
        </span>
      </div>
      <input
        id={name}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 accent-brand-600"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-0.5">
        <span>None</span>
        <span>Severe</span>
      </div>
    </div>
  )
}
